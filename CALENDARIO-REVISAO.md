# Calendário: revisão e publicação

Esta pasta é um checkout da versão atual do frontend, com CONNECT e o projeto Android Capacitor. A pasta `FRONTEND-ASCEND` fornecida no workspace é uma versão anterior e não deve substituir este checkout em produção. Revise as alterações com `git diff` antes de publicar.

O calendário usa a API autenticada `/api/calendar/events`. As atividades editadas a partir das sugestões ficam separadas do plano gerado; atividades recorrentes são editadas ou removidas como série. A lista semanal atualmente cobre apenas os dias dentro do mês exibido. O aviso de conflito considera eventos com início e fim no dia mostrado. A IA ainda não envia propostas individuais de reorganização e o push FCM ainda não foi implementado.

## Antes do deploy

1. Resolva a exposição apontada em `BACKEND-ASCEND-atual/database/REVISAO-SEGURANCA-CALENDARIO.md`. Não execute SQL de produção sem avaliar os consumidores.
2. Em PostgreSQL isolado, ensaie a migration e valide as credenciais JDBC com RLS habilitada. Confirme backup e recuperação antes de aplicá-la em produção. Não dependa de `ddl-auto=update` para habilitar RLS.
3. Rode testes e builds nas duas pastas `*-atual`; teste persistência, login, isolamento, CONNECT, tema e calendário em web e Android com o backend atualizado. A suíte simulada não comprova esses fluxos em produção.
4. Confirme os endereços de produção, CORS, configuração do Firebase e versão do APK. Não exponha credenciais no frontend.
5. Revise `git status`, `git diff`, `git diff --check`, arquivos não rastreados e segredos. Não inclua `.env`, chaves, dados pessoais ou resultados de teste.

Após aprovação explícita para commit e push, execute em cada checkout `FRONTEND-ASCEND-atual` e `BACKEND-ASCEND-atual`, escolhendo previamente a branch aprovada:

```powershell
git fetch origin
git status --short --branch
git diff
git diff --stat
# Revise arquivos não rastreados individualmente antes de git add.
git switch -c calendario-revisao
# git add -- <arquivos revisados>
# git diff --cached
# git commit -m "Adiciona calendário editável"
# git push -u origin calendario-revisao
```

Não force push. A branch deve ser comparada com a versão mais recente de `origin/main`, e conflitos resolvidos preservando CONNECT, login e demais alterações. Um push na branch de produção pode acionar deploy automático; revise as configurações das integrações antes de qualquer push.

## Android e push

O APK deste repositório usa Capacitor (`android/` e `capacitor.config.json`), com identificador `br.com.ascend.mobile`. O repositório `ASCEND-mobile` é um app Expo distinto. Para construir o APK deste frontend são necessários Android SDK, Java/Gradle compatíveis e, para distribuição, a configuração de assinatura correspondente. O APK precisa conter esta nova versão do frontend e apontar para a mesma API.

O plugin oficial `@capacitor/local-notifications` 8.3.1 foi integrado e o projeto sincronizado. O botão **Ativar lembretes** solicita a permissão; cada sincronização da agenda substitui apenas os avisos identificados como pertencentes ao calendário. São agendadas até 256 ocorrências nos próximos 60 dias, no fuso `America/Sao_Paulo`; ao abrir o aplicativo a janela é renovada. Após logout os avisos locais são cancelados. O conteúdo na tela bloqueada é genérico. O plugin fornece um receiver para reinicialização, mas isso ainda deve ser verificado no aparelho.

Os alarmes são intencionalmente imprecisos e o Android pode adiá-los por economia de bateria. Alterações feitas em outro dispositivo só chegam aos alarmes locais após a próxima sincronização do aplicativo; se o app ficar fechado por mais de 60 dias, ocorrências posteriores não estarão agendadas. O navegador apenas salva a configuração. Esses limites e o comportamento após forçar parada, reiniciar, alterar fuso, negar permissão, editar ou apagar um evento devem ser testados fisicamente antes de anunciar a função como concluída.

Para compilar no Windows, instale JDK 21 e Android Studio com Android SDK e os componentes requeridos pelo projeto; configure `ANDROID_HOME` ou `android/local.properties` fora do Git. Na raiz do frontend execute `npm ci`, `npm run android:sync` e, em `android`, `./gradlew.bat assembleDebug`. O APK de debug não é uma versão assinada para distribuição.

Para push, registre `br.com.ascend.mobile` no Firebase, configure `android/app/google-services.json`, forneça credenciais administrativas exclusivamente ao backend e associe tokens a usuários autenticados. O envio deve ocorrer após persistência confirmada da mensagem, com identificação idempotente, tratamento de tokens inválidos, preferências, conteúdo privado oculto e abertura autorizada da conversa. A implementação e o teste em dispositivo ainda estão pendentes.
