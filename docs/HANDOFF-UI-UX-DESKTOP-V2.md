# Handoff UI/UX desktop — fase 2

## Proveniência e isolamento

- Repositório: `renato-lucindo/base-do-basquete-next`.
- Base: `codex/ui-ux-desktop` em `8cbeb089faab3abab8d5e44e60606a1f4fea2011`.
- Branch da unidade: `codex/ui-ux-desktop-v2`.
- PR draft: https://github.com/renato-lucindo/base-do-basquete-next/pull/34
- A base já contém a primeira unidade de UI/UX (#33). A branch de
  reaproveitamento de elenco e banco permaneceu intocada.
- Nenhuma migration, função SQL, RLS, Auth, API, Worker, cálculo da
  súmula ou regra de publicação foi alterada. Sem deploy.

## Escopo implementado

1. `src/games/sheet-workspace.tsx`: Editar ação agora usa o
   `AdminDialog` existente; campos de equipe, período, camisa/alvo
   e código ficam no modal. O formulário de lançamentos é ocultado
   durante a edição. O motor `editAction`, a validação, o histórico
   de desfazer/refazer e o salvamento do rascunho continuam os mesmos.
   Cancelar e Escape descartam os valores da edição sem mutação.
2. `src/competition/admin-toast.tsx` e `admin-toast.css`:
   feedback efêmero acessível, com `role=status`, dispensa manual,
   duração de cinco segundos e respeito a movimento reduzido.
   Avisos de erro, conflito, ACK ou reautenticação continuam no
   contexto original, sem depender do Toast.
3. `src/competition/screen.tsx`, `src/games/workspace.tsx`,
   `src/teams/screen.tsx` e `src/people/workspace.tsx`:
   feedbacks somente após mutações locais confirmadas ou leitura
   reconciliada do salvamento persistido. Mensagens de alterações
   locais explicam que ainda há necessidade de salvar.
4. `src/competition/compact.css`, `src/text-import/workspace.css`
   e `src/games/sheet-workspace.css`: ajustes proporcionais para
   listas, tabelas e controles de desktop em equipes, jogos,
   cadastros globais, importador, premiações, regulamento e
   ações da súmula. Nenhum campo obrigatório foi ocultado.

## Testes e artefatos

- Foram modificados `tests/sheet.spec.ts`,
  `tests/sheet-desktop.spec.ts` e `tests/competition.spec.ts`.
- Cobertura inclui edição/cancelamento via Escape, edição confirmada,
  Toast de alteração em rascunho e confirmação contextual de remoção.
- Capturas novas da edição modal: `dist/ui-ux-captures/sheet-edit-after-1366x768.png`
  e `sheet-edit-after-1920x1080.png`, via fixture sintética.
- A referência é a branch auxiliar `codex/ui-ux-desktop-v2-baseline`
  (base original #33 mais um teste de captura, sem alteração de UI).
  Arquivos: `sheet-edit-before-1366x768.png`,
  `sheet-edit-before-1920x1080.png`.
- A leitura dos resultados deve ser feita por SHA específico em
  https://github.com/renato-lucindo/base-do-basquete-next/actions.
  Não usar o resultado de uma execução anterior para atestar a nova.

## Limites

- O desenvolvimento ocorreu pelo conector GitHub em branch isolada,
  sem executar o clone no ambiente original do responsável.
- Continuidade de rascunho, autenticação e ACK preservadas.
- `window.confirm` dos guards de saída ainda é síncrono e não foi
  trocado por um modal assíncrono sem refatorar a navegação.
- Testes automáticos não substituem revisão visual humana nem
  constituem comprovação WCAG integral.
- Verificar zoom, contraste, rótulos longos, foco e responsividade
  antes de integrar as duas unidades de UI com o banco.
- Sem alterações não commitadas conhecidas; a escrita foi por API
  GitHub em uma branch exclusiva.

## Integração

Revisar PR #34 sobre `codex/ui-ux-desktop`; não mesclar em
`main` nem publicar no preview real sem coordenação com a
implementação de banco. Preservar ambas as unidades de UI e realizar
validação de composição na integração.
