import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { db } from "../lib/db.js";
import { exampleProducts } from "../lib/examples.js";

export function seedExamples() {
  // INSERT OR IGNORE preserva alterações e desativações feitas pelo administrador.
  const insert = db.prepare(
    "INSERT OR IGNORE INTO products(id,value) VALUES (?,?)",
  );
  let inserted = 0;
  db.exec("BEGIN");
  try {
    for (const p of exampleProducts)
      inserted += Number(insert.run(p.id, JSON.stringify(p)).changes);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return inserted;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  console.log(
    `${seedExamples()} produtos fictícios adicionados. Configurações e produtos existentes foram preservados.`,
  );
  db.close();
}
