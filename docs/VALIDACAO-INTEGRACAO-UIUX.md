# Integração da UI/UX desktop — 28/10/2026

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

### Composição com banco preservado

Junção explícita em branch `codex/uiux-elenco-integracao`, merge **36801c0a492ad62260eb664c56b33e548dcd7e9a**, pais75c7ad2 (banco/checkpoint) e b4a9209 (UI corrigida). Merge sem conflitos; nenhuma integração na principal ou alteração nas branches de origem. Todos os commits daUI e do banco preservados por ancestralidade. Esta branch é integraçãoWIP, não uma novaPR deUI.

Gate consolidado dessa composição **PASS/exit0:577unit/119arquivos,6transportes/13PG/23workerd/4PDFs**, builds/tipos/lint/formato/fronteira/segredos747. Log `.preview-artifacts/uiux-bank-composition-gate.log`, SHA256 **2b45dd27a4c7707b29145cf64b8ea2db31bd1a588ebd7117026a2a3016c02474**. Os40browsers focais anteriores se aplicam às mesmas telas/testes inalterados. Isso não é CI remota da composição nem prova de cópia de elenco no Supabase. Migrations49/50 continuam **não aplicadas**, fonte/writer ainda sem provider/rotas/diálogo.

Publicação deUI deverá usar a fonte daPR33 cujaCI específica aprovar, sem apresentar o reaproveitamento incompleto como funcionalidade disponível. Banco/serviços não serão alterados para publicar CSS/componentes.

Salvar/push da correção na mesmaPR33 e conferir novaCI integral doSHA específico. Gate573 de98a6f1c permanece válido para o código de produto inalterado; não repetir gate local por ajuste somente de teste/documentação. Depois reconciliar e integrar aUI com o bancoWIP em unidade própria, preservando ambas as histórias. Migrations49/50 continuam locais/não aplicadas; nenhum novo deploy ou serviço remoto foi alterado nesta correção.
