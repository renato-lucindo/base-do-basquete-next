# Plano — primeiro marco navegável

Especificação: README → ESCOPO → EXPERIENCIA → ARQUITETURA → CONTRATOS (domínios utilizados) → VALIDACAO, no pacote original preservado em `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022`.

Objetivo: apresentar os três percursos completos com dados fictícios e estados recuperáveis, em desktop e celular, antes da integração. Execução nesta conversa pelo agente principal, em branch de trabalho, conforme autonomia solicitada. A avaliação humana é o encerramento do marco; testes não substituem esse aceite.

## Unidades

- [x] U1 — preservar/verificar pacote, iniciar repositório independente e plano; verificar ferramentas e acessos reais.
- [x] U2 — protótipo de campeonato/disputas numa página, importação por texto com prévia editável e elencos expandidos. Arquivos: `src/competition/`, `src/prototype/`, `src/app.tsx`. Testar camisa 0/00, repetida, inválida, linha pendente e identidade ambígua; salvar não publica e visitar não muda Recentes.
- [x] U3 — espaço de PDFs: destinos diferentes, criação/associação contextual, erro isolado, duplicidade, nova tentativa, rascunho e publicação individual. Arquivos: `src/import/`. Fixture demonstrativa explicitamente simulada; integração do extrator real pertence à etapa 4. Testar revalidação de destino e falha entre sucessos.
- [x] U4 — jogo/súmula, relacionados, participação sem ações, códigos e períodos usando motor do pacote; desfazer/refazer, rascunho, conflito persistente até recarga, publicar/corrigir com motivo e prévia. Arquivos: `src/scoresheet/`, `src/domain/`. Testar conflito duas vezes e preservação da publicação anterior.
- [ ] U5 — gate consolidado, revisão, percursos desktop/celular/teclado e composições; issue e PR de apresentação, checkpoint e espera pela validação humana. Arquivos: `tests/`, `docs/VALIDACAO-PROTOTIPO.md`, `.github/workflows/`.

U5: preview remoto protegido e CI aprovados; issue #1 e PR draft #2 criados. Feedback de 22/10 da súmula aplicado conforme `docs/AJUSTES-DE-EXPERIENCIA.md`, com gate e 20 cenários de navegador aprovados. Capturas da súmula atualizadas e demais composições reutilizadas. Avaliação humana final continua pendente; não avançar à integração completa sem ela.

Antes de cada unidade e operação longa: consultar cota real. Gatilho do responsável: <=15% restante na janela de 5h. Checkpoint em `docs/PROGRESSO.md` e retomada oficial nesta conversa em reset +2 minutos; janela semanal também respeitada. Não criar agendamento enquanto não houver razão real de retomada.

## Fronteiras

`src/domain` contém apenas domínio puro selecionado do pacote, com proveniência. `src/prototype` implementa armazenamento e falhas fictícias do navegador, nunca autoridade produtiva. Telas consomem esses contratos. Sem SDK Supabase no navegador. Fundação posterior substituirá o adaptador por casos de uso no Worker com autorização, RLS, transações e idempotência reais.

Tokens: #075FCA, #FFFFFF, #172033, #F6F8FB, #EEF6FF, #D9E2EE; pilha definida no pacote, sem fonte externa. Tabelas/listas, quatro abas diretas, controles rotulados, foco, avisos de não salvo, erro associado e reflow 320px.

## Lacunas e revisão

`EXPERIENCIA.md` menciona `PROTOTIPO-E-APROVACAO.md`, ausente do ZIP; seguir a seção explícita “Primeira entrega” e registrar feedback na issue/PR. Referências finais de composição pendentes de avaliação, como previsto. Amostras reais do importador textual e escolha/custo do novo projeto Supabase serão necessárias nas etapas seguintes; não bloqueiam dados fictícios. Não foi identificada contradição impeditiva nos três percursos.

Falhas prioritárias: armazenamento indisponível (não afirmar salvo), navegação com dados não salvos (avisar), destino alterado (invalidar associações), concorrência (não reciclar versão) e erro parcial (não perder sucessos). Testes focais em cada fronteira; gate único após estabilidade, preservando evidências dos insumos inalterados.
