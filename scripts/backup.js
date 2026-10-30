import { backup } from "node:sqlite";
import { mkdirSync, cpSync, existsSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { db } from "../lib/db.js";
import { runtime } from "../lib/runtime.js";
const destination = resolve(
  runtime.backupDir,
  new Date().toISOString().replace(/[:.]/g, "-"),
);
mkdirSync(destination, { recursive: true, mode: 0o700 });
await backup(db, join(destination, "juvenil.sqlite"));
const uploads = runtime.uploadDir;
if (existsSync(uploads))
  cpSync(uploads, join(destination, "uploads"), { recursive: true });
writeFileSync(
  join(destination, "backup.json"),
  JSON.stringify({ createdAt: new Date().toISOString(), version: 1 }, null, 2),
  { mode: 0o600 },
);
db.close();
console.log(`Backup criado em ${destination}`);
