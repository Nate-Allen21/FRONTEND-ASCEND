# Vercel

Este repositório contém o frontend na raiz. Conecte `Nate-Allen21/FRONTEND-ASCEND` ao projeto Vercel, com branch de produção `main` e Root Directory `.`. O `vercel.json` define Vite, `npm ci`, `npm run build` e saída `dist`.

Configure `VITE_API_URL` com a URL pública da API, terminando em `/api`. Exemplo: `https://backend-ascend.onrender.com/api`. Não use localhost em produção. Após alterar variáveis, faça um novo deploy.

O backend deve permitir o domínio do site em `ASCEND_CORS_ALLOWED_ORIGINS`. O padrão já inclui `https://ascend22.vercel.app` e seus previews. Se o projeto Vercel tiver outro domínio, adicione-o no Render.

Um push em `main` aciona o deploy quando a integração Git da Vercel está habilitada. Chaves de IA e credenciais do banco ficam somente no backend; arquivos `.env` locais não são enviados.

Validação local: `npm ci`, `npx playwright install chromium`, `npm test` e `npm run build`. Os testes usam API simulada.
