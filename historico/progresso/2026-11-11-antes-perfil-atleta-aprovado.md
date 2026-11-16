# Progresso atual

Atualizado em10/11/2026. Unidade: restringir https://copa-es-u15.pages.dev à Copa ES U15, por solicitação direta do responsável. Publicação autorizada exclusivamente nesse Pages; sem alterar o Worker principal, banco ou dados publicados.

## Unidade e evidências

- Branch `codex/copa-es-u15`, base `ab4820b` (merge da PR77), worktree isolado `C:/Users/12405304716/.codex/worktrees/copa-es-u15`. Fonte material **658c879** (UI a58fd1a; correções do Pages b05d86d/658c879). A PR77 foi integrada durante esta execução pelo agente anterior; esta unidade começa da main integrada, sem empilhamento.
- Cabeçalho exclusivo Copa ES U15, entrada direta em Classificação, quatro seções preservadas. Sem troca de disputa, busca global, catálogo de campeonatos ou entrada administrativa. URLs sem disputa ou com outra disputa são reconduzidas à Copa. Perfis consultam somente a disputa configurada.
- Proxy limita catálogo e APIs à disputa, bloqueia descoberta/busca global e jogos de outras disputas. Perfis filtram estatísticas, jogos, histórico, conquistas e contextos pelo contrato existente. Assets públicos próprios no Pages, API pelo SOURCE existente, sem novo deploy no backend.
- Transporte Node **8/8 PASS**; navegação Playwright **2/2 PASS** (1366×768 e390×844), incluindo quatro seções, URL adulterada, jogo/retorno e atleta. Typecheck, build foundation, lint focal, formato e diff PASS. Revisão `web-design-guidelines` sobre o cabeçalho: links semânticos e foco preservados; sem avisos, tooltips ou tabelas novos.
- Gate local inicial travou em forks; com threads passaram805unitários/171arquivos,18transporte e15banco. Runtime:33/35PASS e2falhas, uma com SQLite disk I/O e disco local cheio; PDF não executado nessa sequência. CI42889008688 no HEAD anterior b7f65fc aprovou gate completo, design e WebKit; isso não aprova as correções posteriores do proxy. CI completa do HEAD atual da PR78 e do SHA integrado ainda obrigatória.

## Serviço e continuidade

Pages observado inicialmente: deployment `69c41d4e-9eaf-4b59-95c0-f714a82ef586`, fonte `720d85b`. SOURCE `base-do-basquete-next-pr77`, disputa `b5433b13-a8f9-4baa-b4d9-08066ebf3e96`. O backend e as proteções existentes são preservados. Publicado em https://copa-es-u15.pages.dev, deployment curto2d093e45 (https://2d093e45.copa-es-u15.pages.dev), fonte658c879. Smoke remoto24percursosPASS em1366/1920/390/320px, quatro abas, atleta e jogo/retorno;7rotas externas/privadas bloqueadas, catálogo somenteU15, requests somentePages, sem errosJS ou transbordamento. Primeira tentativa identificou redirecionamento HTML do ASSETS e revalidação304; ambos corrigidos e cobertos por teste. Captura390px e JSON detalhado preservados nos artefatos locais.

Checkout principal `sync/trabalho-casa` e mudanças humanas em CONTRIBUTING.md, skills locais e skills-lock.json preservados. Worktree/branch da PR77 não alterados. Histórico único anterior em [checkpoint da PR77](../historico/progresso/2026-11-10-antes-copa-es-u15-exclusiva.md).

Próximo passo: conferir CI do HEAD real da PR78, revisar e integrar por merge commit após checks aprovados, depois acompanhar CI integrada. Pages já publicado e validado; não repetir deploy por atualização documental. Checagem oficial concluir-copa-es-u15-exclusiva ACTIVE, a cada10min. Responsável autorizou continuar até3%restante5h neste chat; depois checkpoint e retomada pelo reset real+2min. Sem avisos repetidos enquanto CI pendente.
