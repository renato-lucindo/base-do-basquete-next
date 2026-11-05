# Progresso atual

Atualizado em 05/11/2026. Unidade ativa: [PR #61](https://github.com/renato-lucindo/base-do-basquete-next/pull/61), classificação publicada dos jogos nas estatísticas. Branch `codex/fases-estatisticas-publicadas`, HEAD anterior `0880ca5`, reconciliação por merge explícito da main `6d37e29f7e0712cc02b2155f726e2a213c1f21ee`. Recuperar HEAD atual e CI na PR. [Checkpoint anterior preservado](../historico/progresso/2026-11-05-pr61-antes-reconciliacao.md).

## Código e validação

A publicação confirmada copia `games.stage_kind` para as projeções estatísticas. O comando administrativo versionado confirma jogos antigos por disputa, preservando resultados, placares e autoria. O responsável solicitou concluir a PR nesta conversa; merge do código e operações de serviço permanecem distintos. Procedimento em [CONFIRMACAO-FASES-ESTATISTICAS.md](CONFIRMACAO-FASES-ESTATISTICAS.md).

CI anterior `53fafa9`: SUCCESS [42078598450](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42078598450), sem validar esta reconciliação. Testes HTTP/Workerd foram acrescentados para a rota de confirmação: autenticação, origem, formato, limite do corpo, recibo correlacionado e revogação administrativa. Gate e CI atualizados serão registrados na descrição da mesma PR. Testes isolados não equivalem à publicação autenticada remota nem a um ensaio PostgreSQL concorrente multi-conexão.

## Banco e sessão real

Consulta somente leitura nesta conversa confirmou o projeto `base-do-basquete-next-dev` (`nizmasjddyrhmevvfviz`), migration `20261105220937` aplicada uma vez, RPC `confirm_game_stages(jsonb)` presente e 25 jogos/575 projeções sem fase. O conector usa `postgres`, com `auth.uid()` nulo. Nenhuma migration foi reaplicada e nenhum dado foi atualizado nesta retomada.

O responsável abriu sessão administrativa real no preview Worker `base-do-basquete-next-uiux`; a área administrativa autenticada foi observada. O domínio principal está bloqueado na rede; utilizar o preview existente sem alterar suas proteções. Conferir a versão publicada e a disponibilidade do novo endpoint antes de qualquer comando. Não simular identidade, extrair credenciais nem editar projeções diretamente. Deploy exige autorização própria sobre o artefato concreto.

## Outras unidades e continuidade

PR #60 integrada em `6d37e29`, CI do merge [42126275393](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42126275393) SUCCESS; filtros FUT-004 continuam ideia pós-MVP. Contexto das PRs #59/#62 e dos serviços está no [histórico preservado](../historico/progresso/2026-11-05-antes-conclusao-pr60.md), sem nova verificação de deploy nesta retomada.

Checkout humano `sync/trabalho-casa` com `CONTRIBUTING.md` modificado e skills pessoais não rastreadas preservado; demais worktrees e automações intocados. Próximo passo: validar e publicar a reconciliação na PR #61, conferir a CI do HEAD, revisar e integrar somente o código validado; registrar separadamente deploy e execução autenticada. Seguir [CONTRIBUTING.md](../CONTRIBUTING.md) para cota/retomada, sem reutilizar percentuais ou horários históricos.
