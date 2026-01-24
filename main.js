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


const firebaseConfig = {
  apiKey: "AIzaSyA-7HOp-Ycvyf3b_03ev__8aJEwAbWSQZY",
  authDomain: "connectfamilia-312dc.firebaseapp.com",
  projectId: "connectfamilia-312dc",
  storageBucket: "connectfamilia-312dc.appspot.com",
  messagingSenderId: "797817838649",
  appId: "1:797817838649:web:1aa7c54abd97661f8d81e8",
  measurementId: "G-QKN9NFXZZQ",
};

let auth = null;
let db = null;
let currentUser = null;
let storesCache = [];
let activeStoreCategory = "todos";

function initFirebase() {
  if (!window.firebase) return;
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  db = firebase.firestore();
}

function setDashboardState(text, type = "info") {
  const stateEl = document.getElementById("storeDashboardState");
  if (!stateEl) return;
  stateEl.textContent = text || "";
  stateEl.classList.remove("is-warning", "is-success");
  if (type === "warning") stateEl.classList.add("is-warning");
  if (type === "success") stateEl.classList.add("is-success");
}

function setDashboardMessage(text, type = "info") {
  const messageEl = document.getElementById("storeDashboardMessage");
  if (!messageEl) return;
  messageEl.textContent = text || "";
  messageEl.classList.remove("is-error", "is-success");
  if (type === "error") messageEl.classList.add("is-error");
  if (type === "success") messageEl.classList.add("is-success");
}

function setDashboardLoading(isLoading) {
  const submitBtn = document.getElementById("storeDashboardSubmit");
  const refreshBtn = document.getElementById("storeDashboardRefresh");
  if (submitBtn) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? "Salvando..." : "Salvar alterações";
  }
  if (refreshBtn) refreshBtn.disabled = isLoading;
}

function fillStoreForm(form, store) {
  if (!form || !store) return;
  form.elements.storeName.value = store.name || "";
  form.elements.storeCategory.value = store.category || "";
  form.elements.storeWhatsApp.value = store.whatsapp || "";
  form.elements.storeFulfillment.value = store.fulfillment || "";
  form.elements.storeDescription.value = store.description || "";
}

function toggleDashboardVisibility(shouldShow) {
  const dashboard = document.getElementById("storeDashboard");
  if (!dashboard) return;
  dashboard.classList.toggle("is-hidden", !shouldShow);
}

function normalizeCategory(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function renderStoresEmpty(message) {
  const grid = document.getElementById("storesGrid");
  const count = document.getElementById("storesCount");
  if (count) count.textContent = message;
  if (!grid) return;
  grid.innerHTML = `<div class="store-card__empty">${message}</div>`;
}

function buildStoreCard(store) {
  const category = store.category || "Sem categoria";
  const description = store.description || "Loja sem descrição cadastrada.";
  const fulfillment = store.fulfillment || "Atendimento a combinar";
  const whatsapp = store.whatsapp || "";
  const phoneDigits = whatsapp.replace(/\D/g, "");
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Olá, ${store.name}! Vim pelos Comércios Locais.`)}`
    : "";

  return `
    <article class="store-card">
      <span class="store-card__category">${category}</span>
      <h4 class="store-card__name">${store.name || "Loja sem nome"}</h4>
      <p class="store-card__desc">${description}</p>
      <div class="store-card__meta">
        <span><i class="fa-solid fa-truck-fast"></i> ${fulfillment}</span>
        ${phoneDigits ? `<span><i class="fa-brands fa-whatsapp"></i> ${phoneDigits}</span>` : ""}
      </div>
      <div class="store-card__actions">
        ${
          whatsappUrl
            ? `<a class="btn btn-success" href="${whatsappUrl}" target="_blank" rel="noopener">
                 <i class="fa-brands fa-whatsapp"></i> Conversar
               </a>`
            : `<span class="muted">WhatsApp não informado</span>`
        }
        <a class="btn btn-outline-light comercios-secondary" href="Vitrine.html?storeUid=${encodeURIComponent(store.uid || "")}">
          Ver vitrine
        </a>
      </div>
    </article>
  `;
}

function renderStoresList(stores) {
  const grid = document.getElementById("storesGrid");
  const count = document.getElementById("storesCount");
  if (!grid || !count) return;

  if (!stores.length) {
    const label =
      activeStoreCategory === "todos"
        ? "Nenhuma loja disponível ainda."
        : "Nenhuma loja encontrada nesta categoria.";
    renderStoresEmpty(label);
    return;
  }

  count.textContent =
    activeStoreCategory === "todos"
      ? `${stores.length} loja(s) disponível(is)`
      : `${stores.length} loja(s) em ${activeStoreCategory}`;

  grid.innerHTML = stores.map(buildStoreCard).join("");
}

function filterStoresByCategory(categoryKey) {
  activeStoreCategory = categoryKey || "todos";
  if (!storesCache.length) {
    renderStoresEmpty("Nenhuma loja disponível ainda.");
    return;
  }

  if (activeStoreCategory === "todos") {
    renderStoresList(storesCache);
    return;
  }

  const filtered = storesCache.filter(
    (store) => normalizeCategory(store.category) === activeStoreCategory
  );
  renderStoresList(filtered);
}

function setActiveChip(targetChip) {
  const chips = document.querySelectorAll(".comercios-chips .chip");
  chips.forEach((chip) => chip.classList.remove("is-active"));
  targetChip?.classList.add("is-active");
}

async function loadStoresFromFirestore() {
  if (!db) return;
  renderStoresEmpty("Carregando lojas...");

  try {
    const snap = await db.collection("users").get();
    storesCache = snap.docs
      .map((doc) => ({ uid: doc.id, ...doc.data()?.store }))
      .filter((store) => store && store.name);

    if (!storesCache.length) {
      renderStoresEmpty("Nenhuma loja disponível ainda.");
      return;
    }

    filterStoresByCategory(activeStoreCategory);
  } catch (err) {
    console.error("Erro ao carregar lojas:", err);
    renderStoresEmpty("Não foi possível carregar as lojas agora.");
  }
}

async function loadStoreForDashboard() {
  if (!auth || !db) return;
  const form = document.getElementById("storeDashboardForm");
  if (!form) return;

  const user = auth.currentUser;
  currentUser = user || null;

  if (!user) {
    toggleDashboardVisibility(false);
    return;
  }

  toggleDashboardVisibility(true);
  setDashboardState("Carregando dados da sua loja...");
  setDashboardMessage("");

  try {
    const snap = await db.collection("users").doc(user.uid).get();
    const store = snap.data()?.store;
    if (!store) {
      setDashboardState("Você ainda não criou sua loja. Clique em “Quero criar minha loja”.", "warning");
      form.reset();
      return;
    }
    fillStoreForm(form, store);
    setDashboardState("Loja carregada. Edite os campos e salve para atualizar.", "success");
  } catch (err) {
    console.error("Erro ao carregar loja:", err);
    setDashboardState("Não foi possível carregar os dados da loja agora.", "warning");
  }
}
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

function setStoreFormMessage(text, type = "info") {
  const messageEl = document.getElementById("storeFormMessage");
  if (!messageEl) return;
  messageEl.textContent = text || "";
  messageEl.classList.remove("is-error", "is-success");
  if (type === "error") messageEl.classList.add("is-error");
  if (type === "success") messageEl.classList.add("is-success");
}

function setStoreFormLoading(isLoading) {
  const submitBtn = document.getElementById("storeFormSubmit");
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Salvando..." : "Salvar loja no Firestore";
}

function openStoreModal() {
  const modal = document.getElementById("storeModal");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeStoreModal() {
  const modal = document.getElementById("storeModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function getStorePayload(form) {
  const data = new FormData(form);
  return {
    name: String(data.get("storeName") || "").trim(),
    category: String(data.get("storeCategory") || "").trim(),
    whatsapp: String(data.get("storeWhatsApp") || "").replace(/\D/g, ""),
    fulfillment: String(data.get("storeFulfillment") || "").trim(),
    description: String(data.get("storeDescription") || "").trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
}

function validateStorePayload(payload) {
  if (!payload.name || !payload.category || !payload.whatsapp || !payload.fulfillment || !payload.description) {
    return "Preencha todos os campos da loja.";
  }
  if (payload.whatsapp.length < 12) {
    return "Informe o WhatsApp com DDI e DDD. Ex: 5511999990000.";
  }
  return "";
}

async function saveStoreToFirestore(form) {
  if (!auth || !db) {
    setStoreFormMessage("Firebase não foi carregado corretamente.", "error");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    setStoreFormMessage("Você precisa estar logado para criar sua loja.", "error");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);
    return;
  }

  const payload = getStorePayload(form);
  const validationError = validateStorePayload(payload);
  if (validationError) {
    setStoreFormMessage(validationError, "error");
    return;
  }

  setStoreFormLoading(true);
  setStoreFormMessage("Salvando os dados da sua loja...");

  try {
    const userRef = db.collection("users").doc(user.uid);
    await userRef.set(
      {
        uid: user.uid,
        store: {
          ...payload,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

    setStoreFormMessage("Loja salva com sucesso no documento users/{uid}.", "success");
    form.reset();
    loadStoreForDashboard();
    setTimeout(closeStoreModal, 900);
  } catch (err) {
    console.error("Erro ao salvar loja:", err);
    setStoreFormMessage("Não foi possível salvar sua loja. Tente novamente.", "error");
  } finally {
    setStoreFormLoading(false);
  }
}

async function saveDashboardStore(form) {
  if (!auth || !db) return;
  const user = auth.currentUser;
  if (!user) {
    setDashboardMessage("Você precisa estar logado para editar sua loja.", "error");
    return;
  }

  const payload = getStorePayload(form);
  const validationError = validateStorePayload(payload);
  if (validationError) {
    setDashboardMessage(validationError, "error");
    return;
  }

  setDashboardLoading(true);
  setDashboardMessage("Salvando alterações da sua loja...");

  try {
    await db.collection("users").doc(user.uid).set(
      {
        uid: user.uid,
        store: {
          ...payload,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
    setDashboardMessage("Alterações salvas com sucesso.", "success");
    setDashboardState("Loja atualizada e pronta para ser listada.", "success");
  } catch (err) {
    console.error("Erro ao salvar dashboard:", err);
    setDashboardMessage("Não foi possível salvar agora. Tente novamente.", "error");
  } finally {
    setDashboardLoading(false);
  }
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

    const createStoreBtn = e.target.closest("#createStoreBtn");
    if (createStoreBtn) {
      openStoreModal();
      return;
    }

    const scrollBtn = e.target.closest("[data-scroll-target]");
    if (!scrollBtn) return;

    const targetSelector = scrollBtn.getAttribute("data-scroll-target");
    if (!targetSelector) return;

    const target = comerciosSection.querySelector(targetSelector);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const chipsContainer = comerciosSection.querySelector(".comercios-chips");
  chipsContainer?.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip[data-category]");
    if (!chip) return;
    const categoryKey = chip.getAttribute("data-category");
    if (!categoryKey) return;
    setActiveChip(chip);
    filterStoresByCategory(categoryKey);
  });

  const openModalBtn = document.getElementById("createStoreBtn");
  openModalBtn?.addEventListener("click", openStoreModal);

  const modal = document.getElementById("storeModal");
  modal?.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-close-store-modal]");
    if (closeBtn) closeStoreModal();
  });

  const storeForm = document.getElementById("storeForm");
  storeForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveStoreToFirestore(storeForm);
  });

  const dashboardForm = document.getElementById("storeDashboardForm");
  dashboardForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveDashboardStore(dashboardForm);
  });

  document.getElementById("storeDashboardRefresh")?.addEventListener("click", loadStoreForDashboard);
  document.getElementById("storeDashboardOpenModal")?.addEventListener("click", openStoreModal);
}

document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  bindNavbar();
  bindTopbar();
  bindComercios();
  loadStoresFromFirestore();
  auth?.onAuthStateChanged(() => {
    loadStoreForDashboard();
    loadStoresFromFirestore();
  });
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
