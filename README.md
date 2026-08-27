# ASCEND Frontend

Frontend for the ASCEND platform, built with Vite.

## What is included

- `index.html`
- `css/`
- `js/`
- `assets/`

## Local run

Install dependencies and run Vite:

```powershell
npm install
npm run dev
```

For a production build:

```powershell
npm run build
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

If the variable is not present, the frontend falls back to the public ASCEND backend at `https://backend-ascend.onrender.com/api`.

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
