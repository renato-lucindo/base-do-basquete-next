# Integração das PRs 75 e 76 — 10/11/2026

## Escopo e revisão

Integração sequencial autorizada pelo responsável: PR75 por merge commit, atualização explícita da PR76 com main, reconciliação da migration emergencial, gate e browsers completos antes do segundo merge. Sem deploy de Worker, DDL/DML remoto, seeds, publicação da semifinal, Auth, Access, segredos ou configurações de produção.

PR75 revisada em `a47c58f7cfb0e4a05510630dc9917416c4003063`, base `903dc9c`: rotas/flag, comandos administrativos, concorrência/idempotência, projeções anônimas e regressões de privacidade. Sem bloqueio encontrado nos pontos revisados; revisão técnica deste agente, sem parecer independente adicional. CI [42840209632](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42840209632) 7/7 SUCCESS. Integrada em `6445091e8b5d8f1c16f2b1567c02bfbc721722e4`; [CI da main](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42853798575) **7/7 SUCCESS**, conferida no SHA integrado.

PR76 de origem `8e4868c3dcad8c1275186fa7e39175518a556b31`, com [CI anterior](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42840273781) 7/7 SUCCESS. Esse PASS não valida a composição nova.

## Composição e conflitos

Sete arquivos sobrepostos foram conferidos:

- `docs/PROGRESSO.md`: resumos anteriores arquivados integralmente por origem e substituídos pelo estado desta unidade.
- `docs/design/PUBLICO.md`: mantidas as decisões da partida aceita e o alinhamento de Últimos jogos da classificação.
- `docs/design/PADROES.md`: merge automático mantém regras de apresentação e comparador global de camisas.
- `src/publication/pdf-panel.tsx`: mantidos compareJerseys, flag flexível, finalização/justificativa e fluxos legados.
- `src/publication/provider.ts`: leitura por get_public_game_detail junto dos comandos de finalização e publicação existentes.
- `src/server/database.types.ts`: RPC de detalhes e RPCs flexíveis/visibilidade presentes.
- `tests/access-worker.test.mjs`: transporte de detalhes e isolamento de rotas/metadata flexíveis preservados.

Teste focal inicialmente falhou com `relation game_visibility_heads already exists`: a fixture da PR76 pressupunha ausência da PR75. Ajustada para usar save_game_visibility real, conferir bloqueio nas duas RPCs públicas, preservação do snapshot privado e restauração. A compatibilidade sem tabela/sem helper permanece coberta em objetos renomeados somente no PGlite descartável e com rollback. Uma assertiva de preservação foi corrigida para consultar o leitor privado: o leitor público deve negar rascunhos inclusive ao owner.

Comando: `npx vitest run src/publication/game-detail-database.test.ts src/games/visibility-database.test.ts src/regulation/setup-database.test.ts src/publication/provider.test.ts src/publication/finalization.test.ts`: **17 PASS / 5 arquivos**, na composição local.

## Histórico das migrations

Consulta somente de leitura a `supabase_migrations.schema_migrations` em `base-do-basquete-next-dev` (`nizmasjddyrhmevvfviz`): 73 versões aplicadas, iguais às 73 versões locais após recuperar o guard. Sem versão duplicada ou ausente. Conteúdo recente comparado ao SQL recuperado; idêntico, exceto espaço final em duas migrations preexistentes, que não foram editadas.

| Versão         | Efeito / dependência                                              |
| -------------- | ----------------------------------------------------------------- |
| 20261107213937 | configuração flexível                                             |
| 20261109163216 | heads de visibilidade e game_is_public                            |
| 20261109181057 | classificação legada respeita rascunhos                           |
| 20261110115128 | remove associações privadas da fonte pública                      |
| 20261110130218 | cria os detalhes por versão imutável publicada                    |
| 20261110133504 | guard original depende do predicado da PR75 e do detalhe anterior |
| 20261110145957 | sanitiza definições legadas/customizadas aninhadas                |
| 20261110150011 | substitui o wrapper por guard compatível e fechado sem helper     |

`20261110133504_public_game_detail_draft_guard.sql` foi recuperada sem reformatação, MD5 do SQL **37a6ed945fb0c90496a0a849d79cb86f**. Não foi reaplicada nem houve repair do histórico remoto. A instalação combinada reproduz a ordem cronológica no PGlite; não distribuir o guard isoladamente sem PR75. Os nomes históricos de duas migrations FIBA no DEV contêm prefixo antigo, mas suas versões e SQL coincidem; nenhuma renomeação ou mutação remota necessária.

## DEV e preservação

Consultas somente de leitura observaram semifinal `62d99b70-21c9-495f-b0d7-44c0f53b4380` em draft v1, jogo finished v4 e publicação v1. MD5 do snapshot publicado `090e6e067ef60dfd91399e01f58f1ddb`; documento histórico `4f5816fbc095c1b671a573d73dbd8ea7`. Como anon, get_public_game e get_public_game_detail retornam null; fonte flexível contém 26 jogos/26 resultados, sem ID privado. Primeira consulta usou g.status, coluna inexistente; corrigida para g.state, sem escrita.

Checkout principal sync/trabalho-casa e suas alterações humanas em CONTRIBUTING.md, skills locais e skills-lock.json preservados. Demais worktrees e branches não alterados. Trabalho realizado em worktree gerenciado integracao-pr75-pr76, branch local codex/integracao-pr75-pr76, publicando apenas na branch existente da PR76. Nenhuma versão do site publicada; estado atual dos deployments não auditado nesta tarefa. Fontes históricas preservadas nos dois checkpoints arquivados.

## Gate e resultado

Composição material **08afa92cc6e31437021082c0c62734a760865736**:

- `npm run gate` local: **exit0**, 799 unitários/170 arquivos, 11 transporte, 15 banco isolado, 35 Worker/HTTP, um teste dos quatro PDFs no workerd; lint/formato/tipos/builds/fronteira/segredos PASS. Log local ignorado `.integration-gate.log`. Wrangler somente em dry-run, sem deploy.
- [CI42854770370](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42854770370), workflow_dispatch no SHA exato: **7/7 SUCCESS**, todos os jobs incluindo validate.
- Chromium: dois shards disjuntos de451testes, **451 +333 =784 PASS**, **118 SKIP**; união igual à coleção integral de902cenários em64arquivos. Nenhum skip ou timeout alterado nesta integração.
- WebKit/macOS: **42 PASS** em5arquivos. Design PASS. CI também executou arquitetura, 141 regressões da skill e scanner de segredos.
- Threads existentes das PRs conferidas: nenhuma aberta; achado anterior de permissão anônima resolvido e com regressão preservada. Revisão técnica deste agente, sem nova aceitação visual humana ou parecer independente declarado.

O checkpoint posterior à composição é exclusivamente documental. Provas locais de código inalterado são reutilizadas; a CI obrigatória deve aprovar no HEAD documental antes do merge. A PR76 e seu merge commit registram o SHA resultante e a conferência da CI da main, sem criar um ciclo de commits apenas para inserir o próprio SHA no documento. Nenhum Worker, dado humano, migration remota ou configuração de produção alterado.
