# Acessibilidade administrativa — observação inicial

## Continuação S2 — equipes e importador

Retomada em 26/10/2026, base d8cdd21; Git local/remoto iguais e limpos, PR23 draft MERGEABLE sem reviews, CI40297505322 SUCCESS no produto bbcda6a. Anônimo continua recebendo 302 no preview; nenhuma alteração de banco ou infraestrutura nesta unidade.

Quatro browsers novos (dois casos desktop/mobile), dez varreduras: lista de equipes, elenco expandido, entrada de texto, revisão com correspondência e confirmação. Primeiro ensaio teve **dois casos RED e dois PASS**. Regra `label-content-name-mismatch` apontou os botões visíveis “Transferir ou retornar” com nome acessível “Transferir Ana Silva/Ausente”. Causa confirmada em `src/people/workspace.tsx`; rótulo agora conserva “Transferir ou retornar” e acrescenta a pessoa. Seletores dos testes de transferência acompanham o nome completo, sem mudar dados ou operação.

**GREEN: 42 browsers de composição PASS** (`admin-accessibility`, `text-import`, `transfers`, desktop/mobile). As dezoito varreduras administrativas finais não têm violações. Importação conserva relatórios `incomplete` de contraste em células fora da área horizontal visível, sem excluir regras ou declarar aprovação integral. Captura do elenco mobile inspecionada; tabelas mantêm rolagem contida. Relatórios anteriores preservados em `.preview-artifacts/a11y-admin-before-20261026/`.

- RED: `.preview-artifacts/admin-a11y-s2-first.log`, SHA256 `b8576994210c3504d358743e07a6577028b09b66cfb400fabc99f810cebad04a`.
- Composição: `.preview-artifacts/admin-a11y-s2-composition.log`, SHA256 `4445247a99dd086c7a07717a135616f084e97e928bde7ec702e3fd7253bba634`.

Próxima observação delimitada: preparação da súmula, lançamento e confirmação manual com fixtures já usadas em `tests/sheet.spec.ts`; captura/axe e navegação por teclado, sem duplicar mocks nem testes humanos. Consolidar gate/CI quando essa unidade estiver estável. A correção S2 ainda não está publicada no preview.

## Evidência histórica S1

26/10/2026. Branch codex/acessibilidade-administrativa/basec307627. Plano2026-10-26-acessibilidade-administrativa.md; somente testes/fixture, sem alteração de produto, banco ou serviços. Helperaxe extraído do teste público sem alterar tags/asserts/formato dos relatórios.

**6browsers focais PASS**: login/erro por teclado e Jogos/formulário inicial, emdesktop/mobile, mais um resultado público porprojeto para verificar o helper extraído. São8varreduras administrativas e2públicas. Zero violations/incomplete nesses estados; erro de entrada mantém foco na senha. Capturas e relatórios .preview-artifacts/a11y-admin-*.png/.json, todos com dados fictícios locais; nenhuma senha/conta real foi usada.

Log admin-a11y-s1.log SHA256 **31cceae8824e23d2f79022569566a8a1ca9fdd7e196fa39ef3f41d5ad225d82c**. ESLint/formatação focais PASS. Nenhuma falha deproduto foi observada nesses quatroestados, portanto nenhuma correção nem RED artificial foi produzida. Não éauditoria completa da administração ou WCAG. Demais32varreduras/CI515+352 e artefatos do produto inalterados mantêm evidência; não repetir gate,SQL,126harness ou deploy sópela extração do helper.

**Pendente:** ampliar o escopo para Equipes e elencos/importação, depois súmula e demais fluxos com suas próprias fixtures. Observar/capturar eventualRED antes de corrigir, conservar relatóriosincomplete e manter perguntas/testes humanos adiados pendentes. Esta amostra nova ainda não passou porCI dedicada; está em branch de trabalho, sem integraçãoàprincipal/produção.

Cota real atingiu85%usados5h ao fechar esta observação. Testes/browsers/servidores locais e cluster nativo anteriores estão encerrados. Checkpoint e exatoretomada emPROGRESSO.md; não iniciar correção/unidade/gatelongo antes da nova janela.
