# Progresso atual

Atualizado em 25/11/2026. [Checkpoint anterior preservado](../historico/progresso/2026-11-25-pausa-legibilidade-resolvida.md).

## Unidade ativa

Branch `codex/perfis-equipes`, [PR #89](https://github.com/renato-lucindo/next/pull/89), fonte executável `ac2a0c7caa1c78995474fb71cf1a750e6bad75c5`. Mesma unidade, sem merge autorizado. Revisão publicada: nomes288/240px, métricas10px por lado,100jogadores por página na mesma região rolável, campos44px/fonte16px/lupa central, Equipes sem busca livre externa e decimal uniforme permanente aprovado (AVG2casas; ausências preservadas). [Matriz](PLAN-TABELAS-FILTROS.md#legibilidade-e-controles--revisão-aprovada-em25112026), [validação](design/VALIDACAO-PERFIS-EQUIPES.md#retomada-e-diagnóstico--25112026), [capturas e medidas](design/evidencias/2026-11-25-legibilidade/README.md#conferência-dos-workers).

## Verificação real

Reserva corrigida: precisão dos totais reconstruídos, sem criar45,0 apenas no modo médio. Consulta real da Copa ES:100atletas na primeira página, variação0px entre modos no campeonato, Elencos e Jogadores da disputa; oito abas reais carregadas sem erro/transbordamento em1366px. Campanhas930px ocupa painel930px; ícones originais e AVG preservados. Capturas inspecionadas pelo agente; sem aceite humano ou parecer independente.

Gate UI PASS,24contratos Chromium nos seis tamanhos,2unitários da reserva e8contratos finais de tooltip PASS. CI [45725623712](https://github.com/renato-lucindo/next/actions/runs/45725623712)/ac2a0c7: gate completo859PASS/183arquivos, catálogo,526Chromium do primeiro shard e44WebKit PASS; segundo shard400PASS/125dispensas preexistentes/1falha no teste de alinhamento de Equipes. Trace confirmou boundingBox separados na transição390→1366px. Corrigido apenas o teste: todas as posições na mesma tarefa do navegador, aguardando juntas as invariantes, tolerância<1px e timeouts preservados;20repetições focais PASS, lint/tipos PASS. Nenhuma UI/Worker mudou com essa correção. Nova CI do HEAD deve validar o ajuste. Timeout local de premiações não se repetiu nos checks limpos; causa local não provada. Artefatos foram enviados normalmente; sem nova limpeza/cobrança.

## Serviços publicados

Somente admin/preview atualizados pelo conector Cloudflare, fonteac2a0c7. Admin versão6f57eca9-a6cf-4029-9222-b1e4595a6af6/deployment4437b6b4-ca2d-4f5b-8db1-ffe76d0d3fd7; preview versão15c5b2da-fbdc-408e-9d74-6fea571a140f/deployment645d5d34-41e6-485c-999d-48e57ff25b2e. Health/raiz200, APIs privadas401/403,12assetsSHA256 PASS; sessões/segredos/aliases e ausência de Access preservados. Adminnamespace597c612fd69c447e81547f16d5dcca41. Sem escrita em dados humanos, mudanças de banco/cálculos/API ou cobrança.

**Não atualizar/excluir admin-publicacao.** Acesso fixo https://admin-publicacao.renato-lucindo-jr.workers.dev/admin, fonte039d78a, versão3f2a6cf6-d1dc-4dec-91e6-db2c1f9132b4/deployment513f2d14-5bd5-4b0a-af28-b3e4c8b32425. Namespace isolado2f3752c7b23049e0a4dec04ba7b05e8f; mesmo banco compartilhado de desenvolvimento. Usuário publica jogos nesse acesso. Versão conferida intacta pelo conector.

## Pendências e próximo passo

- Correção de medição e checkpoint reunidos na mesma PR; aguardar CI do HEAD final; heartbeat oficial `conferir-legibilidade-da-pr89` ativo a cada10min. Ler resultado real, corrigir falhas sem ampliar tolerâncias/timeouts, atualizar mesma PR e excluir checagem ao terminar a espera. Sem merge sem aceite explícito.
- Pergunta de design enviada: Jogadores direto abre Fase regular pelo parser legado, enquanto Limpar filtros assume Todos. Responsável deve escolher abertura Todos ou preservar Fase regular com reset correspondente. Aguardar somente essa decisão dependente; não mudar recorte por suposição. Demais alterações já publicadas.
- Alterações alheias neste worktree: nenhuma observada. Outro agente trabalha em confrontos-fase-regular; preservar seus processos/worktree. Nenhum crédito/reset consumido. Regra de pausa: consultar cota real, checkpoint aos15%restante e agendar reset observado+2min.
