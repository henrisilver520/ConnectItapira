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

const auth = firebase.auth();
const db = firebase.firestore();

const CATEGORY_ORDER = [
  "Todos",
  "Reparos & Manutenção",
  "Saúde & Bem-estar",
  "Educação & Aulas",
  "Transporte & Fretes",
  "Utilidades Essenciais",
  "Jurídico & Contábil",
];

const servicosChips = document.getElementById("servicosChips");
const servicosGrid = document.getElementById("servicosGrid");
const servicosSearch = document.getElementById("servicosSearch");
const servicosClear = document.getElementById("servicosClear");
const resultsCount = document.getElementById("resultsCount");
const resultsBadge = document.getElementById("resultsBadge");

let servicesCache = [];
let activeCategory = "Todos";
let activeQuery = "";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function moneyMask(value) {
  if (!value && value !== 0) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildWhatsAppLink(service) {
  const phone = String(service.whatsapp || "").replace(/\D/g, "");
  if (!phone) return "";
  const message = [
    `Olá, *${service.title}*!`,
    "",
    "Encontrei seu serviço na seção de prestadores.",
    `• Categoria: ${service.category}`,
    service.area ? `• Região: ${service.area}` : "",
    "",
    "Pode me passar mais detalhes e disponibilidade?",
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function renderChips() {
  if (!servicosChips) return;
  servicosChips.innerHTML = CATEGORY_ORDER.map((cat) => {
    const activeClass = cat === activeCategory ? "is-active" : "";
    return `<button class="chip ${activeClass}" type="button" data-category="${cat}">${cat}</button>`;
  }).join("");
}

function setResultsInfo(count) {
  if (resultsCount) {
    resultsCount.textContent = `${count} serviço(s) encontrado(s)`;
  }
  if (resultsBadge) {
    resultsBadge.textContent = activeCategory;
  }
}

function renderEmpty(message) {
  if (!servicosGrid) return;
  servicosGrid.innerHTML = `<div class="empty-state">${message}</div>`;
  setResultsInfo(0);
}

function buildServiceCard(service) {
  const whatsappLink = buildWhatsAppLink(service);
  const areaLabel = service.area ? `Área: ${service.area}` : "Área não informada";

  return `
    <article class="service-card">
      <div class="service-card__header">
        <span class="service-card__category">${service.category}</span>
        ${service.priceFrom ? `<span class="service-card__category">A partir de ${moneyMask(service.priceFrom)}</span>` : ""}
      </div>
      <h3 class="service-card__title">${service.title}</h3>
      <p class="service-card__desc">${service.description || "Sem descrição informada."}</p>
      <div class="service-card__meta">
        <span><i class="fa-solid fa-location-dot"></i> ${areaLabel}</span>
        ${service.updatedLabel ? `<span><i class="fa-regular fa-clock"></i> Atualizado ${service.updatedLabel}</span>` : ""}
      </div>
      <div class="service-card__actions">
        ${
          whatsappLink
            ? `<a class="btn btn-success" href="${whatsappLink}" target="_blank" rel="noopener">
                 <i class="fa-brands fa-whatsapp"></i>
                 Chamar no WhatsApp
               </a>`
            : `<span class="muted">WhatsApp não informado</span>`
        }
        <a class="btn btn-ghost" href="index.html#servicosSection">
          <i class="fa-solid fa-arrow-left"></i>
          Voltar
        </a>
      </div>
    </article>
  `;
}

function matchesFilters(service) {
  const categoryOk = activeCategory === "Todos" || service.category === activeCategory;
  if (!categoryOk) return false;

  if (!activeQuery) return true;
  const haystack = normalize(`${service.title} ${service.category} ${service.area} ${service.description}`);
  return haystack.includes(activeQuery);
}

function renderServices() {
  if (!servicosGrid) return;
  if (!servicesCache.length) {
    renderEmpty("Nenhum serviço anunciado ainda. Seja o primeiro a anunciar.");
    return;
  }

  const filtered = servicesCache.filter(matchesFilters);
  if (!filtered.length) {
    renderEmpty("Nenhum serviço encontrado com os filtros atuais.");
    return;
  }

  setResultsInfo(filtered.length);
  servicosGrid.innerHTML = filtered.map(buildServiceCard).join("");
}

function formatRelativeDate(ts) {
  if (!ts?.toDate) return "";
  const date = ts.toDate();
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(1, Math.round(diffMs / 36e5));
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d`;
}

async function loadServices() {
  if (!resultsCount) return;
  resultsCount.textContent = "Carregando serviços...";

  try {
    const snap = await db.collection("users").get();
    servicesCache = snap.docs
      .map((doc) => {
        const profile = doc.data()?.servicesProfile;
        if (!profile?.title || !profile?.category) return null;
        return {
          uid: doc.id,
          ...profile,
          updatedLabel: formatRelativeDate(profile.updatedAt),
        };
      })
      .filter(Boolean);

    renderChips();
    renderServices();
  } catch (err) {
    console.error(err);
    renderEmpty("Não foi possível carregar os serviços agora.");
  }
}

function bindEvents() {
  servicosChips?.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip[data-category]");
    if (!chip) return;
    activeCategory = chip.getAttribute("data-category") || "Todos";
    renderChips();
    renderServices();
  });

  servicosSearch?.addEventListener("input", () => {
    activeQuery = normalize(servicosSearch.value);
    renderServices();
  });

  servicosClear?.addEventListener("click", () => {
    activeCategory = "Todos";
    activeQuery = "";
    if (servicosSearch) servicosSearch.value = "";
    renderChips();
    renderServices();
  });

  document.getElementById("servicosAnunciarTop")?.addEventListener("click", () => {
    window.location.href = "index.html";
  });
  document.getElementById("servicosAnunciarHero")?.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadServices();
  auth.onAuthStateChanged(() => {
    loadServices();
  });
});

