import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { db } from "../lib/db.js";
import { hashPassword } from "../lib/security.js";
let muted = false;
const output = new Writable({
  write(chunk, encoding, done) {
    if (!muted) process.stdout.write(chunk);
    done();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: true });
try {
  const email = (await rl.question("E-mail do administrador: "))
    .trim()
    .toLowerCase();
  process.stdout.write("Senha (mínimo de 12 caracteres, oculta): ");
  muted = true;
  const password = await rl.question("");
  muted = false;
  process.stdout.write("\n");
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 12 ||
    password.length > 200
  )
    throw new Error(
      "E-mail inválido ou senha fora do limite de 12 a 200 caracteres.",
    );
  db.prepare("INSERT INTO admins(email,hash) VALUES (?,?)").run(
    email,
    hashPassword(password),
  );
  console.log("Administrador criado. Acesse /admin.");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  rl.close();
  db.close();
}
