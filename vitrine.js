// ================== FIREBASE INIT ==================
const firebaseConfig = {
  apiKey: "AIzaSyA-7HOp-Ycvyf3b_03ev__8aJEwAbWSQZY",
  authDomain: "connectfamilia-312dc.firebaseapp.com",
  projectId: "connectfamilia-312dc",
  storageBucket: "connectfamilia-312dc.appspot.com",
  messagingSenderId: "797817838649",
  appId: "1:797817838649:web:1aa7c54abd97661f8d81e8",
  measurementId: "G-QKN9NFXZZQ",
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ================== ELEMENTS ==================
// ATENÇÃO: no seu HTML novo, o H1 deve ser id="storeNameH1"
const storeNameTopEl = document.getElementById("storeNameTop"); // topbar
const storeNameH1El = document.getElementById("storeNameH1");   // título no corpo
const storeDescriptionEl = document.getElementById("storeDescription");

const storeMetaEl = document.getElementById("storeMeta"); // se não existir, ok
const storeActionsEl = document.getElementById("storeActions");

const categoryChipsEl = document.getElementById("categoryChips");
const productsGridEl = document.getElementById("productsGrid");

const storeLogoEl = document.getElementById("storeLogo");

// ================== STATE ==================
let storeUid = "";
let storeData = null;
let activeCategory = "todos";

// ================== HELPERS ==================
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
  }).format(Number(value || 0));
}

function ensureStoreShape(data) {
  const base = data && typeof data === "object" ? data : {};
  base.categories = Array.isArray(base.categories) ? base.categories : [];
  base.products = Array.isArray(base.products) ? base.products : [];
  return base;
}

function setEmptyState(message) {
  if (!productsGridEl) return;
  productsGridEl.innerHTML = `<div class="empty-state">${message}</div>`;
}

function safeSetText(el, text) {
  if (el) el.textContent = text;
}

// ================== WHATSAPP ==================
function buildWhatsAppProductUrl(store, product) {
  const phone = String(store.whatsapp || "").replace(/\D/g, "");
  if (!phone) return "";

  const lines = [
    `Olá, *${store.name || "loja"}*!`,
    "",
    "Quero pedir este produto:",
    `• Produto: ${product.name || "Sem nome"}`,
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

// ================== RENDER HEADER ==================
function renderStoreHeader(store) {
  const storeName = store.name || "Vitrine";

  safeSetText(storeNameTopEl, storeName);
  safeSetText(storeNameH1El, storeName);

  if (storeDescriptionEl) {
    storeDescriptionEl.textContent =
      store.description || "Confira os produtos disponíveis nesta loja.";
  }

  if (storeLogoEl) {
    const fallback = "https://via.placeholder.com/160x60?text=LOGO";
    storeLogoEl.src = store.logoUrl || store.logo || fallback;
    storeLogoEl.alt = `Logo da ${storeName}`;
  }

  // storeMetaEl é opcional: se não existir no HTML, não dá erro
  if (storeMetaEl) {
    const meta = [
      store.category
        ? `<span><i class="fa-solid fa-tags"></i> ${store.category}</span>`
        : "",
      store.fulfillment
        ? `<span><i class="fa-solid fa-truck-fast"></i> ${store.fulfillment}</span>`
        : "",
    ].filter(Boolean);

    storeMetaEl.innerHTML = meta.join("");
  }

  if (storeActionsEl) {
    const phone = String(store.whatsapp || "").replace(/\D/g, "");
    if (!phone) {
      storeActionsEl.innerHTML = `<span class="text-muted">WhatsApp não informado.</span>`;
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(
      `Olá, ${storeName}! Vim pela sua vitrine.`
    )}`;

    storeActionsEl.innerHTML = `
      <a class="btn btn-success" href="${url}" target="_blank" rel="noopener">
        <i class="fa-brands fa-whatsapp"></i>
        Conversar no WhatsApp
      </a>
    `;
  }
}

// ================== CATEGORIES ==================
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

function handleChipClick(e) {
  if (!storeData || !categoryChipsEl) return;

  const chip = e.target.closest(".chip[data-category]");
  if (!chip) return;

  activeCategory = chip.getAttribute("data-category") || "todos";

  categoryChipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
  chip.classList.add("is-active");

  renderProducts(storeData);
}

// ================== PRODUCTS ==================
function buildProductCard(store, product) {
  const image =
    product.image ||
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1974&auto=format&fit=crop";

  const category = product.category || store.category || "Produto";
  const waUrl = buildWhatsAppProductUrl(store, product);

  return `
    <article class="product-card">
      <div class="product-card__media">
        <img src="${image}" alt="${product.name || "Produto"}">
      </div>

      <div class="product-card__body">
        <h3 class="product-card__name">${product.name || "Produto sem nome"}</h3>
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
              : `<span class="text-muted">WhatsApp não informado</span>`
          }
        </div>
      </div>
    </article>
  `;
}

function renderProducts(store) {
  if (!productsGridEl) return;

  if (!store.products || !store.products.length) {
    setEmptyState("Esta loja ainda não possui produtos cadastrados.");
    return;
  }

  const products =
    activeCategory === "todos"
      ? store.products
      : store.products.filter((p) => normalizeCategory(p.category) === activeCategory);

  if (!products.length) {
    setEmptyState("Nenhum produto encontrado nesta categoria.");
    return;
  }

  productsGridEl.innerHTML = products.map((p) => buildProductCard(store, p)).join("");
}

// ================== LOAD STORE ==================
async function loadStore() {
  storeUid = getStoreUidFromUrl();

  // placeholder inicial (não fica preso se carregar certo)
  safeSetText(storeNameTopEl, "Carregando...");
  safeSetText(storeNameH1El, "Carregando loja...");

  if (!storeUid) {
    setEmptyState("Loja não informada. Volte e escolha uma vitrine.");
    safeSetText(storeNameTopEl, "Loja não encontrada");
    safeSetText(storeNameH1El, "Loja não encontrada");
    return;
  }

  try {
    const snap = await db.collection("users").doc(storeUid).get();

    // se o doc não existir
    if (!snap.exists) {
      setEmptyState("Loja não encontrada.");
      safeSetText(storeNameTopEl, "Loja não encontrada");
      safeSetText(storeNameH1El, "Loja não encontrada");
      return;
    }

    // aqui é onde sua loja está salva (ajuste se a estrutura for diferente)
    const raw = snap.data();
    const store = ensureStoreShape(raw?.store);

    if (!store || !store.name) {
      setEmptyState("Esta loja ainda não está disponível.");
      safeSetText(storeNameTopEl, "Loja indisponível");
      safeSetText(storeNameH1El, "Loja indisponível");
      return;
    }

    storeData = store;

    renderStoreHeader(storeData);
    renderCategoryChips(storeData);
    renderProducts(storeData);
  } catch (err) {
    console.error(err);
    setEmptyState("Não foi possível carregar a vitrine agora.");
    safeSetText(storeNameTopEl, "Erro ao carregar");
    safeSetText(storeNameH1El, "Erro ao carregar");
  }
}

// ================== SLIDER AUTOPLAY (opcional) ==================
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
      if (dots[i]) dots[i].classList.add("is-active");
    }
  }, 3500);
}

// ================== START ==================
document.addEventListener("DOMContentLoaded", () => {
  if (categoryChipsEl) categoryChipsEl.addEventListener("click", handleChipClick);
  loadStore();
  initSliderAutoPlay();
});
