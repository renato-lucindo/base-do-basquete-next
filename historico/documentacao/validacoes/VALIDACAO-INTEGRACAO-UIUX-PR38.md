# Integração da UI/UX desktop — 28/10/2026

## Entrega final

UI publicada nafonte **1e73ae03e242d36c1f2e400e808a1bc14fdb7a0d**, CI **40681821442/job122794162129 SUCCESS**: gate573unit/117arquivos,6transportes/13PG/23workerd/4PDFs e **426browsersPASS/76SKIP**. CI intermediária40680476563/b4a9209 tambémSUCCESS426. Nenhuma mudança no código de produto depois de98a6f1c, apenas correções/evidências de teste. A referência histórica deCI pendente abaixo foi superada.

Cloudflare Workerbase-do-basquete-next-preview, deployment **1290ebc0-fedd-4d64-8c7a-e410c80e68d2**, versão **a1165841-76f1-414c-954a-904e53135db6**,100%, criado28/10/2026 11:52:23UTC.24assets/hashes/Xsource,41GETs privados/13POSTs privados/health/Auth inválido/projeções públicas/HTMLs e dois browsersPASS. Backend idêntico ao anterior, SHAdeb6fe60fb000a89c3e2dd373c93eb58369abcbcec8308c266a4fd08cd6d69d2. Nenhum dado humano ouDDL alterado. Accessownerúnico/previewsOFF/namespaces/bindings preservados. Token2f41fd8e-238a-4df5-83c8-50670d87f768/políticaa6c2aa1d-78c3-4067-841c-6029c5c02214 revogados, ausência conferida e anônimo302 após revogação.

Relatório `.preview-artifacts/uiux-smoke-report.json`, SHA256 **4c236e1e0786ad1fd81dd33fe8fef454f3399c1df250c631734e90abab380793**. LogCI `.preview-artifacts/uiux-ci-final-success.log`, SHA256 **96d6b28523da65ca16c45107144a5be0b345c1ee14b5386aa1c18ac412087f71**. Prova reproduzível de zoom nativo2PASS em `docs/evidencias/uiux-native-zoom`, logSHA **0e3956a3f6ab85e2f23d5958281673b55157d48f5163c89a09bb5bbb7f51b803**. Artefatos ignorados estão no worktree nativo, caminho registrado no checkpoint. Sem revisão independente, aceite humano ou auditoriaWCAG completa comprovados.

PR33 permaneceDraft; nenhumaPRnova deUI/mergeprincipal. Composição local com o banco preservada emcodex/uiux-elenco-integracao, gate577PASS conforme seção própria. Migrations49/50 não aplicadas, reaproveitamento direto ainda pendente. Próximo passo dessa funcionalidade está no início de `docs/PROGRESSO.md`; não repetir suítes por documentação ou retomada.

## Reconciliação da entrega externa

PRdraft33, branch `codex/ui-ux-desktop`, base `codex/reaproveitar-elenco`/260713c. Handoff externo informaHEAD98a6f1c7c0cf77548bb9fac2643b10629b20f5ca; GitHub confirmou esseHEAD ePR aberta emDraft. Produto e banco não foram alterados na conferência inicial. Checkout original continua em `codex/reaproveitar-elenco-banco`/75c7ad2; arquivos humanos `.agents/` e `skills-lock.json` preservados.

CI **40608285174/job122553191652 FAIL** sobre98a6f1c: gate com573unit/117arquivos e demais etapas aprovado; browsers425PASS/76SKIP/**1FAIL**. A falha é `scoresheet reflows at CSS widths equivalent to 200% desktop zoom`, timeout30s. Não atribuir aprovação integral daCI0099fad aos15commits posteriores. Artefato `browser-evidence`12781484123 baixado pelo plugin, ZIP/trace preservados na pasta ignorada do checkout original `.preview-artifacts/uiux-ci-98a6f1c`.

## Diagnóstico e correção focal

- Worktree nativo isolado `C:/Users/12405304716/.codex/worktrees/uiux-validation/Base do Basquete-v1`, branch existente daPR33, sem mudar o checkout do banco. Dependências pelo lockfile com `npm ci --ignore-scripts`; nenhuma instalação de biblioteca ou DDL.
- Trace mostra que `.sheet-desktop-teams.last()` seleciona o grid de lançamento montado sob `hidden` durante a preparação. Seus retângulos zerados passavam nas asserções geométricas, mas a captura esperava visibilidade até o timeout. O grid visível de preparação não era validado.
- Reprodução focal contra98a6f1c **FAIL real** no screenshot do grid oculto. Log `.preview-artifacts/uiux-zoom-red.log`, SHA256 **bcf3dc22a066bda1bdaa95fc1f2030680b0ac6c747341f067f0d5442b747bcac**.
- Correção somente no teste: selecionar `.sheet-desktop-teams:visible`, exigir exatamente um grid visível e altura positiva de cada equipe antes de testar empilhamento/overflow/captura. Não aumentar timeout, retirar verificações, mudar componente ou calcular layout a partir de elemento oculto.
- Focal posterior **1PASS/7,3s**, cenário3,4s. Log `.preview-artifacts/uiux-zoom-green.log`, SHA256 **234a4de65f9bf2f7954bdedc5371d1284abc346d8307bff892a90a91ac44caeb**.
- Composição `tests/sheet-desktop.spec.ts tests/admin-compact.spec.ts tests/competition.spec.ts tests/sheet.spec.ts --project=desktop`: **40PASS/44,4s**, log `.preview-artifacts/uiux-integration-desktop.log`, SHA256 **9aebbb4215f99fcbaf568686f5d31b0bca52862c5d3faa2bca6189ba9d84dd48**. Inclui importação rolável por teclado, edição/exclusão/modal, filtros/OT/cores/contornos, rascunhos, reautenticação/ACK/409 e histórico publicado. Formato/ESLint focal e diffcheck aprovados.
- Capturas sintéticas reais de preparação e lançamento em683/960CSSpx inspecionadas: equipes empilhadas e tabela de lançamento com overflow local. Isso valida simulação de área útil, **não zoom nativo200%**, mobile ouWCAG completa. Nenhum dado humano foi usado.

## Próximo passo

### Zoom nativo automatizado

Prova reproduzível em `docs/evidencias/uiux-native-zoom/README.md`, runner fora da suíte padrão. Fonte da composição5f9a683, frontend idêntico a1e73ae0; **2PASS/11,5s**. Usa perfil temporário Chromium, extensão local restrita a esse perfil e `tabs.setZoom/getZoom=2`. Janelas1366×768 e1920×1080 deram área útil1350×673→675×336 e1904×985→952×492, DPR1→2. Preparação/lançamento, layout, rolagem, edição por teclado e restauração do foco aprovados; não houve viewport reduzida artificialmente nessa prova.

Capturas iniciais por elemento sob zoom recortavam a área errada e não sustentam avaliação visual. Refeitas com CDP da viewport, inspecionadas e preservadas. Log intermediário `.preview-artifacts/native-zoom-viewport.log`, SHA256 **94fb6f3e02d6d5c18ee9184fec00bded11b384a0db5ec2b7de79077149077491**; runner versionado equivalente foi executado depois, sem mudança no produto. Isso complementa os testes de simulação de largura, não comprova aceite humano/WCAG integral. Extensão/fixtures nunca vão para deploy.

### Composição com banco preservado

Junção explícita em branch `codex/uiux-elenco-integracao`, merge **36801c0a492ad62260eb664c56b33e548dcd7e9a**, pais75c7ad2 (banco/checkpoint) e b4a9209 (UI corrigida). Merge sem conflitos; nenhuma integração na principal ou alteração nas branches de origem. Todos os commits daUI e do banco preservados por ancestralidade. Esta branch é integraçãoWIP, não uma novaPR deUI.

Gate consolidado dessa composição **PASS/exit0:577unit/119arquivos,6transportes/13PG/23workerd/4PDFs**, builds/tipos/lint/formato/fronteira/segredos747. Log `.preview-artifacts/uiux-bank-composition-gate.log`, SHA256 **2b45dd27a4c7707b29145cf64b8ea2db31bd1a588ebd7117026a2a3016c02474**. Os40browsers focais anteriores se aplicam às mesmas telas/testes inalterados. Isso não é CI remota da composição nem prova de cópia de elenco no Supabase. Migrations49/50 continuam **não aplicadas**, fonte/writer ainda sem provider/rotas/diálogo.

Publicação deUI deverá usar a fonte daPR33 cujaCI específica aprovar, sem apresentar o reaproveitamento incompleto como funcionalidade disponível. Banco/serviços não serão alterados para publicar CSS/componentes.

### Conferência populada na evidência de importação

Inspeção da captura `admin-import-zoom200-after-683.png` encontrou apenas cabeçalho: o teste novo usava caracteres literais de barra invertida+n em vez de quebras de linha. A interpretação tinha zero atletas; as asserções de overflow/foco passavam sem conferir conteúdo. Isso é lacuna dafixture/teste, não defeito novo do interpretador.

Acrescentadas exigências de duas linhas e nomes reais nos campos. **RED2FAIL** porzero linhas, `.preview-artifacts/uiux-import-zoom-red.log`, SHA256 **bfa4b1b955647a0c471959dcd4b22ed0362cd561f60b9ca7a6688f3fbc819569**. Corrigida apenas entrada com `join("\n")` e espera do carregamento; **GREEN2PASS/6,4s**, log `.preview-artifacts/uiux-import-zoom-green.log`, SHA256 **8ceeec945ba375c20eec740d0c1f7a63cc2a9a528d79b76ca621332ddac3572f**. Captura inspecionada mostra Ana Silva e Ricardo Souza, com dados sintéticos, campos e rolagem horizontal. Formato/lint/diffcheckPASS. Parser/matching/produto continuam inalterados.

Este ajuste posterior somente de teste precisa deCI própria antes de atribuir aprovação aoHEAD final; gate de produto573/composto577 permanece válido para os arquivos inalterados. Manifesto preparado deb4a9209 torna-se obsoleto para identificar o novoHEAD; regenerar antes de release dafonte final.

Salvar/push da correção na mesmaPR33 e conferir novaCI integral doSHA específico. Gate573 de98a6f1c permanece válido para o código de produto inalterado; não repetir gate local por ajuste somente de teste/documentação. Depois reconciliar e integrar aUI com o bancoWIP em unidade própria, preservando ambas as histórias. Migrations49/50 continuam locais/não aplicadas; nenhum novo deploy ou serviço remoto foi alterado nesta correção.
