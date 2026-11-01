# Handoff — UI/UX desktop, etapa 2

## Origem e isolamento

- Base do produto: `codex/ui-ux-desktop`, commit
  `8cbeb089faab3abab8d5e44e60606a1f4fea2011`
  (primeira entrega visual, PR #33).
- Nova unidade: `codex/ui-ux-desktop-modais-toasts`; PR draft #35,
  tendo a branch de UI anterior como base.
- Branch auxiliar de evidências: `codex/uiux-etapa2-baseline-capturas`;
  parte do mesmo commit-base, contém somente teste de captura da edição
  inline original. Não integrar essa branch na aplicação.
- O banco WIP (`codex/reaproveitar-elenco-banco`), migrations, RLS,
  Auth, contratos de API, estatísticas, publicação, PDF, Worker e
  deploy compartilhado não fazem parte desta unidade.

## Mudanças de interface

1. A edição de ações na súmula usa um `AdminDialog` com equipe, período,
   camisa/alvo e código. Os campos do lançamento rápido permanecem
   separados, com valores restaurados ao cancelar/salvar uma edição.
   Escape cancela; Confirmar altera só o rascunho existente. O motor
   `editAction`, a validação e desfazer/refazer permanecem intactos.
2. O componente reutilizável `AdminToast` mostra avisos transitórios
   descartáveis (6 segundos) para edição/exclusão de ação e conclusão
   de gravações em Jogos, Pessoas, Equipes, Campeonato e Regulamento.
   Não aparece a cada ponto/falta registrada. Mantém os textos
   `role="status"` e erros visíveis já existentes na tela; o toast
   não substitui alertas nem obriga o usuário a dispensá-lo.
3. `compact.css` refina a largura útil no desktop e a densidade de
   tabelas, contextos, painéis de equipes/jogos/pessoas, regulamentos,
   conquistas, transferências e perfis existentes. Campos de edição
   no modal usam duas colunas e refluem quando necessário.
4. Não foram introduzidas novas bibliotecas de componentes, interfaces
   fictícias, atalhos ou alterações de regras de produto.

## Testes e capturas

Arquivos modificados: `tests/sheet.spec.ts`,
`tests/sheet-desktop.spec.ts` e `tests/competition.spec.ts`.

Novos cenários de Playwright cobrem modal da edição, Escape sem
salvar, edição confirmada no rascunho, toast dispensável, manutenção
do status persistente, geometria e capturas em 1366×768/1920×1080.

Capturas feitas por fixtures sintéticas, nunca por API do preview real:

- Antes: `sheet-edit-before-1366x768.png`,
  `sheet-edit-before-1920x1080.png` (branch de referência).
- Depois: `sheet-edit-modal-after-1366x768.png`,
  `sheet-edit-modal-after-1920x1080.png`,
  `competition-toast-after-1366x768.png`,
  `competition-toast-after-1920x1080.png`.

Os PNGs serão extraídos do artefato `prototipo-SHA` das execuções de
GitHub Actions. Não declarar captura obtida antes da execução e download.

## Limites e encaminhamento

- Revisar zoom de 200%, teclado, mensagens longas, foco e contraste;
  o sucesso da suíte não comprova WCAG integral.
- Confirmações de saída por `window.confirm` continuam síncronas
  por contrato dos guards de navegação.
- Não houve mudanças em dados humanos, no banco ou no Worker.
- Revisar o diff apenas da UI em PR draft, nunca fazer merge direto
  na principal. O responsável integrará com a branch de banco depois.
- A CI e as imagens devem ser identificadas pelo **commit exato
  testado**; esta seção precisa ser atualizada após as verificações.
