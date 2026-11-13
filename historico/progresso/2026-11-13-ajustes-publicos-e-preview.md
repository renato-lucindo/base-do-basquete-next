# Progresso atual

Atualizado em 13/11/2026. Ajustes públicos solicitados na mesma [PR79](https://github.com/renato-lucindo/base-do-basquete-next/pull/79), branch `codex/perfil-atleta-aprovado`, base `a55dd7c`. A implementação e as provas locais estão concluídas. O HEAD real e o resultado de `validate` ficam nos [checks da PR](https://github.com/renato-lucindo/base-do-basquete-next/pull/79/checks); o commit deste checkpoint exige CI própria. Não usar a aprovação anterior de `373f4f8`/run43242010656 para aprovar esta revisão.

- Equipes: escopo e modo lado a lado quando couberem, com quebra alinhada; superfícies de Equipes e Classificação claras e navegação com preenchimento apenas na seleção. Placar da lista sem bloco de cor; traço de faltas de quem não entrou centralizado.
- Classificação: seletor **Fase Regular / Eliminatórias** com visual segmentado; fase regular só oferece troca quando as eliminatórias estão disponíveis. Links por fase, grupos e regras de disponibilidade preservados.
- Busca completa: até 20 resultados por tipo e página, com última equipe publicada abaixo do apelido ou do nome. Sugestões e consulta antiga preservadas. Troca de disputa abre pelo nome do campeonato e usa o seletor pesquisável existente com foco e Escape.
- Validação: gate local completo PASS, 122 browsers PASS/8 skips de matriz e 42 verificações focais PASS após o ajuste final no seletor e alinhamento. Capturas e comandos no [relatório](../../docs/VALIDACAO-REFINAMENTO-PUBLICO.md#ajustes-de-13112026) e em `.preview-artifacts/followup-*`.
- Migração de leitura `20261113115916_public_search_full_results` aplicada somente ao `base-do-basquete-next-dev` pela autorização permanente. SQL conferido no histórico, SHA256 `443a63e1200ec26edcfb2dff2fb99db3b8ae1d857be59efdc22866bded10b0a8`. RLS e RPC antiga intactas; smoke anônimo PASS com a equipe publicada. Nenhum DML real, alteração de dados ou deploy.

O [preview UIUX separado](https://base-do-basquete-next-uiux-preview.renato-lucindo-jr.workers.dev) continua na fonte `4643a29`, versão `acef31bf-ab42-4754-b4b8-bed4cf45f7bd`, deployment `1f2beccf-5132-41c1-9bb9-e258b419aa18`. O Worker da PR79 continua na fonte `8f7b38d`, versão `80e95d3b-9a4f-45c7-a418-d8c6d4ac367e`, deployment `abab63fd-a7e9-4687-ab2e-a702764da3ce`. Nenhum foi alterado nesta unidade. A revisão de 13/11 ainda não está publicada nesses Workers.

Worktree da unidade `C:/Users/12405304716/Documents/Codex/2026-11-10/perfil-jogador-prototipos/work/perfil-atleta-produto`. Checkout humano `sync/trabalho-casa`, seus `CONTRIBUTING.md`, `skills-lock.json`, `.agents/skills/web-design-guidelines/` e demais worktrees preservados. [Checkpoint anterior](2026-11-12-refinamento-e-preview-publico.md).

Próximo passo: confirmar CI/pareceres do HEAD real, registrar o resultado no corpo da PR e pausar a mesma automação de acompanhamento. Sem merge ou novo deploy nesta rodada; o aceite visual pode usar as capturas e, quando houver autorização de publicação, o preview separado.

### Resultado operacional da rodada anterior

No SHA `f1c99245de6e2b278f937799375a3e3e76998c1c`, CI completa [43421897883](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/43421897883) aprovada, incluindo `validate`, sem novos pareceres ou threads abertas na consulta da rodada. O preview separado foi atualizado às 11:01 BRT, versão `17355c61-98d5-42aa-886c-6c83c81ceba7`, deployment `521f54cd-eb01-447d-855d-0caf6d67fb88`. Smoke remoto conferiu 36 arquivos, sete consultas HTTP e a interface em 390/1366 px. O Worker da PR79 continuou na fonte `8f7b38d`, versão `80e95d3b-9a4f-45c7-a418-d8c6d4ac367e`, deployment `abab63fd-a7e9-4687-ab2e-a702764da3ce`. A descrição da PR registra a publicação.
