# Progresso atual

Atualizado em25/11/2026. [Checkpoint anterior preservado](../historico/progresso/2026-11-25-antes-espacamento-estatisticas.md).

## Unidade ativa

Branch codex/perfis-equipes/[PR89](https://github.com/renato-lucindo/next/pull/89), HEAD iniciale1e7f7b4a2e0051397e48fcb78de6504b4867c19, CI45646680852/tentativa3 SUCCESS. Repo público renato-lucindo/next (ID1430204185). Nova revisão: nomes mais largos, células10px por lado,100jogadores, controles44px/fonte16px/lupa central, sem busca externa em Equipes, decimal uniforme permanente aprovado. [Matriz](PLAN-TABELAS-FILTROS.md#legibilidade-e-controles--revisão-aprovada-em25112026), [validação](design/VALIDACAO-PERFIS-EQUIPES.md#legibilidade-de-estatísticas--25112026), [capturas](design/evidencias/2026-11-25-legibilidade/README.md). Sem cálculos/banco/dados humanos alterados; paginação100aditiva,20/30preservadas. Alteração local anterior deste checkpoint preservada em histórico.

82PASS/16falhas iniciais corrigidas22PASS; regressão64PASS/14expectativas/seletores corrigidos20PASS. Gate UI e design:verify completos PASS. Gate completo local856PASS/1timeout30s em premiações sem alteração nessa fonte/SQL; isolado1worker2timeouts, não tratar como PASS. CI do SHA final deve validar em ambiente limpo. WebKit41PASS/3falhas, sendo2overscroll Windows e1lista999; eliminado recálculo quadrático da precisão e rechecagem9992PASS/18s, limite30s preservado. Capturas reais inspecionadas; sem parecer independente ou aceite humano.

## Serviços e limites

Admin/preview ainda na fonte039d78a validada: admin versãob32aeb22-fa54-4bd2-80d7-c0d6be6dcc8e, preview versãoa73c20e0-7401-4670-8522-a28fb366483c. Atualizar esses dois após validar a revisão; preservar namespace597c612fd69c447e81547f16d5dcca41, sessões/segredos/aliases e ausência de Access. Sem mudança de domínio/raiz/www. Limpeza antiga concluída1286artefatos/18,68GB;8escolhidos preservados. Após tornar público, novos uploads e CI final foram aprovados; não repetir limpeza nem alterar cobrança.

**Worker fixo admin-publicacao não deve ser atualizado ou excluído sem pedido explícito.** https://admin-publicacao.renato-lucindo-jr.workers.dev/admin, fonte039d78a, versão3f2a6cf6-d1dc-4dec-91e6-db2c1f9132b4/deployment513f2d14-5bd5-4b0a-af28-b3e4c8b32425. Login/sessões isolados no namespace2f3752c7b23049e0a4dec04ba7b05e8f; mesmo banco de desenvolvimento. Config ignorada .preview-artifacts/wrangler.admin-publicacao.jsonc; credenciais no cofre DPAPI do usuário, sem valores nos documentos. Usuário publica jogos por esse acesso; agente não escreveu dados humanos.

Próximo passo: concluir provas, atualizar mesma PR89, publicar apenas admin/preview e conferir SHA/assets/telas reais; acompanhar CI do HEAD final pela ferramenta oficial. Merge depende de aceite humano explícito. A checagem anterior foi encerrada após CI aprovada; criar nova espera somente para a revisão atual.

## Pausa por cota — revisão ainda pendente

Ferramenta real92%usados/8%restante na janela5h; reset25/11/2026 20:39:02Brasília (1795649942). Retomada obrigatória reset+2min:20:41:02Brasília/23:41:02UTC. Atualizar automação conferir-legibilidade-da-pr89 para essa execução, confirmar ferramenta; sem consumir crédito/reset.

Fontee14a0e7415bb5647915a899be1503a0a371f40f7 enviada; CI45682268112 falhou em TypeScript TS1156 na variante TeamsTable: const foi inserido depois de if sem bloco. Corrigido localmente antes da pausa, tsc --noEmit passou; não alegar que gateUI anterior validou a otimização posterior.6contratos finais de modos/decimal PASS. Rechecagem999WebKit2PASS. Catálogo completo PASS, bundle técnico restaurado aos bytes HEAD.

Publicação e14a0e7 foi testada remotamente:100linhas, campos44px/16px, nomes288px e12assets SHA256 PASS; mas medição real detectou crescimento até9,203125px em Total/Por jogo. Arquivo .preview-artifacts/legibilidade-live-debug.log contém larguras/reservas por coluna. Causa localizada: metricColumnStyle infere decimalColumn das médias recebidas, formata o total reconstruído45como45,0 somente ao entrar no modo médio. Próximo ajuste exato: inferir decimalColumn a partir dos totais reconstruídos value*totalFactor (respeitando forceDecimal para PPJ/PP%), usando os mesmos formatos nos dois modos; reservar45e5,0, não introduzir45,0 fictício. Confirmar com dados reais da Copa ES, resposta concluída e arrays de reserva/limites, além de fixture com total45/média5 e uma média fracionária na mesma coluna.

Por essa divergência e falha de compilação, admin/preview voltaram à fonte039d78a validada: admin deploymenteee28ee6-f3f6-4aa4-97e6-1a2090df0538/versãob32aeb22-fa54-4bd2-80d7-c0d6be6dcc8e; preview deployment16e2cf0c-d26e-40e3-a015-9c9600c4ceef/versãoa73c20e0-7401-4670-8522-a28fb366483c. admin-publicacao continua na versão fixa3f2a6cf6-d1dc-4dec-91e6-db2c1f9132b4, conferida pelo conector. Não republicar antes de corrigir divergência real. Preserve fontes/API100/filtros já implementados; mesma PR89, sem merge. As provas anteriores não equivalem à entrega desta revisão.

Ao retomar: conferir cota/HEAD/CI reais, corrigir reserva e ampliar contrato real; validar tipo com exit code explícito, campo/nomes/decimal/performance, CI completa incluindo timeout de premiações. Usar conector Cloudflare para ativar apenas admin/preview, smoke e navegador real, atualizar PR e encerrar checagem. Não alterar admin-publicacao/dados humanos/cobrança nem enfraquecer testes/timeouts.
