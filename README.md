# ASCEND Frontend

Frontend for the ASCEND platform, built with Vite.

## Aplicativo Android

O projeto Android usa Capacitor e inclui os arquivos do frontend no APK. Ele
precisa de internet para acessar a API e recursos externos. O endereço padrão
da API é `https://backend-ascend.onrender.com/api`; para usar outro servidor,
configure `VITE_API_URL` antes de gerar o build, com uma URL HTTPS acessível
ao celular terminada em `/api`. `localhost` no celular não é o computador.

Para gerar um APK de teste no Windows, instale as dependências com `npm install`,
configure o Android SDK e um JDK compatível com o Gradle do projeto e execute:

```powershell
npm run android:apk
```

O arquivo é criado em `android/app/build/outputs/apk/debug/app-debug.apk`.
É um APK de teste assinado com a chave de debug; para distribuição pública,
configure uma chave própria e gere uma versão release. O login Google no Android
usa o Credential Manager nativo e precisa ser configurado antes do build:
defina `VITE_GOOGLE_CLIENT_ID` com o ID OAuth Web que o backend valida em
`ASCEND_GOOGLE_CLIENT_ID`. No mesmo projeto Google Cloud, crie um cliente OAuth
Android com o pacote `br.com.ascend.mobile` e a impressão SHA-1 do certificado
que assina o APK. A assinatura de debug usa outra impressão. Teste o login em um
dispositivo com Google Play Services; sem essa configuração, use conta e senha.

### APK de lançamento

O APK de lançamento é gerado com Java 21, Android SDK e `npm run android:sync`,
seguido de `android\gradlew.bat :app:assembleRelease`. O APK não assinado fica
em `android/app/build/outputs/apk/release/app-release-unsigned.apk`: alinhe-o com
`zipalign` e assine-o com `apksigner` e a chave de lançamento antes de distribuir.
A chave e sua senha devem ser guardadas em local seguro, fora do repositório e
com backup: futuras atualizações precisam usar a mesma chave. Incremente
`versionCode` em `android/app/build.gradle` a cada lançamento.

## What is included

- `index.html`
- `css/`
- `js/`
- `assets/`

New accounts choose AETHER or ASTRA during onboarding. Both character portraits
use transparent PNG artwork and are displayed without background blending. The
selection is saved through the authenticated backend and reused in the profile,
dashboard, sidebar and ranking. Existing users can change it from **Meu perfil**.

The profile screen also supports an editable bio, tags and visibility, a custom
profile photo, progress sharing, likes and comments, player discovery, follows
and friend requests. Profile photos are resized in the browser and saved with
the authenticated profile through the `/api/profile` endpoint.

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
