# ASCEND Frontend

Frontend for the ASCEND platform, built with Vite.

## What is included

- `index.html`
- `css/`
- `js/`
- `assets/`

## Local run

Open `index.html` with a local static server.

Examples:

```powershell
npx serve frontend
```

or

```powershell
python -m http.server 3000 --directory frontend
```

## API configuration

For Vite deployments, define the backend URL with:

```text
VITE_API_URL=https://nome-do-servico.onrender.com/api
```

The value must include `/api`. Vite injects this variable during the build.

You can override the backend URL manually with:

```text
?apiBase=https://your-backend-domain.com/api
```

The chosen value is saved in `localStorage`, so the frontend keeps using it on the next load.

## GitHub Pages or static hosting

If you publish this folder on GitHub Pages, Netlify, Vercel, or similar, make sure the backend allows that domain through CORS. See the backend README for the `ASCEND_CORS_ALLOWED_ORIGINS` variable.
