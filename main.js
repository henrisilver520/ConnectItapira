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


const STORE_CATEGORIES = [
  "Alimentação & Bebidas",
  "Restaurantes",
  "Lanchonetes",
  "Padarias & Confeitarias",
  "Mercados & Mercearias",
  "Farmácias & Drogarias",
  "Saúde & Bem-estar",
  "Beleza & Estética",
  "Moda & Acessórios",
  "Joias & Relógios",
  "Calçados",
  "Eletrônicos & Informática",
  "Assistência Técnica",
  "Construção & Materiais",
  "Móveis & Decoração",
  "Pet Shop & Veterinária",
  "Veículos & Autopeças",
  "Oficinas Mecânicas",
  "Serviços Profissionais",
  "Educação & Cursos",
  "Esportes & Lazer",
  "Presentes & Utilidades",
  "Hotéis & Pousadas",
  "Imobiliárias",
  "Outros"
]

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

  const logoHtml = store.logo
  ? `<img src="${store.logo}" class="store-card__logo" alt="Logo ${store.name}">`
  : `<div class="store-card__logo placeholder">Logo</div>`


  const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Olá, ${store.name}! Vim pelos Comércios Locais.`)}`
    : "";

  return `
    <article class="store-card">
    <div class="store-card__top">
  

  <div class="store-card__head">

  <h4 class="store-card__name">${store.name || "Loja sem nome"}</h4>
  </div>
  <div class="store-card__logo-wrap">
    ${logoHtml}
  </div>
</div>


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
  .map((doc) => {
    const store = doc.data()?.store || {};
    return {
      uid: doc.id,
      ...store,
      categories: Array.isArray(store.categories) ? store.categories : [],
      products: Array.isArray(store.products) ? store.products : [],
    };
  })
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

function setServicosFormMessage(text, type = "info") {
  const messageEl = document.getElementById("servicosFormMessage");
  if (!messageEl) return;
  messageEl.textContent = text || "";
  messageEl.classList.remove("is-error", "is-success");
  if (type === "error") messageEl.classList.add("is-error");
  if (type === "success") messageEl.classList.add("is-success");
}

function setServicosFormLoading(isLoading) {
  const submitBtn = document.getElementById("servicosFormSubmit");
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Salvando..." : "Salvar serviço";
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

function openServicosModal() {
  const modal = document.getElementById("servicosModal");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeServicosModal() {
  const modal = document.getElementById("servicosModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
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
    setTimeout(() => (window.location.href = "login.html"), 1200);
    return;
  }

  // trava criação de 2ª loja
try {
  const profile = await getUserProfileDoc();
  if (hasStore(profile)) {
    setStoreFormMessage(ADMIN_UPSELL_MESSAGE, "error");
    return;
  }
} catch (err) {
  setStoreFormMessage(err?.message || "Não foi possível validar sua conta agora.", "error");
  return;
}


  let payload;
  try {
    payload = await getStorePayload(form); // <-- AQUI
  } catch (err) {
    setStoreFormMessage(err?.message || "Falha ao processar logo.", "error");
    return;
  }

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

function getServicosPayload(form) {
  const data = new FormData(form);
  return {
    title: String(data.get("serviceTitle") || "").trim(),
    category: String(data.get("serviceCategory") || "").trim(),
    whatsapp: String(data.get("serviceWhatsApp") || "").replace(/\D/g, ""),
    area: String(data.get("serviceArea") || "").trim(),
    description: String(data.get("serviceDescription") || "").trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
}

function validateServicosPayload(payload) {
  if (!payload.title || !payload.category || !payload.whatsapp || !payload.area || !payload.description) {
    return "Preencha todos os campos do serviço.";
  }
  if (payload.whatsapp.length < 12) {
    return "Informe o WhatsApp com DDI e DDD. Ex: 5511999990000.";
  }
  return "";
}

async function saveServicosProfile(form) {
  if (!auth || !db) {
    setServicosFormMessage("Firebase não foi carregado corretamente.", "error");
    return;
  }
  const user = auth.currentUser;
  if (!user) {
    setServicosFormMessage("Você precisa estar logado para anunciar seus serviços.", "error");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);
    return;
  }
// trava criação de 2º serviço
try {
  const profile = await getUserProfileDoc();
  if (hasService(profile)) {
    setServicosFormMessage(ADMIN_UPSELL_MESSAGE, "error");
    return;
  }
} catch (err) {
  setServicosFormMessage(err?.message || "Não foi possível validar sua conta agora.", "error");
  return;
}

  const payload = getServicosPayload(form);
  const validationError = validateServicosPayload(payload);
  if (validationError) {
    setServicosFormMessage(validationError, "error");
    return;
  }

  const imageInput = form.querySelector('input[name="serviceImage"]');
  const file = imageInput?.files?.[0];
  if (!file) {
    setServicosFormMessage("Envie uma foto do serviço realizado para continuar.", "error");
    return;
  }

  setServicosFormLoading(true);
  setServicosFormMessage("Processando imagem e salvando seu anúncio...");

  try {
    const imageData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Falha ao ler imagem."));
      reader.readAsDataURL(file);
    });
    const normalizedImageData = String(imageData || "");
    if (!normalizedImageData.startsWith("data:image/")) {
      setServicosFormMessage("Arquivo inválido. Envie uma imagem válida.", "error");
      setServicosFormLoading(false);
      return;
    }
    if (normalizedImageData.length > 900000) {
      setServicosFormMessage("Imagem muito grande. Envie uma foto com até 1MB.", "error");
      setServicosFormLoading(false);
      return;
    }

    await db.collection("users").doc(user.uid).set(
      {
        uid: user.uid,
        servicesProfile: {
          ...payload,
          imageData: normalizedImageData,
          imageName: file.name || "",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
    setServicosFormMessage("Serviço salvo com sucesso. Em breve você poderá aparecer nas categorias.", "success");
    form.reset();
    setTimeout(closeServicosModal, 900);
  } catch (err) {
    console.error("Erro ao salvar serviços:", err);
    setServicosFormMessage("Não foi possível salvar agora. Tente novamente.", "error");
  } finally {
    setServicosFormLoading(false);
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
  (async () => {
    try {
      const ok = await guardSingleStore();
      if (ok) openStoreModal();
    } catch (err) {
      alert(err?.message || "Não foi possível validar sua conta agora.");
    }
  })();
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
openModalBtn?.addEventListener("click", async () => {
  try {
    const ok = await guardSingleStore();
    if (ok) openStoreModal();
  } catch (err) {
    alert(err?.message || "Não foi possível validar sua conta agora.");
  }
});

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
document.getElementById("storeDashboardOpenModal")?.addEventListener("click", async () => {
  try {
    const ok = await guardSingleStore();
    if (ok) openStoreModal();
  } catch (err) {
    alert(err?.message || "Não foi possível validar sua conta agora.");
  }
});
}

function bindServicos() {
  const servicosSection = document.getElementById("servicosSection");
  if (!servicosSection) return;

  const announceBtn = document.getElementById("announceServiceBtn");
announceBtn?.addEventListener("click", async () => {
  try {
    const ok = await guardSingleService();
    if (ok) openServicosModal();
  } catch (err) {
    alert(err?.message || "Não foi possível validar sua conta agora.");
  }
});

  const verCategoriasBtn = document.getElementById("verCategoriasServicosBtn");
  verCategoriasBtn?.addEventListener("click", () => {
    window.location.href = "servicos.html";
  });

  const modal = document.getElementById("servicosModal");
  modal?.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-close-servicos-modal]");
    if (closeBtn) closeServicosModal();
  });

  const form = document.getElementById("servicosForm");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveServicosProfile(form);
  });
}
document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  fillStoreCategories(); // <-- AQUI
  bindNavbar();
  bindTopbar();
  bindComercios();
  bindServicos();
  loadStoresFromFirestore();
  bindEventCommentsModal();
  bindLocais();
bindComerciosSearch();

  bindImoveis();
  bindImovelDetailsModal();
  bindImovelAnuncioModal();
  loadPropertiesFromFirestore();
  enableDragScroll(document.getElementById("nav-header-buttons"));

  bindEventos();
  bindEventCreateModal();
  loadEvents();
  
auth?.onAuthStateChanged(async () => {
    isUserAdmin = await checkIsAdmin();
    document.getElementById("adminPlaceBtn")?.classList.toggle("is-hidden", !isUserAdmin);

    await loadPlaces();
  });

  bindLocaisFirestore();
  

  auth?.onAuthStateChanged(() => {
    loadStoreForDashboard();
    loadStoresFromFirestore();
    loadEvents();

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



async function getStorePayload(form) {
  const data = new FormData(form)

  let logoData = ""
  const logoFile = form.querySelector('input[name="storeLogo"]')?.files?.[0]

  if (logoFile) {
    logoData = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(logoFile)
    })

    if (!logoData.startsWith("data:image/")) {
      throw new Error("Logo inválido")
    }
    if (logoData.length > 900000) {
      throw new Error("Logo muito grande (máx. 1MB)")
    }
  }

  return {
    name: String(data.get("storeName") || "").trim(),
    category: String(data.get("storeCategory") || "").trim(),
    whatsapp: String(data.get("storeWhatsApp") || "").replace(/\D/g, ""),
    fulfillment: String(data.get("storeFulfillment") || "").trim(),
    description: String(data.get("storeDescription") || "").trim(),
    logo: logoData || null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  }
}


function fillStoreCategories() {
  const select = document.querySelector('select[name="storeCategory"]')
  if (!select) return

  select.innerHTML = `<option value="">Selecione uma categoria</option>`

  STORE_CATEGORIES.forEach(cat => {
    const option = document.createElement("option")
    option.value = cat
    option.textContent = cat
    select.appendChild(option)
  })
}


function fillStoreCategories() {
  const select = document.querySelector('select[name="storeCategory"]');
  if (!select) return;

  select.innerHTML = `<option value="">Selecione uma categoria</option>`;
  STORE_CATEGORIES.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}


const ADMIN_UPSELL_MESSAGE =
  "Você já possui um cadastro ativo. Para liberar 2ª loja/2º serviço, entre em contato com o ADM.";

async function getUserProfileDoc() {
  if (!auth || !db) throw new Error("Firebase não carregado.");
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não logado.");
  const snap = await db.collection("users").doc(user.uid).get();
  return snap.exists ? (snap.data() || {}) : {};
}

function hasStore(profile) {
  const s = profile?.store;
  return !!(s && s.name); // considera loja existente se tiver nome
}

function hasService(profile) {
  const sp = profile?.servicesProfile;
  return !!(sp && sp.title); // considera serviço existente se tiver título
}

async function guardSingleStore() {
  const profile = await getUserProfileDoc();
  if (hasStore(profile)) {
    alert(ADMIN_UPSELL_MESSAGE);
    return false;
  }
  return true;
}

async function guardSingleService() {
  const profile = await getUserProfileDoc();
  if (hasService(profile)) {
    alert(ADMIN_UPSELL_MESSAGE);
    return false;
  }
  return true;
}


// imoveis

let propertiesCache = [];
let activePropertyPurpose = "venda";
let selectedProperty = null;

// galeria
let galleryIndex = 0;
let galleryPhotos = [];

const IMOVEL_FREE_LIMIT = 1;
const ADMIN_UPSELL_MESSAGE_IMOVEIS =
  "Você já possui 1 anúncio grátis. Para liberar mais anúncios, entre em contato com o ADM.";

function formatBRL(value) {
  const n = Number(value || 0);
  if (!n) return "Sob consulta";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

function openModalById(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeModalById(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function buildMapUrl(p) {
  // pode usar endereço completo (interno), mas o público vê parcial
  const street = p.addressStreet || "";
  const number = p.addressNumber || "";
  const neighborhood = p.addressNeighborhood || "";
  const city = p.addressCity || "Itapira";
  const state = p.addressState || "SP";
  const query = `${street} ${number}, ${neighborhood}, ${city} - ${state}`.trim();
  const q = encodeURIComponent(query || `${neighborhood}, ${city} - ${state}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function buildPublicAddress(p) {
  // parcial por privacidade: rua + bairro + cidade/UF (sem número)
  const street = p.addressStreet ? String(p.addressStreet).trim() : "";
  const neighborhood = p.addressNeighborhood ? String(p.addressNeighborhood).trim() : "";
  const city = p.addressCity ? String(p.addressCity).trim() : "Itapira";
  const state = p.addressState ? String(p.addressState).trim() : "SP";

  const a = [];
  if (street) a.push(street);
  if (neighborhood) a.push(neighborhood);
  a.push(`${city} - ${state}`);
  return a.join(" · ");
}

async function loadPropertiesFromFirestore() {
  if (!db) return;

  const grid = document.getElementById("imoveisGrid");
  const count = document.getElementById("imoveisCount");
  if (count) count.textContent = "Carregando imóveis...";
  if (grid) grid.innerHTML = `<div class="imoveis-empty">Carregando imóveis...</div>`;

  try {
    const snap = await db
      .collectionGroup("imoveis")
      .where("isActive", "==", true)
      .get();

    propertiesCache = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
    filterPropertiesByPurpose(activePropertyPurpose);
  } catch (err) {
    console.error("Erro ao carregar imóveis:", err);
    if (count) count.textContent = "Não foi possível carregar os imóveis agora.";
    if (grid) grid.innerHTML = `<div class="imoveis-empty">Não foi possível carregar os imóveis agora.</div>`;
  }
}

function buildPropertyCard(p) {
  const purposeLabel = (p.purpose || "venda") === "aluguel" ? "Aluguel" : "Venda";
  const type = p.type || "Imóvel";
  const title = p.title || `${type} em ${p.addressNeighborhood || "Itapira"}`;
  const price = formatBRL(p.price);
  const neighborhood = p.addressNeighborhood || "Bairro não informado";
  const city = p.addressCity || "Itapira";

  const beds = Number(p.bedrooms || 0);
  const baths = Number(p.bathrooms || 0);
  const garage = Number(p.parking || 0);
  const area = Number(p.areaM2 || 0) ? `${Number(p.areaM2)} m²` : "Área n/d";

  // primeira foto (se houver)
  const cover = (p.photos && p.photos[0]) ? p.photos[0] : "";

  return `
    <article class="imovel-card" data-imovel-id="${p.id}">
      <div class="imovel-cover" style="${cover ? `background-image:url('${cover}');background-size:cover;background-position:center;` : ""}">
        <div class="imovel-badges">
          <span class="imovel-badge is-purpose">${purposeLabel}</span>
          <span class="imovel-badge">${type}</span>
        </div>
      </div>

      <div class="imovel-body">
        <p class="imovel-price">${price}</p>
        <h4 class="imovel-title">${title}</h4>
        <p class="imovel-loc"><i class="fas fa-map-marker-alt"></i> ${neighborhood} · ${city}</p>

        <div class="imovel-features">
          <span><i class="fas fa-ruler-combined"></i> ${area}</span>
          <span><i class="fas fa-bed"></i> ${beds || "—"} dorm</span>
          <span><i class="fas fa-bath"></i> ${baths || "—"} banh</span>
          <span><i class="fas fa-car"></i> ${garage || "—"} vaga</span>
        </div>
      </div>

      <div class="imovel-actions">
        <button class="btn btn-outline-light js-imovel-details" type="button">
          Ver detalhes
        </button>
        <button class="btn btn-success js-imovel-whats" type="button"
          data-phone="${onlyDigits(p.whatsapp)}"
          data-title="${encodeURIComponent(title)}">
          WhatsApp
        </button>
      </div>
    </article>
  `;
}

function renderProperties(list) {
  const grid = document.getElementById("imoveisGrid");
  const count = document.getElementById("imoveisCount");
  if (!grid || !count) return;

  if (!list.length) {
    count.textContent =
      activePropertyPurpose === "aluguel"
        ? "Nenhum imóvel para aluguel disponível agora."
        : "Nenhum imóvel à venda disponível agora.";
    grid.innerHTML = `<div class="imoveis-empty">${count.textContent}</div>`;
    return;
  }

  count.textContent =
    activePropertyPurpose === "aluguel"
      ? `${list.length} imóvel(is) para aluguel`
      : `${list.length} imóvel(is) à venda`;

  grid.innerHTML = list.map(buildPropertyCard).join("");
}

function filterPropertiesByPurpose(purpose) {
  activePropertyPurpose = purpose || "venda";
  const filtered = propertiesCache.filter((p) => (p.purpose || "venda") === activePropertyPurpose);
  renderProperties(filtered);
}

function setGallery(index) {
  if (!galleryPhotos.length) return;
  galleryIndex = Math.max(0, Math.min(index, galleryPhotos.length - 1));

  const main = document.getElementById("imovelGalleryMain");
  const thumbs = document.querySelectorAll(".imovel-gallery__thumb");
  if (main) main.src = galleryPhotos[galleryIndex];

  thumbs.forEach((t, i) => t.classList.toggle("is-active", i === galleryIndex));
}

function renderGallery(photos) {
  galleryPhotos = Array.isArray(photos) ? photos.filter(Boolean) : [];
  galleryIndex = 0;

  const main = document.getElementById("imovelGalleryMain");
  const thumbsWrap = document.getElementById("imovelGalleryThumbs");

  if (!main || !thumbsWrap) return;

  if (!galleryPhotos.length) {
    main.src = "";
    main.style.background = "rgba(2,6,23,.25)";
    thumbsWrap.innerHTML = "";
    return;
  }

  main.src = galleryPhotos[0];
  thumbsWrap.innerHTML = galleryPhotos
    .map(
      (src, i) =>
        `<img class="imovel-gallery__thumb ${i === 0 ? "is-active" : ""}" src="${src}" alt="Foto ${i + 1}" data-idx="${i}">`
    )
    .join("");

  thumbsWrap.onclick = (e) => {
    const img = e.target.closest(".imovel-gallery__thumb[data-idx]");
    if (!img) return;
    setGallery(Number(img.getAttribute("data-idx")));
  };
}

function openImovelDetails(p) {
  selectedProperty = p || null;
  if (!selectedProperty) return;

  const title = selectedProperty.title || "Detalhes do imóvel";
  const purposeLabel = (selectedProperty.purpose || "venda") === "aluguel" ? "Aluguel" : "Venda";
  const type = selectedProperty.type || "Imóvel";
  const neighborhood = selectedProperty.addressNeighborhood || "";
  const city = selectedProperty.addressCity || "Itapira";

  document.getElementById("imovelDetailsTitle").textContent = title;
  document.getElementById("imovelDetailsSub").textContent = `${type} · ${neighborhood} · ${city}`;

  document.getElementById("imovelDetailsPrice").textContent = formatBRL(selectedProperty.price);

  // badges
  const badges = document.getElementById("imovelDetailsBadges");
  badges.innerHTML = `
    <span class="imovel-details__badge">${purposeLabel}</span>
    <span class="imovel-details__badge">${type}</span>
    ${Number(selectedProperty.areaM2 || 0) ? `<span class="imovel-details__badge">${selectedProperty.areaM2} m²</span>` : ""}
  `;

  // features
  const f = document.getElementById("imovelDetailsFeatures");
  const beds = Number(selectedProperty.bedrooms || 0);
  const baths = Number(selectedProperty.bathrooms || 0);
  const park = Number(selectedProperty.parking || 0);

  f.innerHTML = `
    <span><i class="fas fa-bed"></i> ${beds || "—"} dorm</span>
    <span><i class="fas fa-bath"></i> ${baths || "—"} banh</span>
    <span><i class="fas fa-car"></i> ${park || "—"} vaga</span>
    <span><i class="fas fa-map-marker-alt"></i> ${selectedProperty.addressNeighborhood || "Local n/d"}</span>
  `;

  // descrição
  document.getElementById("imovelDetailsDesc").textContent =
    selectedProperty.description || "Sem descrição.";

  // custos
  document.getElementById("imovelDetailsCondo").textContent =
    selectedProperty.condominiumFee ? formatBRL(selectedProperty.condominiumFee) : "—";
  document.getElementById("imovelDetailsIPTU").textContent =
    selectedProperty.iptuYear ? formatBRL(selectedProperty.iptuYear) : "—";

  // endereço parcial
  document.getElementById("imovelDetailsAddress").textContent = buildPublicAddress(selectedProperty);

  // links
  const mapLink = document.getElementById("imovelDetailsMap");
  mapLink.href = buildMapUrl(selectedProperty);

  const phone = onlyDigits(selectedProperty.whatsapp);
  const whatsLink = document.getElementById("imovelDetailsWhats");
  if (phone && phone.length >= 12) {
    const msg = `Olá! Vi o imóvel "${title}" no ConnectIta. Pode me passar mais informações?`;
    whatsLink.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    whatsLink.classList.remove("is-disabled");
  } else {
    whatsLink.href = "#";
  }

  // meta
  const meta = document.getElementById("imovelDetailsMeta");
  meta.textContent = selectedProperty.createdAt?.toDate
    ? `Publicado em ${selectedProperty.createdAt.toDate().toLocaleDateString("pt-BR")}`
    : "";

  // galeria
  renderGallery(selectedProperty.photos || []);

  openModalById("imovelDetailsModal");
}


function bindImovelDetailsModal() {
  const modal = document.getElementById("imovelDetailsModal");
  if (!modal) return;

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-imovel-details]")) {
      closeModalById("imovelDetailsModal");
    }
  });

  document.getElementById("imovelGalleryPrev")?.addEventListener("click", () => {
    if (!galleryPhotos.length) return;
    setGallery(galleryIndex - 1);
  });

  document.getElementById("imovelGalleryNext")?.addEventListener("click", () => {
    if (!galleryPhotos.length) return;
    setGallery(galleryIndex + 1);
  });
}


function setImovelFormMessage(text, type = "info") {
  const el = document.getElementById("imovelFormMessage");
  if (!el) return;
  el.textContent = text || "";
  el.classList.remove("is-error", "is-success");
  if (type === "error") el.classList.add("is-error");
  if (type === "success") el.classList.add("is-success");
}

function setImovelFormLoading(isLoading) {
  const btn = document.getElementById("imovelFormSubmit");
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Publicando..." : "Publicar anúncio";
}

async function canUserCreateImovel() {
  if (!auth || !db) throw new Error("Firebase não carregado.");
  const user = auth.currentUser;
  if (!user) throw new Error("Você precisa estar logado para anunciar.");

  const snap = await db.collection("users").doc(user.uid).collection("imoveis").get();
  // limite 1 grátis
  return snap.size < IMOVEL_FREE_LIMIT;
}

async function readPhotosAsBase64(files, maxPhotos = 6) {
  const arr = Array.from(files || []).slice(0, maxPhotos);
  if (!arr.length) return [];

  const results = [];
  for (const f of arr) {
    if (!f.type.startsWith("image/")) throw new Error("Envie apenas imagens nas fotos.");
    if (f.size > 1024 * 1024) throw new Error("Cada foto deve ter no máximo 1MB.");

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Falha ao ler uma das fotos."));
      reader.readAsDataURL(f);
    });

    if (!dataUrl.startsWith("data:image/")) throw new Error("Foto inválida.");
    results.push(dataUrl);
  }

  return results;
}

function previewImovelPhotos(base64List) {
  const wrap = document.getElementById("imovelPhotosPreview");
  if (!wrap) return;
  wrap.innerHTML = (base64List || []).map((src) => `<img src="${src}" alt="Prévia">`).join("");
}

function getImovelPayload(form, photosBase64) {
  const data = new FormData(form);

  const purpose = String(data.get("purpose") || "").trim();
  const type = String(data.get("type") || "").trim();
  const title = String(data.get("title") || "").trim();
  const description = String(data.get("description") || "").trim();

  const price = Number(data.get("price") || 0);
  const condominiumFee = Number(data.get("condominiumFee") || 0);
  const iptuYear = Number(data.get("iptuYear") || 0);

  const areaM2 = Number(data.get("areaM2") || 0);
  const bedrooms = Number(data.get("bedrooms") || 0);
  const bathrooms = Number(data.get("bathrooms") || 0);
  const parking = Number(data.get("parking") || 0);

  const whatsapp = onlyDigits(data.get("whatsapp"));

  const addressStreet = String(data.get("addressStreet") || "").trim();
  const addressNumber = String(data.get("addressNumber") || "").trim();
  const addressNeighborhood = String(data.get("addressNeighborhood") || "").trim();
  const addressCity = String(data.get("addressCity") || "Itapira").trim();
  const addressState = String(data.get("addressState") || "SP").trim();
  const addressCep = String(data.get("addressCep") || "").trim();
  const addressComplement = String(data.get("addressComplement") || "").trim();

  return {
    isActive: true,
    purpose,
    type,
    title,
    description,

    price,
    condominiumFee: condominiumFee || null,
    iptuYear: iptuYear || null,

    areaM2,
    bedrooms,
    bathrooms,
    parking,

    whatsapp,

    addressStreet,
    addressNumber, // não exibido publicamente
    addressNeighborhood,
    addressCity,
    addressState,
    addressCep: addressCep || null,
    addressComplement: addressComplement || null,

    photos: photosBase64 || [],
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
}

function validateImovelPayload(p) {
  if (!p.purpose || !p.type || !p.title || !p.description) return "Preencha finalidade, tipo, título e descrição.";
  if (!p.price || p.price <= 0) return "Informe um preço válido.";
  if (!p.areaM2 || p.areaM2 <= 0) return "Informe uma área válida (m²).";
  if (p.bedrooms < 0 || p.bathrooms < 0 || p.parking < 0) return "Quartos/banheiros/vagas inválidos.";
  if (!p.whatsapp || p.whatsapp.length < 12) return "Informe WhatsApp com DDI e DDD. Ex: 5511999990000.";
  if (!p.addressStreet || !p.addressNeighborhood || !p.addressCity || !p.addressState)
    return "Preencha rua, bairro, cidade e estado.";
  if (!Array.isArray(p.photos) || p.photos.length < 1) return "Envie pelo menos 1 foto do imóvel.";
  return "";
}

async function saveImovel(form) {
  if (!auth || !db) {
    setImovelFormMessage("Firebase não foi carregado corretamente.", "error");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    setImovelFormMessage("Você precisa estar logado para anunciar.", "error");
    return;
  }

  // Limite 1 anúncio grátis
  let allowed = false;
  try {
    allowed = await canUserCreateImovel();
  } catch (err) {
    setImovelFormMessage(err?.message || "Não foi possível validar sua conta agora.", "error");
    return;
  }

  if (!allowed) {
    setImovelFormMessage(ADMIN_UPSELL_MESSAGE_IMOVEIS, "error");
    return;
  }

  setImovelFormLoading(true);
  setImovelFormMessage("Processando fotos e publicando anúncio...");

  try {
    const files = form.querySelector("#imovelPhotos")?.files;
    const photosBase64 = await readPhotosAsBase64(files, 6);
    previewImovelPhotos(photosBase64);

    const payload = getImovelPayload(form, photosBase64);
    const err = validateImovelPayload(payload);
    if (err) {
      setImovelFormMessage(err, "error");
      setImovelFormLoading(false);
      return;
    }

    const ref = db.collection("users").doc(user.uid).collection("imoveis").doc();
    await ref.set({
      ...payload,
      ownerUid: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    setImovelFormMessage("Anúncio publicado com sucesso!", "success");
    form.reset();
    previewImovelPhotos([]);
    setTimeout(() => closeModalById("imovelAnuncioModal"), 900);

    // recarrega a lista
    loadPropertiesFromFirestore();
  } catch (err) {
    console.error("Erro ao salvar imóvel:", err);
    setImovelFormMessage(err?.message || "Não foi possível publicar agora. Tente novamente.", "error");
  } finally {
    setImovelFormLoading(false);
  }
}


function bindImovelAnuncioModal() {
  const modal = document.getElementById("imovelAnuncioModal");
  if (!modal) return;

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-imovel-anuncio]")) {
      closeModalById("imovelAnuncioModal");
    }
  });

  const form = document.getElementById("imovelForm");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveImovel(form);
  });

  document.getElementById("imovelPhotos")?.addEventListener("change", async (e) => {
    try {
      const files = e.target.files;
      const photosBase64 = await readPhotosAsBase64(files, 6);
      previewImovelPhotos(photosBase64);
      setImovelFormMessage(`${photosBase64.length} foto(s) selecionada(s).`);
    } catch (err) {
      previewImovelPhotos([]);
      setImovelFormMessage(err?.message || "Falha ao processar fotos.", "error");
      e.target.value = "";
    }
  });
}


function bindImoveis() {
  const section = document.getElementById("imoveisSection");
  if (!section) return;

  section.addEventListener("click", (e) => {
    const tab = e.target.closest(".imoveis-tab[data-purpose]");
    if (tab) {
      document.querySelectorAll(".imoveis-tab").forEach((b) => b.classList.remove("is-active"));
      tab.classList.add("is-active");
      filterPropertiesByPurpose(tab.getAttribute("data-purpose"));
      return;
    }

    const detailsBtn = e.target.closest(".js-imovel-details");
    if (detailsBtn) {
      const card = detailsBtn.closest(".imovel-card");
      const id = card?.getAttribute("data-imovel-id");
      const prop = propertiesCache.find((p) => p.id === id);
      if (prop) openImovelDetails(prop);
      return;
    }

    const whatsBtn = e.target.closest(".js-imovel-whats");
    if (whatsBtn) {
      const phone = whatsBtn.getAttribute("data-phone") || "";
      const title = decodeURIComponent(whatsBtn.getAttribute("data-title") || "");
      if (!phone || phone.length < 12) {
        alert("WhatsApp do anunciante não informado.");
        return;
      }
      const msg = `Olá! Vi o imóvel "${title}" no ConnectIta. Pode me passar mais informações?`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
      return;
    }
  });

  document.getElementById("anunciarImovelBtn")?.addEventListener("click", async () => {
    if (!auth?.currentUser) {
      alert("Você precisa estar logado para anunciar.");
      return;
    }
    // checa limite antes de abrir
    try {
      const ok = await canUserCreateImovel();
      if (!ok) {
        alert(ADMIN_UPSELL_MESSAGE_IMOVEIS);
        return;
      }
      openModalById("imovelAnuncioModal");
    } catch (err) {
      alert(err?.message || "Não foi possível validar sua conta agora.");
    }
  });
}


function openModalById(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  modal.scrollTop = 0;
  modal.querySelector(".ti-modal__body")?.scrollTo({ top: 0 });
}



function enableDragScroll(el) {
  if (!el) return;

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  // evita selecionar texto enquanto arrasta
  el.style.userSelect = "none";
  el.style.cursor = "grab";

  const onDown = (pageX) => {
    isDown = true;
    el.classList.add("is-dragging");
    el.style.cursor = "grabbing";
    startX = pageX;
    scrollLeft = el.scrollLeft;
  };

  const onMove = (pageX) => {
    if (!isDown) return;
    const walk = (pageX - startX);
    el.scrollLeft = scrollLeft - walk;
  };

  const onUp = () => {
    isDown = false;
    el.classList.remove("is-dragging");
    el.style.cursor = "grab";
  };

  // Mouse
  el.addEventListener("mousedown", (e) => {
    // só botão esquerdo
    if (e.button !== 0) return;
    onDown(e.pageX);
  });

  window.addEventListener("mousemove", (e) => onMove(e.pageX));
  window.addEventListener("mouseup", onUp);

  // Touch
  el.addEventListener("touchstart", (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    onDown(t.pageX);
  }, { passive: true });

  el.addEventListener("touchmove", (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    onMove(t.pageX);
  }, { passive: true });

  el.addEventListener("touchend", onUp);
  el.addEventListener("mouseleave", onUp);

  // Evita clique acidental no botão quando arrastou
  let moved = false;
  el.addEventListener("mousemove", () => { if (isDown) moved = true; });
  el.addEventListener("click", (e) => {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    }
  }, true);
}



// EVENTOS


function openEventCreateModal() {
  openModalById("eventCreateModal");
}

function bindEventCreateModal() {
  const modal = document.getElementById("eventCreateModal");
  if (!modal) return;

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-event-create]")) closeModalById("eventCreateModal");
  });
}

function setEventCreateMessage(text, type="info") {
  const el = document.getElementById("eventCreateMessage");
  if (!el) return;
  el.textContent = text || "";
  el.classList.remove("is-error", "is-success");
  if (type === "error") el.classList.add("is-error");
  if (type === "success") el.classList.add("is-success");
}

function setEventCreateLoading(isLoading) {
  const btn = document.getElementById("eventCreateSubmit");
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Publicando..." : "Publicar evento";
}

async function readSingleImageAsBase64(file) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) throw new Error("Envie um arquivo de imagem válido.");
  if (file.size > 1024 * 1024) throw new Error("Imagem muito grande (máx. 1MB).");

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.readAsDataURL(file);
  });

  if (!dataUrl.startsWith("data:image/")) throw new Error("Imagem inválida.");
  return dataUrl;
}


function parseDatetimeLocal(value) {
  // "YYYY-MM-DDTHH:mm" -> Date
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function validateEventPayload(p) {
  if (!p.title || !p.description || !p.category) return "Preencha título, descrição e categoria.";
  if (!p.startAt) return "Informe a data e hora de início.";
  if (!p.placeName || !p.addressNeighborhood || !p.addressCity || !p.addressState) return "Informe local, bairro, cidade e estado.";
  if (!p.coverImage) return "Envie um banner do evento.";
  if (!p.isFree && (!p.price || p.price <= 0)) return "Informe o preço (R$) para evento pago.";
  return "";
}

async function saveEvent(form) {
  if (!auth || !db) {
    setEventCreateMessage("Firebase não foi carregado corretamente.", "error");
    return;
  }
  const user = auth.currentUser;
  if (!user) {
    setEventCreateMessage("Você precisa estar logado para anunciar evento.", "error");
    return;
  }

  setEventCreateLoading(true);
  setEventCreateMessage("Processando e publicando evento...");

  try {
    const data = new FormData(form);

    const isFree = String(data.get("isFree")) === "true";
    const price = Number(data.get("price") || 0);

    const startAtDate = parseDatetimeLocal(String(data.get("startAt") || ""));
    const endAtDate = parseDatetimeLocal(String(data.get("endAt") || ""));

    const coverFile = document.getElementById("eventCoverInput")?.files?.[0];
    const coverImage = await readSingleImageAsBase64(coverFile);

    const payload = {
      title: String(data.get("title") || "").trim(),
      description: String(data.get("description") || "").trim(),
      category: String(data.get("category") || "").trim(),
      isFree,
      price: isFree ? null : (price || null),

      startAt: startAtDate ? firebase.firestore.Timestamp.fromDate(startAtDate) : null,
      endAt: endAtDate ? firebase.firestore.Timestamp.fromDate(endAtDate) : null,

      placeName: String(data.get("placeName") || "").trim(),
      addressNeighborhood: String(data.get("neighborhood") || "").trim(),
      addressCity: String(data.get("city") || "Itapira").trim(),
      addressState: String(data.get("state") || "SP").trim(),
      addressStreet: String(data.get("street") || "").trim() || null,

      coverImage,
      status: "active",
      attendanceCount: 0,

      createdByUid: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    const err = validateEventPayload(payload);
    if (err) {
      setEventCreateMessage(err, "error");
      setEventCreateLoading(false);
      return;
    }

    await db.collection("events").add(payload);

    setEventCreateMessage("Evento publicado com sucesso!", "success");
    form.reset();
    document.getElementById("eventCoverPreview").innerHTML = "";
    setTimeout(() => closeModalById("eventCreateModal"), 800);

    loadEvents(); // recarrega lista
  } catch (e) {
    console.error(e);
    setEventCreateMessage(e?.message || "Não foi possível publicar agora.", "error");
  } finally {
    setEventCreateLoading(false);
  }
}


let eventsCache = [];
let activeEventFilter = "todos"; // todos | hoje | fim-de-semana | gratuito

function formatDateTime(ts) {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  const date = d.toLocaleDateString("pt-BR");
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} • ${time}`;
}

function buildMapsLinkFromEvent(ev) {
  const q = encodeURIComponent(
    `${ev.placeName || ""} ${ev.addressStreet || ""}, ${ev.addressNeighborhood || ""}, ${ev.addressCity || "Itapira"} - ${ev.addressState || "SP"}`
  );
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function eventMatchesFilter(ev) {
  if (activeEventFilter === "todos") return true;

  if (activeEventFilter === "gratuito") return !!ev.isFree;

  const start = ev.startAt?.toDate ? ev.startAt.toDate() : null;
  if (!start) return true;

  const now = new Date();

  if (activeEventFilter === "hoje") {
    return start.toDateString() === now.toDateString();
  }

  if (activeEventFilter === "fim-de-semana") {
    // sábado (6) e domingo (0)
    const day = start.getDay();
    return day === 6 || day === 0;
  }

  return true;
}


async function loadEvents() {
  const grid = document.getElementById("eventosGrid");
  if (grid) grid.innerHTML = `<div class="placeholder">Carregando eventos...</div>`;

  try {
    const snap = await db.collection("events")
      .where("status", "==", "active")
      .orderBy("startAt", "asc")
      .get();

    eventsCache = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
    renderEvents();
  } catch (e) {
    console.error(e);
    if (grid) grid.innerHTML = `<div class="placeholder">Não foi possível carregar os eventos agora.</div>`;
  }
}

async function setAttendance(eventId, status) {
  if (!auth?.currentUser) {
    alert("Você precisa estar logado para marcar presença.");
    return;
  }

  const uid = auth.currentUser.uid;
  const eventRef = db.collection("events").doc(eventId);
  const attendRef = eventRef.collection("attendance").doc(uid);

  try {
    await db.runTransaction(async (tx) => {
      const evSnap = await tx.get(eventRef);
      if (!evSnap.exists) throw new Error("Evento não encontrado.");

      const currentCount = Number(evSnap.data()?.attendanceCount || 0);

      const attSnap = await tx.get(attendRef);
      const prevStatus = attSnap.exists ? attSnap.data()?.status : null;

      // Regras de contagem:
      // - Se antes era "going" e agora não é, decrementa
      // - Se antes não era "going" e agora é, incrementa
      let nextCount = currentCount;

      const prevGoing = prevStatus === "going";
      const nextGoing = status === "going";

      if (prevGoing && !nextGoing) nextCount = Math.max(0, currentCount - 1);
      if (!prevGoing && nextGoing) nextCount = currentCount + 1;

      tx.set(attendRef, {
        uid,
        status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.update(eventRef, {
        attendanceCount: nextCount,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Atualiza UI local (otimista)
    const ev = eventsCache.find(e => e.id === eventId);
    if (ev) {
      // recarrega do server é mais fiel, mas isso dá sensação instantânea
      loadEvents();
    }
  } catch (e) {
    console.error(e);
    alert(e?.message || "Não foi possível marcar presença.");
  }
}

function bindEventos() {
  const section = document.getElementById("eventosSection");
  if (!section) return;

  // Abrir modal de anúncio
  document.getElementById("anunciarEventoBtn")?.addEventListener("click", () => {
    if (!auth?.currentUser) {
      alert("Você precisa estar logado para anunciar um evento.");
      return;
    }
    openEventCreateModal();
  });

  // Filtros
  section.querySelector(".eventos-filters")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".eventos-filter[data-filter]");
    if (!btn) return;

    section.querySelectorAll(".eventos-filter").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");

    activeEventFilter = btn.getAttribute("data-filter") || "todos";
    renderEvents();
  });

  // Ações dos cards (comentários + presença + mapa)
  document.getElementById("eventosGrid")?.addEventListener("click", (e) => {
    // 1) Abrir comentários
    const commentsBtn = e.target.closest(".js-open-comments");
    if (commentsBtn) {
      const card = commentsBtn.closest(".evento-card");
      const eventId = card?.getAttribute("data-event-id");
      if (!eventId) return;

      const ev = eventsCache.find((x) => x.id === eventId);
      if (ev) openEventCommentsModal(ev);
      return;
    }

    // 2) Presença (Vou / Não vou)
    const attendBtn = e.target.closest(".js-attend[data-action]");
    if (attendBtn) {
      const card = attendBtn.closest(".evento-card");
      const eventId = card?.getAttribute("data-event-id");
      if (!eventId) return;

      const action = attendBtn.getAttribute("data-action");
      if (action === "going") setAttendance(eventId, "going");
      if (action === "not_going") setAttendance(eventId, "not_going");
      return;
    }
  });

  // Submit anúncio
  const form = document.getElementById("eventCreateForm");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveEvent(form);
  });

  // Preview da capa
  document.getElementById("eventCoverInput")?.addEventListener("change", async (e) => {
    try {
      const file = e.target.files?.[0];
      const b64 = await readSingleImageAsBase64(file);
      document.getElementById("eventCoverPreview").innerHTML =
        `<img src="${b64}" alt="Prévia do banner">`;
      setEventCreateMessage("Banner selecionado.");
    } catch (err) {
      document.getElementById("eventCoverPreview").innerHTML = "";
      setEventCreateMessage(err?.message || "Falha ao processar banner.", "error");
      e.target.value = "";
    }
  });
}


let activeCommentsEventId = null;
let commentsUnsub = null;

function setEventCommentsMessage(text, type="info") {
  const el = document.getElementById("eventCommentsMessage");
  if (!el) return;
  el.textContent = text || "";
  el.classList.remove("is-error", "is-success");
  if (type === "error") el.classList.add("is-error");
  if (type === "success") el.classList.add("is-success");
}

function formatTime(ts) {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  return d.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
}

function renderCommentsList(comments) {
  const wrap = document.getElementById("eventCommentsList");
  if (!wrap) return;

  if (!comments.length) {
    wrap.innerHTML = `<div class="placeholder">Seja o primeiro a comentar.</div>`;
    return;
  }

  wrap.innerHTML = comments.map(c => `
    <div class="event-comment">
      <div class="event-comment__top">
        <span class="event-comment__name">${c.userName || "Morador"}</span>
        <span class="event-comment__time">${formatTime(c.createdAt)}</span>
      </div>
      <p class="event-comment__text">${(c.text || "").replace(/</g,"&lt;")}</p>
    </div>
  `).join("");
}


function openEventCommentsModal(eventObj) {
  if (!eventObj?.id) return;

  activeCommentsEventId = eventObj.id;

  document.getElementById("eventCommentsTitle").textContent = eventObj.title || "Evento";
  document.getElementById("eventCommentsSubtitle").textContent =
    `${eventObj.placeName || ""} · ${eventObj.addressNeighborhood || ""} · ${eventObj.addressCity || "Itapira"}`;

  // limpa estado
  document.getElementById("eventCommentInput").value = "";
  setEventCommentsMessage("");

  // cancela listener anterior
  if (commentsUnsub) {
    commentsUnsub();
    commentsUnsub = null;
  }

  // realtime
  commentsUnsub = db.collection("events")
    .doc(activeCommentsEventId)
    .collection("comments")
    .orderBy("createdAt", "asc")
    .limit(200)
    .onSnapshot((snap) => {
      const comments = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
      renderCommentsList(comments);

      // rola pro fim
      const list = document.getElementById("eventCommentsList");
      if (list) list.scrollTop = list.scrollHeight;
    }, (err) => {
      console.error(err);
      setEventCommentsMessage("Não foi possível carregar comentários agora.", "error");
    });

  openModalById("eventCommentsModal");
}


async function sendEventComment() {
  if (!activeCommentsEventId) return;

  const user = auth?.currentUser;
  if (!user) {
    setEventCommentsMessage("Você precisa estar logado para comentar.", "error");
    return;
  }

  const input = document.getElementById("eventCommentInput");
  const text = String(input?.value || "").trim();

  if (text.length < 2) {
    setEventCommentsMessage("Digite pelo menos 2 caracteres.", "error");
    return;
  }

  // simples anti-spam: limite de tamanho
  if (text.length > 280) {
    setEventCommentsMessage("Comentário muito longo (máx. 280).", "error");
    return;
  }

  const eventRef = db.collection("events").doc(activeCommentsEventId);
  const commentRef = eventRef.collection("comments").doc();

  setEventCommentsMessage("Enviando...");

  try {
    await db.runTransaction(async (tx) => {
      const evSnap = await tx.get(eventRef);
      if (!evSnap.exists) throw new Error("Evento não encontrado.");

      const currentCount = Number(evSnap.data()?.commentCount || 0);

      tx.set(commentRef, {
        uid: user.uid,
        userName: user.displayName || "Morador",
        text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      tx.update(eventRef, {
        commentCount: currentCount + 1,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });

    input.value = "";
    setEventCommentsMessage("Comentário enviado!", "success");

    // Atualiza cards (contador)
    loadEvents();
  } catch (err) {
    console.error(err);
    setEventCommentsMessage(err?.message || "Não foi possível enviar comentário.", "error");
  }
}


function bindEventCommentsModal() {
  const modal = document.getElementById("eventCommentsModal");
  if (!modal) return;

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-event-comments]")) {
      closeModalById("eventCommentsModal");

      // encerra realtime
      if (commentsUnsub) {
        commentsUnsub();
        commentsUnsub = null;
      }
      activeCommentsEventId = null;
    }
  });

  document.getElementById("eventCommentSend")?.addEventListener("click", sendEventComment);

  // Enter envia
  document.getElementById("eventCommentInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendEventComment();
    }
  });
}


function renderEvents() {
  const grid = document.getElementById("eventosGrid");
  const empty = document.getElementById("eventosEmpty");
  if (!grid || !empty) return;

  const filtered = (eventsCache || []).filter(eventMatchesFilter);

  if (!filtered.length) {
    grid.innerHTML = "";
    empty.classList.remove("is-hidden");
    return;
  }

  empty.classList.add("is-hidden");

  grid.innerHTML = filtered
    .map((ev) => {
      const badge = ev.isFree ? `<span class="evento-badge">Gratuito</span>` : "";
      const price = ev.isFree ? "" : ` • R$ ${Number(ev.price || 0)}`;
      const mapsLink = buildMapsLinkFromEvent(ev);
      const commentCount = Number(ev.commentCount || 0);
      const attendanceCount = Number(ev.attendanceCount || 0);

      return `
        <article class="evento-card" data-event-id="${ev.id}">
          <div class="evento-cover" style="background-image:url('${ev.coverImage || ""}')">
            ${badge}
          </div>

          <div class="evento-body">
            <p class="evento-date">
              <i class="fa-solid fa-calendar"></i> ${formatDateTime(ev.startAt)}${price}
            </p>

            <h3 class="evento-title">${ev.title || "Evento"}</h3>

            <p class="evento-loc">
              <i class="fa-solid fa-location-dot"></i>
              ${ev.placeName || ""} · ${ev.addressNeighborhood || ""} · ${ev.addressCity || "Itapira"}
            </p>

            <p class="evento-desc">${ev.description || ""}</p>

            <div class="evento-actions">
              <button class="btn btn-outline-primary js-attend" type="button" data-action="going">
                <i class="fa-solid fa-check"></i> Vou
              </button>

              <button class="btn btn-outline-light js-attend" type="button" data-action="not_going">
                <i class="fa-solid fa-xmark"></i> Não vou
              </button>

              <button class="btn btn-outline-light js-open-comments" type="button">
                <i class="fa-solid fa-comments"></i> ${commentCount}
              </button>

              <a class="btn btn-outline-light" href="${mapsLink}" target="_blank" rel="noopener">
                <i class="fa-solid fa-map"></i>
              </a>
            </div>

            <p class="evento-meta">
              <strong class="js-att-count">${attendanceCount}</strong> vão
            </p>
          </div>
        </article>
      `;
    })
    .join("");
}


// ========================
// LOCAIS (Pontos de Interesse)
// ========================
const LOCAIS_CATEGORIES = [
  "Todos",
  "Praças & Parques",
  "Turismo & Pontos Históricos",
  "Cultura & Lazer",
  "Esporte",
  "Saúde",
  "Educação",
  "Serviços Públicos",
  "Compras & Conveniência",
  "Igrejas & Templos",
];

const LOCAIS_CAT_ICONS = {
  "Todos": "fa-compass",
  "Praças & Parques": "fa-tree",
  "Turismo & Pontos Históricos": "fa-landmark",
  "Cultura & Lazer": "fa-masks-theater",
  "Esporte": "fa-dumbbell",
  "Saúde": "fa-heart-pulse",
  "Educação": "fa-graduation-cap",
  "Serviços Públicos": "fa-building-columns",
  "Compras & Conveniência": "fa-basket-shopping",
  "Igrejas & Templos": "fa-place-of-worship",
};

let locaisActiveCat = "Todos";

// Dados exemplo (depois vira Firestore)
const PLACES = [
  {
    id: "p1",
    name: "Praça Central",
    category: "Praças & Parques",
    short: "Ponto de encontro e eventos ao ar livre.",
    address: "Centro, Itapira - SP",
    hours: "Aberto 24h",
    phone: "",
    icon: "fa-tree",
    mapsQuery: "Praça Central Itapira SP",
    details: "Área central com circulação, bancos e espaço para eventos.",
  },
  {
    id: "p2",
    name: "Prefeitura Municipal",
    category: "Serviços Públicos",
    short: "Atendimento e serviços do município.",
    address: "Centro, Itapira - SP",
    hours: "Seg-Sex 08:00–17:00",
    phone: "",
    icon: "fa-building-columns",
    mapsQuery: "Prefeitura Itapira SP",
    details: "Serviços administrativos e atendimento ao cidadão.",
  },
  {
    id: "p3",
    name: "Hospital (referência)",
    category: "Saúde",
    short: "Serviços de saúde e atendimento.",
    address: "Itapira - SP",
    hours: "24h",
    phone: "",
    icon: "fa-heart-pulse",
    mapsQuery: "Hospital Itapira SP",
    details: "Procure o local para horários e serviços.",
  },
];

function buildMapsLink(queryOrAddress) {
  const q = encodeURIComponent(queryOrAddress || "Itapira SP");
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function renderLocaisCats() {
  const wrap = document.getElementById("locaisCats");
  if (!wrap) return;

  wrap.innerHTML = LOCAIS_CATEGORIES.map((cat) => {
    const active = cat === locaisActiveCat ? "is-active" : "";
    const icon = LOCAIS_CAT_ICONS[cat] || "fa-location-dot";
    return `
      <button class="local-cat ${active}" type="button" data-cat="${cat}">
        <span class="local-cat__icon"><i class="fa-solid ${icon}"></i></span>
        <span class="local-cat__label">${cat}</span>
      </button>
    `;
  }).join("");
}

function getLocaisFiltered() {
  if (locaisActiveCat === "Todos") return PLACES;
  return PLACES.filter((p) => p.category === locaisActiveCat);
}

function renderLocaisGrid() {
  const grid = document.getElementById("locaisGrid");
  const empty = document.getElementById("locaisEmpty");
  if (!grid || !empty) return;

  const items = getLocaisFiltered();

  if (!items.length) {
    grid.innerHTML = "";
    empty.classList.remove("is-hidden");
    return;
  }
  empty.classList.add("is-hidden");

  grid.innerHTML = items.map((p) => {
    const icon = p.icon || "fa-location-dot";

   const coverUrl =
  p.coverImage ||
  p.image ||
  p.photo ||
  p.cover ||
  "";

const coverHtml = coverUrl
  ? `<div class="local-card__cover-img" style="background-image:url('${coverUrl}')"></div>`
  : `<div class="local-card__cover-fallback"><i class="fa-solid ${icon}"></i></div>`;


    return `
      <article class="local-card" data-place-id="${p.id}">
        <div class="local-card__cover">
  ${coverHtml}
  <span class="local-card__category">${p.category}</span>
</div>


        <div class="local-card__body">
          <h3 class="local-card__name">${p.name}</h3>

          <p class="local-card__location">
            <i class="fa-solid fa-location-dot"></i>
            ${p.addressNeighborhood || ""} · ${p.addressCity || "Itapira"}
          </p>

          ${p.short ? `<p class="local-card__desc">${p.short}</p>` : ""}
        </div>
      </article>
    `;
  }).join("");
}


function openLocalDetails(place) {
  if (!place) return;

  document.getElementById("localDetailsTitle").textContent = place.name || "Local";
  document.getElementById("localDetailsSub").textContent = place.category || "";

  document.getElementById("localDetailsDesc").textContent = place.details || place.short || "Sem detalhes.";
  document.getElementById("localDetailsCat").textContent = place.category || "—";
  document.getElementById("localDetailsAddr").textContent = place.address || "—";
  document.getElementById("localDetailsHours").textContent = place.hours || "—";
  document.getElementById("localDetailsPhone").textContent = place.phone || "—";

  // ícone
  const iconEl = document.getElementById("localDetailsIcon");
  const iconClass = place.icon || "fa-location-dot";
  iconEl.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;

  // mapa
  const mapLink = document.getElementById("localDetailsMap");
  mapLink.href = buildMapsLink(place.mapsQuery || place.address);

  // telefone (opcional)
  const call = document.getElementById("localDetailsCall");
  if (place.phone) {
    call.classList.remove("is-hidden");
    call.href = `tel:${place.phone.replace(/\D/g, "")}`;
  } else {
    call.classList.add("is-hidden");
    call.href = "#";
  }

  openModalById("localDetailsModal");
}

function bindLocais() {
  const section = document.getElementById("pontosInteresseSection");
  if (!section) return;

  // categorias
  document.getElementById("locaisCats")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".local-cat[data-cat]");
    if (!btn) return;
    locaisActiveCat = btn.getAttribute("data-cat") || "Todos";
    renderLocaisCats();
    renderLocaisGrid();
  });

  // abrir detalhes
  document.getElementById("locaisGrid")?.addEventListener("click", (e) => {
  const card = e.target.closest(".local-card");
  if (!card) return;

  const placeId = card.getAttribute("data-place-id");
  const place = placesCache.find(p => p.id === placeId);
  if (place) openLocalDetails(place);

});


  // fechar modal
  document.getElementById("localDetailsModal")?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-local-details]")) closeModalById("localDetailsModal");
  });

  renderLocaisCats();
  renderLocaisGrid();
}





let placesCache = [];
let selectedPlace = null;
let isUserAdmin = false;

function onlyDigits(v){ return String(v||"").replace(/\D/g,""); }

async function readSingleImageAsBase64(file) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) throw new Error("Envie uma imagem válida.");
  if (file.size > 1024 * 1024) throw new Error("Imagem muito grande (máx. 1MB).");
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result||""));
    r.onerror = () => reject(new Error("Falha ao ler imagem."));
    r.readAsDataURL(file);
  });
  if (!dataUrl.startsWith("data:image/")) throw new Error("Imagem inválida.");
  return dataUrl;
}

function buildMapsLink(queryOrAddress){
  const q = encodeURIComponent(queryOrAddress || "Itapira SP");
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function fillCategorySelect(selectEl){
  if (!selectEl) return;
  selectEl.innerHTML = `<option value="">Selecione</option>` + LOCAIS_CATEGORIES
    .filter(c => c !== "Todos")
    .map(c => `<option value="${c}">${c}</option>`)
    .join("");
}


async function checkIsAdmin() {
  if (!auth?.currentUser || !db) return false;
  const snap = await db.collection("admins").doc(auth.currentUser.uid).get();
  return snap.exists;
}


async function loadPlaces() {
  if (!db) return;

  const snap = await db.collection("places")
    .where("status", "==", "published")
    .get();

  placesCache = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
  renderLocaisCats();
  renderLocaisGrid();
}

function renderLocaisCats() {
  const wrap = document.getElementById("locaisCats");
  if (!wrap) return;

  wrap.innerHTML = LOCAIS_CATEGORIES.map((cat) => {
    const active = cat === locaisActiveCat ? "is-active" : "";
    return `
      <button class="local-cat ${active}" type="button" data-cat="${cat}">
        <span class="local-cat__icon"><i class="fa-solid fa-location-dot"></i></span>
        <span class="local-cat__label">${cat}</span>
      </button>
    `;
  }).join("");
}

function getPlacesFiltered() {
  const byCategory = (locaisActiveCat === "Todos")
    ? placesCache
    : placesCache.filter(p => p.category === locaisActiveCat);

  return byCategory.filter(matchesSearch);
}


function renderLocaisGrid() {
  const grid = document.getElementById("locaisGrid");
  const empty = document.getElementById("locaisEmpty");
  if (!grid || !empty) return;

  const items = getPlacesFiltered();
  if (!items.length) {
    grid.innerHTML = "";
    empty.classList.remove("is-hidden");
    return;
  }
  empty.classList.add("is-hidden");

  grid.innerHTML = items.map((p) => `
    <article class="local-card" data-place-id="${p.id}">
      <div class="local-card__top">
        <div class="local-card__icon"><i class="fa-solid ${p.icon || "fa-location-dot"}"></i></div>
        <div style="min-width:0;">
          <h3 class="local-card__name">${p.name}</h3>
          <p class="local-card__meta"><i class="fa-solid fa-location-dot"></i>
            ${p.addressNeighborhood || ""} · ${p.addressCity || "Itapira"}
          </p>
        </div>
      </div>
      <span class="local-card__tag">${p.category || "Local"}</span>
      <p class="local-card__meta">${p.short || ""}</p>
    </article>
  `).join("");
}


function openLocalDetails(place) {
  selectedPlace = place;
  if (!selectedPlace) return;

  document.getElementById("localDetailsTitle").textContent = place.name || "Local";
  document.getElementById("localDetailsSub").textContent = place.category || "";

  document.getElementById("localDetailsDesc").textContent = place.description || place.short || "Sem detalhes.";
  document.getElementById("localDetailsCat").textContent = place.category || "—";


  // imagem (cover)
const coverUrl =
  place.coverImage ||
  place.image ||
  place.photo ||
  place.cover ||
  "";

const coverWrap = document.getElementById("localDetailsCoverWrap");
const coverImg = document.getElementById("localDetailsCover");

if (coverWrap && coverImg) {
  if (coverUrl) {
    coverWrap.classList.remove("is-hidden");
    coverImg.src = coverUrl;
  } else {
    coverWrap.classList.add("is-hidden");
    coverImg.src = "";
  }
}



const addr =
  place.address ||
  [
    place.addressStreet,
    place.addressNeighborhood,
    `${place.addressCity || "Itapira"} - ${place.addressState || "SP"}`
  ].filter(Boolean).join(" · ");

document.getElementById("localDetailsAddr").textContent = addr || "—";

  document.getElementById("localDetailsHours").textContent = place.hours || "—";
  document.getElementById("localDetailsPhone").textContent = place.phone || "—";

  const iconEl = document.getElementById("localDetailsIcon");
  iconEl.innerHTML = `<i class="fa-solid ${place.icon || "fa-location-dot"}"></i>`;

  document.getElementById("localDetailsMap").href = buildMapsLink(place.mapsQuery || addr);

  const call = document.getElementById("localDetailsCall");
  if (place.phone) {
    call.classList.remove("is-hidden");
    call.href = `tel:${onlyDigits(place.phone)}`;
  } else {
    call.classList.add("is-hidden");
    call.href = "#";
  }

  // rating UI
  renderRatingUI(place);

  openModalById("localDetailsModal");
}

function renderRatingUI(place) {
  const starsWrap = document.getElementById("localRatingStars");
  if (!starsWrap) return;

  const avg = Number(place.ratingAvg || 0).toFixed(1);
  const count = Number(place.ratingCount || 0);

  document.getElementById("localRatingAvg").textContent = avg;
  document.getElementById("localRatingCount").textContent = String(count);

  starsWrap.innerHTML = [1,2,3,4,5].map(v => `
    <button class="star-btn" type="button" data-star="${v}" title="${v} estrelas">
      <i class="fa-solid fa-star"></i>
    </button>
  `).join("");
}

async function ratePlace(placeId, value) {
  if (!auth?.currentUser) {
    alert("Você precisa estar logado para avaliar.");
    return;
  }
  const uid = auth.currentUser.uid;

  const placeRef = db.collection("places").doc(placeId);
  const ratingRef = placeRef.collection("ratings").doc(uid);

  try {
    await db.runTransaction(async (tx) => {
      const placeSnap = await tx.get(placeRef);
      if (!placeSnap.exists) throw new Error("Local não encontrado.");

      const place = placeSnap.data() || {};
      const prevAvg = Number(place.ratingAvg || 0);
      const prevCount = Number(place.ratingCount || 0);

      const ratingSnap = await tx.get(ratingRef);
      const hadPrev = ratingSnap.exists;
      const prevValue = hadPrev ? Number(ratingSnap.data()?.value || 0) : 0;

      // recalcula agregados
      let newCount = prevCount;
      let total = prevAvg * prevCount;

      if (hadPrev) {
        total = total - prevValue + value;
      } else {
        total = total + value;
        newCount = prevCount + 1;
      }

      const newAvg = newCount ? (total / newCount) : 0;

      tx.set(ratingRef, {
        uid,
        value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: hadPrev ? ratingSnap.data()?.createdAt : firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.update(placeRef, {
        ratingAvg: newAvg,
        ratingCount: newCount,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });

    // reflete na UI
    await loadPlaces();
    const updated = placesCache.find(p => p.id === placeId);
    if (updated) openLocalDetails(updated);

  } catch (e) {
    console.error(e);
    alert(e?.message || "Não foi possível salvar sua avaliação.");
  }
}


async function submitPlaceSuggestion(form) {
  if (!auth?.currentUser) {
    alert("Você precisa estar logado para sugerir.");
    return;
  }

  const data = new FormData(form);
  const coverFile = document.getElementById("placeSuggestCover")?.files?.[0];
  let coverImage = "";

  try {
    if (coverFile) coverImage = await readSingleImageAsBase64(coverFile);

    const payload = {
      status: "pending",
      name: String(data.get("name") || "").trim(),
      category: String(data.get("category") || "").trim(),
      icon: String(data.get("icon") || "").trim() || null,
      short: String(data.get("short") || "").trim(),
      description: String(data.get("description") || "").trim(),

      addressNeighborhood: String(data.get("neighborhood") || "").trim(),
      addressCity: String(data.get("city") || "Itapira").trim(),
      addressState: String(data.get("state") || "SP").trim(),
      addressStreet: String(data.get("street") || "").trim() || null,

      hours: String(data.get("hours") || "").trim() || null,
      phone: String(data.get("phone") || "").trim() || null,
      mapsQuery: String(data.get("mapsQuery") || "").trim() || null,

      coverImage: coverImage || null,

      suggestedByUid: auth.currentUser.uid,
      suggestedByName: auth.currentUser.displayName || "Morador",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      reviewedByUid: null,
      reviewedAt: null,
      reviewNote: null,
    };

    if (!payload.name || !payload.category || !payload.short || !payload.description) {
      document.getElementById("placeSuggestMsg").textContent = "Preencha nome, categoria, descrição curta e completa.";
      return;
    }

    await db.collection("place_suggestions").add(payload);

    document.getElementById("placeSuggestMsg").textContent = "Sugestão enviada! Aguarde revisão do ADM.";
    form.reset();
    document.getElementById("placeSuggestPreview").innerHTML = "";
    setTimeout(() => closeModalById("placeSuggestModal"), 900);

  } catch (e) {
    console.error(e);
    document.getElementById("placeSuggestMsg").textContent = e?.message || "Falha ao enviar sugestão.";
  }
}


async function savePlaceAdmin(form) {
  if (!isUserAdmin) {
    alert("Acesso restrito ao ADM.");
    return;
  }

  const data = new FormData(form);
  const placeId = String(data.get("placeId") || "").trim();
  const coverFile = document.getElementById("placeAdminCover")?.files?.[0];

  let coverImage = "";
  try { if (coverFile) coverImage = await readSingleImageAsBase64(coverFile); } catch(e){}

  const payload = {
    status: String(data.get("status") || "published"),
    name: String(data.get("name") || "").trim(),
    category: String(data.get("category") || "").trim(),
    icon: String(data.get("icon") || "").trim() || "fa-location-dot",
    short: String(data.get("short") || "").trim(),
    description: String(data.get("description") || "").trim(),
    addressNeighborhood: String(data.get("neighborhood") || "").trim(),
    addressCity: String(data.get("city") || "Itapira").trim(),
    addressState: String(data.get("state") || "SP").trim(),
    addressStreet: String(data.get("street") || "").trim() || null,
    hours: String(data.get("hours") || "").trim() || null,
    phone: String(data.get("phone") || "").trim() || null,
    mapsQuery: String(data.get("mapsQuery") || "").trim() || null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  if (!payload.name || !payload.category || !payload.short || !payload.description) {
    document.getElementById("placeAdminMsg").textContent = "Preencha nome, categoria, descrição curta e completa.";
    return;
  }

  const ref = placeId ? db.collection("places").doc(placeId) : db.collection("places").doc();
  const snap = await ref.get();

  await ref.set({
    ...payload,
    coverImage: coverImage ? coverImage : (snap.exists ? (snap.data()?.coverImage || null) : null),
    ratingAvg: snap.exists ? Number(snap.data()?.ratingAvg || 0) : 0,
    ratingCount: snap.exists ? Number(snap.data()?.ratingCount || 0) : 0,
    createdByUid: snap.exists ? snap.data()?.createdByUid : auth.currentUser.uid,
    createdByName: snap.exists ? snap.data()?.createdByName : (auth.currentUser.displayName || "ADM"),
    createdAt: snap.exists ? snap.data()?.createdAt : firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  document.getElementById("placeAdminMsg").textContent = "Local salvo!";
  await loadPlaces();
}

async function deletePlaceAdmin() {
  const form = document.getElementById("placeAdminForm");
  const data = new FormData(form);
  const placeId = String(data.get("placeId") || "").trim();
  if (!placeId) return alert("Selecione um local para excluir.");
  if (!isUserAdmin) return alert("Acesso restrito ao ADM.");

  await db.collection("places").doc(placeId).delete();
  document.getElementById("placeAdminMsg").textContent = "Local excluído.";
  await loadPlaces();
}



function bindLocaisFirestore() {
  const section = document.getElementById("pontosInteresseSection");
  if (!section) return;

  // selects dos forms
  fillCategorySelect(document.querySelector("#placeSuggestForm select[name='category']"));
  fillCategorySelect(document.querySelector("#placeAdminForm select[name='category']"));

  // categorias
  document.getElementById("locaisCats")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".local-cat[data-cat]");
    if (!btn) return;
    locaisActiveCat = btn.getAttribute("data-cat") || "Todos";
    renderLocaisCats();
    renderLocaisGrid();
  });

  // abrir detalhes
document.getElementById("locaisGrid")?.addEventListener("click", (e) => {
  const card = e.target.closest(".local-card[data-place-id]");
  if (!card) return;

  const placeId = card.getAttribute("data-place-id");
  const place = placesCache.find(p => p.id === placeId);
  if (!place) return;

  openLocalDetails(place);
});


  // fechar modal detalhes
  document.getElementById("localDetailsModal")?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-local-details]")) closeModalById("localDetailsModal");
  });

  // rating click
  document.getElementById("localRatingStars")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".star-btn[data-star]");
    if (!btn || !selectedPlace?.id) return;
    const v = Number(btn.getAttribute("data-star"));
    ratePlace(selectedPlace.id, v);
  });

  // abrir sugerir
  document.getElementById("suggestPlaceBtn")?.addEventListener("click", () => {
    if (!auth?.currentUser) return alert("Você precisa estar logado para sugerir.");
    openModalById("placeSuggestModal");
  });

  // fechar sugerir
  document.getElementById("placeSuggestModal")?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-place-suggest]")) closeModalById("placeSuggestModal");
  });

  // preview sugerir
  document.getElementById("placeSuggestCover")?.addEventListener("change", async (e) => {
    try{
      const b64 = await readSingleImageAsBase64(e.target.files?.[0]);
      document.getElementById("placeSuggestPreview").innerHTML = `<img src="${b64}" alt="Prévia">`;
    }catch(err){
      document.getElementById("placeSuggestPreview").innerHTML = "";
      e.target.value = "";
    }
  });

  // submit sugerir
  document.getElementById("placeSuggestForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    submitPlaceSuggestion(e.target);
  });

  // admin abrir
  document.getElementById("adminPlaceBtn")?.addEventListener("click", () => {
    if (!isUserAdmin) return alert("Acesso restrito ao ADM.");
    openModalById("placeAdminModal");
  });

  // fechar admin
  document.getElementById("placeAdminModal")?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-place-admin]")) closeModalById("placeAdminModal");
  });

  // preview admin
  document.getElementById("placeAdminCover")?.addEventListener("change", async (e) => {
    try{
      const b64 = await readSingleImageAsBase64(e.target.files?.[0]);
      document.getElementById("placeAdminPreview").innerHTML = `<img src="${b64}" alt="Prévia">`;
    }catch(err){
      document.getElementById("placeAdminPreview").innerHTML = "";
      e.target.value = "";
    }
  });

  const searchInput = document.getElementById("locaisSearch");
const clearBtn = document.getElementById("locaisSearchClear");

searchInput?.addEventListener("input", () => {
  locaisQuery = normalizeText(searchInput.value);

  if (locaisQuery) {
    locaisActiveCat = "Todos";
    renderLocaisCats();
  }

  renderLocaisGrid();
});


clearBtn?.addEventListener("click", () => {
  locaisQuery = "";
  if (searchInput) searchInput.value = "";
  renderLocaisGrid();
});


  // salvar admin
  document.getElementById("placeAdminForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    savePlaceAdmin(e.target);
  });

  document.getElementById("placeAdminDelete")?.addEventListener("click", deletePlaceAdmin);
}


let locaisQuery = "";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function buildPlaceHaystack(p) {
  // “todos os textos” (orgânico)
  return normalizeText([
    p.name,
    p.category,
    p.short,
    p.description,
    p.addressNeighborhood,
    p.addressCity,
    p.addressState,
    p.addressStreet,
    p.hours,
    p.phone,
    p.mapsQuery,
  ].filter(Boolean).join(" "));
}

function matchesSearch(p) {
  if (!locaisQuery) return true;
  const hay = buildPlaceHaystack(p);
  return hay.includes(locaisQuery);
}



const scroller = document.getElementById("comerciosCategories");

let isDown = false;
let startX;
let scrollLeft;

scroller?.addEventListener("mousedown", (e) => {
  isDown = true;
  scroller.classList.add("dragging");
  startX = e.pageX - scroller.offsetLeft;
  scrollLeft = scroller.scrollLeft;
});

scroller?.addEventListener("mouseleave", () => isDown = false);
scroller?.addEventListener("mouseup", () => isDown = false);

scroller?.addEventListener("mousemove", (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - scroller.offsetLeft;
  const walk = (x - startX) * 1.6;
  scroller.scrollLeft = scrollLeft - walk;
});


document.getElementById("comerciosCategories")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".comercio-cat[data-category]");
  if (!btn) return;

  document.querySelectorAll(".comercio-cat")
    .forEach(b => b.classList.remove("is-active"));

  btn.classList.add("is-active");

  const category = btn.getAttribute("data-category") || "todos";

  // usa sua função existente
  filterStoresByCategory(category);
});


function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function buildStoreHaystack(store) {
  return normalizeText([
    store.name,
    store.category,
    store.description,
    store.fulfillment,
    store.whatsapp,
    ...(store.categories || []),
  ].filter(Boolean).join(" "));
}

function buildProductHaystack(store, product) {
  return normalizeText([
    store.name,
    store.category,
    product?.name,
    product?.category,
    product?.description,
  ].filter(Boolean).join(" "));
}

function moneyBR(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}



function buildMiniProductCard(store, product) {
  const image = product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=900&auto=format&fit=crop";
  const category = product.category || store.category || "Produto";
  const price = moneyBR(product.price);
  const storeUid = store.uid || "";

  return `
    <article class="product-mini">
      <div class="product-mini__media">
        <img src="${image}" alt="${product.name || "Produto"}" loading="lazy">
      </div>
      <div class="product-mini__body">
        <h5 class="product-mini__name">${product.name || "Produto"}</h5>
        <p class="product-mini__desc">${product.description || ""}</p>
        <div class="product-mini__meta">
          <span class="product-mini__price">${price}</span>
          <span class="product-mini__tag">${category}</span>
        </div>
        <div class="product-mini__actions">
          <a class="btn btn-outline-light comercios-secondary" href="Vitrine.html?storeUid=${encodeURIComponent(storeUid)}">
            Ver vitrine
          </a>
        </div>
      </div>
    </article>
  `;
}

function renderComerciosSearchResults(query) {
  const wrap = document.getElementById("comerciosSearchResults");
  const storesEl = document.getElementById("comerciosSearchStores");
  const productsEl = document.getElementById("comerciosSearchProducts");
  const countEl = document.getElementById("comerciosSearchCount");
  const prodCountEl = document.getElementById("comerciosProductsCount");

  if (!wrap || !storesEl || !productsEl) return;

  const q = normalizeText(query);
  if (!q) {
    wrap.classList.add("is-hidden");
    storesEl.innerHTML = "";
    productsEl.innerHTML = "";
    countEl && (countEl.textContent = "");
    prodCountEl && (prodCountEl.textContent = "");
    return;
  }

  // Lojas que combinam
  const matchedStores = (storesCache || []).filter((s) => buildStoreHaystack(s).includes(q));

  // Produtos que combinam (flatten)
  const matchedProducts = [];
  (storesCache || []).forEach((store) => {
    (store.products || []).forEach((product) => {
      if (buildProductHaystack(store, product).includes(q)) {
        matchedProducts.push({ store, product });
      }
    });
  });

  // Limite pra não “explodir”
  const maxStores = 12;
  const maxProducts = 16;

  wrap.classList.remove("is-hidden");

  countEl && (countEl.textContent = `${matchedStores.length} comércio(s)`);
  prodCountEl && (prodCountEl.textContent = `${matchedProducts.length} produto(s)`);

  storesEl.innerHTML = matchedStores.slice(0, maxStores).map((s) => buildStoreCard(s)).join("")
    || `<div class="store-card__empty">Nenhum comércio encontrado.</div>`;

  productsEl.innerHTML = matchedProducts.slice(0, maxProducts).map(({ store, product }) => buildMiniProductCard(store, product)).join("")
    || `<div class="store-card__empty">Nenhum produto encontrado.</div>`;
}


function bindComerciosSearch() {
  const input = document.getElementById("comerciosSearch");
  const clear = document.getElementById("comerciosSearchClear");
  if (!input) return;

  input.addEventListener("input", () => {
    renderComerciosSearchResults(input.value);
  });

  clear?.addEventListener("click", () => {
    input.value = "";
    renderComerciosSearchResults("");
    input.focus();
  });
}
