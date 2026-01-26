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

const form = document.getElementById("servicesProfileForm");
const statusCard = document.getElementById("dashboardStatus");
const messageEl = document.getElementById("servicesProfileMessage");
const submitBtn = document.getElementById("servicesProfileSubmit");
const refreshBtn = document.getElementById("refreshService");
const previewImage = document.getElementById("serviceImagePreview");
const imageInput = document.getElementById("serviceImageFile");

let currentUid = "";
let currentProfile = null;

function setStatus(message, type = "info") {
  if (!statusCard) return;
  statusCard.classList.remove("is-success", "is-warning");
  if (type === "success") statusCard.classList.add("is-success");
  if (type === "warning") statusCard.classList.add("is-warning");
  statusCard.innerHTML = `
    <div class="status-card__title">
      <i class="fa-solid ${
        type === "success" ? "fa-circle-check" : type === "warning" ? "fa-triangle-exclamation" : "fa-bolt"
      }"></i>
      ${message}
    </div>
    <div class="muted">Tudo fica salvo em users/{uid}.servicesProfile.</div>
  `;
}

function setMessage(text, type = "info") {
  if (!messageEl) return;
  messageEl.textContent = text || "";
  messageEl.classList.remove("is-error", "is-success");
  if (type === "error") messageEl.classList.add("is-error");
  if (type === "success") messageEl.classList.add("is-success");
}

function setLoading(isLoading) {
  if (submitBtn) {
    submitBtn.disabled = isLoading;
    submitBtn.innerHTML = isLoading
      ? '<i class="fa-solid fa-spinner"></i> Salvando...'
      : '<i class="fa-solid fa-floppy-disk"></i> Salvar alterações';
  }
  if (refreshBtn) refreshBtn.disabled = isLoading;
}

function normalizeWhatsApp(value) {
  return String(value || "").replace(/\D/g, "");
}

function fillForm(profile) {
  if (!form || !profile) return;
  form.elements.serviceTitle.value = profile.title || "";
  form.elements.serviceCategory.value = profile.category || "";
  form.elements.serviceWhatsApp.value = profile.whatsapp || "";
  form.elements.serviceArea.value = profile.area || "";
  form.elements.serviceDescription.value = profile.description || "";
  if (previewImage) {
    previewImage.src = profile.imageData || "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=1974&auto=format&fit=crop";
  }
}

function validatePayload(payload) {
  if (!payload.title || !payload.category || !payload.whatsapp || !payload.area || !payload.description) {
    return "Preencha todos os campos obrigatórios.";
  }
  if (payload.whatsapp.length < 12) {
    return "Informe o WhatsApp com DDI e DDD. Ex: 5511999990000.";
  }
  return "";
}

async function loadProfile() {
  if (!currentUid) return;
  setStatus("Carregando seu anúncio...");
  setMessage("");
  try {
    const snap = await db.collection("users").doc(currentUid).get();
    const profile = snap.data()?.servicesProfile;
    if (!profile) {
      currentProfile = null;
      fillForm({});
      setStatus("Você ainda não publicou um serviço.", "warning");
      return;
    }
    currentProfile = profile;
    fillForm(profile);
    setStatus("Anúncio carregado e pronto para edição.", "success");
  } catch (err) {
    console.error(err);
    setStatus("Não foi possível carregar o anúncio agora.", "warning");
  }
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Falha ao ler imagem."));
    reader.readAsDataURL(file);
  });
}

async function handleSubmit(e) {
  e.preventDefault();
  if (!currentUid) return;

  const payload = {
    title: form.elements.serviceTitle.value.trim(),
    category: form.elements.serviceCategory.value.trim(),
    whatsapp: normalizeWhatsApp(form.elements.serviceWhatsApp.value),
    area: form.elements.serviceArea.value.trim(),
    description: form.elements.serviceDescription.value.trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  const validationError = validatePayload(payload);
  if (validationError) {
    setMessage(validationError, "error");
    return;
  }

  let imageData = currentProfile?.imageData || "";
  const file = imageInput?.files?.[0];

  if (file) {
    const dataUrl = await fileToDataUrl(file);
    if (!dataUrl.startsWith("data:image/")) {
      setMessage("Arquivo inválido. Envie uma imagem válida.", "error");
      return;
    }
    if (dataUrl.length > 900000) {
      setMessage("Imagem muito grande. Envie uma foto com até 1MB.", "error");
      return;
    }
    imageData = dataUrl;
  }

  if (!imageData) {
    setMessage("Envie uma foto do serviço realizado para continuar.", "error");
    return;
  }

  setLoading(true);
  setMessage("Salvando alterações...");

  try {
    await db.collection("users").doc(currentUid).set(
      {
        uid: currentUid,
        servicesProfile: {
          ...payload,
          imageData,
          imageName: file?.name || currentProfile?.imageName || "",
          createdAt: currentProfile?.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
    setMessage("Serviço atualizado com sucesso.", "success");
    setStatus("Anúncio salvo e publicado.", "success");
    if (file && previewImage) previewImage.src = imageData;
    await loadProfile();
  } catch (err) {
    console.error(err);
    setMessage("Não foi possível salvar agora. Tente novamente.", "error");
    setStatus("Falha ao salvar no Firestore.", "warning");
  } finally {
    setLoading(false);
  }
}

function bindEvents() {
  form?.addEventListener("submit", handleSubmit);
  refreshBtn?.addEventListener("click", loadProfile);
  imageInput?.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    if (previewImage) previewImage.src = dataUrl;
  });
  document.getElementById("logoutServices")?.addEventListener("click", async () => {
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
  loadProfile();
});
