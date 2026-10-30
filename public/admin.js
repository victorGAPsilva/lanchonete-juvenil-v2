import {
  $,
  esc,
  money,
  api,
  json,
  toast,
  cents,
  uid,
  DEFAULT_LOGO,
  renderLogo,
} from "./shared.js";
let data,
  tab = "products";
const root = $("#admin");
const field = (label, name, value = "", type = "text", extra = "") =>
  `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const checkbox = (label, name, value) =>
  `<label class="check"><input type="checkbox" name="${name}" ${value ? "checked" : ""}>${label}</label>`;
const selected = (a, b) => (a === b ? "selected" : "");
async function load() {
  try {
    data = await api("/api/admin/data");
    renderLogo(data.config.logo, data.config.name);
    render();
  } catch (e) {
    if (e.status === 401) login();
    else
      root.innerHTML = `<p class="error">${esc(e.message)}</p><button id="retry">Tentar novamente</button>`;
    if ($("#retry")) $("#retry").onclick = load;
  }
}
function login() {
  root.innerHTML = `<section class="panel login"><p class="eyebrow">ÁREA ADMINISTRATIVA</p><h2>Bem-vindo de volta.</h2><p class="small">Gerencie o cardápio e o funcionamento da lanchonete.</p><form id="login">${field("E-mail", "email", "", "email", 'required autocomplete="username"')}${field("Senha", "password", "", "password", 'required maxlength="200" autocomplete="current-password"')}<p id="login-error" class="error" role="alert"></p><button class="primary wide">Entrar no painel</button></form><p class="small">Primeiro acesso? Crie o administrador no servidor com <code>npm run admin:create</code>.</p></section>`;
  $("#login").onsubmit = async (e) => {
    e.preventDefault();
    const button = $("button", e.target);
    button.disabled = true;
    try {
      await api(
        "/api/admin/login",
        json("POST", Object.fromEntries(new FormData(e.target))),
      );
      await load();
    } catch (e) {
      $("#login-error").textContent = e.message;
    } finally {
      button.disabled = false;
    }
  };
}
function render() {
  root.innerHTML = `<div class="admin-row"><div><p class="eyebrow">PAINEL DA LANCHONETE</p><h1 class="admin-title">Tudo em ordem.</h1></div><button id="logout">Sair</button></div><nav class="admin-nav" aria-label="Seções do painel">${[
    ["products", "Produtos"],
    ["categories", "Categorias"],
    ["settings", "Loja e funcionamento"],
    ["delivery", "Entrega e pagamento"],
  ]
    .map(
      ([id, name]) =>
        `<button data-tab="${id}" class="${tab === id ? "active" : ""}">${name}</button>`,
    )
    .join("")}</nav><div id="admin-content"></div>`;
  $(".admin-nav").onclick = (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) {
      tab = b.dataset.tab;
      render();
    }
  };
  $("#logout").onclick = async () => {
    await api("/api/admin/logout", json("POST", {}));
    login();
  };
  if (tab === "products" || tab === "categories") list();
  else settingsForm();
}
function list() {
  const isProduct = tab === "products";
  $("#admin-content").innerHTML =
    `<section class="panel"><div class="admin-row"><div><h2>${isProduct ? "Seu cardápio" : "Categorias"}</h2><p>${isProduct ? "Cadastre os produtos e mantenha a disponibilidade atualizada." : "A ordem menor aparece primeiro no cardápio."}</p></div><button class="primary" id="new">${isProduct ? "Novo produto" : "Nova categoria"}</button></div>${!data[tab].length ? `<p class="empty">${isProduct ? "Nenhum produto cadastrado. Comece pelas categorias." : "Nenhuma categoria cadastrada."}</p>` : data[tab].map((item) => `<div class="admin-row"><div><strong>${esc(item.name)}</strong><p>${item.active ? "Ativo" : "Desativado"}${isProduct ? ` · ${money(item.promoPrice ?? item.price)}${item.soldOut ? " · Esgotado" : ""}` : ""} · Ordem ${item.order}</p></div><div class="actions">${isProduct ? `<button data-stock="${esc(item.id)}">${item.soldOut ? "Repor" : "Esgotar"}</button>` : ""}<button data-edit="${esc(item.id)}">Editar</button><button data-toggle="${esc(item.id)}">${item.active ? "Desativar" : "Ativar"}</button></div></div>`).join("")}</section>`;
  $("#new").onclick = () => (isProduct ? editProduct() : editCategory());
  $("#admin-content").onclick = async (e) => {
    const edit = e.target.closest("[data-edit]"),
      toggle = e.target.closest("[data-toggle]"),
      stock = e.target.closest("[data-stock]");
    if (edit) {
      const item = data[tab].find((i) => i.id === edit.dataset.edit);
      isProduct ? editProduct(item) : editCategory(item);
    }
    if (toggle || stock) {
      const b = toggle || stock,
        item = data[tab].find(
          (i) => i.id === (toggle?.dataset.toggle || stock?.dataset.stock),
        );
      try {
        const value = {
          ...item,
          ...(toggle ? { active: !item.active } : { soldOut: !item.soldOut }),
        };
        await api(`/api/admin/${tab}/${item.id}`, json("PUT", value));
        await load();
        toast("Atualizado no cardápio.");
      } catch (e) {
        toast(e.message);
      }
    }
  };
}
function editCategory(
  item = { id: uid(), name: "", order: data.categories.length, active: true },
) {
  const d = $("#editor");
  d.innerHTML = `<button class="close" data-close aria-label="Fechar">×</button><h2>Categoria</h2><form id="category-form">${field("Nome", "name", item.name, "text", 'required maxlength="80"')}${field("Ordem de exibição", "order", item.order, "number", 'required step="1"')}${checkbox("Categoria ativa", "active", item.active)}<p class="error" role="alert" id="edit-error"></p><button class="primary wide">Salvar categoria</button></form>`;
  $("#category-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await api(
        `/api/admin/categories/${item.id}`,
        json("PUT", {
          ...item,
          name: f.elements.name.value,
          order: Number(f.elements.order.value),
          active: f.elements.active.checked,
        }),
      );
      d.close();
      await load();
      toast("Categoria salva.");
    } catch (e) {
      $("#edit-error").textContent = e.message;
    }
  };
  d.showModal();
}
function editProduct(
  item = {
    id: uid(),
    name: "",
    description: "",
    price: 0,
    promoPrice: null,
    categoryId: data.categories[0]?.id || "",
    active: true,
    featured: false,
    soldOut: false,
    order: data.products.length,
    image: "",
    groups: [],
  },
) {
  const d = $("#editor");
  let image = item.image,
    groups = structuredClone(item.groups);
  d.innerHTML = `<button class="close" data-close aria-label="Fechar">×</button><h2>Produto</h2><form id="product-form"><div class="admin-grid">${field("Nome", "name", item.name, "text", 'required maxlength="100"')}<label class="field">Categoria<select name="categoryId" required><option value="">Selecione</option>${data.categories.map((c) => `<option value="${esc(c.id)}" ${selected(c.id, item.categoryId)}>${esc(c.name)}</option>`).join("")}</select></label></div><label class="field">Descrição<textarea name="description" maxlength="1000">${esc(item.description)}</textarea></label><div class="admin-grid">${field("Preço (R$)", "price", (item.price / 100).toFixed(2), "number", 'required min="0" max="100000" step="0.01"')}${field("Preço promocional (R$, opcional)", "promo", item.promoPrice === null ? "" : (item.promoPrice / 100).toFixed(2), "number", 'min="0" max="100000" step="0.01"')}</div>${field("Ordem de exibição", "order", item.order, "number", 'required step="1"')}<label class="field">Foto (JPG, PNG ou WebP, até 5 MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp"></label><div id="image-preview">${image ? `<img class="preview-image" src="${esc(image)}" alt="Foto atual">` : ""}</div><button type="button" id="remove-image">Remover foto</button><div class="actions">${checkbox("Ativo", "active", item.active)}${checkbox("Esgotado", "soldOut", item.soldOut)}${checkbox("Destaque", "featured", item.featured)}</div><fieldset><legend>Opções e adicionais</legend><p class="small">Use mínimo 1 para tornar um grupo obrigatório. Cada opção pode ser escolhida uma vez por unidade do produto.</p><div id="groups"></div><button id="add-group" type="button">+ Grupo de opções</button></fieldset><p id="edit-error" class="error" role="alert"></p><button class="primary wide" id="save-product">Salvar produto</button></form>`;
  const f = $("#product-form");
  $("#remove-image").onclick = () => {
    image = "";
    $("#image-preview").innerHTML = "";
    f.elements.image.value = "";
  };
  function readGroups() {
    groups.forEach((g, i) => {
      const el = $(`[data-group="${i}"]`);
      if (!el) return;
      g.name = $("[data-name]", el).value;
      g.min = Number($("[data-min]", el).value);
      g.max = Number($("[data-max]", el).value);
      g.options.forEach((o, j) => {
        const op = $(`[data-option="${j}"]`, el);
        o.name = $("[data-option-name]", op).value;
        o.price = cents($("[data-option-price]", op).value);
      });
    });
  }
  function renderGroups() {
    $("#groups").innerHTML = groups
      .map(
        (g, i) =>
          `<div class="group-editor" data-group="${i}"><label class="field">Nome do grupo<input class="control" data-name value="${esc(g.name)}" required maxlength="100"></label><div class="row"><label class="field">Mínimo<input class="control" data-min type="number" min="0" max="30" value="${g.min}" required></label><label class="field">Máximo<input class="control" data-max type="number" min="0" max="30" value="${g.max}" required></label></div>${g.options.map((o, j) => `<div class="row" data-option="${j}"><label class="field">Opção<input class="control" data-option-name value="${esc(o.name)}" required maxlength="100"></label><label class="field">Adicional (R$)<input class="control" data-option-price type="number" min="0" max="100000" step="0.01" value="${(o.price / 100).toFixed(2)}" required></label><button type="button" data-remove-option="${i}:${j}" aria-label="Remover opção">×</button></div>`).join("")}<div class="actions"><button type="button" data-add-option="${i}">+ Opção</button><button type="button" data-remove-group="${i}">Remover grupo</button></div></div>`,
      )
      .join("");
  }
  $("#groups").onclick = (e) => {
    const add = e.target.closest("[data-add-option]"),
      remove = e.target.closest("[data-remove-option]"),
      removeGroup = e.target.closest("[data-remove-group]");
    if (!add && !remove && !removeGroup) return;
    readGroups();
    if (add)
      groups[Number(add.dataset.addOption)].options.push({
        id: uid(),
        name: "",
        price: 0,
      });
    if (remove) {
      const [i, j] = remove.dataset.removeOption.split(":").map(Number);
      groups[i].options.splice(j, 1);
    }
    if (removeGroup) groups.splice(Number(removeGroup.dataset.removeGroup), 1);
    renderGroups();
  };
  $("#add-group").onclick = () => {
    readGroups();
    groups.push({
      id: uid(),
      name: "",
      min: 0,
      max: 1,
      options: [{ id: uid(), name: "", price: 0 }],
    });
    renderGroups();
  };
  renderGroups();
  f.onsubmit = async (e) => {
    e.preventDefault();
    $("#save-product").disabled = true;
    try {
      readGroups();
      if (f.elements.image.files[0]) {
        const body = new FormData();
        body.append("image", f.elements.image.files[0]);
        image = (await api("/api/admin/upload", { method: "POST", body })).url;
      }
      const value = {
        ...item,
        name: f.elements.name.value,
        description: f.elements.description.value,
        categoryId: f.elements.categoryId.value,
        price: cents(f.elements.price.value),
        promoPrice:
          f.elements.promo.value === "" ? null : cents(f.elements.promo.value),
        order: Number(f.elements.order.value),
        active: f.elements.active.checked,
        featured: f.elements.featured.checked,
        soldOut: f.elements.soldOut.checked,
        image,
        groups,
      };
      await api(`/api/admin/products/${item.id}`, json("PUT", value));
      d.close();
      await load();
      toast("Produto salvo no cardápio.");
    } catch (e) {
      $("#edit-error").textContent = e.message;
    } finally {
      if ($("#save-product")) $("#save-product").disabled = false;
    }
  };
  d.showModal();
}
function settingsForm() {
  const c = data.config,
    isDelivery = tab === "delivery";
  let logo = c.logo;
  const neighborhoods = structuredClone(c.neighborhoods),
    payments = structuredClone(c.payments);
  $("#admin-content").innerHTML =
    `<section class="panel"><h2>${isDelivery ? "Entrega e pagamento" : "Loja e funcionamento"}</h2><form id="settings-form">${!isDelivery ? `<div class="admin-grid">${field("Nome da lanchonete", "name", c.name, "text", 'required maxlength="100"')}${field("WhatsApp (país + DDD + número)", "whatsapp", c.whatsapp, "tel", 'required pattern="[0-9]{10,15}"')}</div>${field("Endereço completo para retirada", "address", c.address, "text", 'maxlength="300"')}${field("Instagram (URL, opcional)", "instagram", c.instagram, "url", 'placeholder="https://www.instagram.com/seu.perfil"')}<label class="field">Logo original (JPG, PNG ou WebP, até 5 MB)<input type="file" name="logo" accept="image/jpeg,image/png,image/webp"></label><div id="logo-preview">${logo ? `<img class="preview-image" src="${esc(logo)}" alt="Logo atual">` : '<img class="preview-image" src="${DEFAULT_LOGO}" alt="Logo original do projeto"><p class="small">Usando a logo original do projeto.</p>'}</div><button type="button" id="remove-logo">Usar logo original</button><fieldset><legend>Funcionamento · America/Sao_Paulo</legend><label class="field">Situação da loja<select name="mode"><option value="closed" ${selected(c.mode, "closed")}>Fechada temporariamente</option><option value="open" ${selected(c.mode, "open")}>Aberta temporariamente</option><option value="auto" ${selected(c.mode, "auto")}>Seguir horários abaixo</option></select></label>${field("Pausa excepcional até (ISO com fuso, opcional)", "pauseUntil", c.pauseUntil, "text", 'placeholder="2026-12-25T23:59:00-03:00"')}<p class="small">A pausa tem prioridade sobre a abertura manual. Horário final menor que o inicial encerra no dia seguinte. Não há agendamento de pedidos.</p>${["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((name, i) => `<div class="hours-row">${checkbox(name, `enabled-${i}`, c.hours[i].enabled)}<label class="small">Abre<input class="control" name="open-${i}" type="time" value="${c.hours[i].open}" required></label><label class="small">Fecha<input class="control" name="close-${i}" type="time" value="${c.hours[i].close}" required></label></div>`).join("")}</fieldset><div class="admin-grid">${field("Prazo estimado de preparo", "prep", c.prep, "text", 'maxlength="120" placeholder="Ex.: 20 a 30 minutos"')}${field("Prazo estimado de entrega", "deliveryEstimate", c.deliveryEstimate, "text", 'maxlength="120" placeholder="Ex.: 40 a 60 minutos"')}</div>` : `<div class="actions">${checkbox("Habilitar retirada", "pickup", c.pickup)}${checkbox("Habilitar entrega", "delivery", c.delivery)}</div><p class="small">Para habilitar a finalização com retirada, cadastre o endereço em Loja e funcionamento.</p><label class="field">Cálculo da entrega<select name="deliveryMode"><option value="pending" ${selected(c.deliveryMode, "pending")}>Taxa a combinar pelo WhatsApp</option><option value="fixed" ${selected(c.deliveryMode, "fixed")}>Taxa fixa</option><option value="neighborhood" ${selected(c.deliveryMode, "neighborhood")}>Taxa por bairro</option></select></label>${field("Taxa fixa (R$)", "fixedFee", (c.fixedFee / 100).toFixed(2), "number", 'required min="0" max="100000" step="0.01"')}<fieldset><legend>Bairros atendidos</legend><p class="small">Somente estes bairros poderão receber entregas, inclusive com taxa fixa ou a combinar. Zero é uma taxa gratuita explicitamente configurada.</p><div id="neighborhoods"></div><button type="button" id="add-neighborhood">+ Bairro</button></fieldset><fieldset><legend>Formas de pagamento</legend><p class="small">Pagamento combinado no WhatsApp, sem cobrança no site.</p><div id="payments"></div><button type="button" id="add-payment">+ Forma de pagamento</button></fieldset>`}<p id="settings-error" class="error" role="alert"></p><button class="primary" id="save-settings">Salvar configurações</button></form></section>`;
  const f = $("#settings-form");
  if (!isDelivery)
    $("#remove-logo").onclick = () => {
      logo = "";
      $("#logo-preview").innerHTML =
        `<img class="preview-image" src="${DEFAULT_LOGO}" alt="Logo original do projeto"><p class="small">Usando a logo original do projeto.</p>`;
      f.elements.logo.value = "";
    };
  function readDelivery() {
    neighborhoods.forEach((n, i) => {
      n.name = $(`[data-neighborhood-name="${i}"]`).value.trim();
      n.fee = cents($(`[data-neighborhood-fee="${i}"]`).value);
    });
    payments.forEach((p, i) => {
      p.name = $(`[data-payment-name="${i}"]`).value.trim();
      p.cash = $(`[data-payment-cash="${i}"]`).checked;
    });
  }
  function renderDelivery() {
    $("#neighborhoods").innerHTML = neighborhoods
      .map(
        (n, i) =>
          `<div class="row"><label class="field">Bairro<input class="control" data-neighborhood-name="${i}" value="${esc(n.name)}" required maxlength="100"></label><label class="field">Taxa (R$)<input class="control" data-neighborhood-fee="${i}" type="number" value="${(n.fee / 100).toFixed(2)}" min="0" max="100000" step="0.01" required></label><button type="button" data-remove-neighborhood="${i}" aria-label="Remover bairro">×</button></div>`,
      )
      .join("");
    $("#payments").innerHTML = payments
      .map(
        (p, i) =>
          `<div class="row"><label class="field">Nome<input class="control" data-payment-name="${i}" value="${esc(p.name)}" maxlength="80" required></label><label class="check"><input type="checkbox" data-payment-cash="${i}" ${p.cash ? "checked" : ""}>Dinheiro (habilita troco)</label><button type="button" data-remove-payment="${i}" aria-label="Remover pagamento">×</button></div>`,
      )
      .join("");
  }
  if (isDelivery) {
    renderDelivery();
    $("#add-neighborhood").onclick = () => {
      readDelivery();
      neighborhoods.push({ name: "", fee: 0 });
      renderDelivery();
    };
    $("#add-payment").onclick = () => {
      readDelivery();
      payments.push({ id: uid(), name: "", cash: false });
      renderDelivery();
    };
    f.onclick = (e) => {
      const n = e.target.closest("[data-remove-neighborhood]"),
        p = e.target.closest("[data-remove-payment]");
      if (n || p) {
        readDelivery();
        if (n) neighborhoods.splice(Number(n.dataset.removeNeighborhood), 1);
        if (p) payments.splice(Number(p.dataset.removePayment), 1);
        renderDelivery();
      }
    };
  }
  f.onsubmit = async (e) => {
    e.preventDefault();
    $("#save-settings").disabled = true;
    try {
      let value = { ...c };
      if (isDelivery) {
        readDelivery();
        value = {
          ...value,
          pickup: f.elements.pickup.checked,
          delivery: f.elements.delivery.checked,
          deliveryMode: f.elements.deliveryMode.value,
          fixedFee: cents(f.elements.fixedFee.value),
          neighborhoods,
          payments,
        };
      } else {
        if (f.elements.logo.files[0]) {
          const body = new FormData();
          body.append("image", f.elements.logo.files[0]);
          logo = (await api("/api/admin/upload", { method: "POST", body })).url;
        }
        for (const key of [
          "name",
          "whatsapp",
          "address",
          "instagram",
          "mode",
          "pauseUntil",
          "prep",
          "deliveryEstimate",
        ])
          value[key] = f.elements[key].value.trim();
        value.logo = logo;
        value.hours = c.hours.map((h, i) => ({
          enabled: f.elements[`enabled-${i}`].checked,
          open: f.elements[`open-${i}`].value,
          close: f.elements[`close-${i}`].value,
        }));
      }
      await api("/api/admin/settings", json("PUT", value));
      await load();
      toast("Configurações salvas.");
    } catch (e) {
      $("#settings-error").textContent = e.message;
    } finally {
      if ($("#save-settings")) $("#save-settings").disabled = false;
    }
  };
}
load();
