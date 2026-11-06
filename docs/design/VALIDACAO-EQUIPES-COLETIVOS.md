# FR, T e GD — validação da unidade

Unidade codex/equipes-fr-t-gd sobre mainfb3f26b. [Plano aprovado](../superpowers/plans/2026-11-05-equipes-fr-t-gd.md). Estado de execução vigente no [checkpoint](../PROGRESSO.md).

## Decisões e implementação

FR coletiva de súmula = FC adversária na mesma partida, antes de agregar. T automática por ocorrências publicadas de atletas/comissão/banco/sucessões, sem B2. GD obrigatória e explicitamente conferida por equipe, maior/igual ao mínimo do motor; zero não é presumido. Boxscore e métricas individuais preservados.

Revisão normal exibe FR/T calculadas; GD recuperada da mesma versão permanece sem confirmação até ação humana. Alterar GD remove o check; alterar o documento exige recarregar conferência. Resposta incerta conserva comando/UUID; conflito exige recarga.

Endpoint protegido POST /api/games/:id/publication/team-statistics usa somente documento congelado da versão pública corrente. Migration20261106005214_complete_sheet_team_statistics.sql preserva funções/migrations anteriores, acrescenta guarda de GD e RPC transacional com locks,recibo,versão e projeções existentes. Não escreve game_sheets/game_sheet_entries/games nem sobrescreve documentos históricos; revisa somente teamStatistics e metadados necessários. Sem backfill na migration.

## Evidência incremental

- Cálculo/guarda:2testes RED→GREEN. FR inclui exatamente FC dos atletas adversários,sem somar técnicas de comissão novamente; valor manual divergente rejeitado,GD explícita e legado legível.
- Banco descartável:1teste PASS com equivalência SQL/TypeScript,anon negado,escritor semGD negado,correção versionada,idempotência/conflito,projeção atualizada e preservação integral da súmula divergente/identidades/placar/fatos anteriores. Erros de infraestrutura do próprio teste (transação abortada por negativa fora de subtransação e leitura privada sob authenticated) corrigidos usando helper de erro/owner somente no banco descartável.
- Regressão focal intermediária:90/91PASS; a fixture SQL de origem ainda publicava semGD. Ajustada preservando a prova de migração sobre histórico; repetição focal desse1PASS. Não somar recortes sobrepostos nem declarar gate completo desta composição.
- Browser Chromium:revisão histórica PASS,GD publicada recuperada,checks obrigatórios inclusivezero,alteração do total invalida check,axe,larguras1366/390,resposta perdida/repetição do mesmo JSON e fonte atual divergente intacta. Publicação manual normal e fallback conferidos incrementalmente. Expectativas de teste ajustadas para esperar carregamento dos checks e selecionar mensagem de sucesso sem confundir outputs numéricos com status.
- TypeScript/ESLint focais PASS antes dos ajustes finais; verificação consolidada pendente. Revisão autoral,sem alegar parecer independente ou celular físico. Capturas locais ignoradas .preview-artifacts/team-statistics-review-*.png; renovar após CSS final.

## Dados humanos e operação

[Quadro](../evidencias/2026-11-05-equipes-fr-t-gd.md) e JSON associado:25jogos/50lados,T15,mínimoGD4,nenhum GD confirmado. Valores derivam de cópias imutáveis da mesma versão publicada. Fonte privada bruta permanece ignorada,fora do commit; relatório contém somente contexto público e hash documental.

Nenhuma migration remota,DDL/DML humano,republicação ou deploy desta unidade. UIUX continua em fb3f26b/PR63,version3dbe1bda-69d5-446d-9265-15bd9a003eb2; principal/Access/segredos preservados. Migration é de escrita e não está coberta pela autorização permanente de funções somente leitura. Solicitar autorização apenas após SQL/testes/quadro concretos e revisados.

Referência de privilégio mínimo/search_path nas [funções Supabase](https://supabase.com/docs/guides/database/functions). CLI atual conferida por help; migration new é local. Nenhum comando remoto da CLI executado.
