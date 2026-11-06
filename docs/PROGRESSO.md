# Progresso atual

## Classificação e Últimos 5 — 06/11/2026

Unidade `codex/classificacao-ultimos-cinco`, base `origin/main` **95d40ff787f49565d6f8c0e6e1ca0bdac19ec5ac** (PR #70). Worktree isolado `C:/Users/12405304716/.codex/worktrees/classificacao-ultimos-cinco/Base do Basquete-v1`. Plano integral aprovado pelo responsável: tabela no padrão de Equipes, seleção de fase/grupo na URL e últimos cinco resultados exclusivamente do grupo/fase. Sem alterações de contrato público, cálculos oficiais, banco ou publicação de dados.

Derivação: **5 testes RED→GREEN**; público anterior **17 PASS**. Interface nova: **14 browsers PASS**, incluindo grupos/fases, recarga/voltar, cinco resultados, administrativo sem placar, correção/cancelamento, foco/hover/toque e quatro resoluções. Revisão autoral e gate consolidado em preparação; CI remota, integração e preview desta unidade **ainda pendentes**. Não confundir esses testes com aceite humano ou WCAG integral. Evidências detalhadas serão registradas na mesma PR.

## Entrega anterior encerrada

PR #68 integrada em **bc13c0a030a8266da10bfadfb57b9bd268452884**; CI integrada [42298430642](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42298430642) **SUCCESS**, conferida nesta execução. Preview UI/UX antes ainda na PR #66; publicado agora no SHA da PR #68, versão **1dec3d76-f451-4d4c-b5e5-d6438297c0ac**. Conferidos **34 hashes remotos**, `/`, `/admin`, `/admin/`, `/api/health` HTTP 200 e API privada sem sessão HTTP 401. Não houve mudança de Access, bindings, segredos, domínio principal ou dados. Depois dessa prova, outra execução publicou as PRs #69/#70: versão **9e69a80d-0373-4c7e-ad70-950b3f1ff942**, deployment **4a31d9e5-9df4-40b5-bb41-fe8f46ba75fa**, origem **95d40ff**, confirmada pela API Cloudflare e cabeçalho remoto. Essa origem já está na base desta unidade. A versão deste parágrafo antecede a entrega da Classificação.

## Complemento de textos públicos na mesma PR #71

Por pedido direto do responsável, os padrões comuns passam a separar o significado público do indicador das explicações técnicas e a exigir uma definição compartilhada entre tabela, seletor, legenda e tooltip. Não foi acrescentada uma nova etapa de revisão. FR em súmula reutiliza **Faltas recebidas**, sem o complemento técnico; cálculo preservado. Verificação focal deste complemento: **14 testes unitários PASS**, ESLint, Prettier e diff PASS. Sem merge ou deploy neste complemento; CI e entrega seguem na mesma PR de Classificação.

## Preservação e próximo passo

Checkout principal `sync/trabalho-casa`, alterações humanas em `CONTRIBUTING.md`, skills locais e `skills-lock.json` preservados; demais worktrees preservados. Sem migration/DDL/DML ou publicação de jogos. Deploy autorizado **somente** em `base-do-basquete-next-uiux`, após CI do SHA integrado; configuração da raiz aponta ao principal e não deve ser usada para deploy.

Próximo: concluir gate/revisão, abrir uma PR para `main`, integrar após checks e publicar o SHA integrado no preview UI/UX; verificar versão e entregar capturas reais. Cota consultada pela ferramenta oficial; pausa em 15% restante/5h conforme [CONTRIBUTING.md](../CONTRIBUTING.md), sem consumir resets/créditos. Contexto anterior preservado no [histórico](../historico/progresso/2026-11-06-antes-classificacao.md).
