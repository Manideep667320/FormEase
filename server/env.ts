import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let currentDir = "";
try {
  currentDir = path.dirname(fileURLToPath(import.meta.url));
} catch (_) {
  currentDir = process.cwd();
}

/**
 * Ensures environment variables from .env files are loaded into process.env.
 * This runs synchronously at the very start of module loading to avoid ES module import hoisting issues.
 */
export function loadEnv(): void {
  const envCandidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env"),
    path.resolve(currentDir, ".env"),
    path.resolve(currentDir, "..", ".env"),
  ];

  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf8");
        content.split(/\r?\n/).forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) return;
          const eqIdx = trimmed.indexOf("=");
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
}

// Immediately execute on import
loadEnv();
