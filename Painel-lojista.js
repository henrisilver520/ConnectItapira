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
const storage = firebase.storage();

let currentUid = "";
let storeData = null;

const painelStatus = document.getElementById("painelStatus");
const painelStoreTitle = document.getElementById("painelStoreTitle");

const storeSettingsForm = document.getElementById("storeSettingsForm");
const storeSettingsMessage = document.getElementById("storeSettingsMessage");
const storeSettingsSubmit = document.getElementById("storeSettingsSubmit");

const categoryForm = document.getElementById("categoryForm");
const categoryNameInput = document.getElementById("categoryName");
const categoryMessage = document.getElementById("categoryMessage");
const categoryList = document.getElementById("categoryList");

const productForm = document.getElementById("productForm");
const productEditingId = document.getElementById("productEditingId");
const productName = document.getElementById("productName");
const productCategory = document.getElementById("productCategory");
const productPrice = document.getElementById("productPrice");
const productImage = document.getElementById("productImage"); // por enquanto URL
const productDescription = document.getElementById("productDescription");
const productMessage = document.getElementById("productMessage");
const productList = document.getElementById("productList");
const productCancelEdit = document.getElementById("productCancelEdit");
const productSubmit = document.getElementById("productSubmit");

// ===== NOVO: LOGO UPLOAD =====
const storeLogoPreview = document.getElementById("storeLogoPreview");
const storeLogoFile = document.getElementById("storeLogoFile");
const storeLogoUploadBtn = document.getElementById("storeLogoUploadBtn");
const storeLogoMessage = document.getElementById("storeLogoMessage");

function setStatus(message, type = "info") {
  if (!painelStatus) return;
  painelStatus.classList.remove("is-warning", "is-success");
  if (type === "warning") painelStatus.classList.add("is-warning");
  if (type === "success") painelStatus.classList.add("is-success");

  painelStatus.innerHTML = `
    <div class="status-card__title">
      <i class="fa-solid ${
        type === "success"
          ? "fa-circle-check"
          : type === "warning"
          ? "fa-triangle-exclamation"
          : "fa-bolt"
      }"></i>
      ${message}
    </div>
  `;
}

function setFormMessage(el, text, type = "info") {
  if (!el) return;
  el.textContent = text || "";
  el.classList.remove("is-error", "is-success");
  if (type === "error") el.classList.add("is-error");
  if (type === "success") el.classList.add("is-success");
}

function normalizeWhatsApp(value) {
  return String(value || "").replace(/\D/g, "");
}

function parsePrice(value) {
  const normalized = String(value || "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function moneyBR(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function ensureStoreShape(data) {
  const base = data && typeof data === "object" ? data : {};
  base.categories = Array.isArray(base.categories) ? base.categories : [];
  base.products = Array.isArray(base.products) ? base.products : [];
  return base;
}

function fillStoreForm(store) {
  if (!storeSettingsForm || !store) return;

  storeSettingsForm.elements.storeName.value = store.name || "";
  storeSettingsForm.elements.storeCategory.value = store.category || "";
  storeSettingsForm.elements.storeWhatsApp.value = store.whatsapp || "";
  storeSettingsForm.elements.storeFulfillment.value = store.fulfillment || "";
  storeSettingsForm.elements.storeDescription.value = store.description || "";

  // preview do logo salvo
  if (storeLogoPreview) {
    storeLogoPreview.src =
      store.logoUrl || "https://via.placeholder.com/280x120?text=LOGO";
  }
}

function fillProductCategoryOptions(categories) {
  if (!productCategory) return;
  const currentValue = productCategory.value;

  productCategory.innerHTML = '<option value="">Selecione</option>';
  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    productCategory.appendChild(opt);
  });

  if (currentValue && categories.includes(currentValue)) {
    productCategory.value = currentValue;
  }
}

function renderCategories(categories) {
  if (!categoryList) return;
  categoryList.innerHTML = "";

  if (!categories.length) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "Nenhuma categoria ainda. Crie a primeira.";
    categoryList.appendChild(empty);
    return;
  }

  categories.forEach((name) => {
    const li = document.createElement("li");
    li.className = "category-item";
    li.innerHTML = `
      <span class="category-item__name">${name}</span>
      <div class="category-actions">
        <button class="btn btn-ghost" type="button" data-action="edit-category" data-name="${name}">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-danger" type="button" data-action="delete-category" data-name="${name}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    categoryList.appendChild(li);
  });
}

function renderProducts(products) {
  if (!productList) return;
  productList.innerHTML = "";

  if (!products.length) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "Nenhum produto cadastrado ainda.";
    productList.appendChild(empty);
    return;
  }

  products.forEach((p) => {
    const li = document.createElement("li");
    li.className = "product-item";
    li.innerHTML = `
      <div class="product-item__top">
        <div class="product-item__title">${p.name}</div>
        <div class="actions-row">
          <button class="btn btn-ghost" type="button" data-action="edit-product" data-id="${p.id}">
            <i class="fa-solid fa-pen"></i>
            Editar
          </button>
          <button class="btn btn-danger" type="button" data-action="delete-product" data-id="${p.id}">
            <i class="fa-solid fa-trash"></i>
            Remover
          </button>
        </div>
      </div>
      <div class="product-item__meta">
        <span class="tag">${p.category || "Sem categoria"}</span>
        <span>${moneyBR(p.price)}</span>
      </div>
      <div class="muted">${p.description || "Sem descrição."}</div>
      ${p.image ? `<a class="muted" href="${p.image}" target="_blank" rel="noopener">Ver imagem</a>` : ""}
    `;
    productList.appendChild(li);
  });
}

function renderAll(store) {
  const safeStore = ensureStoreShape(store);

  fillStoreForm(safeStore);
  fillProductCategoryOptions(safeStore.categories);

  renderCategories(safeStore.categories);
  renderProducts(safeStore.products);

  if (painelStoreTitle) painelStoreTitle.textContent = safeStore.name || "Minha Loja";
}

function getStorePayloadFromForm() {
  const data = new FormData(storeSettingsForm);
  return {
    name: String(data.get("storeName") || "").trim(),
    category: String(data.get("storeCategory") || "").trim(),
    whatsapp: normalizeWhatsApp(data.get("storeWhatsApp")),
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

function getProductPayload() {
  const priceValue = parsePrice(productPrice.value);
  return {
    id: productEditingId.value || `prod_${Date.now()}`,
    name: productName.value.trim(),
    category: productCategory.value.trim(),
    price: priceValue,
    image: productImage.value.trim(), // ainda URL
    description: productDescription.value.trim(),
    updatedAt: Date.now(),
  };
}

function validateProduct(payload) {
  if (!payload.name || !payload.category || !payload.description) {
    return "Preencha nome, categoria e descrição do produto.";
  }
  if (!Number.isFinite(payload.price) || payload.price <= 0) {
    return "Informe um preço válido para o produto.";
  }
  return "";
}

async function saveStore(storePatch, messageTarget, successMessage) {
  if (!currentUid) return;

  try {
    await db.collection("users").doc(currentUid).set(
      {
        uid: currentUid,
        store: {
          ...storeData,
          ...storePatch,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

    setFormMessage(messageTarget, successMessage, "success");
    setStatus("Loja atualizada com sucesso.", "success");
    await loadStore();
  } catch (err) {
    console.error(err);
    setFormMessage(messageTarget, "Não foi possível salvar agora.", "error");
    setStatus("Falha ao salvar no Firestore.", "warning");
  }
}

async function loadStore() {
  if (!currentUid) return;
  setStatus("Carregando dados da loja...");

  try {
    const snap = await db.collection("users").doc(currentUid).get();
    const data = snap.data()?.store;

    if (!data) {
      storeData = ensureStoreShape({});
      renderAll(storeData);
      setStatus("Você ainda não criou sua loja.", "warning");
      return;
    }

    storeData = ensureStoreShape(data);
    renderAll(storeData);
    setStatus("Painel pronto para edição.", "success");
  } catch (err) {
    console.error(err);
    setStatus("Não foi possível carregar sua loja agora.", "warning");
  }
}

async function handleStoreSubmit(e) {
  e.preventDefault();

  const payload = getStorePayloadFromForm();
  const error = validateStorePayload(payload);

  if (error) {
    setFormMessage(storeSettingsMessage, error, "error");
    return;
  }

  storeSettingsSubmit.disabled = true;
  setFormMessage(storeSettingsMessage, "Salvando configurações...");

  await saveStore(payload, storeSettingsMessage, "Configurações salvas.");
  storeSettingsSubmit.disabled = false;
}

async function handleCategorySubmit(e) {
  e.preventDefault();
  if (!storeData) return;

  const name = categoryNameInput.value.trim();
  if (!name) {
    setFormMessage(categoryMessage, "Informe um nome de categoria.", "error");
    return;
  }

  if (storeData.categories.includes(name)) {
    setFormMessage(categoryMessage, "Essa categoria já existe.", "error");
    return;
  }

  const categories = [...storeData.categories, name];
  categoryNameInput.value = "";
  setFormMessage(categoryMessage, "Salvando categoria...");
  await saveStore({ categories }, categoryMessage, "Categoria adicionada.");
}

async function handleCategoryActions(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn || !storeData) return;

  const action = btn.getAttribute("data-action");
  const name = btn.getAttribute("data-name");
  if (!action || !name) return;

  if (action === "delete-category") {
    const categories = storeData.categories.filter((c) => c !== name);
    const products = storeData.products.map((p) => (p.category === name ? { ...p, category: "" } : p));
    await saveStore({ categories, products }, categoryMessage, "Categoria removida.");
    return;
  }

  if (action === "edit-category") {
    const next = prompt("Novo nome da categoria:", name);
    if (!next) return;

    const trimmed = next.trim();
    if (!trimmed) return;

    const categories = storeData.categories.map((c) => (c === name ? trimmed : c));
    const products = storeData.products.map((p) => (p.category === name ? { ...p, category: trimmed } : p));
    await saveStore({ categories, products }, categoryMessage, "Categoria atualizada.");
  }
}

function resetProductForm() {
  productEditingId.value = "";
  productForm.reset();
  productSubmit.innerHTML = '<i class="fa-solid fa-box"></i> Salvar produto';
}

async function handleProductSubmit(e) {
  e.preventDefault();
  if (!storeData) return;

  const payload = getProductPayload();
  const error = validateProduct(payload);

  if (error) {
    setFormMessage(productMessage, error, "error");
    return;
  }

  const existsIndex = storeData.products.findIndex((p) => p.id === payload.id);
  const products = [...storeData.products];

  if (existsIndex >= 0) products[existsIndex] = payload;
  else products.unshift(payload);

  setFormMessage(productMessage, "Salvando produto...");
  await saveStore({ products }, productMessage, "Produto salvo com sucesso.");
  resetProductForm();
}

async function handleProductActions(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn || !storeData) return;

  const action = btn.getAttribute("data-action");
  const id = btn.getAttribute("data-id");
  if (!action || !id) return;

  if (action === "delete-product") {
    const products = storeData.products.filter((p) => p.id !== id);
    await saveStore({ products }, productMessage, "Produto removido.");
    return;
  }

  if (action === "edit-product") {
    const product = storeData.products.find((p) => p.id === id);
    if (!product) return;

    productEditingId.value = product.id;
    productName.value = product.name || "";
    productCategory.value = product.category || "";
    productPrice.value = String(product.price ?? "").replace(".", ",");
    productImage.value = product.image || "";
    productDescription.value = product.description || "";

    productSubmit.innerHTML = '<i class="fa-solid fa-pen"></i> Atualizar produto';
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// ===== NOVO: preview do arquivo selecionado =====
function bindLogoPreview() {
  if (!storeLogoFile || !storeLogoPreview) return;

  storeLogoFile.addEventListener("change", () => {
    const file = storeLogoFile.files?.[0];
    if (!file) return;

    // preview local
    const url = URL.createObjectURL(file);
    storeLogoPreview.src = url;
    setFormMessage(storeLogoMessage, "Arquivo selecionado. Clique em “Enviar logo”.");
  });
}

// ===== NOVO: upload do logo para Firebase Storage =====
async function handleLogoUpload() {
  if (!currentUid) return;

  const file = storeLogoFile?.files?.[0];
  if (!file) {
    setFormMessage(storeLogoMessage, "Selecione uma imagem primeiro.", "error");
    return;
  }

  // validação simples
  if (!file.type.startsWith("image/")) {
    setFormMessage(storeLogoMessage, "O arquivo precisa ser uma imagem (PNG/JPG).", "error");
    return;
  }
  const maxMB = 2;
  if (file.size > maxMB * 1024 * 1024) {
    setFormMessage(storeLogoMessage, `Imagem muito grande. Máximo: ${maxMB}MB.`, "error");
    return;
  }

  try {
    storeLogoUploadBtn.disabled = true;
    setFormMessage(storeLogoMessage, "Enviando logo...");

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `stores/${currentUid}/logo_${Date.now()}.${ext}`;

    const ref = storage.ref().child(path);

    // upload
    await ref.put(file, { contentType: file.type });

    // url final
    const downloadURL = await ref.getDownloadURL();

    // salva no store
    await saveStore({ logoUrl: downloadURL }, storeLogoMessage, "Logo atualizado com sucesso.");

    // limpa input (opcional)
    if (storeLogoFile) storeLogoFile.value = "";
  } catch (err) {
    console.error(err);
    setFormMessage(storeLogoMessage, "Falha ao enviar logo. Tente novamente.", "error");
    setStatus("Falha ao enviar logo.", "warning");
  } finally {
    if (storeLogoUploadBtn) storeLogoUploadBtn.disabled = false;
  }
}

function bindEvents() {
  storeSettingsForm?.addEventListener("submit", handleStoreSubmit);

  categoryForm?.addEventListener("submit", handleCategorySubmit);
  categoryList?.addEventListener("click", handleCategoryActions);

  productForm?.addEventListener("submit", handleProductSubmit);
  productList?.addEventListener("click", handleProductActions);
  productCancelEdit?.addEventListener("click", resetProductForm);

  document.getElementById("refreshStoreBtn")?.addEventListener("click", loadStore);

  // logo
  bindLogoPreview();
  storeLogoUploadBtn?.addEventListener("click", handleLogoUpload);

  document.getElementById("btnLogoutPainel")?.addEventListener("click", async () => {
    try {
      await auth.signOut();
    } finally {
      window.location.href = "login.html";
    }
  });
}

auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUid = user.uid;
  bindEvents();
  loadStore();
});
