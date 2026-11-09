import './env.ts';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { registerRoutes } from './routes.ts';

function loadEnvFile(envPath: string) {
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    } catch (_) {}
  }
}

// Load .env from current directory or parent directory
loadEnvFile(path.resolve(process.cwd(), '.env'));
loadEnvFile(path.resolve(process.cwd(), '..', '.env'));

async function start() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Simple request logger to help debugging
  app.use((req, _res, next) => {
    console.log(`[backend] ${req.method} ${req.url}`);
    next();
  });

  try {
    const server = await registerRoutes(app);
    const port = process.env.PORT ? Number(process.env.PORT) : 5000;
    server.listen(port, () => {
      console.log(`Backend server listening on http://localhost:${port}`);
      if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('npg_placeholder')) {
        console.log(`[Neon DB] Connected to database: ${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'neon'}`);
      }
      console.log(`[Object Storage] Configured bucket: ${process.env.OBJECT_STORAGE_BUCKET || 'formease-storage'}`);
      console.log(`[Gnani Speech API] Initial credits balance: ${process.env.GNANI_INITIAL_CREDITS || 5000}`);
    });
  } catch (err) {
    console.error('Failed to start backend server', err);
    process.exit(1);
  }
}

start();
