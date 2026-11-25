# Progresso atual

Atualizado em25/11/2026. [Checkpoint anterior preservado](../historico/progresso/2026-11-25-antes-correcao-compacta.md).

## Unidade ativa

Mesma branch codex/perfis-equipes/[PR89](https://github.com/renato-lucindo/base-do-basquete-next/pull/89), base origin/main0af33e38. Correção compacta autorizada: largura real estável Total/Por jogo, alinhamento nativo, ícones originais com traço branco, campanhas desktop sem rolagem, seletor Total e documentação. [Matriz](PLAN-TABELAS-FILTROS.md), [provas e diagnóstico](design/VALIDACAO-PERFIS-EQUIPES.md#correção-compacta--25112026), [capturas](design/evidencias/2026-11-25-correcao-compacta/README.md). Preservada alteração local anterior em histórico. Sem merge, API, schema, cálculo esportivo ou dados humanos alterados.

Gate completo PASS857unitários e demais gates; design:verify e catálogo WebKit PASS. Contratos compactos4PASS/consumidores6PASS; regressão132PASS e8expectativas antigas de padding corrigidas e revalidadas. Focal14PASS, sobreposição mobile corrigida e rechecagem5PASS/1dispensa preexistente. WebKit completo local42PASS/2falhas de overscroll (propriedade não exposta no Windows, limitação documentada na configuração); CI macOS continua obrigatória, sem nova dispensa.

## GitHub e publicação

CI anterior45629988602 falhou em browsers e uploads, apesar de gate/design aprovados; diagnóstico e correções no relatório. Limpeza final autorizada executada:1286artefatos/18,68GB excluídos,8artefatos/38,31MB preservados; inventário final confirmado. Autorização e auditoria em C:\Users\12405304716\.codex\artifact-archives\base-do-basquete-next\2026-11-25. Capturas versionadas preservadas; sem baixar todos os ZIPs, usar Y: ou mudar cobrança. Disponibilidade de novos uploads deve ser comprovada na próxima CI.

Fonte executável039d78add45fd05753a2a4d58d06cc0840d69e86 enviada e publicada: admin versãob32aeb22-fa54-4bd2-80d7-c0d6be6dcc8e/deploymenta5d91478-6530-46bb-b6bc-49f00f956ce3; preview versãoa73c20e0-7401-4670-8522-a28fb366483c/deployment49b5ad0b-826b-4c5c-a650-f7e047d93828. Cloudflare reconectado; upload Wrangler e ativação pelo conector100%. Namespace597c612fd69c447e81547f16d5dcca41, sessões, segredos, aliases e flag preservados; sem Access/novo Worker. Smoke200/fonte e12assets SHA256; privadas401/403. Navegador remoto confirmou campanhas930/1100px sem rolagem1366/1920, ícone original com traço branco e jogadores853,703px/0px de diferença após concluir cada modo. Capturas inspecionadas; nenhuma escrita em dados humanos.

CI45645483650 da fonte039d78a: WebKit macOS SUCCESS; design:verify SUCCESS, upload FAILURE pois GitHub ainda não recalculou armazenamento (annotation6–12h). Demais jobs em andamento na última leitura. Não remover verificações nem mudar cobrança. Novo HEAD acrescenta evidências/docs e sincronização do contrato após consulta,4PASS; fonte executável materialmente idêntica. Conferir resultado real do HEAD documental atual sem repetir gate local de domínio inalterado.

Automação oficial conferir-ci-das-consultas-pr89 ACTIVE,10min, confirmada por view. Próximo passo: conferir CI do HEAD real e separar falhas de execução de upload. Se apenas cota persistir, repetir jobs falhos após a atualização da contabilização; preservar8artefatos escolhidos, não repetir limpeza. Ao validate aprovado e entrega concluída, excluir a checagem. Aceite visual e merge seguem pendentes.
