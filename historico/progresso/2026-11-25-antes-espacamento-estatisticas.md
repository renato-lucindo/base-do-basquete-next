# Progresso atual

Atualizado em25/11/2026. [Checkpoint anterior preservado](../historico/progresso/2026-11-25-antes-correcao-compacta.md).

## Unidade ativa

Mesma branch codex/perfis-equipes/[PR89](https://github.com/renato-lucindo/next/pull/89), base origin/main0af33e38. Correção compacta autorizada: largura real estável Total/Por jogo, alinhamento nativo, ícones originais com traço branco, campanhas desktop sem rolagem, seletor Total e documentação. [Matriz](PLAN-TABELAS-FILTROS.md), [provas e diagnóstico](design/VALIDACAO-PERFIS-EQUIPES.md#correção-compacta--25112026), [capturas](design/evidencias/2026-11-25-correcao-compacta/README.md). Preservada alteração local anterior em histórico. Sem merge, API, schema, cálculo esportivo ou dados humanos alterados.

Gate completo PASS857unitários e demais gates; design:verify e catálogo WebKit PASS. Contratos compactos4PASS/consumidores6PASS; regressão132PASS e8expectativas antigas de padding corrigidas e revalidadas. Focal14PASS, sobreposição mobile corrigida e rechecagem5PASS/1dispensa preexistente. WebKit completo local42PASS/2falhas de overscroll (propriedade não exposta no Windows, limitação documentada na configuração); CI macOS continua obrigatória, sem nova dispensa.

## GitHub e publicação

CI anterior45629988602 falhou em browsers e uploads, apesar de gate/design aprovados; diagnóstico e correções no relatório. Limpeza final autorizada executada:1286artefatos/18,68GB excluídos,8artefatos/38,31MB preservados; inventário final confirmado. Autorização e auditoria em C:\Users\12405304716\.codex\artifact-archives\base-do-basquete-next\2026-11-25. Capturas versionadas preservadas; sem baixar todos os ZIPs, usar Y: ou mudar cobrança. Novos uploads comprovados pela CI final após o responsável tornar o repositório público;8artefatos originais preservados, além dos4novos desta execução.

Fonte executável039d78add45fd05753a2a4d58d06cc0840d69e86 enviada e publicada: admin versãob32aeb22-fa54-4bd2-80d7-c0d6be6dcc8e/deploymenta5d91478-6530-46bb-b6bc-49f00f956ce3; preview versãoa73c20e0-7401-4670-8522-a28fb366483c/deployment49b5ad0b-826b-4c5c-a650-f7e047d93828. Cloudflare reconectado; upload Wrangler e ativação pelo conector100%. Namespace597c612fd69c447e81547f16d5dcca41, sessões, segredos, aliases e flag preservados; sem Access/novo Worker. Smoke200/fonte e12assets SHA256; privadas401/403. Navegador remoto confirmou campanhas930/1100px sem rolagem1366/1920, ícone original com traço branco e jogadores853,703px/0px de diferença após concluir cada modo. Capturas inspecionadas; nenhuma escrita em dados humanos.

CI final45646680852/tentativa3 SUCCESS, incluindo validate, no HEAD remoto/locale1e7f7b4a2e0051397e48fcb78de6504b4867c19.519testes desktop/394mobile/44WebKit macOS PASS;125dispensas mobile preexistentes;857unitários, demais gates e design:verify PASS. Todos os uploads passaram,4artefatos disponíveis: design15044225538/build15044057542/browsers15043998482 e15043323815. Verificados logs, steps, artefatos e HEAD real. O responsável tornou o repositório público e renomeou-o para renato-lucindo/next; identidade1430204185 preservada. Nada alterado em cobrança, testes, limites de tempo ou serviços para contornar falhas. PR89 atualizada com provas do SHA aprovado.

A limpeza diminuiu o armazenamento atual; não restitui consumo acumulado do ciclo. O prazo6–12h atualiza a medição, sem garantia de desbloqueio. Neste caso, a liberação foi comprovada após a mudança de visibilidade. Não repetir limpeza nem excluir os8artefatos escolhidos.

Checagem automática conferir-ci-das-consultas-pr89 encerrada após CI aprovada; resta aceite visual e autorização explícita para merge. Próximo passo: avaliar os Workers já publicados e obter aceite humano; não integrar automaticamente, não republicar apenas por documentação e não alterar dados humanos. Alteração local posterior à CI: somente este checkpoint, preservado sem novo commit para não substituir o HEAD aprovado. A evidência de conclusão já consta da PR remota.

## Acesso fixo para publicação de jogos — 25/11/2026

Pedido humano: manter acesso independente durante atualizações de admin/preview. Criado Worker admin-publicacao em https://admin-publicacao.renato-lucindo-jr.workers.dev/admin, congelado na fonte039d78a; versão3f2a6cf6-d1dc-4dec-91e6-db2c1f9132b4/deployment513f2d14-5bd5-4b0a-af28-b3e4c8b32425. Não atualizar, excluir ou incluir esse Worker nos deploys de admin/preview sem pedido explícito. Configuração local ignorada .preview-artifacts/wrangler.admin-publicacao.jsonc; sem código/API/banco/CI alterado, upload Wrangler e conferência remota pelo conector Cloudflare. Sessions isoladas no namespace2f3752c7b23049e0a4dec04ba7b05e8f, chave própria e limite de login próprio. Mesmo banco de desenvolvimento: o código fica fixo, os dados continuam compartilhados; nenhuma publicação de jogo executada pelo agente. Sem Access ou novo domínio personalizado.

Página aberta e mantida no navegador integrado, com destino Copa ES/Sub-15/Jogos após login. Login visível conferido; exige autenticação própria nesse endereço. Smoke remoto e proteção de APIs registrados em .preview-artifacts/admin-publicacao-smoke.json. Credenciais locais preservadas com DPAPI no cofre do usuário, sem valores nos documentos. Este checkpoint continua sendo a única mudança versionada local, sem novo commit ou alteração do HEAD da PR89 aprovada.
