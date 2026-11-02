# Progresso atual

Atualizado em 02/11/2026. Escopo em [MATRIZ-ESCOPO.md](MATRIZ-ESCOPO.md), objetivos em [ROADMAP.md](ROADMAP.md), leitura seletiva em [INDICE.md](INDICE.md). O [checkpoint anterior](../historico/progresso/2026-11-02-antes-navegacao-publica.md) preserva o contexto único da integração pública anterior; não representa o estado vigente.

## Unidade — navegação pública integrada

- Branch `codex/navegacao-publica`, implementação `13dc91212a41f9bb1ebb18d6b07dbb54880c5a85` (núcleo `2f04dca`), criada de `origin/main` `d84c09e`. [PR #49](https://github.com/renato-lucindo/base-do-basquete-next/pull/49), destino main, sem pilha. Worktree exclusivo `C:/Users/12405304716/.codex/worktrees/navegacao-publica`. A unidade inclui descoberta, busca, seleção hierárquica e navegação entre Classificação, Jogos, Equipes e Jogadores, com detalhes e retorno na URL.
- Verificação local do núcleo `2f04dca`: `npm run gate` **PASS**, 660 unitários/133 arquivos, transporte 6 PASS, banco descartável 13 PASS, HTTP/Workerd 28 PASS e runtime PDF 1 PASS, além de tipos, lint, formato, builds e segurança. Playwright público: **113 PASS / 7 SKIP** preexistentes; 14 execuções novas da navegação. Reforço de reflow em `13dc912`: 2 browsers PASS com nomes longos em 320 px/zoom 200%, lint/formato/segredos PASS; cálculos e leitores inalterados. Capturas, revisão e limites em [evidências](evidencias/2026-11-02-navegacao-publica.md).
- CI remota por SHA: [checks da PR #49](https://github.com/renato-lucindo/base-do-basquete-next/pull/49/checks), com execução e resultado vigente fixados na descrição da PR. A CI local não substitui o check remoto `validate`. A main de origem tem CI [41532508036](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41532508036) SUCCESS; esta prova é da base, não da unidade nova.
- Classificação continua em estado informativo: a política pendente do ADR 013 não foi alterada. O contrato público não traz ordem Categoria/Divisão por edição; foi mantida Categoria → Divisão, sem criar administração ou níveis ausentes. As consultas existentes, métricas, cobertura, filtros e paginação foram preservados. Catálogo deriva somente de resultados publicados; busca de perfis independentes continua disponível mesmo sem catálogo.
- **Próximo passo:** conferir `validate` do HEAD da PR #49 e revisar as capturas/fluxo. Integração depende de autorização específica do responsável. Não fazer merge, deploy ou operações de banco nesta unidade sem nova autorização. Decisões futuras de classificação/ordem pública ficam fora desta implementação.

## Base integrada e alterações alheias

- Estado real consultado: PRs #38 e #46 já integradas; não havia PR aberta ao iniciar esta unidade. Main remota `d84c09e` inclui ambas. Os relatos antigos de conflito/integração pendente foram preservados no histórico, sem refazê-los.
- Checkout principal permanece `sync/trabalho-casa`; alteração preexistente de CONTRIBUTING, `.agents/skills/web-design-guidelines/` e `skills-lock.json` preservados. Worktrees e branches de outros agentes não foram trocados, limpos ou descartados.
- O checkpoint histórico anterior registra detalhes exclusivos das PRs #38/#46 e seus serviços. Não atribuir autorização de merge dessas conversas à PR #49.

## Serviços e banco

- Nenhum deploy, consulta/alteração de dados humanos, DDL ou migration nesta unidade. Migrations aplicadas continuam imutáveis. Testes usam fixtures e banco descartável. Proteção Access e serviços anteriores preservados.
- Os identificadores de deployment/versão publicados permanecem os do [checkpoint anterior](../historico/progresso/2026-11-02-antes-navegacao-publica.md); não foram reconsultados nem republicados. O código desta PR não está implantado.
- Em retomada, conferir branch, HEAD, PR e CI reais. Procedimento de cota e retomada em [CONTRIBUTING.md](../CONTRIBUTING.md); não reaproveitar horários históricos.
