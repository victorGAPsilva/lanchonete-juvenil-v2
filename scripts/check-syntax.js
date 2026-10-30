import { readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const files = ["server.js"];
function visit(folder) {
  for (const item of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, item.name);
    if (item.isDirectory()) visit(path);
    else if (item.name.endsWith(".js")) files.push(path);
  }
}
for (const folder of ["lib", "public", "scripts", "tests"]) visit(folder);
for (const file of files)
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
console.log(`Sintaxe aprovada em ${files.length} módulos JavaScript.`);
