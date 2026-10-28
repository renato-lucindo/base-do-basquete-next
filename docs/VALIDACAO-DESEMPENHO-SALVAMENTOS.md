# Desempenho dos salvamentos — 28/10/2026

Unidade codex/desempenho-sumula, base main4125f478d7ba71aea535416a094418cb6c4a45e2. Escopo: jogo, súmula e atletas do importador; sem alteração de banco, contrato de salvamento ou regras disciplinares. PR38 independente permanece WIP.

## Evidência real anterior

Consultas de leitura no projeto Supabase novo, por pg_stat_statements, sem retornar textos ou parâmetros de usuários:

| Operação         | Chamadas | Média SQL ponderada | Pior SQL observado |
| ---------------- | -------: | ------------------: | -----------------: |
| save_game_sheet  |       65 |            10,876ms |           28,498ms |
| save_game_editor |       13 |             5,746ms |           42,590ms |
| confirm_text_row |      255 |             4,845ms |           13,276ms |
| get_game_sheet   |      202 |             2,518ms |           16,737ms |
| get_game_editor  |       20 |             0,797ms |            2,044ms |
| admin_access     |     3223 |             0,068ms |            5,372ms |

São estatísticas acumuladas, incluindo provas anteriores; não são um trace de uma sessão nem incluem rede/Auth. Nenhuma DDL, reset de estatísticas, fixture ou escrita remota realizada nesta unidade. Consulta de advisors de performance realizada sem alterar índices. Dados humanos preservados.

Amostra Cloudflare de137eventos nas24h anteriores: saveGameEditor8298ms/8msCPU, getGameEditor727ms/3msCPU, getGameSheet622ms/3msCPU, listRoster1246–8971ms/3eventos. Várias listagens também demoravam segundos. São amostras heterogêneas, não permitem atribuir causalmente toda a espera a uma consulta ou comparar salvamentos equivalentes. Queries dry e saídas limitadas a métodos/tempos; IDs de jogos, headers, tokens, nomes e corpos não foram exportados. Consulta agregada inicial por métodoHTTP não tinha eventos dePOST porque a amostra continha principalmente RPCs do Durable Object; não foi atribuída latência zero a esse resultado vazio.

## Causas demonstradas e correção

- A sessão fazia Auth/user e admin_access sequenciais antes de cada operação. Agora usa o ID já cifrado da sessão para iniciar as duas consultas frescas em paralelo, exige igualdade com Auth e permissão válida, sem cache. Login inicial continua sequencial; fila, rotação e logout continuam protegidos. Dados do browser e user_metadata não autorizam nada.
- O importador recarregava elenco após cada resultado de linha e o painel pai oculto também recarregava elenco/comissão. Agora a comparação aguarda o término do lote e o pai aguarda voltar ao elenco. Falha parcial mantém sucessos e produz uma releitura final. Nenhum sucesso é apresentado antes do ACK.
- Tempos de fila, autoridade e dados são registrados apenas para nomes fixos das operações afetadas, sem IDs, conteúdo ou credenciais. Falha no observador não altera resultado do comando. A amostragem existente de observabilidade é preservada.

## Comparação controlada, não rede real

Runner `npx vitest run --config docs/evidencias/benchmarks/save-latency.config.ts`, variável BDB_LATENCY_PHASE before/after, Node24.18/Windows. Usa os providers reais de jogo/súmula/importador e sessão cifrada, upstream fictício com80ms de atraso por chamada, cinco operações por fluxo. Login excluído. Não inclui browser, rede real ou SQL real.

| Fluxo            | Antes, média | Depois, média | Chamadas por operação |
| ---------------- | -----------: | ------------: | --------------------: |
| Jogo             |     279,91ms |      186,84ms |                   3→3 |
| Súmula           |     280,56ms |      187,69ms |                   3→3 |
| Atleta importado |     280,55ms |      186,47ms |                   3→3 |

Redução de aproximadamente33% nesta etapa controlada: menos viagens em sequência, sem remover verificações. Artefatos ignorados `.preview-artifacts/save-latency-before.json` e `save-latency-after.json`. Não prometer redução idêntica no preview nem declarar toda a lentidão resolvida por esses números.

## Focais e limites

- RED de autorização paralela: apenas uma consulta iniciava enquanto Auth estava retido; teste também recusava identidade divergente. GREEN posterior.
  -31unitários focais de Auth/sessão e três providersPASS, incluindo revogação por operação, identidade diferente/anônima, upstream indisponível, rotação, logout e ausência de credenciais nos tempos. Observador com falha não transforma sucesso em erro.
- RED desktop: uma releitura de elenco aparecia no meio do lote. Após coalescer, teste detectou também duas releituras finais; a segunda vinha do pai oculto e foi eliminada. Dez browsers de composiçãoPASS: dois cenários novos de lote completo/parcial e oito importador existentes, incluindo homônimos/retry/reauth/409. Voltar ao elenco atualiza os atletas confirmados.
- Focal workerdPASS: Auth retido não impede iniciar consulta de permissão, nenhumaRPC de dados é chamada antes de ambos, revogação seguinte retorna403. Tipos aplicação/Worker, lint focal, formato e diff-check aprovados após substituir Promise.withResolvers nas fixtures por helper compatível com o lib do projeto. Primeira checagem de tipos falhou só por essaAPI de teste; sem mudança de target/lib/dependências.

Gate e CI finais ainda pendentes nesta gravação. Sem revisão independente, carga, auditoriaWCAG completa ou medida end-to-end do responsável. Browser CUA indisponível por falha de kernel assets; DevTools disponível apenas em about:blank, sem sessão do responsável. Nenhuma tentativa de extrair credenciais para suprir essa limitação.

POST→GET de jogo/súmula continua existente e os envios de linhas mantêm recibos/transações separados. A fila comum também permanece serial para preservar garantias de rotação/logout; os tempos novos permitem separar o custo residual. Confirmar latência remota posterior com operações autorizadas reais/observadas, sem escrever fixtures em dados humanos. Se ainda dominante, tratar composição de escrita/leitura e fila em nova correção comprovada, sem suprimir validações.
