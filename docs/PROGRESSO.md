# Progresso atual

## Unidade ativa — classificação de jogos nas estatísticas (05/11/2026)

Branch `codex/fases-estatisticas-publicadas` criada da main `85ae37e521367150c498989d8ccdfe5019eb2c30`; **PR #61 (draft)** para main. Código do checkpoint: `9dde0e234d9be27051d2caca115e97e83ce73197` (antes deste commit de documentação). Migration nova `20261105181000_confirm_published_game_stages.sql`, testes SQL/PGlite e integração autenticada de confirmação explícita de fases preparados, **sem aplicação no Supabase, merge ou deploy**. Provas reais na CI do SHA `f23cb9821361ecaeeda6e6aeccce30b5126b0b12`: lint, Prettier, tipos e **706/706 Vitest** aprovados; `webkit-boundaries` aprovado. `validate` falhou no teste SQL de preservação de projeções devido a operador JSONB ambíguo no teste; casts explícitos corrigidos no código SHA `9dde0e234d9be27051d2caca115e97e83ce73197`. **Reexecução do gate completo pendente** no HEAD deste checkpoint. Nenhum `npm run gate` local executado neste ambiente Chat (sem checkout/Node 24). Instruções e impacto: [Confirmação de fases estatísticas](CONFIRMACAO-FASES-ESTATISTICAS.md).

Supabase confirmado: `base-do-basquete-next-dev` (`nizmasjddyrhmevvfviz`), 23 jogos regulares, 17 jogos publicados com fase nula e 391 projeções individuais sem fase, em duas disputas (4/92 e 13/299). O fluxo atual nunca copia `games.stage_kind` para `published_statistics_games.phase`; jogadores herdam fase de `private.refresh_player_game`. Mudança planejada: publicação nova propaga a fase; correções retrospectivas dependem de comando versionado/autenticado com motivo; migração não faz backfill. Autorização **específica de DDL e DML ainda não recebida**. Próximo passo: PR, CI real e avaliação de impactos/riscos antes de solicitar autorização.

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
