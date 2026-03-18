# Site Labgen

Site para inscrições em cursos com formulário e API.

## 🚀 Como rodar em outra máquina

1. **Clone o projeto:**
   ```bash
   git clone https://github.com/thallyson1997/site-labgen.git
   cd site-labgen
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   # Copie o template
   cp .env.example .env.local
   
   # Edite o .env.local com seus valores reais do Supabase
   ```

3. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

4. **Execute localmente:**
   ```bash
   vercel dev
   ```

## 🔧 Estrutura

- `index.html` - Página principal
- `pages/inscricao.html` - Formulário de inscrição  
- `api/inscricoes.js` - API serverless
- `assets/` - CSS, JS e imagens

## 🏗️ Deploy

A aplicação está configurada para deploy automático na Vercel.