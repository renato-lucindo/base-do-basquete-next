# Progresso atual

Atualizado em 03/11/2026. Escopo em [MATRIZ-ESCOPO.md](MATRIZ-ESCOPO.md); objetivos em [ROADMAP.md](ROADMAP.md). A implantação anterior e suas autorizações estão no [checkpoint preservado](../historico/progresso/2026-11-03-antes-tabelas-equipes.md).

## Unidade — navegação e tabelas públicas, PR #49

- Mesma branch `codex/navegacao-publica`, [PR #49 para main](https://github.com/renato-lucindo/base-do-basquete-next/pull/49), base da unidade `d84c09e`. Worktree `C:/Users/12405304716/.codex/worktrees/navegacao-publica`. Incremento de tabelas `77601df6dd5c199ee04e739626525723976db7dd`, após o checkpoint `a7d59b9`. Nenhuma nova branch/pilha ou merge.
- Pedido anexado de 03/11: classificação com nove colunas, aproveitamento V/J e perfil por inscrição; domínio/empates/decisões/grupos/fases/publicação preservados. Equipes ganha métricas/cobertura, LL% ponderado, fonte all/boxscore, presets e colunas compartilhados com Jogadores, ordenação por cabeçalho e URL/retorno. Campos coletivos sem fonte suficiente continuam indisponíveis; não há nova publicação/DDL.
- Gate local **PASS**: 672 testes/136 arquivos, 6 transportes, 13 testes de banco descartável, 28 Workerd, 1 runtime PDF, tipos/lint/formato/builds/fronteiras/segredos. Focais de equipes 27 PASS. Browsers: 26 PASS na composição classificação/equipes e 14 PASS após refinamentos finais, sobrepostos; regressão focal de Jogadores 7 PASS/1 SKIP. [Evidências e capturas](evidencias/2026-11-03-tabelas-classificacao-equipes.md).
- CI anterior `a7d59b9` [41622557571](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41622557571) SUCCESS reconfirmada, sem validar este incremento. A CI nova deve ser lida por SHA nos [checks da PR](https://github.com/renato-lucindo/base-do-basquete-next/pull/49/checks). Próximo passo: publicar o incremento na mesma PR, conferir CI e atualizar somente o preview exclusivo já autorizado.
- Sem parecer independente ou aceite humano das novas tabelas. O piloto autenticado da confirmação de regulamento e a corrida PostgreSQL real continuam pendentes. Testes e capturas usam fixtures; sem DML de dados humanos, novas migrations remotas, merge ou produção neste pedido.

## Serviços e preservação

- [Preview exclusivo PR49](https://base-do-basquete-next-pr49.renato-lucindo-jr.workers.dev/publico.html) ainda em `c5257dd5b78628a0a4d96c364d437d7e18483729` ao preparar este checkpoint, versão `da790c41-15a6-4a33-b062-4de48c2be0d7`, deployment `597f1b58-f583-4a57-861e-76a126c3a590`, 100%. Access owner-only `1f3f0e73-6682-4aa5-85a2-3bce67265cfd`, URLs de versão desativadas; preservar DO/sessões, segredos e limite de login. A autorização anterior permite atualizar esse preview, sem liberar produção ou outros serviços.
- Banco de desenvolvimento `nizmasjddyrhmevvfviz`: migration anterior `20261103102443_public_standings_confirmed` aplicada por pedido explícito anterior; não reaplicada nem alterada. As tabelas atuais usam a fonte pública paginada existente, sem novas consultas privadas ou credenciais. Previews `preview`/`pr38`/`pr46` preservados.
- Checkout principal `sync/trabalho-casa`, CONTRIBUTING/skills humanos e outros worktrees/branches preservados. Automação `retomar-navega-o-p-blica-pr-49` permanece PAUSED; execução atual sem pausa por cota. Regras de retomada em [CONTRIBUTING.md](../CONTRIBUTING.md).
