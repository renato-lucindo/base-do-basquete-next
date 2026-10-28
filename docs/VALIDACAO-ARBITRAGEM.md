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

## A2a — adapter local

- Catálogo, leitura de editor num snapshot e salvamento versionado implementados em `src/games/officiating-provider.ts`. Quatro testes novos tiveram RED real e GREEN; composição com provider legado **8/8 PASS**.
- Saída fechada/página20, nome de RPC fixo, JWT somente servidor, validação antes do envio, correlação do jogo/ACK, homônimo explícito, idempotência e erros sanitizados. RPCs novas ainda não conectadas ao SessionStore/rotas/UI. Tipos gerados do banco remoto não foram alterados artificialmente.
- `npm run typecheck` aplicação+Worker PASS; lint dos arquivos do adapter e segredos **755arquivos PASS**. Não houve gate ou CI da unidade incompleta.
- Prova A1 após ordem final de locks: **6/6 PASS**, log `.preview-artifacts/officiating-a1-postlocks.log`, SHA256e8c6a5b1b3270f61b6cbca1ed5bdfd582ab8b7282875d8b53bb40954be607d90.
- Regressão13PG: SHA2562ef23401a2db17b53c2f431c89dc98e74c1cbc0f9c1b767f214b6e3987b6d2a6. Adapter8focais: `.preview-artifacts/officiating-provider-final.log`, SHA2565cbd8222973480f1f07e1148b77f50662a9bc8389f9b75353bc79c84e3e6f0f9.

## Próxima unidade

Revisão independente/corridas reais PG do novo writer/prova real com rollback e aplicação segura/tipos remotos. SessionStore/rotas/dropdowns/formulário, testes de interface, gate/CI e publicação. Não declarar arbitragem disponível no preview. Preview segue source1e73ae0/deployment1290ebc0-fedd-4d64-8c7a-e410c80e68d2, sem novo deploy.
