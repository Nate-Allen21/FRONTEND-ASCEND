# Desbloquear login Google no APK Android

O código do APK usa Android Credential Manager e já está configurado para enviar o ID token ao backend. O `VITE_GOOGLE_CLIENT_ID` precisa ser um cliente OAuth do tipo **Web application**; o backend ASCEND valida esse mesmo público por `ASCEND_GOOGLE_CLIENT_ID`.

## APK debug atual — configuração concluída em 26/11/2026

No projeto Google Cloud **ASCEND Login**, foi criado o cliente OAuth **ASCEND Android Debug**:

- Client ID: `294156922170-ujmgnphe0gbjgnjumd82rhd0uqcbumct.apps.googleusercontent.com`
- Package: `br.com.ascend.mobile`
- SHA-1: `73:91:C7:61:3F:89:0A:11:CD:2B:45:D9:B4:EB:2F:42:2D:42:E6:41`

O APK atual `ASCEND-google-login-debug-2026-11-26.apk` foi verificado com esse certificado debug. A configuração de Audience está como **External / In production**, então não é necessário adicionar test users. Não é necessário recompilar: o app continua usando o cliente Web já incluído no APK como `serverClientId`.

## Para distribuição release / Play Store

Cadastre outros clientes Android com o mesmo package e as impressões SHA-1 correspondentes ao certificado release. Se distribuir pela Play Store com Play App Signing, use também o SHA-1 de **App signing key certificate** em Play Console → Release → Setup → App integrity. O SHA-1 debug acima não autentica uma versão assinada com outra chave.

O arquivo `google-services.json` não configura este fluxo de ID token; ele é usado por integrações separadas do Google Services.

## Se ainda falhar

Confirme que o cliente Android e o cliente Web pertencem ao mesmo projeto Google Cloud e que o cliente Web configurado no frontend é o mesmo aceito por `ASCEND_GOOGLE_CLIENT_ID`. `GetCredentialCancellationException` pode indicar autorização não concluída por configuração técnica, além de cancelamento manual. Consulte os logs filtrando `AscendGoogleSignIn`; o app registra somente o tipo da exceção, sem token nem dados da conta.
