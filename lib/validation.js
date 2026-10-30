import { check } from "./domain.js";
const string = (s, max = 200) =>
  typeof s === "string" && s.trim().length > 0 && s.length <= max;
const cents = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 10000000;
export function category(v) {
  check(
    string(v.name, 80) &&
      typeof v.active === "boolean" &&
      Number.isInteger(v.order),
    "Categoria inválida.",
  );
  return { id: v.id, name: v.name.trim(), active: v.active, order: v.order };
}
export function product(v, categories) {
  check(
    string(v.name, 100) &&
      typeof v.description === "string" &&
      v.description.length <= 1000 &&
      cents(v.price) &&
      Number.isInteger(v.order),
    "Produto inválido.",
  );
  check(
    categories.some((c) => c.id === v.categoryId),
    "Selecione uma categoria.",
  );
  check(
    v.promoPrice === null || (cents(v.promoPrice) && v.promoPrice < v.price),
    "Promoção deve ser inferior ao preço.",
  );
  check(
    ["active", "soldOut", "featured"].every((k) => typeof v[k] === "boolean"),
    "Disponibilidade inválida.",
  );
  check(
    !v.image ||
      /^\/uploads\/[a-f0-9-]+\.webp$/.test(v.image) ||
      /^\/assets\/products\/(croissant|hamburguer|suco)\.webp$/.test(v.image),
    "Imagem inválida.",
  );
  check(Array.isArray(v.groups) && v.groups.length <= 15, "Grupos inválidos.");
  check(
    v.demo === undefined || typeof v.demo === "boolean",
    "Identificação de demonstração inválida.",
  );
  const groupIds = new Set();
  for (const g of v.groups) {
    check(
      string(g.id, 80) &&
        !groupIds.has(g.id) &&
        string(g.name, 100) &&
        Array.isArray(g.options) &&
        g.options.length <= 30,
      "Grupo inválido.",
    );
    groupIds.add(g.id);
    check(
      Number.isInteger(g.min) &&
        Number.isInteger(g.max) &&
        g.min >= 0 &&
        g.max >= g.min &&
        g.max <= g.options.length,
      "Limites de seleção inválidos.",
    );
    const ids = new Set();
    for (const o of g.options) {
      check(
        string(o.id, 80) &&
          !ids.has(o.id) &&
          string(o.name, 100) &&
          cents(o.price),
        "Adicional inválido.",
      );
      ids.add(o.id);
    }
  }
  return Object.fromEntries(
    [
      "id",
      "name",
      "description",
      "price",
      "promoPrice",
      "categoryId",
      "order",
      "active",
      "soldOut",
      "featured",
      "image",
      "groups",
      "demo",
    ].map((k) => [k, v[k]]),
  );
}
export function settings(v) {
  check(
    string(v.name, 100) &&
      /^\d{10,15}$/.test(v.whatsapp) &&
      typeof v.address === "string" &&
      v.address.length <= 300,
    "Nome, WhatsApp ou endereço inválido.",
  );
  check(
    ["open", "closed", "auto"].includes(v.mode) &&
      ["pending", "fixed", "neighborhood"].includes(v.deliveryMode) &&
      cents(v.fixedFee),
    "Funcionamento ou entrega inválidos.",
  );
  check(
    typeof v.pickup === "boolean" && typeof v.delivery === "boolean",
    "Entrega e retirada inválidas.",
  );
  check(
    !v.pauseUntil ||
      (!isNaN(Date.parse(v.pauseUntil)) &&
        /(Z|[+-]\d\d:\d\d)$/.test(v.pauseUntil)),
    "Pausa deve incluir fuso, por exemplo -03:00.",
  );
  check(
    Array.isArray(v.hours) &&
      v.hours.length === 7 &&
      v.hours.every(
        (h) =>
          typeof h.enabled === "boolean" &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(h.open) &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(h.close) &&
          h.open !== h.close,
      ),
    "Horários inválidos.",
  );
  check(
    Array.isArray(v.neighborhoods) &&
      v.neighborhoods.length <= 200 &&
      v.neighborhoods.every((n) => string(n.name, 100) && cents(n.fee)) &&
      new Set(v.neighborhoods.map((n) => n.name.trim().toLowerCase())).size ===
        v.neighborhoods.length,
    "Bairros inválidos ou duplicados.",
  );
  check(
    Array.isArray(v.payments) &&
      v.payments.length <= 20 &&
      v.payments.every(
        (p) =>
          string(p.id, 80) && string(p.name, 80) && typeof p.cash === "boolean",
      ) &&
      new Set(v.payments.map((p) => p.id)).size === v.payments.length,
    "Pagamentos inválidos.",
  );
  check(
    !v.logo || /^\/uploads\/[a-f0-9-]+\.webp$/.test(v.logo),
    "Logo inválida.",
  );
  check(
    !v.instagram ||
      /^https:\/\/(www\.)?instagram\.com\/[\w.\/-]+$/.test(v.instagram),
    "Use uma URL válida do Instagram.",
  );
  check(
    ["prep", "deliveryEstimate"].every(
      (k) => typeof v[k] === "string" && v[k].length <= 120,
    ),
    "Prazo inválido.",
  );
  return v;
}
