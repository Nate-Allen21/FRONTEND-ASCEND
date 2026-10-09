# Atualização da experiência ASCEND

Atualização aplicada ao frontend web, mantendo a identidade de evolução pessoal, ranks, missões e neon. O aplicativo Expo e o backend Java não foram alterados.

- Login e painel inicial renovados, com composição orbital animada, progresso diário real e atalhos para as principais ações.
- Cores, cartões, botões e transições compartilhados entre as 11 áreas. Calendário adaptado ao tema claro.
- Busca de telas por **Ctrl/Cmd + K**, com navegação por setas, Enter e Escape. Voltar/avançar do navegador preservam a navegação entre telas.
- Pesquisa de missões que ignora acentos, filtros de pendentes/concluídas, contagem e estado sem resultados.
- Pomodoro de 25 ou 50 minutos e pausa de 5 minutos, usando horário real para compensar abas em segundo plano. Pausas não contam como ciclos de foco. Removida a indicação de EXP do timer, que não possuía crédito no servidor.
- Exibição de senha, aviso offline, limites de espera nas requisições e limpeza de conversa/ciclos no logout.
- Resumos e cabeçalho mais compactos em telas pequenas; preferência de movimento reduzido respeitada.
- Atributos ausentes na resposta começam em zero em vez de manter números demonstrativos.

## Executar

```powershell
npm install
npm run dev
```

## Verificar

```powershell
npx playwright install chromium
npm test
npm run build
```

Os seis testes de navegador usam respostas simuladas da API para verificar login, missões, navegação, histórico, timer, responsividade, tema, modo offline e logout. Não criam contas nem compras reais. As capturas de desktop, celular e calendário claro são gravadas em `test-results/`.

Build de produção e seis testes aprovados. Integração com o backend real e execução nativa Android/iOS não foram validadas nesta atualização.

O estilo complementar está em `css/experience.css`, as novas interações em `js/experience.js`, e os fluxos existentes continuam em `js/script.js`.

## Organização de treino, estudos e loja

- Treino abre na ficha semanal; configurações ficam em um painel expansível, com campos adicionais da rotina em uma seção opcional. Removidos o briefing redundante do assistente, o resumo de biotipo e o guia ilustrado.
- Estudos concentra timer, duração, pausa e ciclos em um cartão, sem painel explicativo duplicado.
- Loja usa três colunas no desktop, duas em telas intermediárias e uma no celular, com preços abaixo das descrições. A confirmação repetitiva de sincronização foi removida; erros e resultados de compras continuam visíveis.
- Conteúdo usa a rolagem da página, sem barras internas no painel principal.
- Teste adicional cobre larguras de 390, 1440 e 1920 pixels, largura dos cartões e envio do formulário recolhível.
