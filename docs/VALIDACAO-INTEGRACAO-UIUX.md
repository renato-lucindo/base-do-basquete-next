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

### Conferência populada na evidência de importação

Inspeção da captura `admin-import-zoom200-after-683.png` encontrou apenas cabeçalho: o teste novo usava caracteres literais de barra invertida+n em vez de quebras de linha. A interpretação tinha zero atletas; as asserções de overflow/foco passavam sem conferir conteúdo. Isso é lacuna dafixture/teste, não defeito novo do interpretador.

Acrescentadas exigências de duas linhas e nomes reais nos campos. **RED2FAIL** porzero linhas, `.preview-artifacts/uiux-import-zoom-red.log`, SHA256 **bfa4b1b955647a0c471959dcd4b22ed0362cd561f60b9ca7a6688f3fbc819569**. Corrigida apenas entrada com `join("\n")` e espera do carregamento; **GREEN2PASS/6,4s**, log `.preview-artifacts/uiux-import-zoom-green.log`, SHA256 **8ceeec945ba375c20eec740d0c1f7a63cc2a9a528d79b76ca621332ddac3572f**. Captura inspecionada mostra Ana Silva e Ricardo Souza, com dados sintéticos, campos e rolagem horizontal. Formato/lint/diffcheckPASS. Parser/matching/produto continuam inalterados.

Este ajuste posterior somente de teste precisa deCI própria antes de atribuir aprovação aoHEAD final; gate de produto573/composto577 permanece válido para os arquivos inalterados. Manifesto preparado deb4a9209 torna-se obsoleto para identificar o novoHEAD; regenerar antes de release dafonte final.

Salvar/push da correção na mesmaPR33 e conferir novaCI integral doSHA específico. Gate573 de98a6f1c permanece válido para o código de produto inalterado; não repetir gate local por ajuste somente de teste/documentação. Depois reconciliar e integrar aUI com o bancoWIP em unidade própria, preservando ambas as histórias. Migrations49/50 continuam locais/não aplicadas; nenhum novo deploy ou serviço remoto foi alterado nesta correção.
