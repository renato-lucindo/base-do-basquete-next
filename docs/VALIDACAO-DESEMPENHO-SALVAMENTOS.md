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

Gate estável no material **0bd78a2c15614b574596e5da3c7977bd0a648a87 PASS/exit0**:588unitários/120arquivos,6transportes/13PG/25workerd/4PDFs, tipos/builds/fronteira/segredos765. Log ignorado `.preview-artifacts/saving-final-gate.log`, SHA256375c981fa06a6da8da2cdeadceb6c8a8382e9326a4409e1ccb6582bc630944b6. Benchmark antes SHA2563d4b0bbab5fc264ee30cb352388467a0d1d5fcb76e152c8dab6d9da3ed00bc19; depois SHA256f9dcf1e3ef79e632145ab82b4e00edbf427f1655d69bef56e7e942d2e7848098. Documentos posteriores não mudam produto e não exigem repetição local.

CI e novo preview ainda pendentes nesta gravação. Revisão do diff feita pelo próprio autor: sem cache de permissão, token sempre igual nas duas consultas, prioridade para erro de identidade e callbacks de dados bloqueados até ambas terminarem; observador não recebe identidades/corpos. Ferramentas disponíveis não incluem subagente de revisão independente; ferramenta CodeReview disponível serve apenas a diagnósticos deCI. Sem revisão independente, carga, auditoriaWCAG completa ou medida end-to-end do responsável. Browser CUA indisponível por falha de kernel assets; DevTools disponível apenas em about:blank, sem sessão do responsável. Nenhuma tentativa de extrair credenciais para suprir essa limitação.

POST→GET de jogo/súmula continua existente e os envios de linhas mantêm recibos/transações separados. A fila comum também permanece serial para preservar garantias de rotação/logout; os tempos novos permitem separar o custo residual. Confirmar latência remota posterior com operações autorizadas reais/observadas, sem escrever fixtures em dados humanos. Se ainda dominante, tratar composição de escrita/leitura e fila em nova correção comprovada, sem suprimir validações.

## CI, revisão automática e publicação

[PR41](https://github.com/renato-lucindo/base-do-basquete-next/pull/41) integrada em **f7e1fc9d839c7a1f96e55057782bf45f350aed00**. Fonte **f1513c97267b94032b64ac2c9257fa3685d3eb20**, [CI40774741793/job123120951338](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/40774741793/job/123120951338) SUCCESS588unit/443browsersPASS/93SKIP, gate completo e3regressões do scanner. Log ignorado `.preview-artifacts/saving-ci-final.log` SHA2567d5c321fb056ce9edc87ad21c672b6f157049d03a13fdec5efa1f38391af8f21. Comentário do conector Codex registra revisão automática concluída nessa fonte sem apontamentos; não há revisão humana ou revisão completa de segurança declarada. A ausência de revisão independente descrita acima era o estado anterior à PR.

Refinamento de pg_stat_statements filtrando exclusivamente queries iniciadas por WITH pgrst_source AS: save_game_sheet25chamadas/média21,877ms/pior28,498ms; save_game_editor1/8,152ms; confirm_text_row238/4,962ms/pior13,276ms; admin_access2869/0,048ms/pior0,122ms. O primeiro agregado inclui chamadas de provas e outros SQLs que contêm o nome da função; não substitui trace de rede. Ambas as consultas são somente leitura, sem reset de estatísticas.

Cloudflare deployment **57149662-d30d-47e8-a52a-fc7572aafeff**, versão **b4782ef4-1bd0-49ca-a0a0-0c22ab15a728**,100%. Pacote24assets/WorkerSHA2563f0dbb6bec420d7144d2f73cf9b800a1d26fa3fca361d72eb0bd1e603a091bf9. Smoke remoto exit0: hashes/Xsource/43GETs privados/14POSTs sem sessão/Auth inválido/projeções públicas/2browsers desktop, resultado ignorado `.preview-artifacts/saving-remote-smoke.json`. Não salvou dados humanos nem mediu uma sessão autenticada do responsável. O benchmark33% permanece controlado, não é comparação real pós-deploy.

Token0b586340-a8e0-4443-9735-df010b2cc95f/política52200ae4-717c-4deb-bf67-52b78f3d4bb0 transmitidos sob RSA emTTY e revogados imediatamente após smoke. Zero tokens/owner único/previewsOFF/DO/rate/bindings de segredo preservados conferidos; anônimo302 raiz/catálogo. Sem migration/DDL/DML remota e sem credenciais/processos em andamento ao fechar. Registro posterior apenas documental não requer redeploy ou repetição das suítes do produto.
