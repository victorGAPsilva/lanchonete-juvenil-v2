import { backup } from "node:sqlite";
import { mkdirSync, cpSync, existsSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { db } from "../lib/db.js";
const destination = resolve(
  "backups",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
mkdirSync(destination, { recursive: true });
await backup(db, join(destination, "juvenil.sqlite"));
const uploads = resolve(process.env.UPLOAD_DIR || "uploads");
if (existsSync(uploads))
  cpSync(uploads, join(destination, "uploads"), { recursive: true });
writeFileSync(
  join(destination, "backup.json"),
  JSON.stringify({ createdAt: new Date().toISOString(), version: 1 }, null, 2),
);
db.close();
console.log(`Backup criado em ${destination}`);
