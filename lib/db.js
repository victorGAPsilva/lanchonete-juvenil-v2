import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
export const dataDir = resolve(process.env.DATA_DIR || "data");
mkdirSync(dataDir, { recursive: true });
export const db = new DatabaseSync(resolve(dataDir, "juvenil.sqlite"));
db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
db.exec(
  readFileSync(
    new URL("../migrations/001_initial.sql", import.meta.url),
    "utf8",
  ),
);
db.prepare("INSERT OR IGNORE INTO migrations(name) VALUES (?)").run(
  "001_initial",
);
const initial = {
  name: "Lanchonete Juvenil",
  whatsapp: "5511960217697",
  address: "",
  instagram: "",
  logo: "",
  mode: "closed",
  pauseUntil: "",
  pickup: true,
  delivery: true,
  deliveryMode: "pending",
  fixedFee: 0,
  neighborhoods: [],
  payments: [],
  prep: "",
  deliveryEstimate: "",
  hours: Array.from({ length: 7 }, () => ({
    enabled: false,
    open: "18:00",
    close: "23:00",
  })),
};
const created = db
  .prepare("INSERT OR IGNORE INTO config(id,value) VALUES (1,?)")
  .run(JSON.stringify(initial));
if (created.changes) {
  for (const [order, name] of ["Croissants", "Bebidas", "Outros"].entries())
    db.prepare("INSERT INTO categories(id,value) VALUES (?,?)").run(
      `category-${order}`,
      JSON.stringify({ id: `category-${order}`, name, order, active: true }),
    );
}
export const config = () =>
  JSON.parse(db.prepare("SELECT value FROM config WHERE id=1").get().value);
export const rows = (table) =>
  db
    .prepare(`SELECT value FROM ${table}`)
    .all()
    .map((r) => JSON.parse(r.value))
    .sort((a, b) => a.order - b.order);
export function put(table, id, value) {
  db.prepare(
    `INSERT INTO ${table}(id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value`,
  ).run(id, JSON.stringify(value));
}
