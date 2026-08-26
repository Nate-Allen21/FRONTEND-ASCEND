# ASCEND Frontend

Static frontend for the ASCEND platform.

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

The frontend tries to find the backend automatically on:

- `http://localhost:8080/api`
- `http://localhost:8081/api`
- `http://localhost:8082/api`

You can also set the backend URL manually with:

```text
?apiBase=https://your-backend-domain.com/api
```

The chosen value is saved in `localStorage`, so the frontend keeps using it on the next load.

## GitHub Pages or static hosting

If you publish this folder on GitHub Pages, Netlify, Vercel, or similar, make sure the backend allows that domain through CORS. See the backend README for the `ASCEND_CORS_ALLOWED_ORIGINS` variable.
