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

const CATEGORY_ICONS = {
  "Todos": "fa-layer-group",
  "Reparos & Manutenção": "fa-screwdriver-wrench",
  "Saúde & Bem-estar": "fa-heart-pulse",
  "Educação & Aulas": "fa-graduation-cap",
  "Transporte & Fretes": "fa-truck-fast",
  "Utilidades Essenciais": "fa-bolt",
  "Jurídico & Contábil": "fa-scale-balanced",
};


const servicosChips = document.getElementById("servicosChips");
const servicosGrid = document.getElementById("servicosGrid");
const servicosSearch = document.getElementById("servicosSearch");
const servicosClear = document.getElementById("servicosClear");
const resultsCount = document.getElementById("resultsCount");
const resultsBadge = document.getElementById("resultsBadge");
const trabalhoModal = document.getElementById("trabalhoModal");
const trabalhoModalImage = document.getElementById("trabalhoModalImage");
const trabalhoModalCategory = document.getElementById("trabalhoModalCategory");
const trabalhoModalServiceTitle = document.getElementById("trabalhoModalServiceTitle");
const trabalhoModalDescription = document.getElementById("trabalhoModalDescription");
const trabalhoModalMeta = document.getElementById("trabalhoModalMeta");
const trabalhoModalActions = document.getElementById("trabalhoModalActions");

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
    const icon = CATEGORY_ICONS[cat] || "fa-tags";

    return `
      <button
        class="service-cat ${activeClass}"
        type="button"
        data-category="${cat}"
        aria-pressed="${cat === activeCategory}"
      >
        <span class="service-cat__icon">
          <i class="fa-solid ${icon}"></i>
        </span>
        <span class="service-cat__label">${cat}</span>
      </button>
    `;
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
  const avatarUrl =
    service.profilePhotoURL ||
    "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=300&auto=format&fit=crop";
  const serviceImage =
    service.imageData ||
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1200&auto=format&fit=crop";

  return `
    <article class="service-card">
      
      <div class="service-card__header">
        <span class="service-card__category">${service.category}</span>
        ${service.priceFrom ? `<span class="service-card__category">A partir de ${moneyMask(service.priceFrom)}</span>` : ""}
      </div>
      <div class="service-card__title-row">
        <img class="service-card__avatar" src="${avatarUrl}" alt="Foto de perfil de ${service.title}">
        <h3 class="service-card__title">${service.title}</h3>
      </div>
      <div class="service-card__media">
        <img src="${serviceImage}" alt="Foto do serviço ${service.title}">
      </div>
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
        <button class="btn btn-ghost" type="button" data-action="ver-trabalhos" data-uid="${service.uid}">
          <i class="fa-regular fa-image"></i>
          Ver trabalhos
        </button>
        <a class="btn btn-ghost" href="index.html#servicosSection">
          <i class="fa-solid fa-arrow-left"></i>
          Voltar
        </a>
      </div>
    </article>
  `;
}

function openTrabalhoModal(service) {
  if (!trabalhoModal || !service) return;
  const fallbackImage = "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=1974&auto=format&fit=crop";
  if (trabalhoModalImage) {
    trabalhoModalImage.src = service.imageData || fallbackImage;
  }
  if (trabalhoModalCategory) trabalhoModalCategory.textContent = service.category || "Serviço";
  if (trabalhoModalServiceTitle) trabalhoModalServiceTitle.textContent = service.title || "Serviço";
  if (trabalhoModalDescription) trabalhoModalDescription.textContent = service.description || "";
  if (trabalhoModalMeta) {
    trabalhoModalMeta.innerHTML = `
      <span><i class="fa-solid fa-location-dot"></i> ${service.area || "Área não informada"}</span>
      ${service.updatedLabel ? `<span><i class="fa-regular fa-clock"></i> Atualizado ${service.updatedLabel}</span>` : ""}
    `;
  }
  const whatsappLink = buildWhatsAppLink(service);
  if (trabalhoModalActions) {
    trabalhoModalActions.innerHTML = whatsappLink
      ? `<a class="btn btn-success" href="${whatsappLink}" target="_blank" rel="noopener">
           <i class="fa-brands fa-whatsapp"></i>
           Pedir orçamento
         </a>`
      : `<span class="muted">WhatsApp não informado</span>`;
  }

  trabalhoModal.classList.add("is-open");
  trabalhoModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeTrabalhoModal() {
  if (!trabalhoModal) return;
  trabalhoModal.classList.remove("is-open");
  trabalhoModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
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
          profilePhotoURL: doc.data()?.profilePhotoURL || "",
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

  servicosGrid?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action='ver-trabalhos']");
    if (!btn) return;
    const uid = btn.getAttribute("data-uid");
    if (!uid) return;
    const service = servicesCache.find((s) => s.uid === uid);
    if (!service) return;
    openTrabalhoModal(service);
  });

  trabalhoModal?.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-close-trabalho-modal]");
    if (closeBtn) closeTrabalhoModal();
  });

  document.getElementById("servicosAnunciarTop")?.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadServices();
  enableDragScroll(document.getElementById("servicosChips"));

  auth.onAuthStateChanged(() => {
    loadServices();

  });
});
