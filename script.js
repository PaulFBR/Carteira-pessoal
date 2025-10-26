// Import Firebase
var firebase = window.firebase

let currentCalendarYear = new Date().getFullYear()

class FinanceManager {
  constructor() {
    console.log("[v0] FinanceManager: Construtor chamado")

    this.firestore = null
    this.initFirestore()

    const now = new Date()
    this.currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`
    this.selectedCardId = null
    this.currentUser = null
    this.data = { fixedItems: [], creditCards: [] }
    this.encryptionKey = null
    console.log("[v0] Mês inicial:", this.currentMonth)
  }

  async generateEncryptionKey(userId) {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(userId + "carteira-pessoal-secret-2024"),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"],
    )

    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("carteira-salt"),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    )

    console.log("[v0] 🔐 Chave de criptografia gerada")
  }

  async encryptData(data) {
    if (!this.encryptionKey) {
      console.error("[v0] ❌ Chave de criptografia não disponível")
      return data
    }

    try {
      const encoder = new TextEncoder()
      const dataString = JSON.stringify(data)
      const dataBuffer = encoder.encode(dataString)

      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, this.encryptionKey, dataBuffer)

      const encryptedArray = new Uint8Array(encryptedBuffer)
      const combined = new Uint8Array(iv.length + encryptedArray.length)
      combined.set(iv)
      combined.set(encryptedArray, iv.length)

      const base64 = btoa(String.fromCharCode(...combined))
      console.log("[v0] 🔒 Dados criptografados")
      return { encrypted: true, data: base64 }
    } catch (error) {
      console.error("[v0] ❌ Erro ao criptografar:", error)
      return data
    }
  }

  async decryptData(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) {
      return encryptedData
    }

    if (!this.encryptionKey) {
      console.error("[v0] ❌ Chave de criptografia não disponível")
      return null
    }

    try {
      const combined = Uint8Array.from(atob(encryptedData.data), (c) => c.charCodeAt(0))
      const iv = combined.slice(0, 12)
      const encryptedBuffer = combined.slice(12)

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        this.encryptionKey,
        encryptedBuffer,
      )

      const decoder = new TextDecoder()
      const dataString = decoder.decode(decryptedBuffer)
      const data = JSON.parse(dataString)

      console.log("[v0] 🔓 Dados descriptografados")
      return data
    } catch (error) {
      console.error("[v0] ❌ Erro ao descriptografar:", error)
      return null
    }
  }

  initFirestore() {
    try {
      if (!firebase) {
        console.error("[v0] ❌ Firebase não está disponível!")
        return
      }

      this.firestore = firebase.firestore()
      console.log("[v0] ✅ Firestore inicializado com sucesso")
    } catch (error) {
      console.error("[v0] ❌ Erro ao inicializar Firestore:", error)
    }
  }

  async loadUserData(userId) {
    console.log("[v0] ========================================")
    console.log("[v0] CARREGANDO DADOS DO USUÁRIO")
    console.log("[v0] User ID:", userId)
    console.log("[v0] ========================================")

    if (!this.firestore) {
      console.error("[v0] ❌ Firestore não está inicializado!")
      return
    }

    this.currentUser = userId
    await this.generateEncryptionKey(userId)

    try {
      const userRef = this.firestore.collection("users").doc(userId)
      const userDoc = await userRef.get()

      const now = new Date()
      const year = now.getFullYear().toString()
      const month = (now.getMonth() + 1).toString().padStart(2, "0")

      console.log("[v0] 📅 Ano atual:", year)
      console.log("[v0] 📅 Mês atual:", month)

      if (userDoc.exists) {
        const userData = userDoc.data()
        this.data = (await this.decryptData(userData)) || { fixedItems: [], creditCards: [] }

        console.log("[v0] ✅ Dados carregados e descriptografados do Firebase")
        console.log("[v0] Estrutura atual:", Object.keys(this.data))

        // Garantir que ano/mês atual existam
        if (!this.data[year]) {
          console.log("[v0] ⚠️ Ano não existe, criando...")
          this.data[year] = {}
        }

        if (!this.data[year][month]) {
          console.log("[v0] ⚠️ Mês não existe, criando...")
          this.data[year][month] = {
            variable: [],
            creditCard: [],
          }
        }

        // Salvar estrutura atualizada
        const encryptedData = await this.encryptData(this.data)
        await userRef.set(encryptedData, { merge: true })
        console.log("[v0] ✅ Estrutura de ano/mês garantida")
      } else {
        console.log("[v0] ⚠️ Documento não existe, criando estrutura inicial...")

        this.data = {
          fixedItems: [],
          creditCards: [],
          [year]: {
            [month]: {
              variable: [],
              creditCard: [],
            },
          },
        }

        const encryptedData = await this.encryptData(this.data)
        await userRef.set(encryptedData)
        console.log("[v0] ✅ Estrutura inicial criada e criptografada")
      }

      console.log("[v0] 📊 Estrutura final do Firebase:")
      console.log(
        "[v0] - Anos disponíveis:",
        Object.keys(this.data).filter((k) => !isNaN(k)),
      )
      if (this.data[year]) {
        console.log("[v0] - Meses em", year, ":", Object.keys(this.data[year]))
      }

      console.log("[v0] Populando select de mês/ano...")
      this.populateMonthSelect()

      console.log("[v0] Atualizando display...")
      this.updateDisplay()

      console.log("[v0] ✅ CARREGAMENTO CONCLUÍDO")
    } catch (error) {
      console.error("[v0] ❌ ERRO:", error)
      console.error("[v0] ❌ Stack:", error.stack)
      this.data = { fixedItems: [], creditCards: [] }
    }
  }

  populateMonthSelect() {
    console.log("[v0] populateMonthSelect: Função substituída por calendário visual")
    updateMonthDisplay()
  }

  async saveData() {
    if (!this.currentUser || !this.firestore) return

    try {
      console.log("[v0] 💾 Salvando dados...")
      const encryptedData = await this.encryptData(this.data)
      await this.firestore.collection("users").doc(this.currentUser).set(encryptedData, { merge: true })
      console.log("[v0] ✅ Dados criptografados e salvos")
    } catch (error) {
      console.error("[v0] ❌ Erro ao salvar:", error)
    }
  }

  getMonthData() {
    if (!this.currentMonth) {
      return { variable: [], creditCard: [] }
    }

    const [year, month] = this.currentMonth.split("-")

    if (!this.data[year]) {
      this.data[year] = {}
    }

    if (!this.data[year][month]) {
      this.data[year][month] = {
        variable: [],
        creditCard: [],
      }
    }

    return this.data[year][month]
  }

  getValidFixedItems() {
    if (!this.data.fixedItems) {
      this.data.fixedItems = []
    }

    return this.data.fixedItems.filter((item) => {
      // Se o item tem mês de início, só mostrar se o mês atual for >= mês de início
      if (item.startMonth && this.currentMonth) {
        if (item.startMonth > this.currentMonth) {
          return false // Item ainda não começou neste mês
        }
      }

      // Se o item foi deletado, só mostrar se o mês atual for < mês de exclusão
      if (item.deletedMonth && this.currentMonth) {
        return item.deletedMonth > this.currentMonth
      }

      return true
    })
  }

  addFixedItem() {
    console.log("[v0] 💰 Adicionando item fixo...")

    if (!this.currentUser) {
      alert("Você precisa estar logado")
      return
    }

    if (!this.currentMonth) {
      alert("Selecione um mês primeiro")
      return
    }

    const name = document.getElementById("fixedName").value
    const value = Number.parseFloat(document.getElementById("fixedValue").value)
    const type = document.getElementById("fixedType").value
    const category = document.getElementById("fixedCategory").value

    if (!name || isNaN(value) || !type || !category) {
      alert("Preencha todos os campos")
      return
    }

    const item = {
      id: Date.now(),
      name,
      value,
      type,
      category,
      startMonth: this.currentMonth, // Salvar o mês de início
    }

    if (!this.data.fixedItems) {
      this.data.fixedItems = []
    }

    this.data.fixedItems.push(item)
    console.log("[v0] ✅ Item adicionado com mês de início:", this.currentMonth)

    this.saveData()
    this.updateDisplay()
    document.getElementById("fixedForm").reset()
  }

  removeFixedItem(id) {
    const item = this.data.fixedItems.find((item) => item.id === id)
    if (item && this.currentMonth) {
      item.deletedMonth = this.currentMonth
    }
    this.saveData()
    this.updateDisplay()
  }

  addVariableItem() {
    console.log("[v0] 💸 Adicionando item variável...")

    if (!this.currentUser) {
      alert("Você precisa estar logado")
      return
    }

    if (!this.currentMonth) {
      alert("Selecione um mês")
      return
    }

    const name = document.getElementById("variableName").value
    const value = Number.parseFloat(document.getElementById("variableValue").value)
    const category = document.getElementById("variableCategory").value
    const date = document.getElementById("variableDate").value

    if (!name || isNaN(value) || !category || !date) {
      alert("Preencha todos os campos")
      return
    }

    const item = {
      id: Date.now(),
      name,
      value,
      category,
      date,
    }

    const monthData = this.getMonthData()
    monthData.variable.push(item)
    console.log("[v0] ✅ Item variável adicionado")

    this.saveData()
    this.updateDisplay()

    document.getElementById("variableForm").reset()
    document.getElementById("variableDate").value = new Date().toISOString().split("T")[0]
  }

  removeVariableItem(id) {
    const monthData = this.getMonthData()
    monthData.variable = monthData.variable.filter((item) => item.id !== id)
    this.saveData()
    this.updateDisplay()
  }

  addCreditCard() {
    console.log("[v0] 💳 Adicionando cartão...")

    if (!this.currentUser) {
      alert("Você precisa estar logado")
      return
    }

    const bank = document.getElementById("cardBank").value
    const name = document.getElementById("cardName").value

    if (!bank || !name) {
      alert("Preencha todos os campos")
      return
    }

    const card = {
      id: Date.now(),
      bank,
      name,
    }

    if (!this.data.creditCards) {
      this.data.creditCards = []
    }

    this.data.creditCards.push(card)
    console.log("[v0] ✅ Cartão adicionado")

    this.saveData()
    this.updateDisplay()
    document.getElementById("addCardForm").reset()
  }

  removeCreditCard(cardId) {
    this.data.creditCards = this.data.creditCards.filter((card) => card.id !== cardId)

    Object.keys(this.data).forEach((year) => {
      if (typeof this.data[year] === "object" && !Array.isArray(this.data[year])) {
        Object.keys(this.data[year]).forEach((month) => {
          if (this.data[year][month].creditCard) {
            this.data[year][month].creditCard = this.data[year][month].creditCard.filter(
              (item) => item.cardId !== cardId,
            )
          }
        })
      }
    })

    if (this.selectedCardId === cardId) {
      this.selectedCardId = null
      document.getElementById("selectedCardOperations").style.display = "none"
    }

    this.saveData()
    this.updateDisplay()
  }

  selectCreditCard(cardId) {
    if (this.selectedCardId === cardId) {
      this.selectedCardId = null
      document.getElementById("selectedCardOperations").style.display = "none"
    } else {
      this.selectedCardId = cardId
      document.getElementById("selectedCardOperations").style.display = "block"
    }
    this.updateCreditCardDisplay()
  }

  addCreditCardItem() {
    console.log("[v0] 💳 Adicionando item de cartão...")

    if (!this.currentUser) {
      alert("Você precisa estar logado")
      return
    }

    if (!this.selectedCardId) {
      alert("Selecione um cartão")
      return
    }

    if (!this.currentMonth) {
      alert("Selecione um mês")
      return
    }

    const name = document.getElementById("creditCardName").value
    const value = Number.parseFloat(document.getElementById("creditCardValue").value)
    const category = document.getElementById("creditCardCategory").value
    const date = document.getElementById("creditCardDate").value

    if (!name || isNaN(value)) {
      alert("Preencha todos os campos")
      return
    }

    const item = {
      id: Date.now(),
      cardId: this.selectedCardId,
      name,
      value,
      category,
      date,
    }

    const monthData = this.getMonthData()
    monthData.creditCard.push(item)
    console.log("[v0] ✅ Item de cartão adicionado")

    this.saveData()
    this.updateDisplay()

    document.getElementById("creditCardForm").reset()
    document.getElementById("creditCardDate").value = new Date().toISOString().split("T")[0]
  }

  removeCreditCardItem(id) {
    const monthData = this.getMonthData()
    monthData.creditCard = monthData.creditCard.filter((item) => item.id !== id)
    this.saveData()
    this.updateDisplay()
  }

  importCSV() {
    if (!this.currentUser || !this.selectedCardId || !this.currentMonth) {
      alert("Selecione um cartão e um mês primeiro")
      return
    }

    const fileInput = document.getElementById("csvFile")
    const file = fileInput.files[0]

    if (!file) {
      alert("Selecione um arquivo CSV")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csv = e.target.result
        const lines = csv.split("\n")
        const monthData = this.getMonthData()
        let importedCount = 0

        lines.forEach((line, index) => {
          if (line.trim() === "") return

          const columns = line.split(",").map((col) => col.trim().replace(/"/g, ""))

          if (columns.length >= 3) {
            const [date, title, value] = columns

            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return

            const numericValue = Number.parseFloat(value)
            if (isNaN(numericValue)) return

            const item = {
              id: Date.now() + index,
              cardId: this.selectedCardId,
              name: title,
              value: numericValue,
              category: "outros",
              date: date,
            }

            monthData.creditCard.push(item)
            importedCount++
          }
        })

        console.log(`[v0] ✅ ${importedCount} itens importados`)
        this.saveData()
        this.updateDisplay()

        alert(`${importedCount} itens importados com sucesso!`)
        fileInput.value = ""
      } catch (error) {
        alert("Erro ao processar CSV")
        console.error("[v0] ❌ Erro CSV:", error)
      }
    }

    reader.readAsText(file)
  }

  calculateTotals() {
    if (!this.currentMonth) {
      return { income: 0, expense: 0, balance: 0 }
    }

    const monthData = this.getMonthData()
    const fixedItems = this.getValidFixedItems()

    let income = 0
    let expense = 0

    fixedItems.forEach((item) => {
      if (item.type === "income") {
        income += item.value
      } else {
        expense += item.value
      }
    })

    monthData.variable.forEach((item) => {
      expense += item.value
    })

    monthData.creditCard.forEach((item) => {
      expense += item.value
    })

    return {
      income,
      expense,
      balance: income - expense,
    }
  }

  updateDisplay() {
    this.updateSummaryCards()
    this.updateFixedItems()
    this.updateVariableItems()
    this.updateCreditCardDisplay()
  }

  updateSummaryCards() {
    const totals = this.calculateTotals()

    document.getElementById("totalIncome").textContent = `R$ ${totals.income.toFixed(2).replace(".", ",")}`
    document.getElementById("totalExpense").textContent = `R$ ${totals.expense.toFixed(2).replace(".", ",")}`
    document.getElementById("balance").textContent = `R$ ${totals.balance.toFixed(2).replace(".", ",")}`
  }

  updateFixedItems() {
    const container = document.getElementById("fixedItems")
    const fixedItems = this.getValidFixedItems()

    if (fixedItems.length === 0) {
      container.innerHTML = '<p class="empty-state">Nenhum item fixo cadastrado.</p>'
      return
    }

    container.innerHTML = fixedItems
      .map(
        (item) => `
        <div class="item ${item.type}">
          <div class="item-info">
            <div class="item-name">${item.name}</div>
            <div class="item-category">${item.category}</div>
          </div>
          <div class="item-value">R$ ${item.value.toFixed(2).replace(".", ",")}</div>
          <div class="item-actions">
            <button class="btn btn-danger btn-small" onclick="financeManager.removeFixedItem(${item.id})">
              Remover
            </button>
          </div>
        </div>
      `,
      )
      .join("")
  }

  updateVariableItems() {
    if (!this.currentMonth) {
      document.getElementById("variableItems").innerHTML =
        '<p class="empty-state">Selecione um mês para ver os gastos variáveis.</p>'
      return
    }

    const container = document.getElementById("variableItems")
    const monthData = this.getMonthData()

    if (monthData.variable.length === 0) {
      container.innerHTML = '<p class="empty-state">Nenhum gasto variável registrado neste mês.</p>'
      return
    }

    container.innerHTML = monthData.variable
      .map(
        (item) => `
        <div class="item expense">
          <div class="item-info">
            <div class="item-name">${item.name}</div>
            <div class="item-category">${item.category} - ${item.date}</div>
          </div>
          <div class="item-value">R$ ${item.value.toFixed(2).replace(".", ",")}</div>
          <div class="item-actions">
            <button class="btn btn-danger btn-small" onclick="financeManager.removeVariableItem(${item.id})">
              Remover
            </button>
          </div>
        </div>
      `,
      )
      .join("")
  }

  updateCreditCardDisplay() {
    const cardsContainer = document.getElementById("cardsList")

    if (!this.data.creditCards || this.data.creditCards.length === 0) {
      cardsContainer.innerHTML = '<p class="empty-state">Nenhum cartão cadastrado.</p>'
      return
    }

    cardsContainer.innerHTML = `
      <div class="credit-cards-grid">
        ${this.data.creditCards
          .map((card) => {
            const cardTotal = this.calculateCardTotal(card.id)
            return `
            <div class="credit-card-item ${this.selectedCardId === card.id ? "selected" : ""}" 
                 onclick="financeManager.selectCreditCard(${card.id})">
              <div class="credit-card-header">
                <div class="bank-logo ${card.bank}">${this.getBankLogo(card.bank)}</div>
                <div class="card-actions">
                  <button class="btn-card-delete" onclick="event.stopPropagation(); financeManager.removeCreditCard(${card.id})">×</button>
                </div>
              </div>
              <div class="card-name">${card.name}</div>
              <div class="card-total">R$ ${cardTotal.toFixed(2).replace(".", ",")}</div>
            </div>
          `
          })
          .join("")}
      </div>
    `

    this.updateSelectedCardItems()
  }

  calculateCardTotal(cardId) {
    if (!this.currentMonth) return 0

    const monthData = this.getMonthData()
    return monthData.creditCard.filter((item) => item.cardId === cardId).reduce((total, item) => total + item.value, 0)
  }

  getBankLogo(bank) {
    const logos = {
      nubank: "Nu",
      itau: "Itaú",
      bradesco: "Bradesco",
      santander: "Santander",
      bb: "BB",
      caixa: "Caixa",
      inter: "Inter",
      c6: "C6",
      neon: "Neon",
      pagbank: "PagBank",
      picpay: "PicPay",
      btg: "BTG",
      next: "Next",
      will: "Will",
      mercadopago: "MP",
    }
    return logos[bank] || bank.toUpperCase()
  }

  updateSelectedCardItems() {
    if (!this.selectedCardId || !this.currentMonth) {
      document.getElementById("creditCardItems").innerHTML =
        '<p class="empty-state">Selecione um cartão e um mês para ver as transações.</p>'
      return
    }

    const container = document.getElementById("creditCardItems")
    const monthData = this.getMonthData()
    const cardItems = monthData.creditCard.filter((item) => item.cardId === this.selectedCardId)

    if (cardItems.length === 0) {
      container.innerHTML =
        '<p class="empty-state">Nenhuma transação registrada neste cartão para o mês selecionado.</p>'
      return
    }

    container.innerHTML = cardItems
      .map(
        (item) => `
        <div class="item credit-card">
          <div class="item-info">
            <div class="item-name">${item.name}</div>
            <div class="item-category">${item.category} - ${item.date}</div>
          </div>
          <div class="item-value">R$ ${item.value.toFixed(2).replace(".", ",")}</div>
          <div class="item-actions">
            <button class="btn btn-danger btn-small" onclick="financeManager.removeCreditCardItem(${item.id})">
              Remover
            </button>
          </div>
        </div>
      `,
      )
      .join("")
  }

  updateCharts() {
    this.updateCategoryChart()
    this.updateMonthlyChart()
    this.updateExpenseDistributionChart()
    this.updateCardsComparisonChart()
  }

  updateCategoryChart() {
    const canvas = document.getElementById("categoryChart")
    const ctx = canvas.getContext("2d")

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const monthData = this.getMonthData()
    const categories = {}

    monthData.variable.forEach((item) => {
      categories[item.category] = (categories[item.category] || 0) + item.value
    })

    monthData.creditCard.forEach((item) => {
      categories[item.category] = (categories[item.category] || 0) + item.value
    })

    if (Object.keys(categories).length === 0) {
      ctx.fillStyle = "#666"
      ctx.font = "16px Arial"
      ctx.textAlign = "center"
      ctx.fillText("Nenhum dado disponível", canvas.width / 2, canvas.height / 2)
      return
    }

    const total = Object.values(categories).reduce((sum, value) => sum + value, 0)
    const colors = ["#667eea", "#764ba2", "#f093fb", "#f5576c", "#4facfe", "#00f2fe", "#43e97b", "#38f9d7"]

    let currentAngle = 0
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 20

    Object.entries(categories).forEach(([category, value], index) => {
      const sliceAngle = (value / total) * 2 * Math.PI

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
      ctx.closePath()
      ctx.fillStyle = colors[index % colors.length]
      ctx.fill()

      const labelAngle = currentAngle + sliceAngle / 2
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7)
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7)

      ctx.fillStyle = "white"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      ctx.fillText(category, labelX, labelY)

      currentAngle += sliceAngle
    })
  }

  updateMonthlyChart() {
    const canvas = document.getElementById("monthlyChart")
    const ctx = canvas.getContext("2d")

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const [currentYear, currentMonthNum] = this.currentMonth.split("-")
    const recentMonths = []

    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, Number.parseInt(currentMonthNum) - 1 - i, 1)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, "0")
      recentMonths.push(`${year}-${month}`)
    }

    const monthlyData = recentMonths.map((monthKey) => {
      const [year, month] = monthKey.split("-")
      const data = this.data[year]?.[month] || { variable: [], creditCard: [] }
      const total = [...data.variable, ...data.creditCard].reduce((sum, item) => sum + item.value, 0)
      return { month: monthKey, total }
    })

    if (monthlyData.every((data) => data.total === 0)) {
      ctx.fillStyle = "#666"
      ctx.font = "16px Arial"
      ctx.textAlign = "center"
      ctx.fillText("Nenhum dado disponível", canvas.width / 2, canvas.height / 2)
      return
    }

    const maxValue = Math.max(...monthlyData.map((data) => data.total), 1)
    const barWidth = canvas.width / monthlyData.length - 20
    const maxBarHeight = canvas.height - 60

    monthlyData.forEach((data, index) => {
      const barHeight = (data.total / maxValue) * maxBarHeight
      const x = index * (barWidth + 20) + 10
      const y = canvas.height - barHeight - 30

      ctx.fillStyle = "#667eea"
      ctx.fillRect(x, y, barWidth, barHeight)

      ctx.fillStyle = "#333"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      ctx.fillText(data.month.split("-")[1], x + barWidth / 2, canvas.height - 10)

      ctx.fillText(`R$ ${data.total.toFixed(0)}`, x + barWidth / 2, y - 5)
    })
  }

  updateExpenseDistributionChart() {
    const canvas = document.getElementById("expenseDistributionChart")
    const ctx = canvas.getContext("2d")

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!this.currentMonth) {
      ctx.fillStyle = "#666"
      ctx.font = "16px Arial"
      ctx.textAlign = "center"
      ctx.fillText("Selecione um mês", canvas.width / 2, canvas.height / 2)
      return
    }

    const totals = this.calculateTotals()

    if (totals.expense === 0) {
      ctx.fillStyle = "#666"
      ctx.font = "16px Arial"
      ctx.textAlign = "center"
      ctx.fillText("Nenhuma despesa", canvas.width / 2, canvas.height / 2)
      return
    }

    const monthData = this.getMonthData()
    const fixedExpense = this.getValidFixedItems()
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.value, 0)
    const variableExpense = monthData.variable.reduce((sum, item) => sum + item.value, 0)
    const creditExpense = monthData.creditCard.reduce((sum, item) => sum + item.value, 0)

    const data = [
      { label: "Fixas", value: fixedExpense, color: "#e74c3c" },
      { label: "Variáveis", value: variableExpense, color: "#f39c12" },
      { label: "Cartão", value: creditExpense, color: "#9b59b6" },
    ].filter((item) => item.value > 0)

    let currentAngle = 0
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 20

    data.forEach((item) => {
      const sliceAngle = (item.value / totals.expense) * 2 * Math.PI

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
      ctx.closePath()
      ctx.fillStyle = item.color
      ctx.fill()

      const labelAngle = currentAngle + sliceAngle / 2
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7)
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7)

      ctx.fillStyle = "white"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      ctx.fillText(item.label, labelX, labelY)

      currentAngle += sliceAngle
    })
  }

  updateCardsComparisonChart() {
    const canvas = document.getElementById("cardsComparisonChart")
    const ctx = canvas.getContext("2d")

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!this.data.creditCards || this.data.creditCards.length === 0 || !this.currentMonth) {
      ctx.fillStyle = "#666"
      ctx.font = "16px Arial"
      ctx.textAlign = "center"
      ctx.fillText("Nenhum cartão ou mês selecionado", canvas.width / 2, canvas.height / 2)
      return
    }

    const cardTotals = this.data.creditCards.map((card) => ({
      name: card.name,
      total: this.calculateCardTotal(card.id),
    }))

    const maxValue = Math.max(...cardTotals.map((card) => card.total), 1)

    if (maxValue === 0) {
      ctx.fillStyle = "#666"
      ctx.font = "16px Arial"
      ctx.textAlign = "center"
      ctx.fillText("Nenhuma transação nos cartões", canvas.width / 2, canvas.height / 2)
      return
    }

    const barHeight = (canvas.height - 40) / cardTotals.length - 10
    const maxBarWidth = canvas.width - 100

    cardTotals.forEach((card, index) => {
      const barWidth = (card.total / maxValue) * maxBarWidth
      const y = index * (barHeight + 10) + 20

      ctx.fillStyle = "#667eea"
      ctx.fillRect(50, y, barWidth, barHeight)

      ctx.fillStyle = "#333"
      ctx.font = "12px Arial"
      ctx.textAlign = "right"
      ctx.fillText(card.name, 45, y + barHeight / 2 + 4)

      ctx.textAlign = "left"
      ctx.fillText(`R$ ${card.total.toFixed(2)}`, 55 + barWidth, y + barHeight / 2 + 4)
    })
  }
}

function showTab(event, tabName) {
  console.log("[v0] showTab chamado:", tabName)

  // Remover active de todas as abas
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active")
  })

  // Remover active de todos os conteúdos
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active")
  })

  // Ativar aba clicada
  if (event && event.currentTarget) {
    event.currentTarget.classList.add("active")
  }

  // Ativar conteúdo correspondente
  const content = document.getElementById(tabName)
  if (content) {
    content.classList.add("active")
    console.log("[v0] ✅ Aba ativada:", tabName)

    if (tabName === "graphics" && window.financeManager) {
      window.financeManager.updateCharts()
    }
  } else {
    console.error("[v0] ❌ Conteúdo não encontrado:", tabName)
  }
}

let financeManager = null

function initApp() {
  console.log("[v0] ========================================")
  console.log("[v0] INICIALIZANDO APP...")
  console.log("[v0] ========================================")

  // Verificar se Firebase está pronto
  if (!window.firebase || !window.firebaseReady) {
    console.log("[v0] ⏳ Aguardando Firebase...")
    setTimeout(initApp, 100)
    return
  }

  console.log("[v0] ✅ Firebase pronto, criando FinanceManager...")

  // Criar FinanceManager
  financeManager = new FinanceManager()
  window.financeManager = financeManager

  // Configurar event listeners dos formulários
  const fixedForm = document.getElementById("fixedForm")
  if (fixedForm) {
    fixedForm.addEventListener("submit", (e) => {
      e.preventDefault()
      financeManager.addFixedItem()
    })
  }

  const variableForm = document.getElementById("variableForm")
  if (variableForm) {
    variableForm.addEventListener("submit", (e) => {
      e.preventDefault()
      financeManager.addVariableItem()
    })
  }

  const addCardForm = document.getElementById("addCardForm")
  if (addCardForm) {
    addCardForm.addEventListener("submit", (e) => {
      e.preventDefault()
      financeManager.addCreditCard()
    })
  }

  const creditCardForm = document.getElementById("creditCardForm")
  if (creditCardForm) {
    creditCardForm.addEventListener("submit", (e) => {
      e.preventDefault()
      financeManager.addCreditCardItem()
    })
  }

  // Definir data de hoje nos campos de data
  const today = new Date().toISOString().split("T")[0]
  const variableDate = document.getElementById("variableDate")
  const creditCardDate = document.getElementById("creditCardDate")
  if (variableDate) variableDate.value = today
  if (creditCardDate) creditCardDate.value = today

  console.log("[v0] ✅ Inicialização concluída")
}

document.addEventListener("DOMContentLoaded", initApp)

function toggleCalendarSelector() {
  const modal = document.getElementById("calendarSelectorModal")
  const isVisible = modal.style.display === "block"

  if (isVisible) {
    modal.style.display = "none"
  } else {
    modal.style.display = "block"
    // Resetar para o ano atual quando abrir
    const now = new Date()
    currentCalendarYear = now.getFullYear()
    renderCalendar()
  }
}

function changeYear(delta) {
  currentCalendarYear += delta
  renderCalendar()
}

function renderCalendar() {
  const yearDisplay = document.getElementById("calendarYear")
  const monthsGrid = document.getElementById("monthsGrid")

  if (!yearDisplay || !monthsGrid) {
    console.error("[v0] Elementos do calendário não encontrados")
    return
  }

  yearDisplay.textContent = currentCalendarYear

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ]

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  let selectedYear = currentYear
  let selectedMonth = currentMonth

  if (window.financeManager && window.financeManager.currentMonth) {
    const [year, month] = window.financeManager.currentMonth.split("-")
    selectedYear = Number.parseInt(year)
    selectedMonth = Number.parseInt(month)
  }

  monthsGrid.innerHTML = ""

  for (let month = 1; month <= 12; month++) {
    const monthCard = document.createElement("div")
    monthCard.className = "month-card"

    // Verificar se é o mês selecionado
    if (currentCalendarYear === selectedYear && month === selectedMonth) {
      monthCard.classList.add("selected")
    }

    // Verificar se é o mês atual
    if (currentCalendarYear === currentYear && month === currentMonth) {
      monthCard.classList.add("current")
    }

    monthCard.innerHTML = `
      <div class="month-card-name">${monthNames[month - 1]}</div>
      <div class="month-card-number">Mês ${month.toString().padStart(2, "0")}</div>
    `

    monthCard.onclick = () => selectMonth(currentCalendarYear, month)

    monthsGrid.appendChild(monthCard)
  }
}

function selectMonth(year, month) {
  const monthStr = month.toString().padStart(2, "0")
  const newMonth = `${year}-${monthStr}`

  console.log("[v0] 📅 Mês selecionado:", newMonth)

  if (window.financeManager) {
    window.financeManager.currentMonth = newMonth
    window.financeManager.updateDisplay()
  }

  updateMonthDisplay()
  toggleCalendarSelector()
}

function updateMonthDisplay() {
  const display = document.getElementById("currentMonthDisplay")

  if (!display) {
    console.error("[v0] Display do mês não encontrado")
    return
  }

  if (!window.financeManager || !window.financeManager.currentMonth) {
    display.textContent = "Selecionar Mês"
    return
  }

  const [year, month] = window.financeManager.currentMonth.split("-")
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

  const monthIndex = Number.parseInt(month) - 1
  display.textContent = `${monthNames[monthIndex]} ${year}`

  console.log("[v0] ✅ Display atualizado:", display.textContent)
}

window.addEventListener("click", (event) => {
  const modal = document.getElementById("calendarSelectorModal")
  if (event.target === modal) {
    modal.style.display = "none"
  }
})
