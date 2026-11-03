# Progresso atual

Atualizado em 02/11/2026. Escopo em [MATRIZ-ESCOPO.md](MATRIZ-ESCOPO.md), objetivos em [ROADMAP.md](ROADMAP.md), leitura seletiva em [INDICE.md](INDICE.md). O [checkpoint anterior](../historico/progresso/2026-11-02-antes-navegacao-publica.md) preserva o contexto único da integração pública anterior; não representa o estado vigente.

## Unidade — navegação pública integrada

- Branch `codex/navegacao-publica`, implementação `13dc91212a41f9bb1ebb18d6b07dbb54880c5a85` (núcleo `2f04dca`), criada de `origin/main` `d84c09e`. [PR #49](https://github.com/renato-lucindo/base-do-basquete-next/pull/49), destino main, sem pilha. Worktree exclusivo `C:/Users/12405304716/.codex/worktrees/navegacao-publica`. A unidade inclui descoberta, busca, seleção hierárquica e navegação entre Classificação, Jogos, Equipes e Jogadores, com detalhes e retorno na URL.
- Verificação local do núcleo `2f04dca`: `npm run gate` **PASS**, 660 unitários/133 arquivos, transporte 6 PASS, banco descartável 13 PASS, HTTP/Workerd 28 PASS e runtime PDF 1 PASS, além de tipos, lint, formato, builds e segurança. Playwright público: **113 PASS / 7 SKIP** preexistentes; 14 execuções novas da navegação. Reforço de reflow em `13dc912`: 2 browsers PASS com nomes longos em 320 px/zoom 200%, lint/formato/segredos PASS; cálculos e leitores inalterados. Capturas, revisão e limites em [evidências](evidencias/2026-11-02-navegacao-publica.md).
- CI remota observada em 02/11/2026: HEAD `544f63b4f550ece0268c49f9ea458916d80ce402`, [run 41542144801](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41542144801) **SUCCESS**, incluindo gate, protótipos e **517 browsers PASS / 109 SKIP**. PR #49 marcada pronta para revisão em 02/11/2026 às 22:39 BRT; sem revisão humana ou parecer independente. A CI da base main `d84c09e` também era SUCCESS; não confundir as provas.
- Classificação continua em estado informativo: a política pendente do ADR 013 não foi alterada. O contrato público não traz ordem Categoria/Divisão por edição; foi mantida Categoria → Divisão, sem criar administração ou níveis ausentes. As consultas existentes, métricas, cobertura, filtros e paginação foram preservados. Catálogo deriva somente de resultados publicados; busca de perfis independentes continua disponível mesmo sem catálogo.
- **Retomada concluída:** a automação `retomar-navega-o-p-blica-pr-49` despertou às 22:38:38 BRT de 02/11; cota real reiniciada (0% usada na janela de 5h, 54% na semanal). O checkpoint local da pausa `5e81b2e` foi preservado na história. Somente o resumo operacional foi atualizado; código, testes e capturas são os mesmos validados pela CI acima. A mesma automação foi pausada ao concluir a retomada.
- **Próximo passo:** revisão humana da PR #49 e das capturas. O resultado por SHA do HEAD documental posterior fica nos [checks da PR](https://github.com/renato-lucindo/base-do-basquete-next/pull/49/checks) e na descrição atualizada. Não fazer merge, deploy, DDL ou dados reais sem autorização específica; decisões futuras de classificação/ordem pública não integram esta unidade.

## Base integrada e alterações alheias

- Estado real consultado: PRs #38 e #46 já integradas; não havia PR aberta ao iniciar esta unidade. Main remota `d84c09e` inclui ambas. Os relatos antigos de conflito/integração pendente foram preservados no histórico, sem refazê-los.
- Checkout principal permanece `sync/trabalho-casa`; alteração preexistente de CONTRIBUTING, `.agents/skills/web-design-guidelines/` e `skills-lock.json` preservados. Worktrees e branches de outros agentes não foram trocados, limpos ou descartados.
- O checkpoint histórico anterior registra detalhes exclusivos das PRs #38/#46 e seus serviços. Não atribuir autorização de merge dessas conversas à PR #49.

## Serviços e banco

- Nenhum deploy, consulta/alteração de dados humanos, DDL ou migration nesta unidade. Migrations aplicadas continuam imutáveis. Testes usam fixtures e banco descartável. Proteção Access e serviços anteriores preservados.
- Os identificadores de deployment/versão publicados permanecem os do [checkpoint anterior](../historico/progresso/2026-11-02-antes-navegacao-publica.md); não foram reconsultados nem republicados. O código desta PR não está implantado.
- Em retomada, conferir branch, HEAD, PR e CI reais. Procedimento de cota e retomada em [CONTRIBUTING.md](../CONTRIBUTING.md); não reaproveitar horários históricos.
