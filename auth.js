// Import Firebase
// const firebase = require("firebase/app")
// require("firebase/auth")
// require("firebase/firestore")

console.log("[v0] 🔐 AUTH.JS CARREGADO")

class AuthManager {
  constructor() {
    this.currentUser = null
    this.init()
  }

  init() {
    console.log("[v0] 🔐 Inicializando AuthManager...")
    const waitForFirebase = () => {
      if (typeof window.firebase !== "undefined" && window.firebaseReady) {
        console.log("[v0] ✅ Firebase pronto")
        this.setupAuth()
      } else {
        setTimeout(waitForFirebase, 100)
      }
    }
    waitForFirebase()
  }

  setupAuth() {
    console.log("[v0] 🔐 Configurando autenticação...")
    window.firebase.auth().onAuthStateChanged((user) => {
      console.log("[v0] 🔐 Estado de auth mudou:", user ? "LOGADO" : "DESLOGADO")

      if (user) {
        this.currentUser = user
        this.showApp()

        const waitForManager = () => {
          if (window.financeManager) {
            console.log("[v0] 🔐 FinanceManager encontrado, carregando dados...")
            window.financeManager.loadUserData(user.uid)
          } else {
            console.log("[v0] ⏳ Aguardando FinanceManager...")
            setTimeout(waitForManager, 100)
          }
        }
        setTimeout(waitForManager, 100)
      } else {
        this.currentUser = null
        this.showAuth()
      }

      this.hideLoading()
    })

    this.setupEventListeners()
  }

  setupEventListeners() {
    const loginForm = document.getElementById("loginForm")
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault()
        this.login()
      })
    }

    const registerForm = document.getElementById("registerForm")
    if (registerForm) {
      registerForm.addEventListener("submit", (e) => {
        e.preventDefault()
        this.register()
      })
    }

    const forgotForm = document.getElementById("forgotPasswordForm")
    if (forgotForm) {
      forgotForm.addEventListener("submit", (e) => {
        e.preventDefault()
        this.resetPassword()
      })
    }
  }

  async login() {
    console.log("[v0] 🔐 Fazendo login...")
    const email = document.getElementById("loginEmail").value
    const password = document.getElementById("loginPassword").value

    try {
      this.showLoading()
      await window.firebase.auth().signInWithEmailAndPassword(email, password)
      console.log("[v0] ✅ Login bem-sucedido")
      this.showMessage("Login realizado com sucesso!", "success")
    } catch (error) {
      console.error("[v0] ❌ Erro no login:", error)
      this.showMessage(this.getErrorMessage(error.code), "error")
      this.hideLoading()
    }
  }

  async register() {
    console.log("[v0] ========================================")
    console.log("[v0] 🔐 REGISTRANDO NOVO USUÁRIO")
    console.log("[v0] ========================================")

    const name = document.getElementById("registerName").value
    const email = document.getElementById("registerEmail").value
    const password = document.getElementById("registerPassword").value
    const confirmPassword = document.getElementById("confirmPassword").value

    if (password !== confirmPassword) {
      this.showMessage("As senhas não coincidem!", "error")
      return
    }

    if (password.length < 6) {
      this.showMessage("A senha deve ter pelo menos 6 caracteres!", "error")
      return
    }

    try {
      this.showLoading()
      const userCredential = await window.firebase.auth().createUserWithEmailAndPassword(email, password)

      console.log("[v0] ✅ Usuário criado no Auth:", userCredential.user.uid)

      await userCredential.user.updateProfile({
        displayName: name,
      })

      const now = new Date()
      const currentYear = now.getFullYear().toString()
      const currentMonth = (now.getMonth() + 1).toString().padStart(2, "0")

      console.log("[v0] 📅 Criando estrutura para:", currentYear, "/", currentMonth)

      const initialData = {
        name: name,
        email: email,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        fixedItems: [],
        creditCards: [],
        [currentYear]: {
          [currentMonth]: {
            variable: [],
            creditCard: [],
          },
        },
      }

      console.log("[v0] 📊 Estrutura a ser salva:")
      console.log(JSON.stringify(initialData, null, 2))

      await window.firebase.firestore().collection("users").doc(userCredential.user.uid).set(initialData)

      console.log("[v0] ✅ Estrutura salva no Firestore")
      console.log("[v0] ✅ Verificando se foi salvo...")

      // Verificar se foi salvo
      const doc = await window.firebase.firestore().collection("users").doc(userCredential.user.uid).get()
      if (doc.exists) {
        const savedData = doc.data()
        console.log("[v0] ✅ Dados salvos confirmados:")
        console.log(
          "[v0] - Anos:",
          Object.keys(savedData).filter((k) => !isNaN(k)),
        )
        if (savedData[currentYear]) {
          console.log("[v0] - Meses em", currentYear, ":", Object.keys(savedData[currentYear]))
        }
      } else {
        console.error("[v0] ❌ Documento não foi salvo!")
      }

      console.log("[v0] ✅ Conta criada com estrutura inicial")
      console.log("[v0] ========================================")
      this.showMessage("Conta criada com sucesso!", "success")
    } catch (error) {
      console.error("[v0] ❌ ERRO NO CADASTRO:", error)
      console.error("[v0] ❌ Código:", error.code)
      console.error("[v0] ❌ Mensagem:", error.message)
      console.error("[v0] ❌ Stack:", error.stack)
      this.showMessage(this.getErrorMessage(error.code), "error")
      this.hideLoading()
    }
  }

  async resetPassword() {
    const email = document.getElementById("resetEmail").value

    try {
      this.showLoading()
      await window.firebase.auth().sendPasswordResetEmail(email)
      this.showMessage("Link de recuperação enviado!", "success")
      showAuthTab("login")
    } catch (error) {
      this.showMessage(this.getErrorMessage(error.code), "error")
    } finally {
      this.hideLoading()
    }
  }

  async logout() {
    try {
      await window.firebase.auth().signOut()
      this.showMessage("Logout realizado com sucesso!", "success")
    } catch (error) {
      this.showMessage("Erro ao fazer logout", "error")
    }
  }

  showApp() {
    console.log("[v0] 👁️ MOSTRANDO APLICAÇÃO")
    document.getElementById("authContainer").style.display = "none"
    document.getElementById("appContainer").style.display = "block"

    const userEmail = document.getElementById("userEmail")
    if (userEmail && this.currentUser) {
      userEmail.textContent = this.currentUser.email
    }

    this.updateUserAvatar()

    setTimeout(() => {
      if (window.financeManager) {
        console.log("[v0] Populando select após mostrar app...")
        window.financeManager.populateMonthSelect()
      }
    }, 100)
  }

  updateUserAvatar() {
    if (this.currentUser) {
      const name = this.currentUser.displayName || this.currentUser.email
      const initials = this.getInitials(name)

      const userInitials = document.getElementById("userInitials")
      const profileInitials = document.getElementById("profileInitials")

      if (userInitials) userInitials.textContent = initials
      if (profileInitials) profileInitials.textContent = initials
    }
  }

  getInitials(name) {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  async updateProfile(name) {
    try {
      this.showLoading()

      // Atualizar no Firebase Auth
      await this.currentUser.updateProfile({
        displayName: name,
      })

      // Atualizar no Firestore
      await window.firebase.firestore().collection("users").doc(this.currentUser.uid).update({
        name: name,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      })

      this.updateUserAvatar()
      this.showMessage("Perfil atualizado com sucesso!", "success")
    } catch (error) {
      console.error("[v0] Erro ao atualizar perfil:", error)
      this.showMessage("Erro ao atualizar perfil", "error")
    } finally {
      this.hideLoading()
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      this.showLoading()

      // Reautenticar usuário
      const credential = window.firebase.auth.EmailAuthProvider.credential(this.currentUser.email, currentPassword)

      await this.currentUser.reauthenticateWithCredential(credential)

      // Alterar senha
      await this.currentUser.updatePassword(newPassword)

      this.showMessage("Senha alterada com sucesso!", "success")

      // Limpar formulário
      document.getElementById("changePasswordForm").reset()
    } catch (error) {
      console.error("[v0] Erro ao alterar senha:", error)
      this.showMessage(this.getErrorMessage(error.code), "error")
    } finally {
      this.hideLoading()
    }
  }

  async deleteAccount() {
    if (!confirm("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.")) {
      return
    }

    const password = prompt("Digite sua senha para confirmar:")
    if (!password) return

    try {
      this.showLoading()

      // Reautenticar usuário
      const credential = window.firebase.auth.EmailAuthProvider.credential(this.currentUser.email, password)

      await this.currentUser.reauthenticateWithCredential(credential)

      // Excluir dados do Firestore
      await window.firebase.firestore().collection("users").doc(this.currentUser.uid).delete()

      // Excluir conta
      await this.currentUser.delete()

      this.showMessage("Conta excluída com sucesso", "success")
    } catch (error) {
      console.error("[v0] Erro ao excluir conta:", error)
      this.showMessage(this.getErrorMessage(error.code), "error")
    } finally {
      this.hideLoading()
    }
  }

  showAuth() {
    document.getElementById("authContainer").style.display = "flex"
    document.getElementById("appContainer").style.display = "none"
  }

  showLoading() {
    document.getElementById("loadingOverlay").style.display = "flex"
  }

  hideLoading() {
    document.getElementById("loadingOverlay").style.display = "none"
  }

  getErrorMessage(errorCode) {
    const messages = {
      "auth/user-not-found": "Usuário não encontrado",
      "auth/wrong-password": "Senha incorreta",
      "auth/email-already-in-use": "Este email já está em uso",
      "auth/weak-password": "Senha muito fraca",
      "auth/invalid-email": "Email inválido",
      "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde",
    }
    return messages[errorCode] || "Erro desconhecido. Tente novamente."
  }

  showMessage(message, type) {
    const messageDiv = document.createElement("div")
    messageDiv.className = `message ${type}`
    messageDiv.textContent = message
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 5px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      ${type === "success" ? "background: #4CAF50;" : "background: #f44336;"}
    `

    document.body.appendChild(messageDiv)

    setTimeout(() => {
      messageDiv.remove()
    }, 3000)
  }
}

// Funções auxiliares
function showAuthTab(tabName) {
  document.querySelectorAll(".auth-tab").forEach((tab) => tab.classList.remove("active"))
  document.querySelectorAll(".auth-tab-content").forEach((content) => content.classList.remove("active"))

  if (tabName === "login") {
    document.querySelector(".auth-tab:first-child").classList.add("active")
    document.getElementById("loginTab").classList.add("active")
  } else if (tabName === "register") {
    document.querySelector(".auth-tab:last-child").classList.add("active")
    document.getElementById("registerTab").classList.add("active")
  }
}

function showForgotPassword() {
  document.querySelectorAll(".auth-tab-content").forEach((content) => content.classList.remove("active"))
  document.getElementById("forgotPasswordTab").classList.add("active")
}

function showProfile() {
  const modal = document.getElementById("profileModal")
  const profileName = document.getElementById("profileName")
  const profileEmail = document.getElementById("profileEmail")
  const updateName = document.getElementById("updateName")
  const updateEmail = document.getElementById("updateEmail")

  if (window.authManager && window.authManager.currentUser) {
    const user = window.authManager.currentUser
    const displayName = user.displayName || "Usuário"

    profileName.textContent = displayName
    profileEmail.textContent = user.email
    updateName.value = displayName
    updateEmail.value = user.email
  }

  modal.style.display = "block"
}

function closeProfile() {
  document.getElementById("profileModal").style.display = "none"
}

function showProfileTab(tabName) {
  document.querySelectorAll(".profile-tab").forEach((tab) => tab.classList.remove("active"))
  document.querySelectorAll(".profile-tab-content").forEach((content) => content.classList.remove("active"))

  if (tabName === "info") {
    document.querySelector(".profile-tab:first-child").classList.add("active")
    document.getElementById("profileInfoTab").classList.add("active")
  } else if (tabName === "security") {
    document.querySelector(".profile-tab:last-child").classList.add("active")
    document.getElementById("profileSecurityTab").classList.add("active")
  }
}

function deleteAccount() {
  if (window.authManager) {
    window.authManager.deleteAccount()
  }
}

// Inicializar quando DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  console.log("[v0] 🔐 DOM carregado, inicializando AuthManager...")
  const waitForFirebase = () => {
    if (window.firebaseReady) {
      window.authManager = new AuthManager()
    } else {
      setTimeout(waitForFirebase, 100)
    }
  }
  waitForFirebase()

  // Fechar modal ao clicar fora
  window.onclick = (event) => {
    const modal = document.getElementById("profileModal")
    if (event.target === modal) {
      closeProfile()
    }
  }
})
