import { $, esc, money } from "./shared.js";

const region = $("#product-carousel");
const track = $("#carousel-track");
const dots = $("#carousel-dots");
const pauseButton = $("#carousel-pause");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let products = [],
  index = 0,
  timer,
  paused = reduceMotion.matches,
  hovered = false,
  focused = false,
  signature = "";

function schedule() {
  clearInterval(timer);
  if (
    products.length > 1 &&
    !paused &&
    !hovered &&
    !focused &&
    !document.hidden
  ) {
    timer = setInterval(() => move(index + 1), 5000);
  }
}

function move(next, announce = false) {
  if (!products.length) return;
  index = (next + products.length) % products.length;
  [...track.children].forEach((slide, i) => {
    slide.hidden = i !== index;
  });
  [...dots.children].forEach((dot, i) => {
    dot.setAttribute("aria-current", String(i === index));
  });
  $("#carousel-position").textContent = `${index + 1} / ${products.length}`;
  if (announce)
    $("#carousel-announcement").textContent =
      `${products[index].name}. Imagem ${index + 1} de ${products.length}.`;
}

export function renderCarousel(menu) {
  const nextProducts = menu.products.filter(
    (p) =>
      p.image &&
      !p.soldOut &&
      menu.categories.some((c) => c.id === p.categoryId),
  );
  const nextSignature = JSON.stringify(nextProducts);
  if (signature === nextSignature) return;
  signature = nextSignature;
  products = nextProducts;
  clearInterval(timer);
  region.hidden = !products.length;
  if (!products.length) {
    track.replaceChildren();
    dots.replaceChildren();
    return;
  }
  index = 0;
  track.innerHTML = products
    .map(
      (p, i) =>
        `<article class="carousel-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} de ${products.length}" ${i ? "hidden" : ""}><div class="carousel-copy"><span class="eyebrow">${p.demo ? "EXEMPLO DO CARDÁPIO" : p.featured ? "DESTAQUE DO CARDÁPIO" : "CONHEÇA NOSSO CARDÁPIO"}</span><h2>${esc(p.name)}</h2>${p.demo ? '<p class="carousel-disclaimer">Produto e preço fictícios · imagem ilustrativa gerada por IA</p>' : `<p class="carousel-description">${esc(p.description)}</p>`}<p class="carousel-price">${p.promoPrice !== null ? `<del>${money(p.price)}</del>` : ""}${money(p.promoPrice ?? p.price)}</p><button type="button" class="carousel-select" data-carousel-product="${esc(p.id)}">Ver produto <span aria-hidden="true">↗</span></button></div><div class="carousel-photo"><img src="${esc(p.image)}" alt="${esc(p.demo ? `Imagem ilustrativa de ${p.name}` : p.name)}" width="900" height="600" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></div></article>`,
    )
    .join("");
  dots.innerHTML = products
    .map(
      (p, i) =>
        `<button type="button" data-slide="${i}" aria-label="Mostrar ${esc(p.name)}" aria-current="${i === 0}"></button>`,
    )
    .join("");
  pauseButton.hidden = products.length < 2;
  $("#carousel-prev").disabled = products.length < 2;
  $("#carousel-next").disabled = products.length < 2;
  updatePauseButton();
  move(0);
  schedule();
}

function updatePauseButton() {
  pauseButton.textContent = paused ? "▶ Reproduzir" : "Ⅱ Pausar";
  pauseButton.setAttribute(
    "aria-label",
    paused
      ? "Reproduzir carrossel automaticamente"
      : "Pausar carrossel automático",
  );
}
function manualMove(next) {
  move(next, true);
  schedule();
}
$("#carousel-prev").onclick = () => manualMove(index - 1);
$("#carousel-next").onclick = () => manualMove(index + 1);
dots.onclick = (event) => {
  const dot = event.target.closest("[data-slide]");
  if (dot) manualMove(Number(dot.dataset.slide));
};
pauseButton.onclick = () => {
  paused = !paused;
  updatePauseButton();
  schedule();
};
region.addEventListener("mouseenter", () => {
  hovered = true;
  schedule();
});
region.addEventListener("mouseleave", () => {
  hovered = false;
  schedule();
});
region.addEventListener("focusin", () => {
  focused = true;
  schedule();
});
region.addEventListener("focusout", (event) => {
  if (!region.contains(event.relatedTarget)) {
    focused = false;
    schedule();
  }
});
region.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault();
    manualMove(index + (event.key === "ArrowRight" ? 1 : -1));
  }
});
let touchStart;
region.addEventListener(
  "touchstart",
  (event) => {
    touchStart = event.touches[0]?.clientX;
  },
  { passive: true },
);
region.addEventListener(
  "touchend",
  (event) => {
    const distance =
      (event.changedTouches[0]?.clientX ?? touchStart) - touchStart;
    if (Math.abs(distance) > 50) manualMove(index + (distance < 0 ? 1 : -1));
  },
  { passive: true },
);
document.addEventListener("visibilitychange", schedule);
reduceMotion.addEventListener("change", (event) => {
  paused = event.matches;
  updatePauseButton();
  schedule();
});
