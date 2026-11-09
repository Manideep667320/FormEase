import "./env.ts";
import pg from "pg";
const { Pool } = pg;
import type { IStorage } from "../src/lib/storage.ts";
import type { FormDraft, FormSectionWithFields } from "../src/lib/firebaseService.ts";

export interface NeonConfig {
  databaseUrl: string;
  host?: string;
  isConfigured: boolean;
  connected?: boolean;
}

export class NeonStorage implements IStorage {
  private databaseUrl: string = "";
  private pool: pg.Pool | null = null;
  private isConfigured: boolean = false;
  private tablesInitialized: boolean = false;

  constructor(databaseUrl?: string) {
    this.refreshConfig(databaseUrl);
  }

  public refreshConfig(databaseUrl?: string): void {
    if (this.pool && this.isConfigured) return;
    this.databaseUrl = databaseUrl || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";
    this.isConfigured = Boolean(
      this.databaseUrl && 
      !this.databaseUrl.includes("npg_placeholder") &&
      !this.databaseUrl.includes("username:password")
    );

    if (this.isConfigured && !this.pool) {
      try {
        this.pool = new Pool({
          connectionString: this.databaseUrl,
          ssl: { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 8000,
        });

        // Initialize Neon PostgreSQL tables in background
        this.initTables().catch(err => {
          console.warn("[Neon DB] Table init notice:", err.message);
        });
      } catch (err: any) {
        console.error("[Neon DB] Pool init error:", err.message);
      }
    }
  }

  public getConfig(): NeonConfig {
    if (!this.isConfigured || !this.pool) {
      this.refreshConfig();
    }

    let host = "";
    try {
      if (this.databaseUrl.includes("@")) {
        host = this.databaseUrl.split("@")[1].split("/")[0].split("?")[0];
      }
    } catch (_) {}

    return {
      databaseUrl: this.databaseUrl ? this.databaseUrl.replace(/:[^:@]+@/, ":***@") : "",
      host,
      isConfigured: this.isConfigured,
      connected: this.tablesInitialized
    };
  }

  /**
   * Initializes PostgreSQL tables in Neon
   */
  public async initTables(): Promise<void> {
    if (!this.pool || this.tablesInitialized) return;

    const ddl = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        full_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS form_types (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        image_src TEXT
      );

      CREATE TABLE IF NOT EXISTS form_sections (
        id SERIAL PRIMARY KEY,
        form_type_id INTEGER REFERENCES form_types(id) ON DELETE CASCADE,
        section_key TEXT,
        title TEXT NOT NULL,
        order_index INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS form_fields (
        id SERIAL PRIMARY KEY,
        section_id INTEGER REFERENCES form_sections(id) ON DELETE CASCADE,
        field_key TEXT NOT NULL,
        label TEXT NOT NULL,
        field_type TEXT DEFAULT 'text',
        required BOOLEAN DEFAULT false,
        options JSONB,
        order_index INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS form_drafts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        form_type_id TEXT NOT NULL,
        name TEXT NOT NULL,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS form_submissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        form_id TEXT NOT NULL,
        form_data JSONB NOT NULL DEFAULT '{}',
        file_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        sender_id TEXT,
        text TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO form_types (code, name, description, image_src) VALUES
        ('passport', 'Passport Application', 'Official Indian passport fresh and re-issue application form', '/passport.png'),
        ('aadhaar', 'Aadhaar Card', 'Unique Identification Authority of India (UIDAI) enrolment and update form', '/aadhaar.png'),
        ('voterid', 'Voter ID', 'Election Commission of India Form 6 application for registration of new voter', '/voterid.png')
      ON CONFLICT (code) DO NOTHING;
    `;

    try {
      await this.query(ddl);
      this.tablesInitialized = true;
      console.log("[Neon DB] Schema synchronized successfully on Neon PostgreSQL!");
    } catch (err: any) {
      console.warn("[Neon DB] Schema init note:", err.message);
    }
  }

  /**
   * Executes a parameterized SQL query
   */
  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.pool || !this.isConfigured) {
      this.refreshConfig();
    }
    if (!this.pool) {
      console.warn("[Neon DB] Cannot execute query - pool not initialized.");
      return [];
    }

    let client: pg.PoolClient | null = null;
    try {
      client = await this.pool.connect();
      const res = await client.query(sql, params);
      return (res.rows || []) as T[];
    } catch (err: any) {
      console.error("[Neon DB] SQL query error:", err.message, "SQL:", sql.slice(0, 80));
      throw err;
    } finally {
      if (client) client.release();
    }
  }

  // ===== User methods =====
  async getUser(id: string): Promise<any> {
    const rows = await this.query("SELECT * FROM users WHERE id = $1", [id]);
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<any> {
    const rows = await this.query(
      "SELECT * FROM users WHERE username = $1 OR email = $1",
      [username]
    );
    return rows[0];
  }

  async getUserByEmail(email: string): Promise<any> {
    const rows = await this.query("SELECT * FROM users WHERE email = $1", [email]);
    return rows[0];
  }

  async createUser(userData: any): Promise<any> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    await this.query(
      `INSERT INTO users (id, username, email, password, full_name, created_at, last_login)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, userData.username, userData.email, userData.password, userData.fullName || "", now, now]
    );
    return { id, ...userData, createdAt: now, lastLogin: now };
  }

  async updateUser(id: string, userData: any): Promise<any> {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(userData)) {
      const colName = key === "fullName" ? "full_name" : key === "lastLogin" ? "last_login" : key;
      updates.push(`${colName} = $${idx++}`);
      values.push(val);
    }
    values.push(id);

    await this.query(`UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}`, values);
    return this.getUser(id);
  }

  // ===== Session methods =====
  async createUserSession(session: any): Promise<any> {
    const id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    await this.query(
      `INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, session.userId, session.token, session.expiresAt || null, now]
    );
    return { id, ...session, createdAt: now };
  }

  async getUserSessionByToken(token: string): Promise<any> {
    const rows = await this.query("SELECT * FROM user_sessions WHERE token = $1", [token]);
    if (!rows[0]) return undefined;
    return {
      id: rows[0].id,
      userId: rows[0].user_id,
      token: rows[0].token,
      createdAt: rows[0].created_at
    };
  }

  async deleteUserSession(token: string): Promise<void> {
    await this.query("DELETE FROM user_sessions WHERE token = $1", [token]);
  }

  // ===== Form Types =====
  async getFormTypes(): Promise<any[]> {
    const rows = await this.query("SELECT id, code, name FROM form_types ORDER BY id ASC");
    if (rows.length > 0) return rows;
    return [
      { id: 1, code: "passport", name: "Passport Application" },
      { id: 2, code: "aadhaar", name: "Aadhaar Card" },
      { id: 3, code: "voterid", name: "Voter ID" }
    ];
  }

  async getFormTypeByCode(code: string): Promise<any> {
    const rows = await this.query("SELECT * FROM form_types WHERE code = $1", [code]);
    return rows[0];
  }

  // ===== Form Structures =====
  async getFormSections(formTypeId: string | number): Promise<any[]> {
    const isNum = !isNaN(Number(formTypeId));
    const query = isNum
      ? "SELECT * FROM form_sections WHERE form_type_id = $1 ORDER BY order_index ASC"
      : "SELECT * FROM form_sections WHERE form_type_id IN (SELECT id FROM form_types WHERE code = $1) ORDER BY order_index ASC";
    return this.query(query, [formTypeId]);
  }

  async getFormFields(sectionId: string | number): Promise<any[]> {
    return this.query(
      "SELECT * FROM form_fields WHERE section_id = $1 ORDER BY order_index ASC",
      [sectionId]
    );
  }

  async getFormStructure(formTypeCode: string): Promise<{ formType: any; sections: FormSectionWithFields[] }> {
    const typeRows = await this.query("SELECT * FROM form_types WHERE code = $1", [formTypeCode]);
    if (!typeRows[0]) {
      return {
        formType: { id: "1", code: formTypeCode, name: `${formTypeCode} form` },
        sections: []
      };
    }
    const formType = typeRows[0];
    const sections = await this.getFormSections(formType.id);
    const sectionsWithFields: FormSectionWithFields[] = [];

    for (const sec of sections) {
      const fields = await this.getFormFields(sec.id);
      sectionsWithFields.push({
        id: String(sec.id),
        formTypeId: String(formType.id),
        title: sec.title,
        order: sec.order_index,
        fields: fields.map(f => ({
          id: String(f.id),
          sectionId: String(sec.id),
          label: f.label,
          type: f.field_type,
          required: Boolean(f.required),
          options: typeof f.options === "string" ? JSON.parse(f.options) : f.options,
          order: f.order_index
        }))
      });
    }

    return { formType, sections: sectionsWithFields };
  }

  // ===== Form Submissions =====
  async createFormSubmission(submission: any): Promise<any> {
    const id = `sub_${Date.now()}`;
    const now = new Date();
    await this.query(
      `INSERT INTO form_submissions (id, user_id, form_id, form_data, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, submission.userId, submission.formId, JSON.stringify(submission.formData), now]
    );
    return { id, ...submission, createdAt: now };
  }

  async getFormSubmission(id: string): Promise<any> {
    const rows = await this.query("SELECT * FROM form_submissions WHERE id = $1", [id]);
    return rows[0];
  }

  async getUserFormSubmissions(userId: string): Promise<any[]> {
    return this.query(
      "SELECT * FROM form_submissions WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
  }

  // ===== Form Drafts =====
  async createFormDraft(draft: Omit<FormDraft, "id" | "createdAt" | "lastUpdated"> & { id?: string; name?: string }): Promise<FormDraft> {
    const id = (draft as any).id || `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const draftName = ((draft as any).name || "Draft").trim();
    const dataJson = typeof draft.data === "string" ? draft.data : JSON.stringify(draft.data || {});

    await this.query(
      `INSERT INTO form_drafts (id, user_id, form_type_id, name, data, created_at, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         data = EXCLUDED.data,
         last_updated = EXCLUDED.last_updated`,
      [id, draft.userId, draft.formTypeId, draftName, dataJson, now, now]
    );
    return {
      id,
      userId: draft.userId,
      formTypeId: draft.formTypeId,
      name: draftName,
      data: typeof draft.data === "string" ? JSON.parse(draft.data) : draft.data,
      createdAt: now,
      lastUpdated: now
    } as any;
  }

  async getFormDraft(id: string): Promise<FormDraft | undefined> {
    const rows = await this.query("SELECT * FROM form_drafts WHERE id = $1", [id]);
    if (!rows[0]) return undefined;
    const r = rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      formTypeId: r.form_type_id,
      name: r.name || "Draft",
      data: typeof r.data === "string" ? JSON.parse(r.data) : r.data,
      createdAt: r.created_at,
      lastUpdated: r.last_updated
    } as any;
  }

  async getUserFormDrafts(userId: string): Promise<FormDraft[]> {
    const rows = await this.query(
      "SELECT * FROM form_drafts WHERE user_id = $1 ORDER BY last_updated DESC",
      [userId]
    );
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      formTypeId: r.form_type_id,
      name: r.name || "Draft",
      data: typeof r.data === "string" ? JSON.parse(r.data) : r.data,
      createdAt: r.created_at,
      lastUpdated: r.last_updated
    })) as any;
  }

  async updateFormDraft(id: string, data: Partial<FormDraft> & { name?: string }): Promise<FormDraft | undefined> {
    const now = new Date();
    const updates: string[] = ["last_updated = $1"];
    const values: any[] = [now];
    let idx = 2;

    if (data.data !== undefined) {
      const dataJson = typeof data.data === "string" ? data.data : JSON.stringify(data.data || {});
      updates.push(`data = $${idx++}`);
      values.push(dataJson);
    }
    if ((data as any).name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push((data as any).name);
    }
    values.push(id);

    await this.query(
      `UPDATE form_drafts SET ${updates.join(", ")} WHERE id = $${idx}`,
      values
    );
    return this.getFormDraft(id);
  }

  async deleteFormDraft(id: string): Promise<void> {
    await this.query("DELETE FROM form_drafts WHERE id = $1", [id]);
  }

  // ===== Messages =====
  async saveMessage(message: any): Promise<any> {
    const id = message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await this.query(
      `INSERT INTO messages (id, session_id, sender_id, text, timestamp)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, message.sessionId || null, message.senderId || null, message.text || "", message.timestamp || new Date()]
    );
    return { ...message, id };
  }

  async getMessagesBySession(sessionId: string): Promise<any[]> {
    return this.query("SELECT * FROM messages WHERE session_id = $1 ORDER BY timestamp ASC", [sessionId]);
  }

  async getUserMessages(userId: string): Promise<any[]> {
    return this.query("SELECT * FROM messages WHERE sender_id = $1 ORDER BY timestamp ASC", [userId]);
  }
}

export const neonStorage = new NeonStorage();
