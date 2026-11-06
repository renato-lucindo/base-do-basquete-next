# Publicação com totais coletivos automáticos

06/11/2026. Pedido: retirar a confirmação manual de faltas que bloqueava uma súmula válida com GDzero. Implementação em codex/publicacao-coletivos-automatica,base maince882f8. [Plano](../superpowers/plans/2026-11-06-publicacao-coletivos-automatica.md); decisão vigente no [ADR018](../decisoes/018-equipes-de-resultados-confirmados.md).

## Diagnóstico e resultado

Browser real, somente leitura: Saldanha da Gama54×AMPRL45,5períodos,111ações;FR18/25,T0/0,GD0/0 e dois checks desmarcados. Publicar desabilitado. O banco valida totais, não recebe os checks humanos. O formulário agora envia os números automaticamente pelo mesmo contrato e mostra FR/T/GD para leitura. Totais GD anteriores são conservados somente para a mesma versão. A correção de publicação congelada mantém total editável/motivo, sem checks redundantes.

Sem migration, mudança de API, DDL/DML, nova regularização histórica ou publicação do jogo humano. Guardas de versão/edição/motivo/fonte, limite mínimo de GD, FR cruzada, conflitos, reautenticação e recibos permanecem.

## Provas

RED: prontidão automática devolvia false para zero e para contagens do motor; browser não encontrava GD automática. Após implementação:12unitários focais PASS, incluindo as regressões anteriores de FR e números obrigatórios, mínimos, contagens não zero e recuperação de totais conhecidos. A primeira composição de19browsers de súmula passou. Nova prova com desqualificação não zero inicialmente usou fixture com cesta posterior à desqualificação; o motor rejeitou corretamente. Fixture corrigida para registrar a falta depois da cesta, sem mudar domínio/timeouts/retries/skips. Resultado final e gate serão registrados abaixo ou na PR.

UI normal com zero e prorrogação:axe,foco fora do cabeçalho,sem overflow,capturas1366/1920/390 em automatic-collectives-*.png. Histórico: mínimo/erro junto ao campo,fonte divergente preservada,guardar edição/recarga/cancelamento,conflito entre abas e retryJSON/UUID idêntico. Novos cenários usam fixtures; não representam publicação do jogo humano.

Revisão autoral com ui-ux-pro-max e [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultadas06/11. Busca temática de confirmação retornou apenas diálogos/feedback genéricos; segunda busca de formulários retornou rótulos e tipos, sem recomendação específica comprovada para eliminar esse fluxo. A decisão vem do pedido humano. Arquivos collective-review.tsx/sheet-panel.tsx/team-statistics-panel.tsx e sheet-workspace.css:outputs rotulados,GDnumérica validada com erro associado na correção histórica,guardas/foco preservados e CSS exclusivo dos checks removidos. Sem novos achados relevantes nessa revisão; sem afirmar revisão humana independente,WCAG integral ou celular físico.

## Operação

Preview anterior:ce882f8/deploymentb7f1ba34-3716-4a5e-9800-f1b82336dc31/versionc994ffd2-b835-43e3-bdf1-cdbdeafbb311. Conferir CI da PR e do SHA integrado antes de publicar código somente no UIUX. Preservar principal/Access/segredos/DO. A aba humana e dados do jogo não são teste de escrita. Provas finais e versão efetivamente publicada ficam na PR apontada por PROGRESSO, evitando um novo commit só para repetir CI de código inalterado.
