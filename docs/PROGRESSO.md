# Progresso atual

## Classificação e Últimos 5 — 06/11/2026

Unidade `codex/classificacao-ultimos-cinco`, [PR #71](https://github.com/renato-lucindo/base-do-basquete-next/pull/71), base **95d40ff** (PR #70), implementação material **c9279e6**. Worktree isolado `C:/Users/12405304716/.codex/worktrees/classificacao-ultimos-cinco/Base do Basquete-v1`. Tabela no padrão de Equipes; fase/grupo na URL; últimos cinco exclusivamente da lineage contabilizada no grupo/fase. APIs públicas, cálculos oficiais, posições e desempates preservados. Padrão vigente em [PUBLICO.md](design/PUBLICO.md).

Provas locais: **741 unitários/155 arquivos PASS**, incluindo cinco novos RED→GREEN; etapas do gate concluídas em segmentos: formato/lint/tipos, 11 testes de política CI, 11 transportes, 15 PostgreSQL isolado, 33 Workerd, quatro PDFs em um teste de runtime, builds, fronteira e segredos (1249 arquivos). Primeiro gate concorrente teve OOM nativo no host; todos os unitários foram repetidos com um worker, sem mudar testes/timeouts/skips. Browsers novos **14 PASS**, mais navegação/acessibilidade/estados anteriores; um timeout de axe sob concorrência foi preservado e repetido isoladamente. Revisão **autoral** com web-design-guidelines, sem parecer independente alegado. Axe e capturas não constituem aceite humano/WCAG integral.

**CI, integração e versão publicada:** a [PR #71](https://github.com/renato-lucindo/base-do-basquete-next/pull/71) concentra os resultados reais do HEAD e SHA integrado, versão/deployment remotos, hashes e capturas finais. Não usar a prova local como substituta da CI. Publicação autorizada exclusivamente no preview UI/UX, após CI do SHA integrado; configuração da raiz aponta ao principal. As duas disputas consultadas no catálogo remoto retornaram classificação pública `null`: capturas da tabela usam fixtures sintéticas no navegador, sem publicar dados.

## Entrega anterior encerrada

PR #68 integrada em **bc13c0a**; CI integrada [42298430642](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42298430642) **SUCCESS**, conferida nesta execução. Preview antes na PR #66; entregue no SHA da PR #68, versão **1dec3d76-f451-4d4c-b5e5-d6438297c0ac**, com 34 hashes remotos e cinco rotas conferidos. Outra execução depois publicou PRs #69/#70: origem **95d40ff**, versão **9e69a80d-0373-4c7e-ad70-950b3f1ff942**, deployment **4a31d9e5-9df4-40b5-bb41-fe8f46ba75fa**, confirmados pela Cloudflare e cabeçalho remoto. Essa origem já compõe a base da Classificação. Serviço principal observado: versão **139410ce-a8d6-4710-9b94-e1b1222cd3dc**, preservada. Este parágrafo registra a origem anterior à entrega da PR #71.

## Complemento recebido na mesma PR #71

Commit remoto **e98b927** preservado por merge explícito: FR reutiliza **Faltas recebidas**, sem complemento técnico; os padrões comuns distinguem significado público e explicações técnicas, com definição compartilhada entre tabela, seletor, legenda e tooltip. Cálculos preservados. A composição é validada nesta mesma PR, sem nova unidade ou deploy separado.

## Preservação e continuidade

Checkout principal `sync/trabalho-casa`, alterações humanas em `CONTRIBUTING.md`, skills locais, `skills-lock.json` e demais worktrees preservados. Sem migration/DDL/DML, publicação de jogos, mudanças em Access, segredos, bindings ou domínio principal. Cota real acompanhada pela ferramenta oficial; pausa em 15% restante/5h conforme [CONTRIBUTING.md](../CONTRIBUTING.md), sem consumir resets/créditos.

Próximo passo: aceite visual do responsável após conferir na PR #71 a CI do SHA integrado, a origem remota e as capturas; principal permanece fora da autorização de deploy. Contexto anterior no [histórico](../historico/progresso/2026-11-06-antes-classificacao.md).
