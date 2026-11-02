# Navegação pública integrada

Unidade da [PR #49](https://github.com/renato-lucindo/base-do-basquete-next/pull/49), branch `codex/navegacao-publica`, base `d84c09e`, implementação `2f04dca`. Ambiente local Windows, Node 24.18, dependências do lockfile e fixtures isoladas. A descrição e os [checks da PR](https://github.com/renato-lucindo/base-do-basquete-next/pull/49/checks) registram o SHA e o resultado remoto vigente; não usar a CI anterior da main como prova desta unidade.

## Resultado e limites

- A raiz do Worker serve `publico.html`; `foundation.html` conserva o acesso administrativo. Descoberta por competição, ano, naipe e categoria/divisão; árvore pesquisável e expansível, dois naipes lado a lado no desktop e verticais no celular. Busca global inclui equipes e jogadores, sem jogos.
- Abrir disputa leva à Classificação. Cabeçalho, breadcrumbs, seletor rápido e quatro seções compartilham contexto público. Jogos publicados ficam em lista cronológica; equipes, estatísticas completas/simples, comparação, colunas, perfis e súmula reaproveitam os módulos existentes.
- URLs HTML anteriores continuam válidas. A disputa acompanha links de atletas, jogos e inscrições; `returnTo`, antes do hash, preserva a consulta de origem. O destino de retorno aceita somente páginas públicas locais e contexto correspondente, ou a busca global. Não depende de armazenamento local, sessão ou navegação prévia. Perfis independentes continuam consultáveis sem inventar disputa.
- Leituras novas: projeções mínimas de `published_games`, `published_player_games` e `published_player_profiles`, com chave pública somente no servidor, sem JWT administrativo ou fallback privado. Catálogo paginado por ID, até 10.000 jogos, erros explícitos; busca de atletas limitada com aviso para refinar. Cabeçalho e catálogo usam o mesmo leitor. Falha de catálogo não desabilita a busca independente de jogadores nem as consultas existentes.
- A classificação não possui leitor/escritor público autorizado: estado informativo conforme ADR 013, sem novos cálculos. O snapshot público não traz a configuração de ordem por edição; a navegação usa Categoria → Divisão, sem nível fictício quando não existe divisão. A ordem alternativa exige contrato público futuro, sem ampliação administrativa nesta PR.

## Verificação

- `npx vitest run src/public-ui src/team-statistics/navigation.test.ts src/publication/public-page.test.ts`: 16 PASS, incluindo identidade, retorno seguro, projeção anônima, contaminação e filtros de busca. O gate consolidado inclui o conjunto completo.
- Playwright nos nove arquivos públicos afetados: **113 PASS / 7 SKIP**, projetos desktop/mobile. Os sete skips são condicionais preexistentes, sem desativação de cenários nesta unidade. `tests/public-navigation.spec.ts` acrescenta 14 execuções: hierarquia, quatro seções, detalhes e retorno, recarga, histórico, nova aba, troca de disputa, um/dois naipes, ausência de divisão, erro/vazio, busca independente, teclado, axe e reflow.
- Capturas do fluxo: **1440 × 1000** e **390 × 844**. Densidade das telas existentes também conferida em 1440 × 900, mantendo os limites anteriores: primeira linha da súmula mobile em 453 px e oito linhas estatísticas visíveis, sem transbordamento da página.
- Reflow em 320 CSS px; ampliação de layout via CSS zoom 200% e testes existentes de texto 200%; teclado, foco visível, landmarks e `aria-current`. Axe sem violações nos estados exercitados, inclusive seletor aberto. Não equivalem a teste de leitor de tela, zoom nativo de todos os navegadores ou conformidade WCAG integral.
- `npm run gate`: **PASS**, 660 unitários/133 arquivos, 6 transportes, 13 contratos de banco descartável, 28 HTTP/Workerd e 1 runtime PDF; tipos, lint, formato, builds, fronteira cliente/servidor e segredos aprovados. Resultados remotos: ver descrição/checks da PR. Logs locais em `.preview-artifacts/public-navigation-gate-final.log` e `.preview-artifacts/public-navigation-public-final.log`. A CI publica capturas com `after` no nome e logs por etapa.

Falhas corrigidas durante a validação: links sem contexto na tabela compartilhada, densidade inicial do cabeçalho, seletores antigos ambíguos entre seções da disputa e da equipe, fixture antiga da raiz e chamada de `fetch` sem adaptador no Workerd. Nenhum timeout ampliado ou teste desativado. Revisão local com `ui-ux-pro-max` e `web-design-guidelines`, consultando a fonte vigente; não houve parecer independente. Referência antiga consultada seletivamente em `public-navigation.tsx` e `contextual-search.tsx`, sem importar sua infraestrutura.

## Capturas selecionadas

| Interface | Desktop | Mobile |
| --- | --- | --- |
| Descoberta | [Início](navegacao-publica/inicio-desktop.png) | [Início](navegacao-publica/inicio-mobile.png) |
| Detalhe integrado | [Resultado](navegacao-publica/resultado-desktop.png) | [Resultado](navegacao-publica/resultado-mobile.png) |
| Troca rápida | Mesma estrutura compartilhada | [Seletor aberto](navegacao-publica/seletor-mobile.png) |

Sem deploy, alteração de Access, migration, DDL ou dados reais. Merge depende de autorização do responsável; os limites de publicação permanecem os dos ADRs 011, 013, 016, 017 e 018/019.
