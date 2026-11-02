# Preparação da integração da PR #38

Em 02/11/2026, o responsável confirmou: “Validei as correções. Pode iniciar o procedimentos para merge”. [Aceite e autorização registrados na PR](https://github.com/renato-lucindo/base-do-basquete-next/pull/38#issuecomment-6582888204). Não inclui produção, novo deploy ou operação no banco real.

## Candidato e revisão

Código funcional aceito e publicado: `4ae05356e49108ec237b82ffa275dd5e1b69b228`. [CI 41479403192](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41479403192) SUCCESS: 636 unitários/130 arquivos, 481 browsers PASS / 109 SKIP, gate e design. Preview exclusivo da PR #38 continua na versão 5, deployment `ddab0f4e-7eac-4050-a9ad-57fb1930f086`. Nenhuma nova publicação faz parte desta integração.

Preflight: base main `c6004eba2c891a2049edd8f7768b37777ea6d523`, PR sem conflitos e sem threads de revisão abertas. Os pareceres antigos são do autor e referem-se a SHAs anteriores; bloqueios de publicação/login relatados neles foram superados pelas evidências posteriores. Não foi obtido parecer independente nem se exige aprovação fictícia de segundo mantenedor. O aceite humano das correções agora foi recebido.

## Correspondência da migration aplicada

Consulta somente de metadados confirmou exclusivamente `20261102154118_legacy_sheet_editing` no ledger dev; `20261102112205` não foi registrado. A SQL aplicada tem 12.997 caracteres e MD5 `b26d4096aa91fd54679f8a5696598220`. O arquivo local, normalizando somente CRLF para LF e removendo a quebra final, tem o mesmo checksum.

O arquivo foi **renomeado** de `20261102112205_legacy_sheet_editing.sql` para `20261102154118_legacy_sheet_editing.sql`, preservando integralmente seus bytes e o blob Git. A única referência executável literal, no teste de upgrade, foi ajustada ao nome canônico. A ordem continua sendo a última migration, depois de `20261031005230_game_actual_times`. Não houve alteração do SQL aplicado, nova migration, reaplicação, migration repair, DDL, DML ou modificação do ledger remoto. A pendência de nomenclatura das evidências anteriores fica resolvida por esta correspondência, sem editar registros históricos.

O checkpoint documental posterior ao preview foi incorporado à mesma branch. Validação focal do upgrade e CI do candidato final são registradas na conversa da PR; não repetir gate local de código funcional idêntico. A integração usa merge commit e exige CI no SHA integrado, conforme CONTRIBUTING. Resultado final, SHA e CI integrados devem ser conferidos e registrados após execução; este documento não antecipa sucesso.

Alterações humanas no checkout original, documentos já modificados no worktree antigo da PR #46 e demais branches/worktrees permanecem preservados. Não apagar branches utilizadas nem atualizar a PR #46 nesta unidade.

## Falha da primeira CI candidata e sincronização do teste

A CI 41485738438 do candidato d8b8920 passou gate/design e 480 browsers, com 109 SKIP, mas falhou em `save-latency.spec.ts` (sucesso parcial): contagem 1 quando esperava zero durante o lote. O teste ligava o contador depois da interpretação sem aguardar a comparação inicial do elenco concluir. Essa leitura inicial podia ser contada no intervalo reservado ao lote; o efeito do produto já evita recarga enquanto `model.busy` está ativo.

Foi acrescentada somente a sincronização da linha de base no teste: aguardar os efeitos da interpretação e o marcador de comparação concluída antes de ligar o contador. Permanecem as asserções de zero leituras durante o lote, uma ao término e mais uma ao voltar; sem aumento de timeout, remoção de teste ou alteração do produto. Duas variantes × dez repetições = 20 PASS (33,5 s), eslint/formato/diff PASS. A falha anterior não foi omitida nem tratada como aprovação; uma nova CI do novo candidato deve passar antes do merge.
