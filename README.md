# ASCEND Frontend

Frontend for the ASCEND platform, built with Vite.

## What is included

- `index.html`
- `css/`
- `js/`
- `assets/`

New accounts choose AETHER or ASTRA during onboarding. The selection is saved
through the authenticated backend and reused in the profile, dashboard, sidebar
and ranking. Existing users can change it from **Meu perfil**.

## Local run

Install dependencies and run Vite:

```powershell
npm install
npm run dev
```

Neste ambiente, o container `ascend-local-backend` publica a API em
`http://localhost:8081/api`. O arquivo local `.env.development.local` conecta
o Vite a esse backend apenas no modo de desenvolvimento. A porta 8080 pertence
a outro projeto. Verifique a API em `http://localhost:8081/api/health`.

Arquivos `.env*.local` não são versionados. Para reproduzir esta configuração,
crie `.env.development.local` com `VITE_API_URL=http://localhost:8081/api`.
O build de produção continua usando a configuração do ambiente de deploy.

For a production build:

```powershell
npm run build
```

## Browser tests

The Playwright suite runs with:

```powershell
npm test
```

Cypress end-to-end checks run against a temporary local Vite server:

```powershell
npm run test:cypress
```

## Vercel Deploy

This repo includes `vercel.json` configured for Vite:

- build command: `npm run build`
- output directory: `dist`

In Vercel, add this environment variable:

```text
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api
```

The value must include `/api`.

## API configuration

For Vite deployments, define the backend URL with:

```text
VITE_API_URL=https://nome-do-servico.onrender.com/api
```

The value must include `/api`. Vite injects this variable during the build.

Without an environment, URL-query or previously saved API setting, the frontend uses `https://backend-ascend.onrender.com/api`. An explicitly selected backend is never silently replaced by the public backend when unavailable.

You can override the backend URL manually with:

```text
?apiBase=https://your-backend-domain.com/api
```

The chosen value is saved in `localStorage`, so the frontend keeps using it on the next load.

## GitHub Pages or static hosting

If you publish this folder on GitHub Pages, Netlify, Vercel, or similar, make sure the backend allows that domain through CORS. See the backend README for the `ASCEND_CORS_ALLOWED_ORIGINS` variable.

For the Supabase + Vercel + Render setup, the request path is:

```text
Vercel frontend -> Render backend -> Supabase PostgreSQL + AI provider
```

## ASCEND v2 — API da loja e IA

A loja passou a registrar moedas/compras **no backend**. Atualize/deploy o backend v2 **antes** de publicar este frontend, pois é obrigatório oferecer `GET /api/shop` e `POST /api/shop/purchase`.

O menu **Assistente IA** abre uma tela nova e o botão `?` abre a FAQ pesquisável. Com a API Groq configurada no backend, marque o consentimento explícito para autorizar envio de conteúdo e contexto ao provedor. Sem consentimento, não há requisição à IA externa.

Variáveis do navegador, por exemplo `VITE_API_URL`, são públicas: nunca armazene a chave de IA nelas.
