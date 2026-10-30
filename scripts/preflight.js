import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

let db;
try {
  const { runtime } = await import("../lib/runtime.js");
  const store = await import("../lib/db.js");
  db = store.db;
  for (const folder of [
    runtime.dataDir,
    runtime.uploadDir,
    runtime.backupDir,
  ]) {
    mkdirSync(folder, { recursive: true });
    const probe = join(folder, `.write-check-${randomUUID()}`);
    writeFileSync(probe, "ok", { flag: "wx", mode: 0o600 });
    unlinkSync(probe);
  }
  if (Object.values(db.prepare("PRAGMA quick_check").get())[0] !== "ok")
    throw new Error("Falha na integridade do banco SQLite.");
  const { launchIssues } = await import("../lib/readiness.js");
  const validate = await import("../lib/validation.js");
  validate.settings(store.config());
  const categories = store.rows("categories");
  for (const category of categories) validate.category(category);
  for (const product of store.rows("products"))
    validate.product(product, categories);
  const issues = launchIssues({
    config: store.config(),
    categories: store.rows("categories"),
    products: store.rows("products"),
    adminCount: db.prepare("SELECT COUNT(*) AS total FROM admins").get().total,
  });
  console.log(
    `Verificação técnica aprovada (${runtime.production ? "produção" : "desenvolvimento"}): ambiente, banco e diretórios graváveis.`,
  );
  for (const issue of issues)
    console.log(`Pendente para operação comercial: ${issue}`);
  if (process.argv.includes("--live")) {
    if (!runtime.production)
      issues.push(
        "Execute a verificação comercial com NODE_ENV=production e o domínio HTTPS configurado.",
      );
    if (issues.length) {
      if (!runtime.production) console.error(issues.at(-1));
      process.exitCode = 1;
    } else
      console.log(
        "Verificação comercial aprovada. Confira o número do WhatsApp e os dados reais com o responsável antes de abrir a loja.",
      );
  }
} catch (error) {
  console.error(`Verificação reprovada: ${error.message}`);
  process.exitCode = 1;
} finally {
  db?.close();
}
