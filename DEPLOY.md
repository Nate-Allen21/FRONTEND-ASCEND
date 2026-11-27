# Vercel

Este repositório contém o frontend na raiz. Conecte `Nate-Allen21/FRONTEND-ASCEND` ao projeto Vercel, com branch de produção `main` e Root Directory `.`. O `vercel.json` define Vite, `npm ci`, `npm run build` e saída `dist`.

Configure `VITE_API_URL` com a URL pública da API, terminando em `/api`. Exemplo: `https://backend-ascend.onrender.com/api`. Não use localhost em produção. Após alterar variáveis, faça um novo deploy.

O backend deve permitir o domínio do site em `ASCEND_CORS_ALLOWED_ORIGINS`. O padrão já inclui `https://ascend22.vercel.app` e seus previews. Se o projeto Vercel tiver outro domínio, adicione-o no Render.

Um push em `main` aciona o deploy quando a integração Git da Vercel está habilitada. Chaves de IA e credenciais do banco ficam somente no backend; arquivos `.env` locais não são enviados.

Validação local: `npm ci`, `npx playwright install chromium`, `npm test` e `npm run build`. Os testes usam API simulada.

## Recuperação de senha

Publique o build Vite com as duas entradas HTML, incluindo `/recuperar.html`. O site e o APK enviam a recuperação à API definida por `VITE_API_URL` no build, com padrão `https://backend-ascend.onrender.com/api`. No build de produção, o login também usa essa origem. As configurações do Resend ficam no serviço Spring.

O botão do APK abre a página incluída no aplicativo. O e-mail abre a página HTTPS oficial no navegador do celular. Após a confirmação, a mesma senha permite entrar no aplicativo. Uma instalação anterior precisa receber o novo APK para exibir o link funcional. Para distribuir uma atualização, use o mesmo applicationId e certificado da instalação existente.
