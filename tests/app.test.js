import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { quote, checkout, isOpen } from "../lib/domain.js";
import { hashPassword, verifyPassword } from "../lib/security.js";
const cat = [{ id: "c", active: true }];
const product = {
  id: "p",
  name: "Produto de teste",
  description: "",
  categoryId: "c",
  price: 1000,
  promoPrice: 800,
  active: true,
  soldOut: false,
  featured: false,
  image: "",
  order: 0,
  groups: [
    {
      id: "g",
      name: "Recheio",
      min: 1,
      max: 2,
      options: [
        { id: "a", name: "Extra teste", price: 250 },
        { id: "b", name: "Outro teste", price: 100 },
      ],
    },
  ],
};
const cart = [
  {
    productId: "p",
    quantity: 2,
    selections: { g: ["a"] },
    notes: "Observação de teste",
  },
];
const config = {
  name: "Loja teste",
  whatsapp: "5511960217697",
  mode: "open",
  pauseUntil: "",
  hours: [],
  pickup: true,
  delivery: true,
  address: "Endereço de teste",
  deliveryMode: "neighborhood",
  fixedFee: 400,
  neighborhoods: [{ name: "Bairro teste", fee: 500 }],
  payments: [{ id: "cash", name: "Dinheiro", cash: true }],
};
const customer = {
  name: "Cliente teste",
  method: "delivery",
  street: "Rua teste",
  number: "1",
  neighborhood: "Bairro teste",
  payment: "cash",
};
test("calcula promoção, adicionais e quantidade em centavos sem confiar nos preços do cliente", () => {
  const q = quote([{ ...cart[0], price: 1, total: 1 }], [product], cat);
  assert.equal(q.subtotal, 2100);
  assert.equal(q.lines[0].unit, 1050);
});
test("mantém personalizações distintas como linhas separadas", () => {
  const q = quote(
    [...cart, { ...cart[0], selections: { g: ["b"] } }],
    [product],
    cat,
  );
  assert.equal(q.lines.length, 2);
  assert.equal(q.subtotal, 3900);
});
test("valida limites, duplicações, opções inexistentes e grupos removidos", () => {
  for (const selections of [
    { g: [] },
    { g: ["a", "a"] },
    { g: ["x"] },
    { g: ["a"], invalid: [] },
  ])
    assert.throws(() => quote([{ ...cart[0], selections }], [product], cat));
});
test("bloqueia produtos e categorias indisponíveis e quantidades inválidas", () => {
  for (const p of [
    { ...product, soldOut: true },
    { ...product, active: false },
  ])
    assert.throws(() => quote(cart, [p], cat));
  assert.throws(() => quote(cart, [product], [{ id: "c", active: false }]));
  for (const quantity of [-1, 0, 1.5, 100])
    assert.throws(() => quote([{ ...cart[0], quantity }], [product], cat));
});
test("recalcula entrega por bairro, fixa e a combinar sem presumir gratuidade", () => {
  assert.equal(
    checkout({ cart, customer }, [product], cat, config).total,
    2600,
  );
  assert.equal(
    checkout({ cart, customer }, [product], cat, {
      ...config,
      deliveryMode: "fixed",
    }).fee,
    400,
  );
  const pending = checkout({ cart, customer }, [product], cat, {
    ...config,
    deliveryMode: "pending",
  });
  assert.equal(pending.fee, null);
  assert.equal(pending.total, 2100);
  assert.match(pending.text, /Total parcial/);
  assert.throws(() =>
    checkout(
      { cart, customer: { ...customer, neighborhood: "Fora" } },
      [product],
      cat,
      config,
    ),
  );
});
test("valida retirada, pagamentos, troco e loja fechada", () => {
  assert.equal(
    checkout(
      { cart, customer: { ...customer, method: "pickup" } },
      [product],
      cat,
      config,
    ).fee,
    0,
  );
  for (const patch of [{ payment: "invalid" }, { change: 2000 }, { name: "" }])
    assert.throws(() =>
      checkout(
        { cart, customer: { ...customer, ...patch } },
        [product],
        cat,
        config,
      ),
    );
  assert.throws(() =>
    checkout({ cart, customer }, [product], cat, { ...config, mode: "closed" }),
  );
  assert.throws(() =>
    checkout(
      { cart, customer: { ...customer, change: 5000 } },
      [product],
      cat,
      { ...config, deliveryMode: "pending" },
    ),
  );
  assert.match(
    checkout(
      { cart, customer: { ...customer, change: 5000 } },
      [product],
      cat,
      config,
    ).text,
    /Troco para/,
  );
});
test("mensagem WhatsApp corresponde exatamente aos valores e texto revisados", () => {
  const q = checkout({ cart, customer }, [product], cat, config);
  assert.equal(new URL(q.url).searchParams.get("text"), q.text);
  assert.match(q.text, /2× Produto de teste/);
  assert.match(q.text, /26,00/);
  assert.match(q.text, /Observação de teste/);
  assert.match(q.text, /Extra teste/);
});
test("horários usam São Paulo, incluindo madrugada e pausa excepcional", () => {
  const c = {
    ...config,
    mode: "auto",
    hours: Array.from({ length: 7 }, () => ({
      enabled: false,
      open: "18:00",
      close: "23:00",
    })),
  };
  c.hours[5] = { enabled: true, open: "22:00", close: "02:00" };
  assert.equal(isOpen(c, new Date("2026-10-31T04:00:00Z")), true);
  assert.equal(isOpen(c, new Date("2026-10-31T06:00:00Z")), false);
  assert.equal(
    isOpen(
      { ...c, pauseUntil: "2026-11-01T00:00:00-03:00" },
      new Date("2026-10-31T04:00:00Z"),
    ),
    false,
  );
});
test("hash de senha tem salt individual e verifica corretamente", () => {
  const a = hashPassword("senha teste longa");
  assert.notEqual(a, hashPassword("senha teste longa"));
  assert.ok(verifyPassword("senha teste longa", a));
  assert.equal(verifyPassword("senha errada", a), false);
});
test("API: autorização, login, edição pública, upload, recálculo e persistência após reinício", async () => {
  const dir = mkdtempSync(join(tmpdir(), "juvenil-test-"));
  process.env.DATA_DIR = dir;
  process.env.UPLOAD_DIR = join(dir, "uploads");
  const { app } = await import("../server.js");
  const { db } = await import("../lib/db.js");
  db.prepare("INSERT INTO admins(email,hash) VALUES (?,?)").run(
    "admin@test.local",
    hashPassword("senha-segura-de-teste"),
  );
  let server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = "";
  const request = async (path, method = "GET", body, extra = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(cookie ? { Cookie: cookie } : {}),
        ...extra,
      },
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
    return response;
  };
  try {
    for (const [path, method, body] of [
      ["/api/admin/data", "GET"],
      ["/api/admin/settings", "PUT", config],
      ["/api/admin/categories/c", "PUT", {}],
      ["/api/admin/products/p", "PUT", product],
      ["/api/admin/upload", "POST"],
    ])
      assert.equal((await request(path, method, body)).status, 401);
    assert.equal(
      (
        await request("/api/admin/login", "POST", {
          email: "admin@test.local",
          password: "wrong",
        })
      ).status,
      401,
    );
    let response = await request("/api/admin/login", "POST", {
      email: "admin@test.local",
      password: "senha-segura-de-teste",
    });
    assert.equal(response.status, 200);
    cookie = response.headers.get("set-cookie").split(";")[0];
    assert.match(response.headers.get("set-cookie"), /HttpOnly/);
    assert.equal(
      (
        await request("/api/admin/categories/c", "PUT", {
          name: "Categoria teste",
          active: true,
          order: 0,
        })
      ).status,
      200,
    );
    assert.equal(
      (await request("/api/admin/products/p", "PUT", product)).status,
      200,
    );
    const current = (await (await request("/api/admin/data")).json()).config;
    assert.equal(
      (
        await request("/api/admin/settings", "PUT", {
          ...current,
          payments: [null],
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("/api/admin/products/p", "PUT", {
          ...product,
          groups: [null],
        })
      ).status,
      400,
    );
    assert.equal((await request("/api/quote", "POST", [])).status, 400);
    assert.equal(
      (
        await request("/api/admin/settings", "PUT", {
          ...current,
          ...config,
          hours: current.hours,
        })
      ).status,
      200,
    );
    const menu = await (await request("/api/menu")).json();
    assert.equal(menu.products[0].name, product.name);
    assert.equal(menu.open, true);
    const q = await (
      await request("/api/checkout", "POST", {
        cart,
        customer,
        subtotal: 1,
        total: 1,
      })
    ).json();
    assert.equal(q.total, 2600);
    assert.equal(new URL(q.url).searchParams.get("text"), q.text);
    assert.equal(
      (
        await request("/api/admin/products/p", "PUT", product, {
          Origin: "https://attacker.invalid",
        })
      ).status,
      403,
    );
    const form = new FormData();
    form.append(
      "image",
      new Blob(["<svg></svg>"], { type: "image/svg+xml" }),
      "bad.svg",
    );
    assert.notEqual(
      (await request("/api/admin/upload", "POST", form)).status,
      200,
    );
    const sharp = (await import("sharp")).default;
    const png = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "#ed701b" },
    })
      .png()
      .toBuffer();
    const valid = new FormData();
    valid.append("image", new Blob([png], { type: "image/png" }), "image.png");
    response = await request("/api/admin/upload", "POST", valid);
    assert.equal(response.status, 200);
    const uploaded = await response.json();
    assert.match(uploaded.url, /\.webp$/);
    assert.equal((await request(uploaded.url)).status, 200);
    const { seedExamples } = await import("../scripts/seed-examples.js");
    const settingsBeforeSeed = (await (await request("/api/menu")).json())
      .config;
    assert.equal(seedExamples(), 3);
    assert.equal(seedExamples(), 0);
    const example = (await (await request("/api/menu")).json()).products.find(
      (p) => p.id === "example-croissant",
    );
    assert.equal(example.demo, true);
    assert.equal(
      (
        await request("/api/admin/products/example-croissant", "PUT", {
          ...example,
          active: false,
          price: 1900,
        })
      ).status,
      200,
    );
    assert.equal(seedExamples(), 0);
    const seededAdmin = await (await request("/api/admin/data")).json();
    assert.equal(
      seededAdmin.products.find((p) => p.id === example.id).active,
      false,
    );
    assert.equal(
      seededAdmin.products.find((p) => p.id === example.id).price,
      1900,
    );
    assert.deepEqual(seededAdmin.config, settingsBeforeSeed);
    assert.equal((await request("/api/admin/logout", "POST", {})).status, 200);
    assert.equal((await request("/api/admin/data")).status, 401);
    await new Promise((r) => server.close(r));
    db.close();
    const child = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import {rows,config,db} from './lib/db.js'; console.log(JSON.stringify({products:rows('products'),config:config()})); db.close();",
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATA_DIR: dir },
        encoding: "utf8",
      },
    );
    assert.equal(child.status, 0, child.stderr);
    const persisted = JSON.parse(child.stdout);
    assert.equal(persisted.products[0].name, product.name);
    assert.equal(persisted.config.mode, "open");
  } finally {
    if (server.listening) await new Promise((r) => server.close(r));
    try {
      db.close();
    } catch {}
    rmSync(dir, { recursive: true, force: true });
  }
});
