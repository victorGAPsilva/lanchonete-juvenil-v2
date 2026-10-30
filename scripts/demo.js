// Base isolada: nunca escreve em data/ nem usa os dados de produção.
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
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
for (const [order, name, categoryId, price] of [
  [0, "Croissant · DEMONSTRAÇÃO", "category-0", 1500],
  [1, "Bebida · DEMONSTRAÇÃO", "category-1", 600],
  [2, "Outro lanche · DEMONSTRAÇÃO", "category-2", 1200],
])
  put("products", `demo-${order}`, {
    id: `demo-${order}`,
    name,
    categoryId,
    price,
    promoPrice: order === 0 ? 1200 : null,
    description:
      "Produto fictício para testar o site. Não faz parte do cardápio comercial.",
    active: true,
    soldOut: order === 2,
    featured: order === 1,
    order,
    image: "",
    groups:
      order === 0
        ? [
            {
              id: "demo-group",
              name: "Adicionais de demonstração",
              min: 0,
              max: 2,
              options: [
                { id: "extra-1", name: "Adicional fictício 1", price: 200 },
                { id: "extra-2", name: "Adicional fictício 2", price: 300 },
              ],
            },
          ]
        : [],
  });
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
