# Progresso atual

Atualizado em 10/11/2026. Unidade: integração sequencial das PRs #75 e #76, autorizada expressamente pelo responsável, sem publicar nova versão do site.

## Entrega e rastreabilidade

- [PR75](https://github.com/renato-lucindo/base-do-basquete-next/pull/75): merge commit **6445091e8b5d8f1c16f2b1567c02bfbc721722e4**, HEAD revisado a47c58f. [CI da PR42840209632](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42840209632) e [CI da main42853798575](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42853798575): **7/7 SUCCESS** em ambas.
- [PR76](https://github.com/renato-lucindo/base-do-basquete-next/pull/76): composição material **08afa92cc6e31437021082c0c62734a760865736**, originada de 8e4868c e atualizada por merge explícito da main da PR75. [CI completa42854770370](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42854770370): **7/7 SUCCESS**, incluindo gate, Chromium integral, WebKit e design. Sem bloqueios de código identificados na revisão técnica desta integração; sem parecer independente adicional.
- Branch da PR existente: codex/partida-publica. Branch local de integração: codex/integracao-pr75-pr76, em worktree gerenciado isolado. Este checkpoint altera somente documentação sobre a composição já validada; gate local inalterado reutilizado. A CI obrigatória do HEAD documental e a CI do merge permanecem critérios de integração. O estado final e o SHA resultante são registrados na PR76 e no seu merge commit, consultáveis pelo link acima.

## Validação e migrations

Gate local em 08afa92: **exit0**, 799 unitários/170 arquivos, 11 transporte, 15 banco isolado, 35 Worker/HTTP e um teste com os quatro PDFs no workerd; lint, formato, tipos, builds, fronteira cliente e segredos aprovados. CI da composição: **784 Chromium PASS +118 SKIP**, **42 WebKit PASS**, design e validate aprovados. Detalhes, comandos, limites e conflitos em [VALIDACAO-INTEGRACAO-PRS-75-76.md](VALIDACAO-INTEGRACAO-PRS-75-76.md).

SQL original de **20261110133504_public_game_detail_draft_guard** recuperado de supabase_migrations.schema_migrations do DEV e incorporado sem reaplicação. Git e DEV têm as mesmas **73 versões**, sem duplicatas. Ordem: visibilidade da PR75 → detalhe130218 → guard133504 → filtro aninhado145957 → compatibilidade150011. SQL aplicado preservado; sequência reproduzida integralmente no PGlite.

## Serviço e preservação

DEV consultado somente para leitura: semifinal IVV/Cetaf × Saldanha da Gama permanece **draft v1**, jogo finished v4 e publicação histórica v1. As duas RPCs públicas negam a partida; fonte pública mantém26jogos/resultados sem ID privado. Hashes de súmula/snapshot registrados na validação. Nenhum DDL, DML, seed, repair ou deploy nesta unidade. Auth, Access, segredos e configurações de produção preservados. Versão publicada não auditada; o merge não publica o site e a flag flexível principal permanece false.

Checkout principal sync/trabalho-casa preservado, incluindo alteração humana em CONTRIBUTING.md, .agents/skills/web-design-guidelines/ e skills-lock.json. Outros worktrees/branches não alterados. Históricos anteriores: [PR75](../historico/progresso/2026-11-10-antes-integracao-pr75.md) e [PR76](../historico/progresso/2026-11-10-antes-integracao-pr76.md).

Nenhuma publicação de serviço ou de dados está autorizada por esta integração. Próxima liberação do site depende de solicitação própria do responsável; não republicar a semifinal.
