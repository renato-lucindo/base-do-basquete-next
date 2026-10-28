# Arbitragem administrativa — evidências

## A1 — contratos e banco local

Base main e6e8bf49c7040070cfc0fe0aa9cf8eca1169de34, branch codex/arbitragem, worktree `C:/Users/12405304716/.codex/worktrees/uiux-validation/Base do Basquete-v1`. Plano aprovado em `docs/superpowers/plans/2026-10-28-arbitragem.md`.

- RED inicial de importação não executou asserções. Em seguida, schemas provisórios permissivos executaram e falharam nos quatro comportamentos: nomes, sequência/duplicidade e contrato fechado. Implementação passou quatro focais novos e três contratos antigos.
- PostgreSQL descartável zero/upgrade inicialmente recusou a RPC ausente. Nova migration gerada pela CLI fixada2.121.0: **20261028132846_game_officiating.sql**, somente local/NÃO APLICADA.
- Oito focais contratos/banco/locais PASS; composição posterior dez focais com preparação PASS.82casos TS×SQL em cada cenário zero/upgrade:64combinações de funções, entradas malformadas, IDs repetidos inclusive caixa diferente, Unicode/limites/vazio/controles. A matriz não testa carga.
- Ajustes diagnosticados: rollback da fixture de upgrade também desfaz DDL criada dentro da transação, portanto a asserção final verifica jogos revertidos; dependência de helper de Local quebrava seu teste de upgrade, removida por normalizador próprio; Zod4.6.7 limita strings por pontos de código, comprovado diretamente, então SQL usa length em vez de contagem UTF16. Espaços Unicode vazios produziram RED e ganharam normalização compatível, sem alterar helpers antigos.
- Contrato SQL também prova: seis funções opcionais/independentes, lacunas/duplicados/IDs ausentes recusados, normalização e homônimos explícitos, replay exato e conflito de recibo, paginação20+1, versão antiga recusada sem criar nomes, falha tardia desfaz oficial/jogo/recibo, writer legado preserva escala e seu ACK não pode receber escala adicional, limpeza explícita, histórico imutável e revogação antes de replay.
- `npm run test:db`: **13/13 PASS** com a nova migration na árvore, sem executar banco remoto. Log `.preview-artifacts/officiating-db-regression.log`.
- Typecheck aplicação, lint dos três arquivos novos, diff-check e segredos **752arquivos PASS**. Formato focal aprovado após formatação. Sem gate consolidado/CI da arbitragem ainda.

## Segurança e compatibilidade

Catálogo/vínculos/recibos privados com RLS e sem grants diretos. RPCs administrativas versionadas; save_game/get_game/list_games anteriores preservados. Mesma transação, versão do jogo e ordem command→competition→game→identidades ordenadas→nomes ordenados. Snapshots de nomes e recibos imutáveis; nenhuma seleção ou união por nome. Nenhuma exposição em DTO público.

Leitura do projeto novo nizmasjddyrhmevvfviz pelo vínculo autorizado: **48migrations,11jogos,167pessoas,18inscrições,1Auth,0objetosStorage** em28/10/2026. São dados humanos, preservados. Não foram executados DDL/DML/fixtures remotos. SQL de prova usa o administrador existente sem DMLAuth/admin; runner descartável cria seu administrador apenas localmente.

## Pendente

Revisão independente/corridas reais PG do novo writer/prova real com rollback e aplicação segura/tipos remotos. Provider/SessionStore/rotas/dropdowns/formulário, testes de interface, gate/CI e publicação. Não declarar arbitragem disponível no preview. Preview segue source1e73ae0/deployment1290ebc0-fedd-4d64-8c7a-e410c80e68d2, sem novo deploy.
