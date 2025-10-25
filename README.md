# 💰 Carteira Pessoal

Aplicativo web para gerenciamento de finanças pessoais com Firebase.

## 🚀 Funcionalidades

- ✅ Autenticação de usuários (login/registro)
- ✅ Registro de entradas e saídas financeiras
- ✅ Controle de gastos variáveis
- ✅ Gerenciamento de cartões de crédito
- ✅ Gráficos de visualização
- ✅ Seletor de calendário para navegação por mês/ano
- ✅ Dados salvos no Firebase Firestore

## 🛠️ Tecnologias

- HTML5
- CSS3
- JavaScript (Vanilla)
- Firebase (Authentication + Firestore)

## 📦 Como Usar Localmente

1. Clone o repositório
2. Abra o `index.html` no navegador, OU
3. Use Live Server no VSCode

## 🌐 Deploy

Veja o arquivo [DEPLOY.md](DEPLOY.md) para instruções completas de deploy no Vercel.

## 📝 Estrutura de Arquivos

\`\`\`
├── index.html          # Página principal
├── script.js           # Lógica do aplicativo
├── auth.js             # Sistema de autenticação
├── styles.css          # Estilos
├── firebase-config.js  # Configuração do Firebase
├── vercel.json         # Configuração do Vercel
└── DEPLOY.md           # Instruções de deploy
\`\`\`

## 🔐 Configuração do Firebase

As credenciais do Firebase estão em `firebase-config.js`. Certifique-se de que seu projeto Firebase tem:

- Authentication habilitado (Email/Password)
- Firestore Database criado
- Regras de segurança configuradas

## 📄 Licença

Projeto pessoal - Uso livre
