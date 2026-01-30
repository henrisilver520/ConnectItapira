const firebaseConfig = {
  apiKey: "AIzaSyA-7HOp-Ycvyf3b_03ev__8aJEwAbWSQZY",
  authDomain: "connectfamilia-312dc.firebaseapp.com",
  projectId: "connectfamilia-312dc",
  storageBucket: "connectfamilia-312dc.appspot.com",
  messagingSenderId: "797817838649",
  appId: "1:797817838649:web:1aa7c54abd97661f8d81e8",
  measurementId: "G-QKN9NFXZZQ",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

const storeNameEl = document.getElementById("storeName");
const storeNameTopEl = document.getElementById("storeNameTop").textContent = store.name || "Vitrine";
const storeDescriptionEl = document.getElementById("storeDescription");
const storeMetaEl = document.getElementById("storeMeta");
const storeActionsEl = document.getElementById("storeActions");
const categoryChipsEl = document.getElementById("categoryChips");
const productsGridEl = document.getElementById("productsGrid");
const storeLogoEl = document.getElementById("storeLogo");

let storeUid = "";
let storeData = null;
let activeCategory = "todos";

function getStoreUidFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("storeUid") || "";
}

function normalizeCategory(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function moneyBR(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function ensureStoreShape(data) {
  const base = data || {};
  base.categories = Array.isArray(base.categories) ? base.categories : [];
  base.products = Array.isArray(base.products) ? base.products : [];
  return base;
}

function setEmptyState(message) {
  if (!productsGridEl) return;
  productsGridEl.innerHTML = `<div class="empty-state">${message}</div>`;
}

function buildWhatsAppProductUrl(store, product) {
  const phone = String(store.whatsapp || "").replace(/\D/g, "");
  if (!phone) return "";
  const lines = [
    `Olá, *${store.name || "loja"}*!`,
    "",
    "Quero pedir este produto:",
    `• Produto: ${product.name}`,
    `• Preço: ${moneyBR(product.price)}`,
    `• Categoria: ${product.category || "Não informada"}`,
    "",
    "Dados para finalizar:",
    "• Entrega ou retirada:",
    "• Forma de pagamento:",
    "• Nome e telefone:",
    "• Endereço (se entrega):",
  ];
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function renderStoreHeader(store) {
  if (storeNameEl) storeNameEl.textContent = store.name || "Vitrine";
  if (storeNameTopEl) storeNameTopEl.textContent = store.name || "Vitrine";
  if (storeDescriptionEl) {
    storeDescriptionEl.textContent = store.description || "Confira os produtos disponíveis nesta loja.";
  }
  if (storeLogoEl) {
    const fallback = "https://via.placeholder.com/160x60?text=LOGO";
    storeLogoEl.src = store.logoUrl || store.logo || fallback;
    storeLogoEl.alt = `Logo da ${store.name || "loja"}`;
  }

  if (storeMetaEl) {
    const meta = [
      store.category ? `<span><i class="fa-solid fa-tags"></i> ${store.category}</span>` : "",
      store.fulfillment ? `<span><i class="fa-solid fa-truck-fast"></i> ${store.fulfillment}</span>` : "",
    ].filter(Boolean);
    storeMetaEl.innerHTML = meta.join("");
  }

  if (storeActionsEl) {
    const phone = String(store.whatsapp || "").replace(/\D/g, "");
    if (!phone) {
      storeActionsEl.innerHTML = "<span class=\"muted\">WhatsApp não informado.</span>";
      return;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(`Olá, ${store.name || "loja"}! Vim pela sua vitrine.`)}`;
    storeActionsEl.innerHTML = `
      <a class="btn btn-success" href="${url}" target="_blank" rel="noopener">
        <i class="fa-brands fa-whatsapp"></i>
        Conversar no WhatsApp
      </a>
    `;
  }
}

function renderCategoryChips(store) {
  if (!categoryChipsEl) return;
  const categories = Array.from(
    new Set([
      "Todos",
      ...store.categories,
      ...store.products.map((p) => p.category).filter(Boolean),
    ])
  );

  categoryChipsEl.innerHTML = categories
    .map((cat, index) => {
      const key = index === 0 ? "todos" : normalizeCategory(cat);
      const activeClass = key === activeCategory ? "is-active" : "";
      return `<button class="chip ${activeClass}" type="button" data-category="${key}">${cat}</button>`;
    })
    .join("");
}

function buildProductCard(store, product) {
  const image = product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1974&auto=format&fit=crop";
  const category = product.category || store.category || "Produto";
  const waUrl = buildWhatsAppProductUrl(store, product);

  return `
    <article class="product-card">
      <div class="product-card__media">
        <img src="${image}" alt="${product.name}">
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">${product.name}</h3>
        <p class="product-card__desc">${product.description || "Sem descrição."}</p>
        <div class="product-card__meta">
          <span class="product-card__price">${moneyBR(product.price)}</span>
          <span class="product-card__category">${category}</span>
        </div>
        <div class="product-card__actions">
          ${
            waUrl
              ? `<a class="btn btn-success" href="${waUrl}" target="_blank" rel="noopener">
                   <i class="fa-brands fa-whatsapp"></i>
                   Comprar
                 </a>`
              : `<span class="muted">WhatsApp não informado</span>`
          }
        </div>
      </div>
    </article>
  `;
}

function renderProducts(store) {
  if (!productsGridEl) return;
  if (!store.products.length) {
    setEmptyState("Esta loja ainda não possui produtos cadastrados.");
    return;
  }

  const products =
    activeCategory === "todos"
      ? store.products
      : store.products.filter(
          (p) => normalizeCategory(p.category) === activeCategory
        );

  if (!products.length) {
    setEmptyState("Nenhum produto encontrado nesta categoria.");
    return;
  }

  productsGridEl.innerHTML = products.map((p) => buildProductCard(store, p)).join("");
}

function handleChipClick(e) {
  const chip = e.target.closest(".chip[data-category]");
  if (!chip || !storeData) return;
  activeCategory = chip.getAttribute("data-category") || "todos";
  categoryChipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
  chip.classList.add("is-active");
  renderProducts(storeData);
}

async function loadStore() {
  storeUid = getStoreUidFromUrl();
  if (!storeUid) {
    setEmptyState("Loja não informada. Volte e escolha uma vitrine.");
    if (storeNameEl) storeNameEl.textContent = "Loja não encontrada";
    return;
  }

  try {
    const snap = await db.collection("users").doc(storeUid).get();
    const store = ensureStoreShape(snap.data()?.store);

    if (!store || !store.name) {
      setEmptyState("Esta loja ainda não está disponível.");
      if (storeNameEl) storeNameEl.textContent = "Loja indisponível";
      return;
    }

    storeData = store;
    renderStoreHeader(storeData);
    renderCategoryChips(storeData);
    renderProducts(storeData);
  } catch (err) {
    console.error(err);
    setEmptyState("Não foi possível carregar a vitrine agora.");
    if (storeNameEl) storeNameEl.textContent = "Erro ao carregar vitrine";
  }
}

categoryChipsEl?.addEventListener("click", handleChipClick);



function initSliderAutoPlay() {
  const track = document.getElementById("adSliderTrack");
  const dotsWrap = document.getElementById("adDots");
  if (!track) return;

  const slides = Array.from(track.children);
  if (slides.length <= 1) return;

  const dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll(".dot")) : [];
  let i = 0;

  setInterval(() => {
    i = (i + 1) % slides.length;
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
    if (dots.length) {
      dots.forEach((d) => d.classList.remove("is-active"));
      dots[i]?.classList.add("is-active");
    }
  }, 3500);
}

document.addEventListener("DOMContentLoaded", () => {
  loadStore();
  initSliderAutoPlay();
});
