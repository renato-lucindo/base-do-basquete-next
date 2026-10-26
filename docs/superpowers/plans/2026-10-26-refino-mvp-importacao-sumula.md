# Refino do MVP: importações e conferência da súmula

> Para execução posterior: usar superpowers:executing-plans, diagnóstico e TDD em unidades pequenas. Este documento é uma proposta de planejamento solicitada pelo responsável em26/10; não é aprovação da implementação nem evidência de correção.

**Objetivo:** fazer a importação funcionar com variações simples dos documentos/listas e tornar a conferência da súmula curta, pesquisável e informativa.

**Arquitetura:** conservar os parsers e o motor fornecidos, adaptando as fronteiras que falharam. Interpretação continua determinística, com conferência humana antes de gravar; contadores usam o mesmo motor da súmula, sem outro conjunto de regras. Filtros e apresentação não alteram os eventos salvos.

**Stack:** TypeScript/React, unpdf1.8.1, Worker/DO e Supabase atuais; sem nova dependência ou migration prevista. Mudança no banco só se um diagnóstico posterior demonstrar necessidade.

**Especificação:** ZIP preservado, docs/ESCOPO-IMPORTADOR-DE-EQUIPES.md e feedback de26/10 registrado em docs/AJUSTES-DE-EXPERIENCIA.md. Base documental d773e23/material local2475ff3, branch de planejamento codex/plano-ajustes-mvp; preview ainda03d7ed8.

## Evidência de diagnóstico — somente leitura

- `parser.ts`, `site-parser.ts` e `types.ts` de src/boxscore são iguais às versões do pacote após aplicar a mesma formatação. Os quatro PDFs preservados são idênticos byte a byte aos arquivos do ZIP. `tests/pdf-runtime.test.mjs` lê esses arquivos reais; a prova anterior é extração local em workerd/DO, não upload autenticado ponta a ponta no preview.
- Arquivo informado pelo responsável: `docs/boxscore/Box Score FIBA ALC vs IVV 02 junho.pdf`,106038bytes/SHA256 `63fd3a6271c76592b9c1b18348ff942057ccc20568d9196b1cec39bac7cc53cc`. Material humano não rastreado: preservar, não adicionar ao Git nem publicar como fixture. Renderização local inspecionada, imagem ignorada `.preview-artifacts/feedback-pdf-20261026.png`.
- Execução local de `extractSupportedPdf` reproduziu **BDB_PDF_TEAM_LARGEST_LEAD**. A métrica da equipe da direita `67 (41-108)` começa emx508.934022; o parser usa início fixo510 para a célula direita. O item inteiro entra na célula esquerda, deixando a direita sem valor. Placar visual41–108, maiores lideranças0/67. Essa falha de extração está comprovada; a mensagem/etapa exata vista no preview não foi informada, portanto não atribuir toda falha remota exclusivamente a ela.
- `parseRoster('João Silva - 12 - 193 - 1999')` retorna nome correto, camisa null e peso12, sem aviso. Com`#12`, retorna fragmento não reconhecido. O código só procura camisa no prefixo e atribui o primeiro token restante ao nome.
- Sufixos técnicos de UUID estão visíveis em equipes, seletores de confronto e destinos de importação. O estado já guarda IDs separados dos nomes; não é necessário mudar identidade para esconder código.
- A lista real em src/games/sheet-workspace.tsx renderiza todos os eventos. O motor agrega por quarto e preserva ordem original dentro do período; a sequência exibida é o índice global do lançamento. Há regra existente de TC+U gerarGD, inclusive falta compensada. Nenhuma regra disciplinar nova é necessária para o exemplo.

## Proposta de comportamento para o MVP

1. **PDF:** reconhecer as colunas pela geometria de cabeçalhos/células e pela ocupação do texto, com limites verificáveis; não remediar só trocando510 por outro número mágico. Conservar validação de totais, formato, tamanho, bytes/hash, destino e confirmação. Informar a etapa e um erro compreensível quando falhar. Separar leitura/extração, preparação, Storage, finalização e revisão no diagnóstico, sem registrar conteúdo ou credenciais. Retomar a mesma intenção após falha recuperável, sem duplicar arquivo ou resultado.
2. **Texto:** aceitar camisa antes ou depois do nome e variar a ordem dos campos reconhecíveis. Datas, kg/cm/m, posições, mão dominante, apelido entre aspas, `#12` e rótulos explícitos têm precedência sobre palpites numéricos. Nome composto continua inteiro. Camisa0 e00 são diferentes. Número sem unidade que possa ser camisa/peso/posição exige contexto; se persistir ambiguidade, destacar a célula para conferência em vez de gravar interpretação silenciosa. Cabeçalho da tabela, quando presente, é a primeira fonte da ordem das colunas. Não exigir mapeamento manual para toda lista simples.
3. **Equipes:** exibir nome da inscrição/equipe em listas, seletores, importações e súmula; remover UUID completo/abreviado usado como legenda. IDs continuam em keys/values/URLs/requests. A/B permanecem como lados do jogo. Homônimos usam contexto humano disponível — campeonato/temporada/naipe/categoria e nome global quando diferente — e seleção explícita, nunca fusão por nome. Sigla é dado esportivo, mas o rótulo principal será somente o nome.
4. **Ações:** modo inicial mostra as últimas10 ações do jogo, dez no total, mantendo número global e cores. Filtros checkbox de quarto, equipe e tipoPontos/Faltas; valores do mesmo grupo combinam porOU e grupos diferentes porE. Inicialmente todos marcados; desmarcar todos em um grupo retorna zero resultados. Alterar filtros consulta todo o histórico, não só as últimas10. Botão `Consultar histórico` permite acessar registros antigos mesmo sem restringir filtros; resultados em páginas de10, contador de encontrados e retorno explícito `Últimas10`. Separar Pontos e Faltas em duas seções da mesma consulta, sem duplicar o limite. Preservar seletor atual de ordem de lançamento/quarto, número global, edição/exclusão e acesso a prorrogações.
5. **Anotação de cada ação:** `3. Q1 - A - #25 - 2p (5)` significa placar acumulado da equipeA=5 após a cesta. `23. Q3 - B - #12 - Tc (3)` significa terceira falta desse atleta; `24. Q3 - B - #12 - U2 (GD)` indica desqualificação naquele evento. Exibir contagem completa/estado também em texto acessível, sem depender apenas da cor ou do parêntese. Lances livres exibem1p; faltas preservam código e penalidade. Banco/técnico têm rótulos próprios, sem `#B`/`#C` nem atribuição falsa a atleta. Casos de5ª falta, D e capitão-técnico seguem o motor atual.

As escolhas de duas seções, dez por página de histórico e aviso de ambiguidade são propostas reversíveis para revisão. Nenhum dado será descartado pelo limite visual.

## Restrições e revisão focal

- Não alterar o ZIP/harness, migrations aplicadas ou dados humanos. O PDF humano permanece fora do commit; a reprodução portátil usa itens sintéticos e as quatro fixtures fornecidas.
- Para executar, criar checkout/branch isolado a partir do source publicado03d7ed8 e trazer somente esta documentação, preservando a branch de inscrição vazia. A correção do MVP não deve depender de publicar2475ff3 ou levar o WIP de remoção junto. O arquivo humano pode ser lido pelo caminho absoluto do workspace original, sem copiar ao Git. O painel de remoção citado na auditoria fica para compatibilização quando sua própria unidade for integrada.
- Não introduzir serviço de IA/OCR, novo banco, novo Worker, privilégios genéricos ou dependência para este recorte. PDF digitalizado/ilegível precisa informar o limite, sem inventar extração.
- Não calcular contador sobre a lista filtrada/página visível. Reedição, exclusão, desfazer/refazer ou troca de quarto recalculam a linha temporal completa conforme regras atuais, inclusive lançamentos registrados fora de ordem de quarto.
- Não assumir que um nome identifica unicamente equipe/pessoa; não perder campos ou confirmação de homônimo ao reinterpretar.
- Preservar camisas0/00, números com vírgula, rótulos/aspas/hífens em nomes e conflitos entre nascimento/ano.
- Não esconder a ação em edição/exclusão quando filtro ou atualização mudar a janela; manter contexto/foco e mensagem de confirmação.

## Entrega1 — corrigir e comprovar a importação PDF

**Arquivos:** src/boxscore/parser.ts, extract.ts, testes extract.test.ts; criar src/boxscore/parser-layout.test.ts. Fronteiras a investigar: src/access/durable.ts, src/boxscore/storage.ts, provider.ts, upload.ts e workspace.tsx; tests/pdf-runtime.test.mjs, tests/pdf.spec.ts e fixtures controladas correspondentes.

**Interfaces:** manter `extractSupportedPdf(bytes, filename, mediaType)` e DTOs atuais. Layout produz os mesmos ParsedBoxscore; erros públicos distinguem etapas com enum restrito/mensagem segura, sem erro SQL/stack/token. Não escolher alteração de Storage sem reproduzir falha nessa camada.

- [ ] Criar RED portátil: itens posicionados derivados da fixture fornecida com célula direita começando508.934022 e texto largo; exigir mesma atribuição correta das duas equipes, sem consumir a célula vizinha. Incluir ausência real, texto separado/fundido e limite de sobreposição; preservar os valores da fixture-base.
- [ ] Corrigir apenas a associação geométrica demonstrada e obter GREEN do teste novo + extração das quatro fixtures. Executar diagnóstico local de leitura do PDF humano e conferir placar41–108/lideranças0–67 sem persistir ou publicar seus dados; registrar hash/resultado, não seu conteúdo integral.
- [ ] Na fronteira HTTP/DO, provar código de falha compreensível e distinguir erro de extração de Storage; testes de sessão antes do corpo, bytes/hash, retry e duplicidade permanecem. Se a falha vista no preview divergir da local, localizar camada e RED correspondente antes de corrigir.
- [ ] Validar fluxo completo autenticado no serviço novo com fixture autorizada, sem usar senha/token no chat nem extrair segredo do conector. Se não houver sessão autorizada disponível, deixar essa prova pendente explicitamente; mocks/SQL não contam como envio real. Não alterar Access nem depender desse bloqueio para os outros ajustes.
- [ ] Focais: `npx vitest run src/boxscore/parser-layout.test.ts src/boxscore/extract.test.ts`; runtime4PDFs somente se parser/extração alterados; browsersPDF afetados. Commit próprio e relatório com limites reais.

## Entrega2 — interpretador independente de ordem fixa

**Arquivos:** src/text-import/parse.ts, tokens.ts, parse.test.ts; table.tsx/workspace.tsx somente para sinalizar ambiguidade; tests/text-import.spec.ts e tests/fixtures/text-import.ts.

**Interfaces:** manter `parseRoster(text, makeId?) -> ParsedRoster`, origem por linha, provided/issues/decisões. Classificar tokens antes de atribuir camisa/nome; cabeçalho mapeado quando fornecido, caso contrário evidências explícitas e regras documentadas. Não alterar registro/matching sem confirmação.

- [ ] RED para `12 - João Silva - 193 - 1999`, `João Silva - 12 - 193 - 1999`, `João Silva - #12 - 193 - 1999` e permutações com1999/193; todas devem produzir mesmo nome/camisa/altura/ano nas entradas inequívocas. Incluir `Camisa:12`,0/00, altura1,93m, peso74,9kg, posiçãoSG e nome com hífen.
- [ ] RED de conflito: número isolado ambíguo, camisa duplicada, campos repetidos e data/ano divergentes geram aviso acionável; não viram peso ou posição silenciosamente. Preservar casos anteriores de João74,9 e Renato01/01/97-127-151, deixando explícita qualquer ambiguidade nova, sem perder a data/ano já resolvidos.
- [ ] Implementar classificação/revisão e GREEN focal `npx vitest run src/text-import/parse.test.ts`. Browser desktop/mobile: colar variações, conferir colunas, corrigir ambiguidade, confirmar e retomar. Focal de importação persistida só se contrato de confirmação mudar. Commit próprio.

## Entrega3 — nome da equipe sem identificador técnico

**Arquivos:** src/teams/screen.tsx, src/games/workspace.tsx, src/text-import/target-picker.tsx e src/teams/removal-panel.tsx local ainda não publicado; auditar demais rótulos de inscrição, sem apagar referências de jogo/pessoa que não sejam escopo do pedido. Testes teams.spec.ts, games.spec.ts e text-import.spec.ts.

- [ ] Reproduzir UUID abreviado visível. Remover de rótulos/legendas/acessibilidade, mantendo nomes, IDs internos e seleção contextual. Não esconder um nome de inscrição diferente do nome da equipe global.
- [ ] Focais com duas inscrições da mesma equipe, homônimos em contextos diferentes e navegação após reload: o nome fica visível, UUID não aparece como texto e o comando conserva ID correto. Commit pequeno; sem suíte SQL nova para mudança visual.

## Entrega4 — histórico compacto, filtros e contadores

**Arquivos:** src/domain/scoresheet.ts/.test.ts, src/scoresheet/actions.ts/.test.ts, src/games/sheet-workspace.tsx/.css, src/scoresheet/workspace.tsx para manter o protótipo coerente. Criar tests/sheet-action-history.spec.ts com fixture existente de sheet; ampliar review/keyboard quando necessário.

**Interfaces propostas:** `ActionProgress` tem eventId, teamPoints, playerFouls nullable e estado disciplinar aplicável; `aggregate(sheet, onAppliedEvent?)` mantém o retorno atual e oferece observação opcional somente após aplicar cada evento. `annotatedActions(sheet)` associa progresso porID à sequência global. `selectActionHistory(annotated, {mode, periods, sides, kinds, order, page})` produz items/total/page, sem mutar o documento. Um único replay cronológico gera os marcadores antes dos filtros; não chamar aggregate para cada prefixo de até2000eventos.

- [ ] RED nos exemplos exatos: cesta2 elevando equipeA para5, atletaB12 com duas faltas anteriores recebeTC como terceira eU2 provocaGD. Asserções de contagem por atleta/equipe, equipe adversária, C/B, 0/00,5ª falta, D e capitão-técnico. Testar inserção tardia emQ1 apósQ3 para manter a cronologia já usada pelo motor e sequência global da lista.
- [ ] Implementar observação compartilhada/replay e anotações sem duplicar regra de faltas; retorno agregado/validação atual deve permanecer igual. RED/GREEN de editar/excluir/desfazer/refazer/reordenar atualizando marcadores posteriores.
- [ ] RED seleção: mais de10eventos mostra só últimos10 no modo inicial; quarto/equipe/tipo pesquisam todos antes da paginação; múltiplas caixas e grupos vazios; histórico encontra ação antiga, ordem/quarto/OT e número global preservados. As duas seções somam no máximo10registros por página. Nenhum ID de ação perdido.
- [ ] Integrar controles em fieldsets/legend, contagem de resultados, vazios, páginas e retorno; foco permanece na camisa após novo lançamento e na operação atual durante edição. Filtros não mudam atalho de entrada nem rascunho salvo. Browser desktop/mobile320/teclado com ações antigas, filtros combinados e correção em resultado publicado exigindo revisão normal.
- [ ] Focais: `npx vitest run src/domain/scoresheet.test.ts src/scoresheet/actions.test.ts`; `npx playwright test tests/sheet-action-history.spec.ts tests/scoresheet-keyboard.spec.ts tests/scoresheet-review.spec.ts tests/sheet.spec.ts`. Commit de domínio e commit de UI se separação facilitar revisão.

## Fechamento e continuidade

- [ ] Durante planejamento, só documentos; não rodar gate global nem publicar. Inscrição vazia local continua aguardando gate/CI/deploy; decidir composição da release após este plano ser revisto, sem publicar WIP silenciosamente.
- [ ] Por entrega, focais afetados; gate consolidado uma vez quando unidade vertical estiver estável, CI e review do diff, depois novo manifesto do HEAD limpo e preview existente com proteção intacta/smokes/revogação. Guardar fonte/hash/evidência por artefato, sem repetir harness126/SQL/nativos inalterados.
- [ ] Atualizar PROGRESSO, validação e lista de testes humanos apenas do que efetivamente for publicado. Não marcar falha PDF ou aceite humano como resolvidos só por diagnóstico local.
- [ ] Consultar cota real entre unidades/antes de longas; aos85% usados5h, só mínima consistência/checkpoint/push e mesma automação reset efetivo+2min. Preservar custos/acessos atuais e segredos.

Revisão do plano feita pelo autor: PDF humano não é fixtureCI; ausência/colisão não pode virar0; parser existente não implica integração remota comprovada; limites de lista não são perda de histórico; nomes não substituem identidade; contadores não dependem do filtro. Não há parecer independente atribuído.
