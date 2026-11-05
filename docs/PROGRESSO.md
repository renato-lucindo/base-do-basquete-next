# Progresso atual

Unidade ativa: **bordas mobile da tabela de Jogadores + cabeçalho Pos.**, plano e ajuste adicional autorizados em05/11/2026. Branch **codex/tabela-mobile-bordas**, base41452f9a2e450df97e51aa272c5f5187c4c24162; recuperar HEAD pelo Git. Uma PR desta unidade será criada após push do material validado; não integrar sem ambas as CIs.

## Implementação e provas

Implementado `overscroll-behavior:none` apenas nos dois contêineres do ScoresheetStatisticsTable; sincronizador limita offsets/sombras, evita reescritas equivalentes e ajusta a largura útil da barra superior. Altura/scroll interno/inércia/zoom/layout/dados preservados. Pedido adicional: Pos. fixo verticalmente, movimentação horizontal anterior mantida. [Relatório, capturas e limites](design/VALIDACAO-BORDAS-MOBILE.md).

RED→GREEN:2casos originais de bordas/sincronização; Pos. falhou com468px de deslocamento e passou após correção. Chromium56PASS sem skips (Jogadores/bordas/touch/retornos/Equipes), depois6PASS de alinhamento +2touch com CSS final. WebKit Windows3PASS de alinhamento final; não oferece CSS overscroll nem wheel em contexto mobile. CI focal em macOS adicionada para conferir CSS/sincronização desktop/mobile e3casos nativos em larguras mobile, sem simular suporte/introduzir skips. Vídeo touch automatizado não equivale a confirmação física no celular.

Gate local exit0:704unitários/146arquivos, transporte11,banco13,WorkerHTTP30,PDF1,lint/formato/tipos/build/fronteira/segredos. Após ajuste Pos., formato/tipos/browsers focais novamente PASS. CI final no SHA da PR e do merge permanece necessária. Revisão do autor com ui-ux-pro-max/web-design-guidelines vigente, sem parecer independente. Logs `.preview-artifacts/mobile-boundaries-*.log` e `mobile-position-*.log`. Próximo passo: push/PR, conferir CIs/reviews/threads e integrar com expected_head_sha; depois build fresco do merge e deploy autorizado só no Worker independente.

## Registro documental — filtros avançados

Em 05/11/2026, registrado FUT-004 no [roadmap](ROADMAP.md): filtros do perfil e dos jogadores do campeonato, com recálculo por recorte, checkboxes pesquisáveis e aplicação explícita. Branch `codex/roadmap-filtros-jogadores`, base `85ae37e`; SHA documental e resultado de CI devem ser conferidos na PR desta unidade. Sem implementação, migration, atualização de dados ou deploy; integração de regular/eliminatória permanece dependência a confirmar. Validação documental e CI serão registradas na PR; próximo passo: conferir os checks do SHA e integrar somente com autorização vigente. Checkout humano e trabalho da PR #59 preservados; o restante deste checkpoint pertence à unidade anterior e não foi revalidado nesta atualização.

## Serviços preservados

PR57 concluída, CI HEAD/main SUCCESS no41452f9. Preview **base-do-basquete-next-uiux** ainda deploymentd6218ce9-6c00-41dc-9954-e3934908b1cd/versão7fd61d4e-400f-4e45-a86f-16d291c29dc3/fonte41452f9. Não houve novo deploy nesta unidade. Conta16b4a5e0a99a031d28051ebadb4811cc, config local ignorada `.preview-artifacts/uiux-preview/wrangler.json`, origem própria, namespace2ac0ffe60c2d490cb7f457c444f24859/segredos existentes preservar. CLI4.152.0 OAuth/conta correta conferidos, sem relogin/upgrade. Cloudflare Apps exige reautenticação, mas conector Cloudflare direto está disponível/mesmo proprietário; preferir esse para metadata. Nunca chamar uploader canônico.

Principal permanece deployment00dffb6b-1d5c-4433-9214-768013ed6277/versão139410ce-a8d6-4710-9b94-e1b1222cd3dc; preservar domínio principal/Access/banco/Auth/dados. [Encerramento57](../historico/progresso/2026-11-05-jogadores-preview-encerrado.md). Equipes [somente planejada](../historico/progresso/2026-11-05-equipes-planejamento.md), sem implementação/republicação13jogos autorizada.

## Continuidade

Checkout humano sync/trabalho-casa/CONTRIBUTING modificado/skills pessoais, demais worktrees/previews4189/5177/5180 preservados. Servidores de teste task-owned5173/session3470 e5174/session63632 iniciados nesta execução; não confundir com previews herdados. Artefatos dos navegadores devem ter diretórios de saída diferentes se paralelos; execução inicial compartilhada causou ENOENT e servidor encerrado por outro runner, rodada final corrigida sem alterar produto/timeouts.

Última medição real91% restante5h/35% semanal, reset1793907030. Retomada autorizada já ativa nesta conversa; automação retomar-piloto-uiux-pr-51 deve acompanhar esta unidade, sem repetirdiagnóstico. Aos15% restante seguir checkpoint+mesmaautomação reset observado+2min. Sem créditos/reset manual. Pausar somente ao concluir PR+CI integrada+preview validado ou pedido explícito de parar.
