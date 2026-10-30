import { resolve, relative, isAbsolute } from "node:path";

export function readRuntime(env = process.env) {
  const production = env.NODE_ENV === "production";
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT deve ser um número entre 1 e 65535.");
  if (production && !env.PUBLIC_ORIGIN)
    throw new Error(
      "Configure PUBLIC_ORIGIN com o domínio HTTPS antes de iniciar em produção.",
    );
  let origin;
  try {
    const url = new URL(env.PUBLIC_ORIGIN || `http://localhost:${port}`);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error();
    if (production && url.protocol !== "https:") throw new Error();
    origin = url.origin;
  } catch {
    throw new Error(
      "PUBLIC_ORIGIN deve ser uma origem válida, sem caminho; use HTTPS em produção.",
    );
  }
  if (
    env.COOKIE_SECURE !== undefined &&
    !["true", "false"].includes(env.COOKIE_SECURE)
  )
    throw new Error("COOKIE_SECURE deve ser true ou false.");
  const cookieSecure =
    env.COOKIE_SECURE === undefined ? production : env.COOKIE_SECURE === "true";
  if (production && !cookieSecure)
    throw new Error(
      "Cookies seguros são obrigatórios em produção. Defina COOKIE_SECURE=true.",
    );
  const proxyHops = Number(env.TRUST_PROXY_HOPS || 0);
  if (![0, 1].includes(proxyHops))
    throw new Error(
      "TRUST_PROXY_HOPS deve ser 0 (direto) ou 1 (um proxy confiável).",
    );
  const dataDir = resolve(env.DATA_DIR || "data");
  const uploadDir = resolve(env.UPLOAD_DIR || "uploads");
  const backupDir = resolve(env.BACKUP_DIR || "backups");
  const within = (parent, child) => {
    const path = relative(parent, child);
    return path === "" || (!path.startsWith("..") && !isAbsolute(path));
  };
  if (
    within(uploadDir, dataDir) ||
    within(uploadDir, backupDir) ||
    within(resolve("public"), dataDir) ||
    within(resolve("public"), backupDir)
  )
    throw new Error(
      "Separe os diretórios privados de banco e backup dos arquivos públicos e uploads.",
    );
  return {
    production,
    port,
    origin,
    cookieSecure,
    proxyHops,
    host: env.HOST || (production ? "0.0.0.0" : "127.0.0.1"),
    dataDir,
    uploadDir,
    backupDir,
  };
}

export const runtime = readRuntime();
