# Progresso atual

## Unidade ativa — classificação de jogos nas estatísticas (05/11/2026)

**Branch:** `codex/fases-estatisticas-publicadas` (base `main` `85ae37e521367150c498989d8ccdfe5019eb2c30`). **PR:** [#61](https://github.com/renato-lucindo/base-do-basquete-next/pull/61) (draft; sem merge/deploy). **Projeto:** `base-do-basquete-next-dev`, ID `nizmasjddyrhmevvfviz`, PostgreSQL 17.11, confirmado novamente em 05/11/2026.

**DDL aplicado com autorização:** `apply_migration` registrou `20261105220937_confirm_published_game_stages`. Nome do arquivo na PR alinhado exatamente ao histórico aplicado. Foram verificadas as funções de confirmação, RLS e grants (RPC acessível a `authenticated`, não a `anon`/`service_role`). DDL não altera as estatísticas existentes.

**Preflight atual:** 26 jogos regulares cadastrados; 25 publicados com `phase=null`; 575 projeções individuais com fase ausente. Duas disputas: `b350cd03-73fb-41a6-9887-ef5ea309389e` — head v4, 4 jogos/92 projeções; `b5433b13-a8f9-4baa-b4d9-08066ebf3e96` — head v27, 21 jogos/483 projeções. Preflight anterior (17/391) ficou desatualizado por novas publicações. Baselines somente leitura: `published_games` SHA MD5 agregado `38f56c327a58eed242f4c54c0aeac63d` e fatos dos jogadores sem fase/versão `aec193c2ca766fba9c191ca48fbf1ea5`. Recalcular antes de alterações.

**DML autorizado, mas NÃO executado:** `private.confirm_game_stages` exige `auth.uid()` de administrador habilitado; `execute_sql` do conector roda como `postgres`, sem sessão autenticada. Não simular JWT nem usar SQL direto para contornar auditoria. Uma tentativa de preparar operação de manutenção no GitHub foi bloqueada pelas configurações de segurança. O procedimento e a consulta de payloads autenticados estão em [CONFIRMACAO-FASES-ESTATISTICAS.md](CONFIRMACAO-FASES-ESTATISTICAS.md). O banco ainda contém 25 jogos/575 projeções sem fase; nenhum recibo de confirmação foi criado.

**CI:** GitHub Actions no SHA anterior `53fafa9edab58e1b3e52a43f8d24ca49733f3a79` aprovado (gate, 706 Vitest, PGlite, design, E2E, WebKit). Revisar novamente checks do HEAD após o ajuste do nome da migration e este checkpoint. Teste PostgreSQL concorrente multi-conexão e publicação autenticada em sessão real permanecem sem execução. Não rebaixar checks.

**Pendências:** nova validação de SHA da PR, execução do backfill via administrador autenticado, comparações dos totais/placares/origens e revisão/merge/deploy autorizados separadamente. As alterações de outros agentes permanecem intocadas.

## Checkpoint anterior — bordas mobile, já incorporado à main pela PR #58

A unidade anterior utilizou a branch `codex/tabela-mobile-bordas`; a PR #58 foi incorporada no commit `85ae37e521367150c498989d8ccdfe5019eb2c30`. O texto abaixo preserva as provas e os serviços então registrados, sem representar validação da nova unidade.

## Implementação e provas

Implementado `overscroll-behavior:none` apenas nos dois contêineres do ScoresheetStatisticsTable; sincronizador limita offsets/sombras, evita reescritas equivalentes e ajusta a largura útil da barra superior. Altura/scroll interno/inércia/zoom/layout/dados preservados. Pedido adicional: Pos. fixo verticalmente, movimentação horizontal anterior mantida. [Relatório, capturas e limites](design/VALIDACAO-BORDAS-MOBILE.md).

RED→GREEN:2casos originais de bordas/sincronização; Pos. falhou com468px de deslocamento e passou após correção. Chromium56PASS sem skips (Jogadores/bordas/touch/retornos/Equipes), depois6PASS de alinhamento +2touch com CSS final. WebKit Windows3PASS de alinhamento final; não oferece CSS overscroll nem wheel em contexto mobile. CI focal em macOS adicionada para conferir CSS/sincronização desktop/mobile e3casos nativos em larguras mobile, sem simular suporte/introduzir skips. Vídeo touch automatizado não equivale a confirmação física no celular.

Gate local exit0:704unitários/146arquivos, transporte11,banco13,WorkerHTTP30,PDF1,lint/formato/tipos/build/fronteira/segredos. Após ajuste Pos., formato/tipos/browsers focais novamente PASS. CI final no SHA da PR e do merge permanece necessária. Revisão do autor com ui-ux-pro-max/web-design-guidelines vigente, sem parecer independente. Logs `.preview-artifacts/mobile-boundaries-*.log` e `mobile-position-*.log`. Próximo passo: push/PR, conferir CIs/reviews/threads e integrar com expected_head_sha; depois build fresco do merge e deploy autorizado só no Worker independente.

## Serviços preservados

PR57 concluída, CI HEAD/main SUCCESS no41452f9. Preview **base-do-basquete-next-uiux** ainda deploymentd6218ce9-6c00-41dc-9954-e3934908b1cd/versão7fd61d4e-400f-4e45-a86f-16d291c29dc3/fonte41452f9. Não houve novo deploy nesta unidade. Conta16b4a5e0a99a031d28051ebadb4811cc, config local ignorada `.preview-artifacts/uiux-preview/wrangler.json`, origem própria, namespace2ac0ffe60c2d490cb7f457c444f24859/segredos existentes preservar. CLI4.152.0 OAuth/conta correta conferidos, sem relogin/upgrade. Cloudflare Apps exige reautenticação, mas conector Cloudflare direto está disponível/mesmo proprietário; preferir esse para metadata. Nunca chamar uploader canônico.

Principal permanece deployment00dffb6b-1d5c-4433-9214-768013ed6277/versão139410ce-a8d6-4710-9b94-e1b1222cd3dc; preservar domínio principal/Access/banco/Auth/dados. [Encerramento57](../historico/progresso/2026-11-05-jogadores-preview-encerrado.md). Equipes [somente planejada](../historico/progresso/2026-11-05-equipes-planejamento.md), sem implementação/republicação13jogos autorizada.

## Continuidade

Checkout humano sync/trabalho-casa/CONTRIBUTING modificado/skills pessoais, demais worktrees/previews4189/5177/5180 preservados. Servidores de teste task-owned5173/session3470 e5174/session63632 iniciados nesta execução; não confundir com previews herdados. Artefatos dos navegadores devem ter diretórios de saída diferentes se paralelos; execução inicial compartilhada causou ENOENT e servidor encerrado por outro runner, rodada final corrigida sem alterar produto/timeouts.

Última medição real91% restante5h/35% semanal, reset1793907030. Retomada autorizada já ativa nesta conversa; automação retomar-piloto-uiux-pr-51 deve acompanhar esta unidade, sem repetirdiagnóstico. Aos15% restante seguir checkpoint+mesmaautomação reset observado+2min. Sem créditos/reset manual. Pausar somente ao concluir PR+CI integrada+preview validado ou pedido explícito de parar.
