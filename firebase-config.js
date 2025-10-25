const firebaseConfig = {
  apiKey: "AIzaSyAX74X5BsexTqOf5TXb9Q8UEOO29XL4QW0",
  authDomain: "aplicativo-de-financias-1b94b.firebaseapp.com",
  projectId: "aplicativo-de-financias-1b94b",
  storageBucket: "aplicativo-de-financias-1b94b.firebasestorage.app",
  messagingSenderId: "474662122364",
  appId: "1:474662122364:web:bdbcb60ebdf3fff499aaf9",
  measurementId: "G-DHYBMZ00L9",
}

function initFirebase() {
  console.log("[v0] 🔥 Iniciando Firebase...")

  if (typeof window.firebase === "undefined") {
    console.error("[v0] ❌ Firebase não está disponível!")
    return
  }

  try {
    window.firebase.initializeApp(firebaseConfig)
    console.log("[v0] ✅ Firebase inicializado com sucesso")

    // Verificar se Auth e Firestore estão disponíveis
    if (window.firebase.auth && window.firebase.firestore) {
      console.log("[v0] ✅ Auth e Firestore disponíveis")
      window.firebaseReady = true
    } else {
      console.error("[v0] ❌ Auth ou Firestore não disponíveis")
    }
  } catch (error) {
    console.error("[v0] ❌ Erro ao inicializar Firebase:", error)
  }
}

function waitForFirebase() {
  if (typeof window.firebase !== "undefined") {
    initFirebase()
  } else {
    console.log("[v0] ⏳ Aguardando Firebase carregar...")
    setTimeout(waitForFirebase, 100)
  }
}

// Inicializar quando DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", waitForFirebase)
} else {
  waitForFirebase()
}
