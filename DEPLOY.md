# 🚀 Como Fazer Deploy no Vercel

## Opção 1: Deploy Direto (Mais Fácil)

1. Acesse [vercel.com](https://vercel.com)
2. Crie uma conta gratuita (pode usar GitHub, GitLab ou email)
3. Clique em "Add New Project"
4. Clique em "Browse" e selecione a pasta do projeto
5. Clique em "Deploy"
6. Pronto! Seu app estará no ar em segundos

## Opção 2: Deploy via GitHub (Recomendado)

### Passo 1: Subir para o GitHub

\`\`\`bash
# No terminal, dentro da pasta do projeto:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
\`\`\`

### Passo 2: Conectar ao Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Add New Project"
3. Selecione "Import Git Repository"
4. Escolha seu repositório do GitHub
5. Clique em "Deploy"

**Vantagem:** Toda vez que você fizer push no GitHub, o Vercel atualiza automaticamente!

## ⚙️ Configuração do Firebase

Suas credenciais do Firebase estão no arquivo `firebase-config.js`. 

**IMPORTANTE:** Por segurança, você pode adicionar as credenciais como variáveis de ambiente no Vercel:

1. No painel do Vercel, vá em "Settings" → "Environment Variables"
2. Adicione cada credencial do Firebase
3. Atualize o `firebase-config.js` para usar `process.env.VARIAVEL`

## 📁 Arquivos Necessários para Deploy

Certifique-se de que estes arquivos estão na pasta:

- ✅ `index.html` - Página principal
- ✅ `script.js` - Lógica do app
- ✅ `auth.js` - Autenticação
- ✅ `styles.css` - Estilos
- ✅ `firebase-config.js` - Configuração do Firebase
- ✅ `vercel.json` - Configuração do Vercel

## 🌐 Após o Deploy

Seu app estará disponível em: `https://seu-projeto.vercel.app`

Você pode configurar um domínio customizado gratuitamente nas configurações do Vercel!

## 🔧 Problemas Comuns

**Erro 404:** Verifique se o `index.html` está na raiz do projeto

**Firebase não funciona:** Verifique se as credenciais no `firebase-config.js` estão corretas

**Mudanças não aparecem:** Faça um novo deploy ou force um redeploy no painel do Vercel
