// ======================
// Firebase config (use o seu)
// ======================
const firebaseConfig = {
  apiKey: "AIzaSyA-7HOp-Ycvyf3b_03ev__8aJEwAbWSQZY",
  authDomain: "connectfamilia-312dc.firebaseapp.com",
  projectId: "connectfamilia-312dc",
  storageBucket: "connectfamilia-312dc.appspot.com",
  messagingSenderId: "797817838649",
  appId: "1:797817838649:web:1aa7c54abd97661f8d81e8",
  measurementId: "G-QKN9NFXZZQ",
};

function initFirebase() {
  if (!window.firebase) return;
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  db = firebase.firestore();
}

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const LOCAIS_CATEGORIES = [
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

const els = {
  adminState: document.getElementById("adminState"),
  pendingCount: document.getElementById("pendingCount"),
  grid: document.getElementById("suggestionsGrid"),
  empty: document.getElementById("emptyState"),

  btnRefresh: document.getElementById("btnRefresh"),
  btnLogout: document.getElementById("btnLogout"),

  // modal
  modal: document.getElementById("reviewModal"),
  reviewTitle: document.getElementById("reviewTitle"),
  reviewSub: document.getElementById("reviewSub"),
  reviewDesc: document.getElementById("reviewDesc"),
  reviewCover: document.getElementById("reviewCover"),
  reviewCoverWrap: document.getElementById("reviewCoverWrap"),
  reviewStatus: document.getElementById("reviewStatus"),
  reviewBy: document.getElementById("reviewBy"),
  reviewAt: document.getElementById("reviewAt"),
  reviewMsg: document.getElementById("reviewMsg"),

  form: document.getElementById("reviewForm"),
  btnApprove: document.getElementById("btnApprove"),
  btnReject: document.getElementById("btnReject"),
};

let isAdmin = false;
let activeFilter = "pending"; // pending | approved | rejected
let suggestionsCache = [];
let currentSuggestion = null;

function setAdminState(text, kind = "info") {
  if (!els.adminState) return;
  els.adminState.textContent = text;
  els.adminState.className = "pill " + (kind === "ok" ? "pill-ok" : kind === "bad" ? "pill-bad" : "pill-info");
}

function setPendingCount(n) {
  if (!els.pendingCount) return;
  els.pendingCount.textContent = `Pendentes: ${n}`;
}

function openModal() {
  els.modal?.classList.add("is-open");
  els.modal?.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  els.modal.scrollTop = 0;
}

function closeModal() {
  els.modal?.classList.remove("is-open");
  els.modal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  currentSuggestion = null;
  if (els.reviewMsg) els.reviewMsg.textContent = "";
}

function fillCategorySelect(selectEl, value = "") {
  if (!selectEl) return;
  selectEl.innerHTML =
    `<option value="">Selecione</option>` +
    LOCAIS_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");
  if (value) selectEl.value = value;
}

function formatDate(ts) {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleString("pt-BR");
}

async function checkAdmin() {
  const user = auth.currentUser;
  if (!user) return false;
  const snap = await db.collection("admins").doc(user.uid).get();
  return snap.exists;
}

function buildCard(s) {
  const icon = s.icon || "fa-location-dot";
  const status = s.status || "pending";
  const statusTag =
    status === "approved"
      ? `<span class="tag">Aprovada</span>`
      : status === "rejected"
      ? `<span class="tag">Rejeitada</span>`
      : `<span class="tag">Pendente</span>`;

  return `
    <article class="card" data-id="${s.id}">
      <div class="card-top">
        <div class="card-icon"><i class="fa-solid ${icon}"></i></div>
        <div style="min-width:0;">
          <h3>${s.name || "Local"}</h3>
          <p>${s.category || "Sem categoria"} · ${s.addressNeighborhood || "Bairro n/d"} · ${s.addressCity || "Itapira"}</p>
        </div>
      </div>

      <div class="card-tags">
        ${statusTag}
        ${s.phone ? `<span class="tag"><i class="fa-solid fa-phone"></i> contato</span>` : ""}
        ${s.coverImage ? `<span class="tag"><i class="fa-regular fa-image"></i> imagem</span>` : ""}
      </div>

      <p>${(s.short || s.description || "").slice(0, 120)}</p>

      <div class="card-actions">
        <button class="btn btn-primary" type="button" data-action="review">
          <i class="fa-solid fa-magnifying-glass"></i> Revisar
        </button>
      </div>
    </article>
  `;
}

function renderGrid() {
  if (!els.grid || !els.empty) return;

  const filtered = suggestionsCache.filter((s) => (s.status || "pending") === activeFilter);

  if (!filtered.length) {
    els.grid.innerHTML = "";
    els.empty.classList.remove("is-hidden");
  } else {
    els.empty.classList.add("is-hidden");
    els.grid.innerHTML = filtered.map(buildCard).join("");
  }

  const pending = suggestionsCache.filter((s) => (s.status || "pending") === "pending").length;
  setPendingCount(pending);
}

async function loadSuggestions() {
  if (!isAdmin) return;

  // carrega tudo (para alternar filtros sem re-query)
  const snap = await db.collection("place_suggestions").orderBy("createdAt", "desc").limit(200).get();
  suggestionsCache = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
  renderGrid();
}

function setReviewMsg(text) {
  if (!els.reviewMsg) return;
  els.reviewMsg.textContent = text || "";
}

function fillReviewModal(s) {
  currentSuggestion = s;

  els.reviewTitle.textContent = s.name || "Sugestão";
  els.reviewSub.textContent = `${s.category || "—"} · ${s.addressNeighborhood || "—"} · ${s.addressCity || "Itapira"}`;
  els.reviewDesc.textContent = s.description || s.short || "—";

  els.reviewStatus.textContent = s.status || "pending";
  els.reviewBy.textContent = s.suggestedByName || s.suggestedByUid || "—";
  els.reviewAt.textContent = formatDate(s.createdAt);

  if (s.coverImage) {
    els.reviewCoverWrap.style.display = "block";
    els.reviewCover.src = s.coverImage;
  } else {
    els.reviewCoverWrap.style.display = "none";
    els.reviewCover.src = "";
  }

  // form
  const f = els.form;
  f.elements.suggestionId.value = s.id;
  f.elements.currentStatus.value = s.status || "pending";

  f.elements.name.value = s.name || "";
  fillCategorySelect(f.elements.category, s.category || "");

  f.elements.icon.value = s.icon || "";
  f.elements.short.value = s.short || "";
  f.elements.description.value = s.description || "";

  f.elements.addressNeighborhood.value = s.addressNeighborhood || "";
  f.elements.addressCity.value = s.addressCity || "Itapira";
  f.elements.addressState.value = s.addressState || "SP";
  f.elements.addressStreet.value = s.addressStreet || "";

  f.elements.hours.value = s.hours || "";
  f.elements.phone.value = s.phone || "";
  f.elements.mapsQuery.value = s.mapsQuery || "";

  f.elements.reviewNote.value = s.reviewNote || "";

  setReviewMsg("");
  openModal();
}

function buildPlacePayloadFromForm(form) {
  const d = new FormData(form);
  return {
    status: "published",
    name: String(d.get("name") || "").trim(),
    category: String(d.get("category") || "").trim(),
    icon: String(d.get("icon") || "").trim() || "fa-location-dot",
    short: String(d.get("short") || "").trim(),
    description: String(d.get("description") || "").trim(),

    addressNeighborhood: String(d.get("addressNeighborhood") || "").trim(),
    addressCity: String(d.get("addressCity") || "Itapira").trim(),
    addressState: String(d.get("addressState") || "SP").trim(),
    addressStreet: String(d.get("addressStreet") || "").trim() || null,

    hours: String(d.get("hours") || "").trim() || null,
    phone: String(d.get("phone") || "").trim() || null,
    mapsQuery: String(d.get("mapsQuery") || "").trim() || null,
  };
}

function validatePlacePayload(p) {
  if (!p.name || !p.category || !p.short || !p.description) return "Preencha nome, categoria, descrição curta e completa.";
  if (!p.addressNeighborhood || !p.addressCity || !p.addressState) return "Preencha bairro, cidade e estado.";
  return "";
}

async function approveSuggestion() {
  if (!isAdmin || !currentSuggestion) return;

  const user = auth.currentUser;
  const form = els.form;

  const placePayload = buildPlacePayloadFromForm(form);
  const err = validatePlacePayload(placePayload);
  if (err) return setReviewMsg(err);

  const reviewNote = String(form.elements.reviewNote.value || "").trim();

  const sugRef = db.collection("place_suggestions").doc(currentSuggestion.id);
  const placeRef = db.collection("places").doc(); // novo placeId

  setReviewMsg("Aprovando e publicando...");

  try {
    await db.runTransaction(async (tx) => {
      const sugSnap = await tx.get(sugRef);
      if (!sugSnap.exists) throw new Error("Sugestão não encontrada.");

      const s = sugSnap.data() || {};

      tx.set(placeRef, {
        ...placePayload,

        // imagem vem da sugestão
        coverImage: s.coverImage || null,

        // agregados rating
        ratingAvg: 0,
        ratingCount: 0,

        createdByUid: user.uid,
        createdByName: user.displayName || "ADM",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      tx.update(sugRef, {
        status: "approved",
        reviewedByUid: user.uid,
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
        reviewNote: reviewNote || null,
        publishedPlaceId: placeRef.id,
      });
    });

    setReviewMsg("Aprovado e publicado com sucesso ✅");
    await loadSuggestions();
    setTimeout(closeModal, 700);
  } catch (e) {
    console.error(e);
    setReviewMsg(e?.message || "Falha ao aprovar.");
  }
}

async function rejectSuggestion() {
  if (!isAdmin || !currentSuggestion) return;

  const user = auth.currentUser;
  const form = els.form;
  const reviewNote = String(form.elements.reviewNote.value || "").trim();

  const sugRef = db.collection("place_suggestions").doc(currentSuggestion.id);

  setReviewMsg("Rejeitando...");

  try {
    await sugRef.update({
      status: "rejected",
      reviewedByUid: user.uid,
      reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
      reviewNote: reviewNote || "Rejeitado pelo ADM.",
    });

    setReviewMsg("Sugestão rejeitada.");
    await loadSuggestions();
    setTimeout(closeModal, 700);
  } catch (e) {
    console.error(e);
    setReviewMsg(e?.message || "Falha ao rejeitar.");
  }
}

function bindUI() {
  // filtros
  document.querySelector(".filters")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip[data-filter]");
    if (!btn) return;

    document.querySelectorAll(".chip").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");

    activeFilter = btn.getAttribute("data-filter") || "pending";
    renderGrid();
  });

  // grid -> abrir revisão
  els.grid?.addEventListener("click", (e) => {
    const reviewBtn = e.target.closest("[data-action='review']");
    if (!reviewBtn) return;

    const card = reviewBtn.closest(".card[data-id]");
    const id = card?.getAttribute("data-id");
    if (!id) return;

    const s = suggestionsCache.find((x) => x.id === id);
    if (s) fillReviewModal(s);
  });

  // modal close
  els.modal?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-review]")) closeModal();
  });

  // approve/reject
  els.btnApprove?.addEventListener("click", approveSuggestion);
  els.btnReject?.addEventListener("click", rejectSuggestion);

  // refresh
  els.btnRefresh?.addEventListener("click", loadSuggestions);

  // logout
  els.btnLogout?.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "index.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindUI();

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      setAdminState("Faça login para acessar.", "bad");
      window.location.href = "login.html";
      return;
    }

    try {
      setAdminState("Validando permissão...", "info");
      isAdmin = await checkAdmin();

      if (!isAdmin) {
        setAdminState("Acesso negado (não é ADM).", "bad");
        window.location.href = "index.html";
        return;
      }

      setAdminState("Acesso liberado (ADM).", "ok");
      await loadSuggestions();
    } catch (e) {
      console.error(e);
      setAdminState("Erro ao validar permissão.", "bad");
    }
  });
});
