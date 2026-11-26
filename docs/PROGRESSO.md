# Progresso atual

Atualizado em25/11/2026 (26/11UTC). [Histórico preservado](../historico/progresso/2026-11-25-pausa-legibilidade-resolvida.md).

## Unidade validada para avaliação

Branch `codex/perfis-equipes`, [PR #89](https://github.com/renato-lucindo/next/pull/89). Fonte executável5bdb298246d557607f366f69b6faa6af956d7293; fonte de código/testes validada7f18cae1a86cf617af962f5a2fc7ba55903e8c30, sem diferença de runtime. Este encerramento altera somente documentação. [Matriz](PLAN-TABELAS-FILTROS.md#legibilidade-e-controles--revisão-aprovada-em25112026), [resultado consolidado](design/VALIDACAO-PERFIS-EQUIPES.md#resultado-consolidado--26112026-utc), [provas/versões](design/evidencias/2026-11-25-legibilidade/verificacao-final.json).

Nomes288/240px, métricas10px,100jogadores por página na rolagem preservada, campos44px/fonte16px/lupa central, Equipes sem busca externa, decimal uniforme permanente (AVG2casas/ausências preservadas). Consulta real:0px entre modos no campeonato/Elencos/Jogadores, oito abas sem erro/transbordamento e campanhas930px preenchendo painel930px; ícones originais preservados. Tooltip dispensa até nova interação, incluindo foco posterior e consulta atrasada. Capturas inspecionadas; sem aceite humano/parecer independente.

[CI45731786815](https://github.com/renato-lucindo/next/actions/runs/45731786815) SUCCESS no SHA7f18cae:859unitários/183arquivos,927Chromium,44WebKit/macOS, catálogo evalidate PASS;125dispensas mobile preexistentes, sem novas dispensas/timeouts maiores. Navegação macOS usaOption+Tab conforme Apple/Playwright; mesmas asserções. Gate localUI,24contratos nas seis larguras,20repetições da medição e12contratos do tooltip PASS. Timeout local antigo de premiações não se repetiu nas CIs limpas; causa local não provada. Artefatos enviados normalmente.

## Serviços publicados

Somente admin/preview atualizados pelo conector Cloudflare, fonte5bdb298. Admin versãofb9fb0eb-3d7d-4a1f-9347-177daf39ece3/deployment0110497b-0484-4f70-bf66-8d5ac142e368; preview versão01a51499-d940-4e47-8438-09ca271cc88b/deploymente48fdb31-66d9-4b19-b0a0-dc10b5b5bfc0. Rechecados health/raiz200, privados401/403,12assetsSHA256 e versões. Sessões/segredos/aliases/semAccess preservados; adminnamespace597c612fd69c447e81547f16d5dcca41. Sem escrita humana, mudanças de banco/cálculos ou cobrança. Não republicar por encerramento documental.

**Não atualizar/excluir admin-publicacao.** https://admin-publicacao.renato-lucindo-jr.workers.dev/admin, fonte039d78a, versão3f2a6cf6-d1dc-4dec-91e6-db2c1f9132b4/deployment513f2d14-5bd5-4b0a-af28-b3e4c8b32425, reconferido intacto. Namespace isolado2f3752c7b23049e0a4dec04ba7b05e8f; mesmo banco compartilhado de desenvolvimento.

## Próximo passo e limites

- [CI obrigatória do HEAD documental e resultado atual](https://github.com/renato-lucindo/next/pull/89/checks). Encerrar a checagem oficial `conferir-legibilidade-da-pr89` após seu resultado, sem novos commits de polling; reaproveitar provas do runtime inalterado.
- Resposta de design pendente à pergunta já enviada: Jogadores abre Fase regular pelo parser, enquanto Limpar assumeTodos. Aguardar escolha, sem repetir pergunta ou alterar recorte por suposição. A implementação independente já está publicada/validada.
- Merge continua condicionado ao aceite explícito do responsável. Nenhuma alteração alheia observada; preservar outro worktree de confrontos-fase-regular e seus processos. Não consumir reset/crédito; cota real aos15%restante exige checkpoint e agendamento reset+2min.
