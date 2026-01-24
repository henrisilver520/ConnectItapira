/* assets/js/login.js */

/**
 * IMPORTANTE:
 * - Firebase v8 (compatível com seu projeto atual)
 * - Regras de produção: restringir domínio da API Key, regras Firestore/Storage
 */
 
const firebaseConfig = {
  apiKey: "AIzaSyA-7HOp-Ycvyf3b_03ev__8aJEwAbWSQZY",
  authDomain: "connectfamilia-312dc.firebaseapp.com",
  projectId: "connectfamilia-312dc",
  storageBucket: "connectfamilia-312dc.appspot.com",
  messagingSenderId: "797817838649",
  appId: "1:797817838649:web:1aa7c54abd97661f8d81e8",
  measurementId: "G-QKN9NFXZZQ",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");

function setMessage(el, text, type = "info") {
  el.textContent = text || "";
  el.classList.remove("is-error", "is-success");
  if (type === "error") el.classList.add("is-error");
  if (type === "success") el.classList.add("is-success");
}

function normalizePhone(value) {
  return String(value || "").trim();
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function uploadProfileImageIfAny(uid) {
  const input = document.getElementById("profileImage");
  const file = input?.files?.[0];

  if (!file) return ""; // opcional

  // validações simples
  const maxBytes = 2 * 1024 * 1024; // 2MB
  if (!file.type.startsWith("image/")) {
    throw new Error("A foto precisa ser uma imagem válida.");
  }
  if (file.size > maxBytes) {
    throw new Error("A foto excede 2MB. Envie uma imagem menor.");
  }

  const path = `images/${uid}/${Date.now()}_${file.name}`;
  const ref = storage.ref(path);

  await ref.put(file);
  const url = await ref.getDownloadURL();
  return url || "";
}

async function createUserDoc(user, payload) {
  const ref = db.collection("UserWeb").doc(user.uid);
  await ref.set(
    {
      uid: user.uid,
      pontos: 50,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      ...payload,
    },
    { merge: true }
  );
}

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMessage(registerMessage, "");

  const name = document.getElementById("newName").value.trim();
  const email = document.getElementById("newUsername").value.trim();
  const password = document.getElementById("newPassword").value;
  const phoneNumber = normalizePhone(document.getElementById("phoneNumber").value);
  const birthYear = safeNumber(document.getElementById("birthYear").value);
  const maritalStatus = document.getElementById("maritalStatus").value;
  const cityState = document.getElementById("cityState").value.trim();
  const profession = document.getElementById("profession").value.trim();
  const gender = document.getElementById("gender").value;

  // validações básicas
  if (!name || !email || !password) {
    setMessage(registerMessage, "Preencha nome, email e senha.", "error");
    return;
  }
  if (!birthYear || birthYear < 1900 || birthYear > new Date().getFullYear()) {
    setMessage(registerMessage, "Informe um ano de nascimento válido.", "error");
    return;
  }
  if (password.length < 6) {
    setMessage(registerMessage, "A senha deve ter no mínimo 6 caracteres.", "error");
    return;
  }

  try {
    setMessage(registerMessage, "Criando conta...", "info");

    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const user = cred.user;

    // upload opcional da imagem
    let imageUrl = "";
    try {
      imageUrl = await uploadProfileImageIfAny(user.uid);
    } catch (imgErr) {
      // não bloqueia o cadastro, mas informa
      console.warn("Upload de imagem falhou:", imgErr);
      setMessage(registerMessage, String(imgErr.message || imgErr), "error");
      // segue sem imagem
    }

    await createUserDoc(user, {
      name,
      email,
      phoneNumber,
      birthYear,
      maritalStatus,
      cityState,
      profession,
      gender,
      imageUrl,
    });

    setMessage(registerMessage, "Cadastro realizado com sucesso! Redirecionando...", "success");

    setTimeout(() => {
      // ajuste se sua home atual for index.html
      window.location.href = "index.html";
    }, 900);
  } catch (err) {
    console.error(err);
    const msg =
      err?.code === "auth/email-already-in-use"
        ? "Este email já está cadastrado."
        : "Erro ao cadastrar. Verifique os dados e tente novamente.";
    setMessage(registerMessage, msg, "error");
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMessage(loginMessage, "");

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    setMessage(loginMessage, "Informe email e senha.", "error");
    return;
  }

  try {
    setMessage(loginMessage, "Autenticando...", "info");
    await auth.signInWithEmailAndPassword(email, password);

    setMessage(loginMessage, "Login bem-sucedido! Redirecionando...", "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 600);
  } catch (err) {
    console.error(err);
    const msg =
      err?.code === "auth/wrong-password" || err?.code === "auth/user-not-found"
        ? "Credenciais inválidas. Tente novamente."
        : "Não foi possível entrar. Tente novamente.";
    setMessage(loginMessage, msg, "error");
  }
});
