// main.js (sem módulos)

// Lista de todas as sections controladas
const SECTION_IDS = [
  "homeSection",
  "comerciosSection",
  "imoveisSection",
  "eventosSection",
  "servicosSection",
  "redeSocialSection",
  "pontosInteresseSection",
  "gruposSection",
  "noticiasSection",
  "empregosSection",
  "chatPublicoSection",
  "bairrosSection",
];

// Mapa sectionId -> botãoId (para marcar ativo)
const ACTIVE_BTN_MAP = {
  comerciosSection: "CidadeSectionButton",
  imoveisSection: "anunciarImoveisButton",
  eventosSection: "eventosCity",
  servicosSection: "servicosButton",
  redeSocialSection: "notificationButton",
  pontosInteresseSection: "locais",
  gruposSection: "grupos",
  noticiasSection: "noticiasLocaisButton",
  empregosSection: "empregosLocaisButton",
  chatPublicoSection: "openChatButton",
  bairrosSection: "conhecaOBairroButton",
};

function hideAllSections() {
  SECTION_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("is-visible");
  });
}

function clearActiveButtons() {
  const btns = document.querySelectorAll("#nav-header-buttons button");
  btns.forEach((b) => b.classList.remove("is-active"));
}

function setActiveButton(sectionId) {
  clearActiveButtons();
  const btnId = ACTIVE_BTN_MAP[sectionId];
  if (btnId) document.getElementById(btnId)?.classList.add("is-active");
}

function openSection(sectionId) {
  hideAllSections();
  const el = document.getElementById(sectionId);
  if (el) el.classList.add("is-visible");
  setActiveButton(sectionId);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openHome() {
  hideAllSections();
  document.getElementById("homeSection")?.classList.add("is-visible");
  clearActiveButtons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindNavbar() {
  const nav = document.getElementById("nav-header-buttons");
  if (!nav) return;

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const target = btn.getAttribute("data-target");
    if (!target) return;

    openSection(target);
  });
}

function bindTopbar() {
  document.getElementById("btnHome")?.addEventListener("click", openHome);

  document.getElementById("btnLogout")?.addEventListener("click", () => {
    // Por enquanto: placeholder
    // Se você já usa Firebase Auth, depois ligamos:
    // firebase.auth().signOut().then(()=> location.href="login.html")
    alert("Logout: vamos conectar com Firebase depois.");
  });
}


function buildWhatsAppMessage({ store, product, price }) {
  return [
    `Olá, *${store}*!`,
    "",
    "Quero fazer um pedido:",
    `• Produto: ${product}`,
    `• Preço: R$ ${price}`,
    "",
    "Dados para finalizar:",
    "• Entrega ou retirada:",
    "• Forma de pagamento:",
    "• Nome e telefone:",
    "• Endereço (se entrega):",
  ].join("\n");
}

function openWhatsAppOrder(button) {
  const store = button.getAttribute("data-store");
  const product = button.getAttribute("data-product");
  const price = button.getAttribute("data-price");
  const phone = button.getAttribute("data-whatsapp");

  if (!store || !product || !price || !phone) return;

  const message = buildWhatsAppMessage({ store, product, price });
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener");
}

function bindComercios() {
  const comerciosSection = document.getElementById("comerciosSection");
  if (!comerciosSection) return;

  comerciosSection.addEventListener("click", (e) => {
    const orderBtn = e.target.closest(".js-order-btn");
    if (orderBtn) {
      openWhatsAppOrder(orderBtn);
      return;
    }

    const scrollBtn = e.target.closest("[data-scroll-target]");
    if (!scrollBtn) return;

    const targetSelector = scrollBtn.getAttribute("data-scroll-target");
    if (!targetSelector) return;

    const target = comerciosSection.querySelector(targetSelector);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}



document.addEventListener("DOMContentLoaded", () => {
  bindNavbar();
  bindTopbar();
  openHome();
});

// Se você ainda tiver código antigo chamando toggleSection("..."),
// esta função mantém compatibilidade:
function toggleSection(sectionId) {
  openSection(sectionId);
}


document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-open]");
  if (!btn) return;
  const sectionId = btn.getAttribute("data-open");
  if (!sectionId) return;

  // compatível com seu sistema atual
  if (typeof openSection === "function") openSection(sectionId);
  else if (typeof toggleSection === "function") toggleSection(sectionId);
});
