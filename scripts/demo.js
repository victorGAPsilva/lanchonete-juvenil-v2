// Base isolada: nunca escreve em data/ nem usa os dados de produção.
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { exampleProducts } from "../lib/examples.js";
process.env.DATA_DIR = resolve("data-demo");
process.env.UPLOAD_DIR = resolve("uploads-demo");
process.env.PORT = "3001";
process.env.PUBLIC_ORIGIN = "http://localhost:3001";
const { db, config, put } = await import("../lib/db.js");
const { hashPassword } = await import("../lib/security.js");
const c = {
  ...config(),
  name: "Lanchonete Juvenil · DEMONSTRAÇÃO",
  mode: "open",
  address: "Endereço fictício — apenas demonstração",
  deliveryMode: "neighborhood",
  neighborhoods: [{ name: "Bairro de demonstração", fee: 500 }],
  payments: [
    { id: "pix-demo", name: "Pix (demonstração)", cash: false },
    { id: "cash-demo", name: "Dinheiro (demonstração)", cash: true },
  ],
  prep: "20 a 30 min (exemplo)",
};
db.prepare("UPDATE config SET value=? WHERE id=1").run(JSON.stringify(c));
for (const [order, product] of exampleProducts.entries()) {
  put("products", `demo-${order}`, { ...product, id: `demo-${order}` });
}
const password = randomBytes(24).toString("base64url");
db.prepare(
  "INSERT INTO admins(email,hash) VALUES (?,?) ON CONFLICT(email) DO UPDATE SET hash=excluded.hash",
).run("demo@juvenil.local", hashPassword(password));
db.prepare("DELETE FROM sessions").run();
console.log(
  `DEMONSTRAÇÃO — dados fictícios, banco separado.\nhttp://localhost:3001\nPainel: demo@juvenil.local\nSenha temporária para esta execução: ${password}`,
);
const { app } = await import("../server.js");
app.listen(3001, "127.0.0.1");
