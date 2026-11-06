import {
  $,
  esc,
  money,
  api,
  json,
  toast,
  cents,
  renderLogo,
} from "./shared.js";
import { renderCarousel } from "./carousel.js";
let data,
  category = "all",
  cart = [],
  editing = -1,
  quoteData = null,
  review = null,
  customerDraft = { method: "pickup" };
try {
  const stored = JSON.parse(localStorage.getItem("juvenil-cart") || "[]");
  if (Array.isArray(stored))
    cart = stored
      .slice(0, 50)
      .filter(
        (i) =>
          i &&
          typeof i.productId === "string" &&
          Number.isInteger(i.quantity) &&
          i.quantity > 0 &&
          i.quantity <= 99,
      );
} catch {}
const persist = () => {
  try {
    localStorage.setItem("juvenil-cart", JSON.stringify(cart));
  } catch {
    toast("Seu navegador não permitiu salvar a sacola.");
  }
  updateCount();
};
function updateCount() {
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  $("#count").textContent = count;
  $("#cart-summary").textContent = `${count} ${count === 1 ? "item" : "itens"}`;
  $("#cart-bottom").classList.toggle("visible", count > 0);
}
async function load() {
  try {
    data = await api("/api/menu");
    render();
  } catch (e) {
    $("#products").innerHTML =
      `<div class="empty"><strong>Não foi possível carregar.</strong><p>${esc(e.message)}</p><button id="retry">Tentar novamente</button></div>`;
    $("#retry").onclick = load;
    $("#status").textContent = "Sem conexão";
  }
}
function render() {
  const c = data.config;
  document.title = `${c.name} • Cardápio`;
  if (!data.categories.some((c) => c.id === category)) category = "all";
  $("#status").textContent = data.open ? "Aberto agora" : "Fechado agora";
  $("#status").classList.toggle("open", data.open);
  renderLogo(c.logo, c.name);
  $("#address").textContent = c.address || "Endereço ainda não informado.";
  $("#social").hidden = !c.instagram;
  if (c.instagram) {
    $("#social").hidden = false;
    $("#social").href = c.instagram;
    $("#social").target = "_blank";
    $("#social").rel = "noopener";
  }
  $("#service-info").innerHTML = [
    !data.open ? "◷ Fechado • consulte o cardápio" : `● Recebendo pedidos`,
    c.pickup ? "↗ Retirada no local" : "",
    c.delivery ? "↗ Entrega nos bairros atendidos" : "",
    c.prep ? `Preparo: ${esc(c.prep)}` : "",
    c.deliveryEstimate ? `Entrega: ${esc(c.deliveryEstimate)}` : "",
  ]
    .filter(Boolean)
    .map((t) => `<span>${t}</span>`)
    .join("");
  $("#categories").innerHTML = [
    { id: "all", name: "Todos" },
    ...data.categories,
  ]
    .map(
      (c) =>
        `<button data-category="${esc(c.id)}" class="${category === c.id ? "active" : ""}" aria-pressed="${category === c.id}">${esc(c.name)}</button>`,
    )
    .join("");
  renderProducts();
  renderCarousel(data);
}
$("#product-carousel").addEventListener("click", (event) => {
  const button = event.target.closest("[data-carousel-product]");
  if (button) openProduct(button.dataset.carouselProduct);
});
function renderProducts() {
  const term = $("#search").value.trim().toLocaleLowerCase("pt-BR");
  const availableProducts = data.products.filter((p) =>
    data.categories.some((c) => c.id === p.categoryId),
  );
  const ps = availableProducts.filter(
    (p) =>
      (category === "all" || p.categoryId === category) &&
      `${p.name} ${p.description}`.toLocaleLowerCase("pt-BR").includes(term),
  );
  $("#menu-count").textContent =
    `${ps.length} ${ps.length === 1 ? "produto" : "produtos"}`;
  const emptyCategory = category !== "all" && availableProducts.length > 0;
  $("#products").innerHTML = ps.length
    ? ps
        .map(
          (p, index) =>
            `<article class="product ${p.soldOut ? "sold" : ""}"><span class="product-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><div class="product-copy">${p.demo ? `<span class="badge">Exemplo fictício</span> ` : ""}${p.soldOut ? '<span class="badge">Esgotado</span>' : p.promoPrice !== null ? '<span class="badge badge-promo">Em promoção</span>' : p.featured ? '<span class="badge">Destaque</span>' : ""}<h3>${esc(p.name)}</h3><p>${esc(p.description)}</p></div><div class="product-photo">${p.image ? `<img loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}">` : '<div class="placeholder" aria-label="Produto sem foto">⌑</div>'}</div><div class="product-order"><span class="price">${p.promoPrice !== null ? `<del>${money(p.price)}</del>` : ""}${money(p.promoPrice ?? p.price)}</span><button class="add" data-product="${esc(p.id)}" ${p.soldOut ? "disabled" : ""} aria-label="Personalizar ${esc(p.name)}">${p.soldOut ? "Esgotado" : 'Adicionar <span aria-hidden="true">↗</span>'}</button></div></article>`,
        )
        .join("")
    : `<div class="empty"><strong>${term ? "Nenhum lanche por aqui." : emptyCategory ? "Nenhum produto nesta categoria." : "O cardápio está sendo preparado."}</strong>${term ? "Tente outro nome ou descrição." : emptyCategory ? "Escolha outra categoria para conhecer os produtos disponíveis." : "Em breve, os produtos estarão disponíveis neste espaço."}</div>`;
}
document.addEventListener(
  "error",
  (event) => {
    const img = event.target;
    if (img.tagName !== "IMG") return;
    const placeholder = document.createElement("div");
    placeholder.className = "placeholder";
    placeholder.setAttribute("aria-label", "Imagem indisponível");
    placeholder.textContent = "⌑";
    img.replaceWith(placeholder);
  },
  true,
);
$("#search").oninput = () => data && renderProducts();
$("#categories").onclick = (e) => {
  const b = e.target.closest("[data-category]");
  if (b) {
    category = b.dataset.category;
    render();
  }
};
$("#products").onclick = (e) => {
  const b = e.target.closest("[data-product]");
  if (b) openProduct(b.dataset.product);
};
function openProduct(id, index = -1) {
  const p = data.products.find((p) => p.id === id);
  if (!p || p.soldOut) return toast("Produto indisponível.");
  editing = index;
  const old = cart[index],
    d = $("#product-dialog");
  d.innerHTML = `<button class="close" data-close aria-label="Fechar">×</button><h2 id="product-title">${esc(p.name)}</h2><p class="muted">${esc(p.description)}</p><form id="product-form">${p.groups.map((g) => `<fieldset><legend>${esc(g.name)}</legend><small>${g.min ? "Obrigatório" : "Opcional"} · escolha de ${g.min} a ${g.max}</small>${g.options.map((o) => `<label class="option"><input type="checkbox" name="${esc(g.id)}" value="${esc(o.id)}" ${(old?.selections?.[g.id] || []).includes(o.id) ? "checked" : ""}>${esc(o.name)} <span class="small">+ ${money(o.price)}</span></label>`).join("")}</fieldset>`).join("")}<label class="field">Quantidade<input type="number" name="quantity" min="1" max="99" required value="${old?.quantity || 1}"></label><label class="field">Observações<textarea name="notes" maxlength="500" placeholder="Algum detalhe para o seu lanche?">${esc(old?.notes || "")}</textarea></label><p class="error" id="product-error" role="alert"></p><button class="primary wide" id="add-product">${index >= 0 ? "Salvar alterações" : "Adicionar à sacola"}</button></form>`;
  const form = $("#product-form");
  function calc() {
    let unit = p.promoPrice ?? p.price;
    for (const g of p.groups)
      for (const o of g.options)
        if (
          [...form.elements].some(
            (el) => el.name === g.id && el.value === o.id && el.checked,
          )
        )
          unit += o.price;
    $("#add-product").textContent =
      `${index >= 0 ? "Salvar alterações" : "Adicionar à sacola"} • ${money(unit * Number(form.elements.quantity.value || 1))}`;
  }
  form.oninput = calc;
  calc();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const saveButton = $("#add-product");
    saveButton.disabled = true;
    const selections = {};
    for (const g of p.groups)
      selections[g.id] = [...form.elements]
        .filter((el) => el.name === g.id && el.checked)
        .map((el) => el.value);
    const item = {
      productId: id,
      quantity: Number(form.elements.quantity.value),
      notes: form.elements.notes.value.trim(),
      selections,
    };
    try {
      const q = await api("/api/quote", json("POST", { cart: [item] }));
      item.lastUnit = q.lines[0].unit;
      item.lastName = p.name;
      const next = [...cart];
      if (editing >= 0) next[editing] = item;
      else {
        const equal = next.find(
          (i) =>
            i.productId === id &&
            i.notes === item.notes &&
            JSON.stringify(i.selections) === JSON.stringify(selections),
        );
        if (equal) {
          if (equal.quantity + item.quantity > 99)
            throw new Error("Limite de 99 unidades por item.");
          equal.quantity += item.quantity;
        } else next.push(item);
      }
      cart = next;
      persist();
      d.close();
      if ($("#cart-dialog").open) openCart();
      toast("Sacola atualizada.");
    } catch (e) {
      $("#product-error").textContent = e.message;
    } finally {
      saveButton.disabled = false;
    }
  };
  d.showModal();
}
function captureCustomer() {
  const form = $("#checkout-form");
  if (!form) return;
  for (const [key, value] of new FormData(form)) customerDraft[key] = value;
}
async function openCart() {
  const d = $("#cart-dialog");
  if (!d.open) d.showModal();
  d.innerHTML =
    '<button class="close" data-close aria-label="Fechar">×</button><h2>Sua sacola</h2><p>Atualizando preços e disponibilidade…</p>';
  review = null;
  try {
    data = await api("/api/menu");
    render();
    if (!cart.length) {
      d.innerHTML =
        '<button class="close" data-close aria-label="Fechar">×</button><h2>Sua sacola</h2><div class="empty"><strong>Ainda falta o seu lanche.</strong>Escolha um produto no cardápio para começar.</div>';
      return;
    }
    let error = "";
    try {
      quoteData = await api("/api/quote", json("POST", { cart }));
    } catch (e) {
      quoteData = null;
      error = e.message;
    }
    const c = data.config,
      lines = quoteData?.lines;
    const changed = lines?.some(
      (l, i) => cart[i].lastUnit !== undefined && cart[i].lastUnit !== l.unit,
    );
    d.innerHTML = `<button class="close" data-close aria-label="Fechar">×</button><h2>Sua sacola <span class="small">${cart.length} ${cart.length === 1 ? "item" : "itens"}</span></h2>${error ? `<p class="error" role="alert">${esc(error)} Edite ou remova o item indisponível.</p>` : ""}${changed ? '<p class="notice">Os preços foram atualizados. Confira os novos valores antes de continuar.</p>' : ""}${cart
      .map((i, index) => {
        const p = data.products.find((p) => p.id === i.productId),
          l = lines?.[index];
        return `<div class="cart-line"><div class="cart-line-head"><strong>${i.quantity}× ${esc(l?.name || p?.name || i.lastName || "Produto indisponível")}</strong><span>${l ? money(l.total) : "Revisar"}</span></div><p>${l ? esc(l.options.map((o) => o.name).join(", ")) : ""}</p><p>${esc(i.notes)}</p><div class="cart-actions"><button type="button" data-edit="${index}">Editar</button><button type="button" data-remove="${index}">Remover</button></div></div>`;
      })
      .join(
        "",
      )}${quoteData ? `<div class="totals"><div><span>Subtotal</span><strong>${money(quoteData.subtotal)}</strong></div><p class="small">A taxa de entrega será exibida na revisão.</p></div>` : ""}${!data.open ? '<p class="notice">A lanchonete está fechada. Você pode consultar o cardápio e montar a sacola. A finalização estará disponível quando abrir.</p>' : ""}${!c.payments.length ? `<p class="notice">As formas de pagamento ainda não foram cadastradas. Aguarde a configuração da lanchonete para finalizar.</p>` : ""}<form id="checkout-form"><label class="field">Seu nome<input name="name" autocomplete="name" maxlength="100" required value="${esc(customerDraft.name || "")}"></label><label class="field">Como você quer receber?<select name="method">${c.pickup ? '<option value="pickup">Retirar no local</option>' : ""}${c.delivery ? '<option value="delivery">Entrega</option>' : ""}</select></label><div id="delivery-fields"></div><label class="field">Forma de pagamento<select name="payment" required><option value="">Selecione</option>${c.payments.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}</select></label><div id="change-field"></div><p class="small">Pagamento combinado pelo WhatsApp. Nenhuma cobrança é feita neste site.</p><p id="checkout-error" class="error" role="alert"></p><button class="primary wide" ${!data.open || !quoteData || !c.payments.length || (!c.pickup && !c.delivery) ? "disabled" : ""}>Revisar pedido</button></form>`;
    const form = $("#checkout-form");
    form.elements.method.value = customerDraft.method;
    if (!form.elements.method.value) form.elements.method.selectedIndex = 0;
    form.elements.payment.value = customerDraft.payment || "";
    const totals = document.createElement("div");
    totals.className = "totals";
    totals.setAttribute("aria-live", "polite");
    $("#change-field").after(totals);
    function updateCartTotals() {
      if (!quoteData) return;
      const delivery = form.elements.method.value === "delivery";
      const area = c.neighborhoods.find(
        (n) => n.name === form.elements.neighborhood?.value,
      );
      const fee = !delivery
        ? 0
        : c.deliveryMode === "pending"
          ? null
          : c.deliveryMode === "fixed"
            ? c.fixedFee
            : (area?.fee ?? null);
      totals.innerHTML = `<div><span>${delivery ? "Entrega" : "Retirada"}</span><span>${fee === null ? (c.deliveryMode === "pending" ? "Taxa a combinar pelo WhatsApp" : "Selecione o bairro") : money(fee)}</span></div><div class="total"><span>${fee === null ? "Total parcial" : "Total"}</span><span>${money(quoteData.subtotal + (fee ?? 0))}</span></div><p class="small">Valores revalidados no servidor ao revisar.</p>`;
    }
    function deliveryFields() {
      captureCustomer();
      if (form.elements.method.value === "pickup") {
        $("#delivery-fields").innerHTML =
          `<p class="notice">Retirada: ${esc(c.address || "Endereço ainda não configurado.")}</p>`;
        return;
      }
      $("#delivery-fields").innerHTML =
        `<p class="notice">${c.deliveryMode === "pending" ? "Taxa a combinar pelo WhatsApp. O total será parcial." : c.deliveryMode === "fixed" ? `Taxa de entrega: ${money(c.fixedFee)}` : "A taxa depende do bairro selecionado."}</p>${[
          ["street", "Rua", "street-address"],
          ["number", "Número", "off"],
        ]
          .map(
            ([key, label, ac]) =>
              `<label class="field">${label}<input name="${key}" required maxlength="160" autocomplete="${ac}" value="${esc(customerDraft[key] || "")}"></label>`,
          )
          .join(
            "",
          )}<label class="field">Bairro atendido<select name="neighborhood" required><option value="">Selecione seu bairro</option>${c.neighborhoods.map((n) => `<option value="${esc(n.name)}">${esc(n.name)}${c.deliveryMode === "neighborhood" ? ` • ${money(n.fee)}` : ""}</option>`).join("")}</select></label>${[
          ["complement", "Complemento (opcional)"],
          ["reference", "Referência (opcional)"],
        ]
          .map(
            ([key, label]) =>
              `<label class="field">${label}<input name="${key}" maxlength="200" value="${esc(customerDraft[key] || "")}"></label>`,
          )
          .join("")}`;
      form.elements.neighborhood.value = customerDraft.neighborhood || "";
    }
    function changeField() {
      const p = c.payments.find((p) => p.id === form.elements.payment.value);
      $("#change-field").innerHTML = p?.cash
        ? '<label class="field">Troco para (opcional, em R$)<input name="change" type="number" min="0.01" max="100000" step="0.01" placeholder="Ex.: 50,00"></label>'
        : "";
    }
    deliveryFields();
    changeField();
    updateCartTotals();
    form.elements.method.onchange = () => {
      deliveryFields();
      updateCartTotals();
    };
    form.addEventListener("change", updateCartTotals);
    form.elements.payment.onchange = changeField;
    form.onsubmit = async (e) => {
      e.preventDefault();
      captureCustomer();
      const customer = {
        ...Object.fromEntries(new FormData(form)),
        change: form.elements.change?.value
          ? cents(form.elements.change.value)
          : null,
      };
      try {
        const result = await api(
          "/api/checkout",
          json("POST", { cart, customer }),
        );
        review = { result, customer };
        showReview();
      } catch (e) {
        $("#checkout-error").textContent = e.message;
      }
    };
    d.onclick = (e) => {
      const remove = e.target.closest("[data-remove]"),
        edit = e.target.closest("[data-edit]");
      if (remove) {
        captureCustomer();
        cart.splice(Number(remove.dataset.remove), 1);
        persist();
        openCart();
      }
      if (edit) {
        captureCustomer();
        const i = Number(edit.dataset.edit);
        openProduct(cart[i].productId, i);
      }
    };
  } catch (e) {
    d.innerHTML = `<button class="close" data-close aria-label="Fechar">×</button><h2>Não foi possível atualizar</h2><p class="error">${esc(e.message)}</p><button id="retry-cart">Tentar novamente</button>`;
    $("#retry-cart").onclick = openCart;
  }
}
function showReview(updated = false) {
  const d = $("#cart-dialog"),
    { result } = review;
  d.onclick = null;
  d.innerHTML = `<button class="close" data-close aria-label="Fechar">×</button><h2>Confira seu pedido</h2>${updated ? '<p class="notice">O pedido mudou desde a última revisão. Confira os valores atualizados e continue novamente.</p>' : ""}<pre class="review-text">${esc(result.text)}</pre><p class="notice">Envie a mensagem no WhatsApp e aguarde a confirmação da lanchonete. Abrir a conversa não envia nem confirma o pedido.</p><p id="review-error" class="error" role="alert"></p><button id="send-whatsapp" class="primary wide">Continuar no WhatsApp</button><button id="copy-order" class="wide">Copiar texto do pedido</button><button id="back-cart" class="wide">Voltar à sacola</button>`;
  $("#back-cart").onclick = openCart;
  async function revalidate() {
    const fresh = await api(
      "/api/checkout",
      json("POST", { cart, customer: review.customer }),
    );
    if (fresh.text !== review.result.text) {
      review.result = fresh;
      showReview(true);
      return null;
    }
    review.result = fresh;
    return fresh;
  }
  $("#send-whatsapp").onclick = async () => {
    const b = $("#send-whatsapp");
    b.disabled = true;
    try {
      const fresh = await revalidate();
      if (fresh) window.location.assign(fresh.url);
    } catch (e) {
      $("#review-error").textContent = e.message;
    } finally {
      if (b.isConnected) b.disabled = false;
    }
  };
  $("#copy-order").onclick = async () => {
    try {
      const fresh = await revalidate();
      if (!fresh) return;
      await navigator.clipboard.writeText(fresh.text);
      toast("Pedido copiado. Cole no WhatsApp e envie.");
    } catch (e) {
      $("#review-error").textContent =
        `${e.message} Você também pode selecionar e copiar o texto acima.`;
    }
  };
}
$("#cart-top").onclick = openCart;
$("#cart-bottom").onclick = openCart;
updateCount();
load();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") load();
});
