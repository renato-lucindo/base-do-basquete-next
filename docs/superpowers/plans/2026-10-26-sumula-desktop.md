# Súmula desktop — plano aprovado em26/10/2026

Execução inline com executing-plans/TDD/continuidade. O responsável aprovou explicitamente implementar a proposta atualizada da conversa. Três unidades: preparação automática autorizada; duas tabelas únicas de12vagas com comissão/seletores; lançamento compacto com parciais/histórico. PDF, texto e mobile fora deste recorte.

- [x] S1: contexto administrativo completo e limitado por jogo, última súmula salva da mesma inscrição/disputa (cronologia quando disponível), última camisa por pessoa; zero/upgrade/RLS/versão e tipos/adapter/Worker. Nova intenção nunca substitui documento existente; origem visível.
- [x] S2: até12por lado, histórico elegível e preenchimento por camisa0/00; reaproveitar papéis, não participação dos reservas. Dropdown pesquisável sem duplicados, camisa editável,5titulares/capitão/comissão exigidos para avançar; salvar rascunho incompleto continua. Mesma lista nas duas etapas, A/B sempre lado a lado no desktop.
- [x] S3: motor compartilhado gera progresso por ação e por jogador/quarto. Jogadores somamOT na colunaQ4; equipes preservamQ4/OT1/OT2 separados. Faltas Q1/Q3vermelho e Q2/Q4/OTazul; contorno interno reforçado nas faltasQ1/Q2, independentemente da posição; GD/D/5ªfalta não são falta extra.
- [x] S3: últimas10ações totais, checkboxquarto/equipe/tipo, consulta integral paginada10, numeração global; contadores antes do filtro, edição/exclusão/undo/redo recalculam tudo. Exemplos2p(5),Tc(3),U2(GD). Teclado e revisão de publicado preservados.
- [x] S4: focais desktop, gate consolidado após estabilidade/CI/revisão do diff, preview protegido/smokes/revogação. CI40398538486 SUCCESS na fonte a370055; publicação e proteção verificadas em26/10/2026. Revisão separada do autor, sem parecer independente disponível. Sem merge/produção. Evidências inalteradas permanecem válidas.

Base03d7ed868ed9dfc945437c21a980ea8cb9990719, branchcodex/sumula-desktop, checkout sequencial existente; nenhum worktree paralelo necessário. Material humano docs/boxscore permanece não rastreado e intacto.

## Decisões relevantes

Ruling: trazer apenas migration20261026135708/types da branch anterior para espelhar o banco real45, já aplicado; não trazer API/UI de exclusão. Não reaplicar essa DDL. Custo: o novo checkout passa a representar o esquema real, mantendo a funcionalidade não publicada separada.

Ruling: nova consulta bounded administrativa entrega candidatos completos e histórico mínimo para busca local/combobox, evitando inferir a lista a partir de só20itens da página existente. Limites explícitos por inscrição, sem truncamento silencioso ou nomes privados fora da necessidade. Escritor existente revalida vínculos/versões no save.

Registro de execução/testes/SHA em docs/VALIDACAO-SUMULA-DESKTOP.md e checkpoint em docs/PROGRESSO.md. Cota real≤15%restante5h interrompe novas unidades/gates; mínimo consistente/push e mesma automação reset+2.
