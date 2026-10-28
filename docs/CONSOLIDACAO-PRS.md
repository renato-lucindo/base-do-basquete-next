# Consolidação das PRs históricas — 28/10/2026

## Decisão e limites

O responsável autorizou consolidar o código estável na `main` e adotar um fluxo comum para evitar novo acúmulo. Havia **33PRs abertas, todasDraft**, construídas como uma pilha dependente. A `main` estava em **161a5b007833b0af6a0788353205bdba99b286b5**, sem a implementação publicada.

A consolidação parte exclusivamente da fonte **1e73ae03e242d36c1f2e400e808a1bc14fdb7a0d**, já publicada e validada: CI40681821442/job122794162129SUCCESS573unit/426browsers/76SKIP. O merge de consolidação preserva os commits originais; não é squash/rebase da história compartilhada. A PR de consolidação e as proteções da `main` fornecem o registro operacional da conclusão.

O WIP **e7cf9ddc5dc16293aa04170559d31e490c0ac72b**, em `codex/reaproveitar-elenco-banco`/`codex/uiux-elenco-integracao`, fica **fora desta consolidação**. Em particular, as migrations20261027143904_roster_reuse_context e20261027145431_roster_reuse_write não serão incluídas na `main` ou aplicadas ao banco por esta operação. Nenhum deploy/DDL/dado humano é alterado ao organizar o Git.

## Conferência de incorporação

`git merge-base --is-ancestor` confirmou **31cabeças ancestrais** da fonte publicada. As duas exceções não serão rotuladas como commits integrados:

- **#25/codex/ciclo-inscricoes/d773e23:** versão anterior da remoção. A entrega foi portada e completada na #29. Comparação direta de provider, contrato, rotas, migration45 e contratoSQL não encontrou diferenças para a versão estável; a apresentação/testes foram evoluídos na administração compacta. A branch original permanece preservada como fonte histórica.
- **#34/codex/ui-ux-desktop-v2/e442815:** alternativa anterior de modais/toasts/densidade. A #33 consolidou a implementação posterior das #35/#36 e recebeu validação própria. O componenteToast foi reimplementado nessa trajetória; não se afirma equivalência de cada commit ou incorporação por ancestralidade. A branch e o handoff próprios permanecem preservados. Encerrar essa PR como substituída evita integrar uma segunda implementação divergente sobre a consolidada.

Antes de encerrar, confirmar a `main` contendo a fonte estável e oHEAD remoto ainda igual ao inventariado. Qualquer cabeça nova exige nova análise; não fechar cegamente uma PR que outro agente atualizou. Fechamento preserva descrição, histórico, commits e branches. Não apagar fontes únicas para reduzir a contagem.

| PR                                                                     | Branch de origem                      | HEAD inventariado | Destino                        |
| ---------------------------------------------------------------------- | ------------------------------------- | ----------------- | ------------------------------ |
| [#2](https://github.com/renato-lucindo/base-do-basquete-next/pull/2)   | `feat/prototipos-fluxos`              | `702efc9`         | Ancestral da versão estável    |
| [#3](https://github.com/renato-lucindo/base-do-basquete-next/pull/3)   | `feat/fundacao-acesso`                | `f03f2aa`         | Ancestral da versão estável    |
| [#4](https://github.com/renato-lucindo/base-do-basquete-next/pull/4)   | `feat/contexto-campeonatos`           | `929b193`         | Ancestral da versão estável    |
| [#5](https://github.com/renato-lucindo/base-do-basquete-next/pull/5)   | `codex/equipes-inscricoes`            | `22b9f39`         | Ancestral da versão estável    |
| [#6](https://github.com/renato-lucindo/base-do-basquete-next/pull/6)   | `codex/pessoas-elencos`               | `0d34242`         | Ancestral da versão estável    |
| [#7](https://github.com/renato-lucindo/base-do-basquete-next/pull/7)   | `codex/importacao-texto`              | `017db15`         | Ancestral da versão estável    |
| [#8](https://github.com/renato-lucindo/base-do-basquete-next/pull/8)   | `codex/jogos`                         | `e43246e`         | Ancestral da versão estável    |
| [#9](https://github.com/renato-lucindo/base-do-basquete-next/pull/9)   | `codex/sumula-persistida`             | `b316394`         | Ancestral da versão estável    |
| [#10](https://github.com/renato-lucindo/base-do-basquete-next/pull/10) | `codex/pdf-fontes`                    | `f2d634b`         | Ancestral da versão estável    |
| [#11](https://github.com/renato-lucindo/base-do-basquete-next/pull/11) | `codex/publicacao-jogos`              | `820eb96`         | Ancestral da versão estável    |
| [#12](https://github.com/renato-lucindo/base-do-basquete-next/pull/12) | `codex/regulamento-classificacao`     | `5ffc8d6`         | Ancestral da versão estável    |
| [#13](https://github.com/renato-lucindo/base-do-basquete-next/pull/13) | `codex/regulamento-persistido`        | `c11f7ab`         | Ancestral da versão estável    |
| [#14](https://github.com/renato-lucindo/base-do-basquete-next/pull/14) | `codex/ocorrencias-disputa`           | `58b6f0c`         | Ancestral da versão estável    |
| [#15](https://github.com/renato-lucindo/base-do-basquete-next/pull/15) | `codex/classificacao-publica`         | `a9d0b8e`         | Ancestral da versão estável    |
| [#16](https://github.com/renato-lucindo/base-do-basquete-next/pull/16) | `codex/transferencias`                | `d3bb625`         | Ancestral da versão estável    |
| [#17](https://github.com/renato-lucindo/base-do-basquete-next/pull/17) | `codex/conquistas-honrarias`          | `df136a7`         | Ancestral da versão estável    |
| [#18](https://github.com/renato-lucindo/base-do-basquete-next/pull/18) | `codex/estatisticas-confirmadas`      | `c6c28cd`         | Ancestral da versão estável    |
| [#19](https://github.com/renato-lucindo/base-do-basquete-next/pull/19) | `codex/perfil-confirmado`             | `84baf38`         | Ancestral da versão estável    |
| [#20](https://github.com/renato-lucindo/base-do-basquete-next/pull/20) | `codex/equipes-publicas`              | `e1d7485`         | Ancestral da versão estável    |
| [#21](https://github.com/renato-lucindo/base-do-basquete-next/pull/21) | `codex/capacidade-consultas`          | `a58270b`         | Ancestral da versão estável    |
| [#22](https://github.com/renato-lucindo/base-do-basquete-next/pull/22) | `codex/acessibilidade-consultas`      | `0198cd2`         | Ancestral da versão estável    |
| [#23](https://github.com/renato-lucindo/base-do-basquete-next/pull/23) | `codex/concorrencia-postgres`         | `c307627`         | Ancestral da versão estável    |
| [#24](https://github.com/renato-lucindo/base-do-basquete-next/pull/24) | `codex/acessibilidade-administrativa` | `0c2017f`         | Ancestral da versão estável    |
| [#25](https://github.com/renato-lucindo/base-do-basquete-next/pull/25) | `codex/ciclo-inscricoes`              | `d773e23`         | Substituída; branch preservada |
| [#26](https://github.com/renato-lucindo/base-do-basquete-next/pull/26) | `codex/sumula-desktop`                | `b891325`         | Ancestral da versão estável    |
| [#27](https://github.com/renato-lucindo/base-do-basquete-next/pull/27) | `codex/compatibilidade-jogadores`     | `a9c7e0e`         | Ancestral da versão estável    |
| [#28](https://github.com/renato-lucindo/base-do-basquete-next/pull/28) | `codex/admin-compacta`                | `dde49d7`         | Ancestral da versão estável    |
| [#29](https://github.com/renato-lucindo/base-do-basquete-next/pull/29) | `codex/inscricao-vazia-compacta`      | `3936e2b`         | Ancestral da versão estável    |
| [#30](https://github.com/renato-lucindo/base-do-basquete-next/pull/30) | `codex/pessoa-camisa-compacta`        | `16e171a`         | Ancestral da versão estável    |
| [#31](https://github.com/renato-lucindo/base-do-basquete-next/pull/31) | `codex/admin-demais-telas`            | `0c42cba`         | Ancestral da versão estável    |
| [#32](https://github.com/renato-lucindo/base-do-basquete-next/pull/32) | `codex/reaproveitar-elenco`           | `260713c`         | Ancestral da versão estável    |
| [#33](https://github.com/renato-lucindo/base-do-basquete-next/pull/33) | `codex/ui-ux-desktop`                 | `1e73ae0`         | Ancestral da versão estável    |
| [#34](https://github.com/renato-lucindo/base-do-basquete-next/pull/34) | `codex/ui-ux-desktop-v2`              | `e442815`         | Substituída; branch preservada |

## Fluxo adotado

- GitHub Flow, documentado em `CONTRIBUTING.md` e nas instruções de agentes em `AGENTS.md`.
- Branch curta de `origin/main`, uma PR por unidade de volta à principal; não criar unidade por sessão/reset nem manter pilha de entregas concluídas.
- CI em PR e na `main`, check estável `validate`, cancelamento de execuções obsoletas e recusa de base diferente de `main`.
- `main` protegida por PR/checks atuais, resolução de conversas e bloqueio de force-push/exclusão, incluindo administradores. A revisão deve ser real; não exigir aprovação fictícia de um segundo mantenedor inexistente.
- Validação documental enxuta para PRs cujo diff seja exclusivamente textual/imagens; executáveis, testes, workflows e código continuam exigindo gate/browsers. Não usar filtros que deixem o check obrigatório ausente.
- Exclusão automática da branch de novasPRs após merge, sem apagar os refs históricos que ainda preservam fontes únicas.
- Reaproveitamento de elenco retomado em **uma PRdraft própria contra main**, com diff limitado ao que falta, sem dependência na pilha encerrada.

Este arquivo registra a decisão, o inventário e os critérios. Resultados finais de merge/fechamento/proteção ficam na PR de consolidação e no checkpoint vigente, com referências verificadas.
