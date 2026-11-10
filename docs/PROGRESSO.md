# Progresso atual

Atualizado em10/11/2026. Unidade: restringir https://copa-es-u15.pages.dev à Copa ES U15, por solicitação direta do responsável. Publicação autorizada exclusivamente nesse Pages; sem alterar o Worker principal, banco ou dados publicados.

## Unidade e evidências

- Branch `codex/copa-es-u15`, base `ab4820b` (merge da PR77), worktree isolado `C:/Users/12405304716/.codex/worktrees/copa-es-u15`. Fonte material **a58fd1a2325c59ad24c0827609e6e3ce7b5f2f34**. A PR77 foi integrada durante esta execução pelo agente anterior; esta unidade começa da main integrada, sem empilhamento.
- Cabeçalho exclusivo Copa ES U15, entrada direta em Classificação, quatro seções preservadas. Sem troca de disputa, busca global, catálogo de campeonatos ou entrada administrativa. URLs sem disputa ou com outra disputa são reconduzidas à Copa. Perfis consultam somente a disputa configurada.
- Proxy limita catálogo e APIs à disputa, bloqueia descoberta/busca global e jogos de outras disputas. Perfis filtram estatísticas, jogos, histórico, conquistas e contextos pelo contrato existente. Assets públicos próprios no Pages, API pelo SOURCE existente, sem novo deploy no backend.
- Transporte Node **7/7 PASS**; navegação Playwright **2/2 PASS** (1366×768 e390×844), incluindo quatro seções, URL adulterada, jogo/retorno e atleta. Typecheck, build foundation, lint focal, formato e diff PASS. Revisão `web-design-guidelines` sobre o cabeçalho: links semânticos e foco preservados; sem avisos, tooltips ou tabelas novos.
- Gate local passou política/lint/formato/tipos, mas Vitest não avançou além da inicialização dos workers nesta máquina; processo encerrado sem declarar PASS. CI completa obrigatória da PR e do SHA integrado permanece fonte do gate consolidado. Sem repetir as suítes antigas como prova do código novo.

## Serviço e continuidade

Pages observado inicialmente: deployment `69c41d4e-9eaf-4b59-95c0-f714a82ef586`, fonte `720d85b`. SOURCE `base-do-basquete-next-pr77`, disputa `b5433b13-a8f9-4baa-b4d9-08066ebf3e96`. O backend e as proteções existentes são preservados. Publicação desta restrição e smoke remoto ainda pendentes neste checkpoint; consultar PR para evidência final antes de repetir qualquer deploy.

Checkout principal `sync/trabalho-casa` e mudanças humanas em CONTRIBUTING.md, skills locais e skills-lock.json preservados. Worktree/branch da PR77 não alterados. Histórico único anterior em [checkpoint da PR77](../historico/progresso/2026-11-10-antes-copa-es-u15-exclusiva.md).

Próximo passo: conferir CI do HEAD da PR, publicar somente os assets públicos e o proxy desse Pages, conferir navegação e limites no remoto, integrar por merge commit após checks aprovados e acompanhar CI integrada. Em espera, manter checagem oficial silenciosa; avisar somente conclusão, falha ou ação humana necessária.
