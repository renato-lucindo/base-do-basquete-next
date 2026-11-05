# Progresso atual

Atualizado05/11/2026. Unidade ativa: **Equipes conforme Jogadores**, WIP na branch `codex/equipes-refinamento`, base inicial `76b90da`; worktree `C:/Users/12405304716/.codex/worktrees/equipes-refinamento/Base do Basquete-v1`. Recuperar HEAD por Git; este checkpoint será commitado na mesma unidade. Sem PR criada, CI remota, integração ou deploy desta unidade até aqui.

## Implementação e evidências

Contrato optativo pageSize=all/v2 separado do legado20, PB/PB%, médias uniformes/precisão integral, opções completas/hasBoxscore, seleção por registrationId, referência local e POST de consulta extensa. UI própria: busca com debounce/cancelamento, segmentados, tabela integral/legenda/máximos e CSS escopado de súmula. Jogadores, perfil, paginação/cálculos legados e ScrollableTable global preservados. [Spec/plano](superpowers/plans/2026-11-05-equipes-refinamento.md) e [relatório](design/VALIDACAO-EQUIPES-REFINAMENTO.md).

Gate `npm run gate` **exit0** (.equipes-gate.log):715unitários/149arquivos, política11, transporte11, banco descartável13, WorkerHTTP30, PDF1, lint/formato/tipos/build/fronteira/segredos. A parte unitária antecede a última correção pequena de identidade completa/validação/CSSmobile; focais posteriores48PASS e13testes sobrepostos de precisão/PB/fontes mistasPASS. Não repetir o gate por docs; conferir focais finais pertinentes e CI da composição.

Chromium ampliado56PASS/2falhasENOSPC ao gravar traces; os2afetados passaram sequencialmente (.equipes-disk-repeat.log). WebKitWindows2PASS (.equipes-webkit.log), sem confirmar overscroll nativo nessa plataforma nem celular físico. Capturas renovadas em docs/design/evidencias/equipes-refinamento. DiscoC quase cheio (~130MB); ENOENT temporário também desapareceu na repetição sequencial. Removido apenas map PDF gerado nesta execução; preservar arquivos alheios. Revisão autoral, sem parecer independente.

Consulta histórica somente leitura:25jogos/50lados,34sem coletivo novo,15T/mínimoGD4,PBdisponível50. [Quadro por jogo/equipe](evidencias/2026-11-05-equipes-historico.md). Nenhum DDL/DML/rascunho na API/republicação. Originais congelados da versão publicada serviram apenas ao diagnóstico.

## Git e serviços

Origin/main avançou externamente para `6d37e29` (PR60 documental); incorporar main vigente por merge explícito antes da entrega. PR61 é outra unidade, com retomada para o mesmo horário e alvoUIUX: conferir estado real/coordenação antes de publicar, sem empilhar branches nem substituir fonte mais nova por build antigo. Checkout humano sync/trabalho-casa e CONTRIBUTING/skills locais alheios, outros worktrees e automações preservados.

Última leitura remotaUIUX:deployment `79cd9d59-cc65-4437-b44f-55a1f2f859b5`, versão `82ee666f-3ebe-4d0c-b931-0fe020b2c8d3`, source PR59/76b90da. Principal deployment `00dffb6b-1d5c-4433-9214-768013ed6277`, versão `139410ce-a8d6-4710-9b94-e1b1222cd3dc`. Nenhuma alteração em serviços nesta unidade. ConfigUIUX existente em `C:/Users/12405304716/.codex/worktrees/reforma-uiux/.preview-artifacts/uiux-preview/wrangler.json`; não usar uploader canônico.

## Pausa e próximo passo

Cota real **13%5h/30%semanal**, reset `1793934163`. Retomada oficial `retomar-refinamento-de-equipes` **ACTIVE**, confirmada por view e arquivo da automação para este chat: **06/11/2026 às00:04:43 America/Sao_Paulo** (03:04:43UTC), reset+2min. Não usar créditos/resetmanual. Não iniciar outro gate nesta janela.

Ao retomar:medir cota; conferir Git/PRs/CI/main/serviço; concluir revisão e focais pendentes; uma única PR com CI; merge commit e CI integrada; build fresco limpo e deploy exclusivamente base-do-basquete-next-uiux, seguido de smoke/fonte/configuração. Autorizações específicas constam no pedido; não inferir deployprincipal, Access/segredos/DB/DML. [Checkpoint anterior](../historico/progresso/2026-11-05-antes-equipes-refinamento.md).
