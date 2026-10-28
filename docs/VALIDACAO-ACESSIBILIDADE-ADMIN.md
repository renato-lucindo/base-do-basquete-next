# Acessibilidade administrativa — observação inicial

## Continuação S2 — equipes e importador

Retomada em 26/10/2026, base d8cdd21; Git local/remoto iguais e limpos, PR23 draft MERGEABLE sem reviews, CI40297505322 SUCCESS no produto bbcda6a. Anônimo continua recebendo 302 no preview; nenhuma alteração de banco ou infraestrutura nesta unidade.

Quatro browsers novos (dois casos desktop/mobile), dez varreduras: lista de equipes, elenco expandido, entrada de texto, revisão com correspondência e confirmação. Primeiro ensaio teve **dois casos RED e dois PASS**. Regra `label-content-name-mismatch` apontou os botões visíveis “Transferir ou retornar” com nome acessível “Transferir Ana Silva/Ausente”. Causa confirmada em `src/people/workspace.tsx`; rótulo agora conserva “Transferir ou retornar” e acrescenta a pessoa. Seletores dos testes de transferência acompanham o nome completo, sem mudar dados ou operação.

**GREEN: 42 browsers de composição PASS** (`admin-accessibility`, `text-import`, `transfers`, desktop/mobile). As dezoito varreduras administrativas finais não têm violações. Importação conserva relatórios `incomplete` de contraste em células fora da área horizontal visível, sem excluir regras ou declarar aprovação integral. Captura do elenco mobile inspecionada; tabelas mantêm rolagem contida. Relatórios anteriores preservados em `.preview-artifacts/a11y-admin-before-20261026/`.

- RED: `.preview-artifacts/admin-a11y-s2-first.log`, SHA256 `b8576994210c3504d358743e07a6577028b09b66cfb400fabc99f810cebad04a`.
- Composição: `.preview-artifacts/admin-a11y-s2-composition.log`, SHA256 `4445247a99dd086c7a07717a135616f084e97e928bde7ec702e3fd7253bba634`.

Próxima observação delimitada: preparação da súmula, lançamento e confirmação manual com fixtures já usadas em `tests/sheet.spec.ts`; captura/axe e navegação por teclado, sem duplicar mocks nem testes humanos. Consolidar gate/CI quando essa unidade estiver estável. A correção S2 ainda não está publicada no preview.

## S3/S4 — súmula, PDF, ampliação e semântica

Os quatro casos novos de súmula desktop/mobile passaram na preparação, lançamento `Camisa → Enter → Ação → Enter` e conferência manual; seis varreduras. Mais quatro casos PDF passaram na seleção, revisão e preparação do suplemento; seis varreduras. Reutilizam as fixtures dos percursos existentes, sem copiar backend nem usar registros humanos. Logs `admin-a11y-s3-first.log` SHA256 `e581fe26e7ceacad32fd6c555b84749d18b2661b376a6f31c863188a2156b8bb` e `admin-a11y-s4-first.log` SHA256 `4975be9c6a28e7fa4e7b05c969049035e95bc9ee3c664430b365dea78831e628`.

A revisão dos `incomplete` encontrou `aria-label` em parágrafo do placar. Um teste específico de resultado semântico (`status` nomeado) falhou nos dois projetos; `<output>` dentro do parágrafo conserva o texto/calculado e admite o nome acessível. A verificação inicial de axe isoladamente não foi declarada suficiente para esse caso. O teste de texto ampliado também falhou: título 18 em vez de 36 px, textarea 16 em vez de 32 px. As sete medidas tipográficas fixas de competição/elenco passaram a `rem`, com valores idênticos na base de 16 px. Log RED conjunto `admin-a11y-semantics-red.log`, SHA256 `0a4de512c85c6410daa3a808002cd08366c3f6787dca353748545b3710e39d97`.

Após permitir ampliação, a nova verificação de reflow revelou overflow de 446/447 px em viewport 320: diagnóstico por retângulos localizou apenas o título “Área administrativa” e “Sair”, fora da tabela. O cabeçalho agora aceita quebra de linha e palavra longa; nenhum conteúdo foi ocultado. Log `admin-a11y-compact-layout-details.log`, SHA256 `d3ca043297ea19615bb43ee75f4ad278a7212a99f3942a7b662baaa623ee55f0`.

Dois focais finais de 320 px PASS: tamanho computado efetivamente duplica, página permanece em 320, região da tabela recebe foco e rola com seta, campo de registro distante fica focado e seu centro não fica coberto. Capturas/relatórios preservados; contraste de células fora da área visível continua registrado como `incomplete`. Log `admin-a11y-compact-second-green.log`, SHA256 `d1b6976e82eadbc8ed539ba4ea968f1eff465ad86941882ffb2fbe36bac2fbbe`. Isso comprova ampliação por CSS e esses pontos de foco, não zoom nativo, leitor de tela ou WCAG integral.

Uma primeira seleção de testes S3 usou `--grep '^axe '` e não encontrou casos porque o título completo inclui o arquivo. Foi corrigida para `--grep 'axe '` antes de executar; não é RED de produto. Gate consolidado/CI e publicação protegida desta unidade ainda precisam de resultado observado, registrado abaixo quando disponível. Revisão por autor separada da implementação; ferramenta de revisor independente não disponível nesta sessão. Nada foi integrado à principal/produção.

## Gate da unidade estável

`npm run gate` **PASS**: 515 unitários/104 arquivos, cinco transportes, treze cenários PostgreSQL, 22 workerd e prova dos quatro PDFs fornecidos; lint, formato, tipos, builds, fronteira e segredos (660 arquivos) aprovados. Log `.preview-artifacts/admin-a11y-gate.log` SHA256 `56f2af827664ec64ed10d21416645580b04d8798aea69df080e56a6a2b575846`.

Composição final focada **24 browsers PASS**, incluindo todas as novas varreduras, publicação manual, transferência 00 e amostra real aceita do importador. Log `.preview-artifacts/admin-a11y-final-composition.log` SHA256 `2f4e20d1e10f4b4b3637859baddcb363ea7be3cce629d85debaa64e52648b051`. São **32 varreduras administrativas** de dezesseis estados em dois projetos, zero violações; seis relatórios mantêm `incomplete color-contrast` em conteúdo horizontal parcialmente fora da área visível. O placar semântico não tem mais `aria-prohibited-attr`. Total da próxima CI: 370 browsers, observado em `playwright --list`; ainda não equivale ao resultado remoto.

Revisão separada do diff pelo próprio autor: nomes visíveis preservados, medidas de base equivalentes a 16 px, mudança de placar apenas semântica e cabeçalho sem ocultar conteúdo. Sem achado crítico adicional nessa revisão; não é parecer independente. Artefatos do banco/harness nativo inalterados mantêm suas provas; não foram executados novamente por sessão. Publicação protegida depende de CI remota aprovada e smokes novos.

## Histórico S1

## CI e preview protegidos — 26/10/2026

Material **03d7ed868ed9dfc945437c21a980ea8cb9990719**, PR draft **24** sobre 23. CI **40327603169/job121588250376 SUCCESS**: 515 unitários/104 arquivos e **370 browsers Linux**, além dos transportes, PostgreSQL, workerd, quatro PDFs e demais passos do gate. Log `.preview-artifacts/admin-a11y-ci-40327603169.log` SHA256 `33ec40bda879426c9a3968a52fd3a898b62d97e0be0f487c19af0aecbe216a6c`.

Publicação pelo plugin Cloudflare no Worker existente `base-do-basquete-next-preview`, conta `16b4a5e0a99a031d28051ebadb4811cc`: deployment **08840940-5c46-4add-af20-639f054c9d7c**, versão **0ab1457b-23ae-40f2-98ac-0920e655ad8b**, 100%. Manifesto dos 24 assets SHA256 `580086fb8b5efcc0becd2cc2fc10032fa8b10d06b16fd73669f37cdf516782a7`. Backend JS permaneceu idêntico ao preview anterior, SHA256 `840514f603ac4f998bd88a7a3bf87783623352aab7460fb408c2fe209e50990c`; as correções estão na apresentação.

Smokes de hashes/source, 38 GETs privados, doze POSTs, seis leituras públicas, cinco HTMLs públicos, duas sessões de navegador, health, login inválido e backend desconhecido PASS. Relatório `.preview-artifacts/admin-a11y-preview-smoke-03d7ed8.json` SHA256 `ab0ec9c308c9d9386727b73c07cac60b57bd357e7585391fbe90b95465caf369`. Não usa a senha do responsável nem comprova aceite humano ou upload Storage autenticado.

Token efêmero `fef5d023-3db4-4356-ad7d-acc2301da90c` e política `53b2b894-b5aa-425f-b1ee-94f5dc417a7e` **revogados**, ausência conferida. Credencial entregue somente como ciphertext RSA ao processo TTY, chave privada em memória; processo encerrado. Access app `556be918-42ad-44e5-a85f-c2783f65b2ba` conserva apenas política do responsável `30cc3ab4-9331-4df6-8d13-d840c2652210`; anônimo 302 depois da revogação. Previews OFF, namespace `0411ac931ca54d289d270606c7e87ef7` e nomes de secrets preservados, sem ler valores. Nenhum serviço/banco anterior consultado, DDL ou dado humano alterado. Sem processos locais ativos nas portas de teste. Gate e smokes ficam válidos para esses artefatos mesmo após novos commits documentais.

## Evidência histórica S1 preservada

26/10/2026. Branch codex/acessibilidade-administrativa/basec307627. Plano2026-10-26-acessibilidade-administrativa.md; somente testes/fixture, sem alteração de produto, banco ou serviços. Helperaxe extraído do teste público sem alterar tags/asserts/formato dos relatórios.

**6browsers focais PASS**: login/erro por teclado e Jogos/formulário inicial, emdesktop/mobile, mais um resultado público porprojeto para verificar o helper extraído. São8varreduras administrativas e2públicas. Zero violations/incomplete nesses estados; erro de entrada mantém foco na senha. Capturas e relatórios .preview-artifacts/a11y-admin-*.png/.json, todos com dados fictícios locais; nenhuma senha/conta real foi usada.

Log admin-a11y-s1.log SHA256 **31cceae8824e23d2f79022569566a8a1ca9fdd7e196fa39ef3f41d5ad225d82c**. ESLint/formatação focais PASS. Nenhuma falha deproduto foi observada nesses quatroestados, portanto nenhuma correção nem RED artificial foi produzida. Não éauditoria completa da administração ou WCAG. Demais32varreduras/CI515+352 e artefatos do produto inalterados mantêm evidência; não repetir gate,SQL,126harness ou deploy sópela extração do helper.

**Pendente:** ampliar o escopo para Equipes e elencos/importação, depois súmula e demais fluxos com suas próprias fixtures. Observar/capturar eventualRED antes de corrigir, conservar relatóriosincomplete e manter perguntas/testes humanos adiados pendentes. Esta amostra nova ainda não passou porCI dedicada; está em branch de trabalho, sem integraçãoàprincipal/produção.

Cota real atingiu85%usados5h ao fechar esta observação. Testes/browsers/servidores locais e cluster nativo anteriores estão encerrados. Checkpoint e exatoretomada emPROGRESSO.md; não iniciar correção/unidade/gatelongo antes da nova janela.
