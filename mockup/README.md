# Mockup ASCEND

Protótipo visual estático com dados fictícios. Não autentica, não chama a API e não grava alterações. O fluxo de conclusão de missão apenas navega para a tela de level up.

## Como abrir

Abra `index.html` diretamente no navegador para ver o login, ou abra `dashboard.html` para começar pelo painel. Todas as telas se conectam por links. Em telas abaixo de 768 px, a navegação fica numa barra fixa inferior com as abas Painel, Missões, Progresso, Personagem e Acesso; em telas maiores, a sidebar desktop existente permanece. A tipografia usa Google Fonts e os ícones usam Bootstrap Icons via CDN, como no app ASCEND.

## Barra de abas inferior

`js/bottom-tabs.js` constrói a barra a partir dos links já presentes em `.sidebar`, mantendo os destinos existentes e marcando a página atual. Cadastro aponta para Acesso e Level up aponta para Painel. O CSS limita a barra a `max-width: 767.98px`, reserva espaço no conteúdo e respeita `env(safe-area-inset-bottom)`; a partir de 768 px volta a sidebar. Os ícones são acompanhados por nomes acessíveis para leitores de tela.

## Telas e endpoints

Os caminhos abaixo são relativos à base `/api`. “Existe” indica que a rota correspondente está implementada no backend verificado; não significa que toda a experiência mockada esteja persistida. Rotas protegidas exigem `Authorization: Bearer <token>`.

## Levar a barra ao app real

1. Reaproveite os destinos e labels da navegação real (`data-view`/`href`); não copie os links fictícios do mockup sem conferir as seções habilitadas no app.
2. Substitua o botão `MENU` mobile por um `<nav>` inferior com `aria-label`, nomes acessíveis para ícones, `aria-current="page"` e alvos com pelo menos 44 px.
3. Importe Bootstrap Icons apenas se ainda estiver disponível no layout real e reaproveite os tokens CSS do app. A barra deve ser fixa, reservar espaço no conteúdo e usar `env(safe-area-inset-bottom)`.
4. Em `max-width: 767.98px`, mostre a tab bar e esconda a sidebar mobile; a partir de 768 px, preserve a navegação desktop existente. Valide rotação, scroll, foco e todas as rotas reais.

Este protótipo não altera o app real: os dados de conta, as rotas e os estados de demonstração permanecem mockados.

| Tela | Endpoint relacionado | Status | Observação |
|---|---|---|---|
| Login | `POST /auth/login`; `GET /auth/me` | Existe | Autentica e consulta sessão. |
| Cadastro | `POST /auth/register` | Existe | Cria usuário e personagem padrão nível 1. |
| Criação do personagem | `POST /auth/register`; `POST /player/status/planner` | Parcial | Conta/personagem padrão e geração do plano existem; endpoint para salvar nome exibido, foco/meta como perfil persistente falta criar. |
| Dashboard | `GET /player/status` | Existe | Retorna nível, XP, rank, atributos e missões do fluxo legado. O mockup apresenta números inventados. |
| Missões | `POST /player/status/planner`; `POST /player/status/planner/missions/{missionId}/complete` | Existe, com lacuna | Gera e conclui missões adaptativas, mas o perfil/plano não é persistido como instância diária estável. `GET` de plano persistido falta criar. |
| Progresso / histórico | `GET /player/status` | Parcial | Há contagem/status atual; endpoint de histórico paginado de conclusões e recompensas falta criar. |
| Level up | `POST /player/status/planner/missions/{missionId}/complete`; `GET /player/status` | Existe para progressão | Backend atualiza XP/nível no fluxo de conclusão. A resposta visual dedicada de level up não existe no frontend de produção. |
| Estados de carregamento, vazio e erro | `GET /player/status`; `POST /player/status/planner` | Existe | O mockup só desenha os estados; tratamento visual e recuperação completos precisam ser integrados no frontend. |

### Lacunas de contrato a resolver na integração

- Decidir um único fluxo de missões entre `MissionCompletion` e `UserQuest`; hoje há endpoints de conclusão separados.
- Persistir perfil e missão diária no backend, para que leitura e conclusão usem o mesmo plano sem confiar em recompensa recalculada no navegador.
- Criar endpoint de histórico; o ranking existente não substitui histórico pessoal.
- Na produção, restringir `apiBase` e configurar CORS para a origem Vercel aprovada. Consulte [../docs/DIAGNOSTICO.md](../docs/DIAGNOSTICO.md) e [../docs/MVP.md](../docs/MVP.md).
