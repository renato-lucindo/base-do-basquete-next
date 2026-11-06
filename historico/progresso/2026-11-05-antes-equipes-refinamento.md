# Progresso atual

Unidade ativa: **Jogadores — centralização desktop + textos PP%/5F**, reunidos na mesma PR59 após o responsável questionar por que as demandas não foram testadas juntas. Preservar a entrega única e um único deploy de preview; não abrir outra PR só para textos. Worktree reforma-uiux, branch codex/jogadores-desktop-centro, base inicial85ae37e. Merge explícito origin/main1d2505a feito localmente (21707db), preservando história pública; recuperar HEAD por Git. PR59 ainda aberta; HEAD remoto anteriorf4587e4 teve CI42071357279tentativa2 SUCCESS (validate127418909440/WebKit127418912584), mas antecede os textos e não valida a nova versão.

## Implementação e provas

Centralização só hasBoxscore===false acima1050px, CSS intrínseco sem API/banco/cálculos, mobile aprovado e consumidores preservados. Textos privados de apresentação de Jogadores: PP% Participação nos Pontos;5F Exclusões por cinco faltas, cabeçalho/tooltip/legenda iguais. referenceMetric e métricas globais de Equipes não alterados. [Relatório e limites](design/VALIDACAO-DESKTOP-SUMULA.md). Textos RED2→GREEN4 desktop/mobile, foco/hover/toque/Escape/axe. Gate:ui exit0;34Chromium+2WebKit PASS. Capturas revelaram palavra fragmentada na legenda estreita: novo RED de legibilidade, CSS auto-fit só desktop compacto; na versão final12Chromium+7WebKit PASS. Últimos formato/lint/build/segredos/diff focais PASS antes do push; nova CI remota pendente. Provas anteriores do domínio e da centralização reutilizadas conforme política de CI proporcional; CI remota do novo HEAD ainda necessária.

## CI e serviços

PR62 **integrada1d2505af44dedfacc736d70a88409c2eac354332**, CI HEAD42079154524SUCCESS (7min49s observados, sem promessa). CI PUSH42080607535 em18:13:12UTC: scope/checks/design/browsers1/2SUCCESS; WebKit127432587508 QUEUED e validate agregador pendente. Não presumir sucesso; aguardar conclusão antes de consolidar unidade62. Worktree ci-proporcional tem checkpoint/histórico pósmerge locais, preservar/reconciliar futuramente sem commit vazio.

Preview permanece PR58/fonte85ae37e: deployment6b929376-9a49-4d12-af6b-7ad8118d6eae/versãoa15ebe3b-e20f-4a79-8f46-8e305f78d2c7. Após nova CI59 aprovada e CI do merge, build fresco limpo e atualizar SOMENTE Worker base-do-basquete-next-uiux com config ignorada existente. Nunca uploader canônico. Principal base-do-basquete-next-preview/basedobasquete.com.br preservado, deployment00dffb6b-1d5c-4433-9214-768013ed6277/versão139410ce-a8d6-4710-9b94-e1b1222cd3dc. Sem Access/DB/Auth/DML/segredos/dados humanos.

## Continuidade

Automação retomar-piloto-uiux-pr-51 ACTIVE; prompt deve refletir o agrupamento nesta PR59 e ausência de uma segunda entrega textual. Última cota48%restante5h/49%semanal reset1793916012; medir15%reset+2min semcréditos/resetmanual. PR60docs/PR61fases e checkouts humanos/outrosworktrees/previews4189/5177/5180 preservados. Contexto anterior [arquivado](../historico/progresso/2026-11-05-pr59-antes-agrupamento.md); planos históricos não substituem instruções atuais.
