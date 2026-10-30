export class ValidationError extends Error {}
export function check(ok, message) {
  if (!ok) throw new ValidationError(message);
}
export const money = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n / 100,
  );
export function isOpen(c, now = new Date()) {
  if (c.pauseUntil && new Date(c.pauseUntil) > now) return false;
  if (c.mode !== "auto") return c.mode === "open";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      parts.weekday,
    ),
    time = `${parts.hour}:${parts.minute}`,
    h = c.hours[day],
    prev = c.hours[(day + 6) % 7];
  return !!(
    (h?.enabled &&
      (h.close > h.open ? time >= h.open && time < h.close : time >= h.open)) ||
    (prev?.enabled && prev.close < prev.open && time < prev.close)
  );
}
export function quote(cart, products, categories) {
  check(
    Array.isArray(cart) && cart.length > 0 && cart.length <= 50,
    "Seu carrinho está vazio ou excede 50 itens.",
  );
  const lines = cart.map((item) => {
    check(
      item && typeof item === "object" && !Array.isArray(item),
      "Item inválido na sacola.",
    );
    const p = products.find((p) => p.id === item.productId);
    check(
      p &&
        p.active &&
        !p.soldOut &&
        categories.some((c) => c.id === p.categoryId && c.active),
      "Um produto está indisponível. Revise o carrinho.",
    );
    check(
      Number.isInteger(item.quantity) &&
        item.quantity >= 1 &&
        item.quantity <= 99,
      "Quantidade inválida.",
    );
    check(
      typeof (item.notes || "") === "string" &&
        (item.notes || "").length <= 500,
      "Observação muito longa.",
    );
    const selections = item.selections || {};
    check(
      selections &&
        typeof selections === "object" &&
        !Array.isArray(selections),
      "Opções inválidas.",
    );
    check(
      Object.keys(selections).every((id) => p.groups.some((g) => g.id === id)),
      "As opções mudaram. Revise este produto.",
    );
    let unit = p.promoPrice ?? p.price;
    const options = [];
    for (const g of p.groups) {
      const ids = selections[g.id] || [];
      check(
        Array.isArray(ids) &&
          new Set(ids).size === ids.length &&
          ids.length >= g.min &&
          ids.length <= g.max,
        `Escolha de ${g.min} a ${g.max} opções em ${g.name}.`,
      );
      for (const id of ids) {
        const o = g.options.find((o) => o.id === id);
        check(o, "Uma opção não está mais disponível.");
        unit += o.price;
        options.push({ name: o.name, price: o.price });
      }
    }
    return {
      productId: p.id,
      name: p.name,
      quantity: item.quantity,
      selections,
      notes: item.notes || "",
      options,
      unit,
      total: unit * item.quantity,
    };
  });
  return { lines, subtotal: lines.reduce((s, i) => s + i.total, 0) };
}
export function checkout(body, products, categories, c) {
  check(
    isOpen(c),
    "A lanchonete está fechada. A finalização está indisponível.",
  );
  const q = quote(body.cart, products, categories),
    customer = body.customer || {};
  const str = (key, max = 160) => {
    check(
      typeof customer[key] === "string" &&
        customer[key].trim().length > 0 &&
        customer[key].length <= max,
      `Preencha ${key} corretamente.`,
    );
    return customer[key].trim();
  };
  const name = str("name", 100);
  check(
    ["pickup", "delivery"].includes(customer.method),
    "Escolha entrega ou retirada.",
  );
  let fee = 0,
    address = "";
  if (customer.method === "pickup") {
    check(c.pickup && c.address, "Retirada ainda não configurada.");
    address = c.address;
  } else {
    check(c.delivery, "Entrega indisponível.");
    const street = str("street"),
      number = str("number", 30),
      neighborhood = str("neighborhood", 100);
    const area = c.neighborhoods.find(
      (n) =>
        n.name.toLocaleLowerCase("pt-BR") ===
        neighborhood.toLocaleLowerCase("pt-BR"),
    );
    check(area, "Bairro fora da área atendida.");
    fee =
      c.deliveryMode === "pending"
        ? null
        : c.deliveryMode === "fixed"
          ? c.fixedFee
          : area.fee;
    address = `${street}, ${number} — ${area.name}`;
    for (const key of ["complement", "reference"]) {
      check(
        !customer[key] ||
          (typeof customer[key] === "string" && customer[key].length <= 200),
        "Complemento ou referência inválidos.",
      );
      if (customer[key])
        address += `\n${key === "complement" ? "Complemento" : "Referência"}: ${customer[key]}`;
    }
  }
  const payment = c.payments.find((p) => p.id === customer.payment);
  check(payment, "Escolha uma forma de pagamento disponível.");
  const total = q.subtotal + (fee ?? 0);
  let change = "";
  if (payment.cash && customer.change) {
    check(
      fee !== null,
      "Combine o troco pelo WhatsApp enquanto a taxa estiver pendente.",
    );
    check(
      Number.isSafeInteger(customer.change) &&
        customer.change >= total &&
        customer.change <= 10000000,
      "O valor para troco deve ser maior ou igual ao total.",
    );
    change = `\nTroco para: ${money(customer.change)}`;
  }
  const text = [
    `*Pedido • ${c.name}*`,
    `Cliente: ${name}`,
    customer.method === "delivery" ? "Entrega" : "Retirada",
    address,
    "",
    ...q.lines.map(
      (i) =>
        `${i.quantity}× ${i.name} — ${money(i.total)}${i.options.length ? "\n  " + i.options.map((o) => `${o.name} (+${money(o.price)})`).join(", ") : ""}${i.notes ? "\n  Obs.: " + i.notes : ""}`,
    ),
    "",
    `Subtotal: ${money(q.subtotal)}`,
    `Taxa: ${fee === null ? "a combinar pelo WhatsApp" : money(fee)}`,
    `${fee === null ? "Total parcial" : "Total"}: ${money(total)}`,
    `Pagamento: ${payment.name}${change}`,
    "",
    "Envie esta mensagem e aguarde a confirmação da lanchonete.",
  ].join("\n");
  return {
    ...q,
    fee,
    total,
    partial: fee === null,
    text,
    url: `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(text)}`,
  };
}
