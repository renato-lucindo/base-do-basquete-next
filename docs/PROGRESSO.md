# Progresso atual

Atualizado em25/11/2026. [Checkpoint anterior preservado](../historico/progresso/2026-11-25-antes-correcao-compacta.md).

## Unidade ativa

Mesma branch codex/perfis-equipes/[PR89](https://github.com/renato-lucindo/base-do-basquete-next/pull/89), base origin/main0af33e38. Correção compacta autorizada: largura real estável Total/Por jogo, alinhamento nativo, ícones originais com traço branco, campanhas desktop sem rolagem, seletor Total e documentação. [Matriz](PLAN-TABELAS-FILTROS.md), [provas e diagnóstico](design/VALIDACAO-PERFIS-EQUIPES.md#correção-compacta--25112026), [capturas](design/evidencias/2026-11-25-correcao-compacta/README.md). Preservada alteração local anterior em histórico. Sem merge, API, schema, cálculo esportivo ou dados humanos alterados.

Gate completo PASS857unitários e demais gates; design:verify e catálogo WebKit PASS. Contratos compactos4PASS/consumidores6PASS; regressão132PASS e8expectativas antigas de padding corrigidas e revalidadas. Focal14PASS, sobreposição mobile corrigida e rechecagem5PASS/1dispensa preexistente. WebKit completo local42PASS/2falhas de overscroll (propriedade não exposta no Windows, limitação documentada na configuração); CI macOS continua obrigatória, sem nova dispensa.

## GitHub e publicação

CI anterior45629988602 falhou em browsers e uploads, apesar de gate/design aprovados; diagnóstico e correções no relatório. Limpeza final autorizada executada:1286artefatos/18,68GB excluídos,8artefatos/38,31MB preservados; inventário final confirmado. Autorização e auditoria em C:\Users\12405304716\.codex\artifact-archives\base-do-basquete-next\2026-11-25. Capturas versionadas preservadas; sem baixar todos os ZIPs, usar Y: ou mudar cobrança. Disponibilidade de novos uploads deve ser comprovada na próxima CI.

Workers ainda na fonte6c08a024a7ef46154df7f52e3dbeff9196c88920: admin versãoaad50e1b-efcc-4ea5-8fbf-b3142bd816e5, preview versãod221f8b7-a14d-446f-bab2-f0dc0881f7a0. Conector Cloudflare exige reautenticação; solicitação assíncrona enviada. Continuar commit/push na mesma PR89, conferir CI do HEAD real e ativar versões corrigidas nos mesmos Workers quando reconectado. Preservar namespace597c612fd69c447e81547f16d5dcca41, segredos, aliases e ausência de Access; não criar Worker novo. Sem escrita em dados humanos.

Automação conferir-ci-das-consultas-pr89 pausada durante execução manual; reativar para aguardar CI do novo SHA, removendo-a ao terminar. Aceite visual e merge seguem pendentes.
