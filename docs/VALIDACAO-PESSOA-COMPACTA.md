# Pessoa, camisa e formulários compactos

27/10/2026, branch `codex/pessoa-camisa-compacta`, base3936e2b. Feedback humano explícito após rejeitar o piloto: expor campos, diminuir largura dos curtos e incorporar camisa a Editar pessoa. Skill web-design-guidelines consultada com fonte oficial atual; continuidade/TDD/plano/verificação aplicados. Nenhum schema, migration, motor disciplinar, parser ou perfil público alterado. `.agents/`/`skills-lock.json` humanos preservados.

## Composição e comportamento

- `PersonFields` mantém todos os campos expostos, com grupos privados identificados, nomes largos, altura/peso curtos na mesma linha e biografia com duas linhas. Cadastro de atleta/pessoa/técnico usa a mesma composição. Diálogo até960px, conteúdo pode rolar quando necessário sem altura fixa que esconda erros. Botões de salvar/cancelar compartilham a barra de ações.
- Editar pessoa de atleta ativo mostra camisa0/00/null da inscrição atual. Botão isolado Editar camisa removido. Vínculos encerrados não fornecem camisa editável, e a camisa da ocasião não é reatribuída em jogos passados.
- Contratos existentes de pessoa e vínculo preservados; dois comandos separados quando ambos mudam. Ambos são validados antes do primeiro envio. Alteração sóda camisa não incrementa pessoa. Inclusão implícita de papel atleta/técnico ainda exige salvar a pessoa, mesmo sem outra digitação.
- ACKs por comando guardados em memória. Falha parcial informa dados globais já salvos, congela intenção e permite repetir etapa pendente ou recarregar dados atuais; não promete transação atômica entre as duas RPCs. ACK conhecido seguido de GET falho repete apenas leitura. Versão/conflito/homônimo e reautenticação mantêm guardas existentes.
- Editor de equipe global usa nome largo e sigla curta lado a lado. Demais áreas do piloto não foram expandidas sem avaliação humana; mobile/PDF/parser/público continuam adiados.

## RED e diagnósticos

- Dois cenários desktop iniciais recusaram o botão isolado de camisa ainda presente. Depois a asserção de nome acessível revelou que o contexto dentro do label mudava “Camisa”; rótulo associado porhtmlFor e contexto separado poraria-describedby corrigiram.
- RED de viewport mostrou salvar abaixo da área visível em1366×768. Reduzidas margens/duplicações visuais e reunidas ações, com rótulos e foco preservados. Capturas1366×768 e1920×1080 inspecionadas.
- Sigla larga em RED revelou precedência da regra de duas colunas iguais no piloto; seletor específico preserva campo curto160px. Sem ocultar conteúdo com overflow artificial.
- Primeira composição31teve27PASS/4FAIL: regressão real na inclusão implícita de técnico (otimização de não salvar dados inalterados ignorava papel acrescentado automaticamente), corrigida com estado de alteração de papel; duas falhas eram fixture histórica inserida no teste errado, corrigida sem mudar produto; última era sigla afetada pela regra CSS descrita. Não atribuir PASS à primeira execução.

## Evidências finais focais

- **31desktopPASS em36,8s**: pessoas/equipes/a11y administrativo/locais/súmula desktop, `.preview-artifacts/person-final-composition.log`, SHA256 **aa177cbbb90991e9a5bbb3c86c8ce89366069c4fa26da1370d902c8e899aa31e**.
- **1focal reautenticação entre as duas operações PASS em14s**, `.preview-artifacts/person-combined-reauth.log`, SHA256 **c12d6025789bf94761131f073890d5aef612a8e5f38525d96280367d6d7e6e69**. POST global único, mesmo comando da camisa após login.
- Falha transitória de vínculo→ACK conhecido→GET falho e camisa duplicada→recarregar foram aprovados; preservam0/00, pessoa sem novo incremento e histórico fictício com camisa23 inalterado. Dois cenários1366/1920 verificam campos visíveis, largura da altura<200px, altura/peso alinhados e ações na viewport. Axe focal aprovado, sem declarar WCAG completa.
- Tipos e lint focais PASS. Gate consolidado **PASS/exit0**:560unit/115arquivos,6transportes/13PG/23workerd/4PDFs, builds/tipos/fronteira/segredos726. Log `.preview-artifacts/person-compact-final-gate.log`; CI e preview novos pendentes ao encerrar a implementação local. Não repetir prova nativa/contratos remotos por mudança de apresentação; nenhum dado humano foi usado para mutações de teste.

## Gate e CI

Gate local SHA256 **e3ddebcd17daf38300aeb8477c92072faf718af95b3d4ea77d44e2cf0e915797**. Fonte de produto3edac57cedd86d6cbd3ef600a755a8c03876fa8f. CI40498501428/job122169938681 teve gate aprovado, mas browsers393PASS/1FAIL/54SKIP: teste de camisa usava `toContainText("0")`, que também aceitava a linha antiga com00 antes do POST terminar. Estado da fixture era inspecionado prematuramente; não houve falha observada do salvamento da aplicação.

Teste agora aguarda confirmação “Pessoa salva.” e célula exatamente0; atraso simulado250ms no POST de camisa. **6/6focais repetidos PASS em28s**, SHA25668d112b268572c659f89d8a4d9fdb10a8e95f73b26852ac31aa4b9a3eb3d9417, log `.preview-artifacts/person-ci-race-focus.log`. Lint focal aprovado. Nenhum código de produto mudou depois do gate; reutilizar560/SQL/workerd/artefatos. CI final posterior deve ser reconciliada antes do deploy; não atribuir aprovação integral ao primeiro run.
