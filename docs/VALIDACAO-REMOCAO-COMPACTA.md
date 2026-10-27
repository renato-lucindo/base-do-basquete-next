# Remoção de inscrição vazia — integração compacta

**Release27/10 concluído:** sourceaa7 no preview protegido, deploymentaff9ee39-5793-4399-914a-fa561834f1c8/versão18934c23-6b8c-4e85-bc47-2b3a2a91f21d100%. GET/POST sem sessão de `/api/registrations/:id/removal` recusados nos smokes; após revogar o acesso temporário, anônimo302→Access. Nenhuma exclusão humana ou DDL. Relatório/hashes/proteção em `docs/VALIDACAO-ADMIN-COMPACTA.md`. Permanecem pendentes aceite humano e A26 para outras entidades/arquivamento; registros abaixo são históricos da integração.

**Confirmação final27/10:** fonteaa7aa49790d2ed309ff593b9e71c119ef48d3782, CI40452980411/job122019741946 **SUCCESS**,560unit/115arquivos e388browsersPASS/48SKIP, gate completo. Gate local560/6transportes/13PG/23workerd/4PDFs SHA cbb2bd7ba2cfbca01505395a4de4b0d32c13be04399715bb75990eb789e03138. Merge trouxe correção verificada de toolbar e setups de navegação modal; nove focais toolbar/remoção PASS18,7s. Nenhum código de produto mudou após essa fonte. Release não iniciado: consulta pré-deploy atingiu85%usados5h. Pacoteaa7 pronto e preview continua3eca; retomar reset+2 sem repetir suítes. Registros abaixo incluem estados intermediários anteriores à confirmação final.

27/10/2026, base `60aec12`, branch `codex/inscricao-vazia-compacta`. Primeira entrega autorizada de A26, limitada à inscrição vazia. Nenhum dado humano excluído, nenhum comando de remoção enviado ao serviço real nesta execução.

## Reutilização e contratos

- Migration45 `20261026135708_registration_removal.sql` já aplicada: SHA256 `ca525c6f32f362474d58dae93a0cb05bbeea09b5f1b02e8fceeb5bea5d93e4af` conferido, bytes preservados. Banco permanece com48 migrations, sem DDL nova. Tipos já contêm as RPCs.
- Plano/provas originais em `docs/VALIDACAO-REMOCAO-INSCRICOES.md` recuperados da branch de origem. Contrato real BEGIN/ROLLBACK e três corridas nativas continuam aplicáveis ao SQL inalterado; não foram reexecutados. Não atribuir essas provas à UI nova ou a carga total.
- RED na base atual: módulo de contrato ausente; depois quatro testes falharam por métodos do provider ausentes. Portados contratos e adapter, oito testes PASS em431ms (`removal-port-provider-green.log`). Nenhuma cópia integral de telas antigas.
- Rotas/DO específicos: contexto/correlação, replay congelado, sessão e origem antes do corpo. Um cenário workerd focal PASS em1,07s (`removal-port-worker-green.log`), build/typecheck aprovados.

## Diálogo desktop

- RED real por ação de excluir ausente. Conferência integrada ao `AdminDialog` existente, preservando tabelas e busca. IDs retirados do texto visível; contratos mantêm identidade. Escape respeita intenção pendente, fundo inerte, menu de inscrições não expande a página.
- Quatro cenários portados PASS em15,3s: histórico bloqueado, inscrição vazia, ACK incerto/conhecido seguido de GET falho, duas abas/version409 e reautenticação. Caso estreito anterior adaptado ao desktop/1366px; mobile explicitamente adiado.
- Caso novo de Escape/foco/sem expansão e composição com pessoas/equipes: **18/18 PASS em25,7s**, log `.preview-artifacts/removal-port-composition.log`, SHA256 `3de0e762948cb9c9fea887f2257522710d8c25c2f1a4e11cb12a7aec2d1aa462`. Axe focal passou; não comprova WCAG completa. Captura `.preview-artifacts/removal-compact-desktop.png` inspecionada.
- Lint e tipos focais PASS. Gate consolidado PASS/exit0 em `removal-compact-final-gate.log`, incluindo23workerd, quatroPDFs, builds/fronteira e segredos723. Sem CI/deploy desta integração ainda. A documentação acrescentada durante o gate recebe formato focal antes do commit; nenhuma alteração de produto ocorreu durante a execução.

## Achado independente do release

A captura revelou campo de busca sob os botões da toolbar do piloto em1366px. Corrigir com RED geométrico antes de publicar o piloto. Isso não é falha do contrato de remoção. Fonte606e6f6/CI40450755902 ainda aguardam release e não contêm a remoção; pacote606 existente fica obsoleto se o piloto receber a correção.
