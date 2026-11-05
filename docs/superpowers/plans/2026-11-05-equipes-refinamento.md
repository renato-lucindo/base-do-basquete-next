# Equipes conforme Jogadores — plano

**Spec:** [pedido integral aprovado para execução](../specs/2026-11-05-equipes-refinamento.md).
**Base:** origin/main 76b90da. Branch codex/equipes-refinamento, worktree isolado.
**Arquitetura:** contrato optativo pageSize=all na rota existente, cálculo uniforme exclusivo desse contrato; listagem própria e CSS escopado. React/TypeScript/Zod/Vitest/Playwright/Worker. Sem migrations.

- [x] Contratos/cálculos RED→GREEN: PB/PB%, opções e hasBoxscore antes dos filtros; precisão, ranking, seleção compacta/repetida, 26/1000/1002 inscrições, legado20 e perfil inalterados.
- [x] Navegação RED→GREEN: retirar corte de1000, referências locais para seleção grande, aviso e falhas explícitas; transporte de consulta extensa sem perda.
- [x] Listagem RED→GREEN: debounce/cancelamento/foco, segmentados, seleção, tabela completa, máximos e legenda. Preservar Jogadores e perfil. CSS apenas desta tela; não alterar ScrollableTable global.
- [x] Diagnóstico público somente leitura: quadro por jogo/equipe T, mínimoGD, FR/GD/PB; sem rascunhos ou republicação.
- [ ] UI/UX e revisão: skills exigidas; Chromium/WebKit,1366/1920/390/320/1050/1051, zoom/texto200, foco/axe/sticky/barras/bordas, capturas e limites. Gate completo quando estável.
- [ ] Uma PR/CI/merge commit/CI integrada; build fresco e deploy exclusivo no Worker base-do-basquete-next-uiux. Documentação vigente/checkpoint e provas.

Foco: PB coletivo versus pontos manuais; ausência nunca reserva; fontes mistas sem duplicação; grandes seleções sem corte; última resposta prevalece; layout intrínseco apenas súmula; cobertura parcial não vira subtotal.

Execução direta: não há ferramenta de subagentes. Revisão autoral será identificada. Pedido autoriza implementação, integração e preview especificado; não há dependência da PR61. Checkouts humanos e PRs60/61 preservados. Cota inicial real77%5h/40%semanal. Leituras e consultas não alteram dados.

## Pausa de execução —05/11/2026

Contratos/cálculos, navegação, interface e diagnóstico implementados e testados focalmente; a entrega permanece WIP até revisão final/CI/integração/deploy. Gate consolidado exit0 (.equipes-gate.log):715unitários/149arquivos, política11, transporte11, banco13, WorkerHTTP30, PDF1. Revisão posterior:48focaisPASS e13testes sobrepostos de precisão/PB/fontes mistasPASS. Chromium:56PASS na rodada ampliada +2afetados por ENOSPC PASS na repetição; WebKitWindows2PASS. Limites e falhas preservados no relatório. Nenhuma CI remota/PR/deploy desta unidade.

Cota real13%5h/30%semanal, reset1793934163. Retomada oficial `retomar-refinamento-de-equipes` ACTIVE confirmada para06/11/2026 00:04:43 America/Sao_Paulo, reset+2min. Mesma branch/worktree/unidade. PR61 de outro chat tem automação para o mesmo instante e o mesmo alvoUIUX; conferir main/deployment antes de publicar e não substituir build mais novo. Não repetir gates inalterados. DiscoC ~130MB livre; testes sequenciais para evitar novos traces grandes.

WIP material publicado e conferido: `2853a653706b9ca18302a6a8b202ea39bd9d4acb`. Checkout limpo depois do push. Sem PR/CI remota para respeitar pausa antes de novo gate.

## Revisão final na PR63

Main6d37e29 incorporada em6b41ac1, PR63 única. Focais finais48unitários/20Chromium+2storagecheio/12WebKit+4finais de foco e bordasPASS, conforme relatório; não somar recortes sobrepostos. Storage só é necessário para referência longa; falha mantém escolha anterior e avisa. Zero conhecido usa0. Revisão de skills concluída; CI da PR/integrada e deploy/smoke ainda pendentes. Atualizar evidências/estado final na mesma unidade.
