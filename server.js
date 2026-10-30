import express from "express";
import multer from "multer";
import sharp from "sharp";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { db, config, rows, put } from "./lib/db.js";
import { verifyPassword, digest, hashPassword } from "./lib/security.js";
import {
  check,
  ValidationError,
  isOpen,
  quote,
  checkout,
} from "./lib/domain.js";
import { category, product, settings } from "./lib/validation.js";
export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", false);
const uploadDir = resolve(process.env.UPLOAD_DIR || "uploads");
mkdirSync(uploadDir, { recursive: true });
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy":
      "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  });
  if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    if (
      origin &&
      origin !==
        (process.env.PUBLIC_ORIGIN ||
          `http://localhost:${process.env.PORT || 3000}`)
    )
      return res.status(403).json({ error: "Origem não autorizada." });
  }
  next();
});
app.use(express.json({ limit: "256kb" }));
const counts = new Map();
function limit(req, res, next) {
  const key = req.socket.remoteAddress,
    now = Date.now();
  let r = counts.get(key);
  if (!r || r.until < now) {
    r = { n: 0, until: now + 15 * 60000 };
    counts.set(key, r);
  }
  if (++r.n > 20)
    return res
      .status(429)
      .json({ error: "Muitas tentativas. Aguarde 15 minutos." });
  next();
}
const dummyHash = hashPassword(randomBytes(32).toString("hex"));
function auth(req, res, next) {
  const token = /(?:^|; )juvenil=([a-f0-9]+)/.exec(
    req.headers.cookie || "",
  )?.[1];
  const s =
    token &&
    db
      .prepare("SELECT * FROM sessions WHERE token=? AND expires>?")
      .get(digest(token), Date.now());
  if (!s)
    return res.status(401).json({ error: "Entre no painel para continuar." });
  req.admin = s.admin_id;
  next();
}
app.get("/api/menu", (req, res) => {
  const c = config();
  res.json({
    config: c,
    open: isOpen(c),
    categories: rows("categories").filter((c) => c.active),
    products: rows("products").filter((p) => p.active),
  });
});
app.post("/api/quote", (req, res) =>
  res.json(quote(req.body.cart, rows("products"), rows("categories"))),
);
app.post("/api/checkout", (req, res) =>
  res.json(checkout(req.body, rows("products"), rows("categories"), config())),
);
app.post("/api/admin/login", limit, (req, res) => {
  const { email, password } = req.body;
  check(
    typeof email === "string" &&
      typeof password === "string" &&
      password.length <= 200,
    "Credenciais inválidas.",
  );
  const a = db
    .prepare("SELECT * FROM admins WHERE email=?")
    .get(email.trim().toLowerCase());
  const valid = verifyPassword(password, a?.hash || dummyHash);
  if (!a || !valid)
    return res.status(401).json({ error: "E-mail ou senha incorretos." });
  const token = randomBytes(32).toString("hex");
  db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
    digest(token),
    a.id,
    Date.now() + 8 * 3600000,
  );
  res
    .cookie("juvenil", token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "strict",
      maxAge: 8 * 3600000,
      path: "/",
    })
    .json({ ok: true });
});
app.use("/api/admin", auth);
app.post("/api/admin/logout", (req, res) => {
  const token = /(?:^|; )juvenil=([a-f0-9]+)/.exec(
    req.headers.cookie || "",
  )?.[1];
  if (token)
    db.prepare("DELETE FROM sessions WHERE token=?").run(digest(token));
  res.clearCookie("juvenil", { path: "/" }).json({ ok: true });
});
app.get("/api/admin/data", (req, res) =>
  res.json({
    config: config(),
    categories: rows("categories"),
    products: rows("products"),
  }),
);
app.put("/api/admin/settings", (req, res) => {
  const v = settings(req.body);
  db.prepare("UPDATE config SET value=? WHERE id=1").run(JSON.stringify(v));
  res.json({ ok: true });
});
for (const table of ["categories", "products"])
  app.put(`/api/admin/${table}/:id`, (req, res) => {
    check(/^[\w-]{1,80}$/.test(req.params.id), "Identificador inválido.");
    const input = { ...req.body, id: req.params.id };
    const v =
      table === "categories"
        ? category(input)
        : product(input, rows("categories"));
    put(table, v.id, v);
    res.json(v);
  });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
app.post("/api/admin/upload", upload.single("image"), async (req, res) => {
  check(req.file, "Selecione uma imagem de até 5 MB.");
  const b = req.file.buffer;
  const raster =
    b.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    (b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP");
  check(raster, "Use JPG, PNG ou WebP.");
  const name = `${randomUUID()}.webp`;
  try {
    const processor = sharp(b, { limitInputPixels: 25000000, animated: false });
    const meta = await processor.metadata();
    check(
      ["jpeg", "png", "webp"].includes(meta.format),
      "Use JPG, PNG ou WebP.",
    );
    await processor
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toFile(resolve(uploadDir, name));
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    throw new ValidationError(
      "Imagem inválida ou acima de 25 milhões de pixels.",
    );
  }
  res.json({ url: `/uploads/${name}` });
});
app.use(
  "/uploads",
  express.static(uploadDir, {
    dotfiles: "deny",
    immutable: true,
    maxAge: "1y",
  }),
);
app.use(express.static("public"));
app.get("/admin", (req, res) => res.sendFile(resolve("public/admin.html")));
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Rota não encontrada." }),
);
app.use((err, req, res, next) => {
  if (!(err instanceof ValidationError) && !err.status && !err.code)
    console.error(err);
  res
    .status(
      err instanceof ValidationError
        ? 400
        : err.status || (err.code === "LIMIT_FILE_SIZE" && 400) || 500,
    )
    .json({
      error:
        err instanceof ValidationError
          ? err.message
          : err.code === "LIMIT_FILE_SIZE"
            ? "A imagem excede 5 MB."
            : "Não foi possível concluir. Verifique os dados e tente novamente.",
    });
});
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  app.listen(
    Number(process.env.PORT || 3000),
    process.env.HOST || "127.0.0.1",
    () =>
      console.log(
        `Lanchonete Juvenil: http://localhost:${process.env.PORT || 3000}`,
      ),
  );
