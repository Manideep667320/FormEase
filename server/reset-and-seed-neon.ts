import fs from "fs";
import path from "path";
import pg from "pg";
const { Pool } = pg;
import bcrypt from "bcryptjs";

// Load .env manually if not yet loaded
function loadEnv() {
  const envPaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env")
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eq = trimmed.indexOf("=");
        if (eq !== -1) {
          const k = trimmed.slice(0, eq).trim();
          let v = trimmed.slice(eq + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (!process.env[k]) process.env[k] = v;
        }
      });
    }
  }
}

loadEnv();

const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!dbUrl || dbUrl.includes("npg_placeholder")) {
  console.error("❌ ERROR: Valid DATABASE_URL not found in .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigrationAndSeed() {
  const client = await pool.connect();
  console.log("==================================================================");
  console.log(" Connected to Neon PostgreSQL Database:");
  console.log(` Host: ${dbUrl.split("@")[1]?.split("/")[0]}`);
  console.log("==================================================================\n");

  try {
    // 1. Inspect existing tables
    console.log("🔍 Checking existing tables in database...");
    const existingTablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);

    const existingTables = existingTablesRes.rows.map(r => r.table_name);
    console.log(`Found ${existingTables.length} existing tables:`, existingTables);

    // 2. Drop all existing tables with CASCADE
    if (existingTables.length > 0) {
      console.log("\n🗑️  Dropping all existing tables...");
      for (const table of existingTables) {
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`   - Dropped table "${table}"`);
      }
      console.log("✅ All old tables removed successfully.\n");
    }

    // 3. Create fresh FormEase tables schema
    console.log("🔨 Creating FormEase tables schema...");
    await client.query(`
      -- Users Table
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        full_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      );

      -- User Sessions Table
      CREATE TABLE user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Form Types Table
      CREATE TABLE form_types (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        image_src TEXT
      );

      -- Form Sections Table
      CREATE TABLE form_sections (
        id SERIAL PRIMARY KEY,
        form_type_id INTEGER REFERENCES form_types(id) ON DELETE CASCADE,
        section_key TEXT,
        title TEXT NOT NULL,
        order_index INTEGER DEFAULT 0
      );

      -- Form Fields Table
      CREATE TABLE form_fields (
        id SERIAL PRIMARY KEY,
        section_id INTEGER REFERENCES form_sections(id) ON DELETE CASCADE,
        field_key TEXT NOT NULL,
        label TEXT NOT NULL,
        field_type TEXT DEFAULT 'text',
        required BOOLEAN DEFAULT false,
        options JSONB,
        order_index INTEGER DEFAULT 0
      );

      -- Form Drafts Table
      CREATE TABLE form_drafts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        form_type_id TEXT NOT NULL,
        name TEXT NOT NULL,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Form Submissions Table
      CREATE TABLE form_submissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        form_id TEXT NOT NULL,
        form_data JSONB NOT NULL DEFAULT '{}',
        file_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Chat Messages Table
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        sender_id TEXT,
        text TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ FormEase schema created: users, user_sessions, form_types, form_sections, form_fields, form_drafts, form_submissions, messages\n");

    // 4. Seed Form Types
    console.log("🌱 Seeding Form Types...");
    const formTypes = [
      {
        code: "passport",
        name: "Passport Application",
        description: "Official Indian passport fresh and re-issue application form",
        image_src: "/passport.png"
      },
      {
        code: "aadhaar",
        name: "Aadhaar Card",
        description: "Unique Identification Authority of India (UIDAI) enrolment and update form",
        image_src: "/aadhaar.png"
      },
      {
        code: "voterid",
        name: "Voter ID",
        description: "Election Commission of India Form 6 application for registration of new voter",
        image_src: "/voterid.png"
      }
    ];

    const formTypeIds: Record<string, number> = {};

    for (const ft of formTypes) {
      const res = await client.query(
        `INSERT INTO form_types (code, name, description, image_src) 
         VALUES ($1, $2, $3, $4) RETURNING id;`,
        [ft.code, ft.name, ft.description, ft.image_src]
      );
      formTypeIds[ft.code] = res.rows[0].id;
      console.log(`   + Added form type: ${ft.name} (id: ${res.rows[0].id})`);
    }

    // 5. Seed Sections and Fields from JSON definitions
    console.log("\n🌱 Parsing and Seeding Form Sections & Fields from JSON...");

    const formsJsonDir = path.resolve(process.cwd(), "src", "data");

    // Helper to sanitize field key
    const makeKey = (str: string, fallback: string) => {
      const cleaned = (str || fallback).replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase().replace(/_+/g, "_").slice(0, 100);
      return cleaned || fallback;
    };

    // A. Passport Form
    const passportPath = path.join(formsJsonDir, "passportForm.json");
    if (fs.existsSync(passportPath)) {
      const passportJson = JSON.parse(fs.readFileSync(passportPath, "utf8"));
      const sections = passportJson.form_fields || [];
      const formTypeId = formTypeIds["passport"];

      let secOrder = 1;
      let fieldTotal = 0;
      for (const sec of sections) {
        if (sec.section && Array.isArray(sec.fields)) {
          const secRes = await client.query(
            `INSERT INTO form_sections (form_type_id, section_key, title, order_index)
             VALUES ($1, $2, $3, $4) RETURNING id;`,
            [formTypeId, `sec_${secOrder}`, sec.section, secOrder]
          );
          const sectionId = secRes.rows[0].id;
          let fieldOrder = 1;

          for (const f of sec.fields) {
            const fieldKey = makeKey(f.field_name, `field_${fieldOrder}`);
            await client.query(
              `INSERT INTO form_fields (section_id, field_key, label, field_type, required, options, order_index)
               VALUES ($1, $2, $3, $4, $5, $6, $7);`,
              [
                sectionId,
                fieldKey,
                f.field_name || "Detail",
                f.type || (f.options ? "select" : "text"),
                true,
                f.options ? JSON.stringify(f.options) : null,
                fieldOrder++
              ]
            );
            fieldTotal++;
          }
          secOrder++;
        }
      }
      console.log(`   + Seeded Passport Form: ${secOrder - 1} sections, ${fieldTotal} fields.`);
    }

    // B. Aadhaar Form
    const aadharPath = path.join(formsJsonDir, "aadharForm.json");
    if (fs.existsSync(aadharPath)) {
      const aadharJson = JSON.parse(fs.readFileSync(aadharPath, "utf8"));
      const items = aadharJson.form_fields || [];
      const formTypeId = formTypeIds["aadhaar"];

      let secOrder = 1;
      let fieldTotal = 0;

      // Group 1: General enrolment items
      const mainSecRes = await client.query(
        `INSERT INTO form_sections (form_type_id, section_key, title, order_index)
         VALUES ($1, $2, $3, $4) RETURNING id;`,
        [formTypeId, "sec_aadhar_general", "Aadhaar Enrolment & Personal Details", secOrder++]
      );
      let currentSectionId = mainSecRes.rows[0].id;
      let fieldOrder = 1;

      for (const item of items) {
        if (Array.isArray(item.fields)) {
          // It's a nested section like Address or Document Proofs
          const groupTitle = item.field_name || `Section ${secOrder}`;
          const subSecRes = await client.query(
            `INSERT INTO form_sections (form_type_id, section_key, title, order_index)
             VALUES ($1, $2, $3, $4) RETURNING id;`,
            [formTypeId, makeKey(groupTitle, `sec_${secOrder}`), groupTitle, secOrder++]
          );
          currentSectionId = subSecRes.rows[0].id;
          let subOrder = 1;
          for (const subField of item.fields) {
            const fieldKey = makeKey(subField.field_name, `subfield_${subOrder}`);
            await client.query(
              `INSERT INTO form_fields (section_id, field_key, label, field_type, required, options, order_index)
               VALUES ($1, $2, $3, $4, $5, $6, $7);`,
              [
                currentSectionId,
                fieldKey,
                subField.field_name || "Detail",
                subField.type || (subField.options ? "radio" : "text"),
                true,
                subField.options ? JSON.stringify(subField.options) : null,
                subOrder++
              ]
            );
            fieldTotal++;
          }
        } else {
          // Regular field
          const fieldKey = makeKey(item.field_name, `field_${fieldOrder}`);
          await client.query(
            `INSERT INTO form_fields (section_id, field_key, label, field_type, required, options, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7);`,
            [
              currentSectionId,
              fieldKey,
              item.field_name || "Detail",
              item.type || (item.options ? "radio" : "text"),
              true,
              item.options ? JSON.stringify(item.options) : null,
              fieldOrder++
            ]
          );
          fieldTotal++;
        }
      }
      console.log(`   + Seeded Aadhaar Form: ${secOrder - 1} sections, ${fieldTotal} fields.`);
    }

    // C. Voter ID Form
    const voteridPath = path.join(formsJsonDir, "voteridForm.json");
    if (fs.existsSync(voteridPath)) {
      const voterJson = JSON.parse(fs.readFileSync(voteridPath, "utf8"));
      const sections = voterJson.form_fields || [];
      const formTypeId = formTypeIds["voterid"];

      let secOrder = 1;
      let fieldTotal = 0;
      for (const sec of sections) {
        if (sec.section && Array.isArray(sec.fields)) {
          const secRes = await client.query(
            `INSERT INTO form_sections (form_type_id, section_key, title, order_index)
             VALUES ($1, $2, $3, $4) RETURNING id;`,
            [formTypeId, makeKey(sec.section, `sec_voter_${secOrder}`), sec.section, secOrder]
          );
          const sectionId = secRes.rows[0].id;
          let fieldOrder = 1;

          for (const f of sec.fields) {
            const fieldKey = makeKey(f.field_name, `field_${fieldOrder}`);
            await client.query(
              `INSERT INTO form_fields (section_id, field_key, label, field_type, required, options, order_index)
               VALUES ($1, $2, $3, $4, $5, $6, $7);`,
              [
                sectionId,
                fieldKey,
                f.field_name || "Detail",
                f.type || (f.options ? "radio" : "text"),
                true,
                f.options ? JSON.stringify(f.options) : null,
                fieldOrder++
              ]
            );
            fieldTotal++;
          }
          secOrder++;
        }
      }
      console.log(`   + Seeded Voter ID Form: ${secOrder - 1} sections, ${fieldTotal} fields.`);
    }

    // 6. Seed Demo User
    console.log("\n🌱 Seeding Demo User in Neon...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("Password@123", salt);
    const userId = "user_demo_1001";
    await client.query(
      `INSERT INTO users (id, username, email, password, full_name, created_at, last_login)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING;`,
      [userId, "demouser", "demo@formease.com", hashedPassword, "Demo User"]
    );
    console.log(`   + Added demo account: demo@formease.com (Password: Password@123)`);

    // 7. Seed Sample Draft
    console.log("\n🌱 Seeding Sample Draft...");
    await client.query(
      `INSERT INTO form_drafts (id, user_id, form_type_id, name, data, created_at, last_updated)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW());`,
      [
        "draft_sample_01",
        userId,
        "passport",
        "My First Passport Draft",
        JSON.stringify({
          "1_1_applying_for": "Fresh Passport",
          "1_4_type_of_application": "Normal",
          "1_5_type_of_passport_booklet": "36 Pages",
          "applicant_name": "Demo User"
        })
      ]
    );
    console.log(`   + Added sample draft: "My First Passport Draft"`);

    // 8. Verification query
    console.log("\n==================================================================");
    console.log("📊 FormEase Neon Database Summary:");
    console.log("==================================================================");

    const counts = [
      { name: "users", query: "SELECT count(*) FROM users" },
      { name: "form_types", query: "SELECT count(*) FROM form_types" },
      { name: "form_sections", query: "SELECT count(*) FROM form_sections" },
      { name: "form_fields", query: "SELECT count(*) FROM form_fields" },
      { name: "form_drafts", query: "SELECT count(*) FROM form_drafts" },
      { name: "form_submissions", query: "SELECT count(*) FROM form_submissions" },
      { name: "user_sessions", query: "SELECT count(*) FROM user_sessions" },
      { name: "messages", query: "SELECT count(*) FROM messages" }
    ];

    for (const c of counts) {
      const res = await client.query(c.query);
      console.log(`  • ${c.name.padEnd(20)}: ${res.rows[0].count} records`);
    }

    console.log("\n🎉 Database successfully reset and seeded with FormEase schema and data!");
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrationAndSeed().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
