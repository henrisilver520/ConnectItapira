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
    <span class="store-card__category">${category}</span>
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

bindImoveis();
bindImovelDetailsModal();
bindImovelAnuncioModal();
loadPropertiesFromFirestore();

  enableDragScroll(document.getElementById("nav-header-buttons"));


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

function renderEventos(eventos = []) {
  const grid = document.getElementById("eventosGrid");
  const empty = document.getElementById("eventosEmpty");
  if (!grid) return;

  if (!eventos.length) {
    grid.innerHTML = "";
    empty.classList.remove("is-hidden");
    return;
  }

  empty.classList.add("is-hidden");

  grid.innerHTML = eventos.map(ev => `
    <article class="evento-card">
      <div class="evento-cover" style="background-image:url('${ev.cover || ""}')">
        ${ev.gratuito ? `<span class="evento-badge">Gratuito</span>` : ""}
      </div>

      <div class="evento-body">
        <p class="evento-date">
          <i class="fa-solid fa-calendar"></i> ${ev.data} • ${ev.hora}
        </p>

        <h3 class="evento-title">${ev.titulo}</h3>

        <p class="evento-loc">
          <i class="fa-solid fa-location-dot"></i> ${ev.local}
        </p>

        <p class="evento-desc">${ev.descricao}</p>

        <div class="evento-actions">
          <button class="btn btn-outline-primary">
            <i class="fa-solid fa-check"></i> Vou
          </button>

          <button class="btn btn-outline-light">
            <i class="fa-solid fa-comments"></i> Comentários
          </button>
        </div>
      </div>
    </article>
  `).join("");
}
