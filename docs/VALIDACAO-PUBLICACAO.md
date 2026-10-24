# Evidências de confirmação/publicação — G4

## P1a fechamento e fatos manuais

Migration20261024043153_final_sheet_facts aplicada apenas em nizmasjddyrhmevvfviz/vínculo autorizado; CLI gerou042902, reconciliada com histórico043153. Validador de rascunho agora delega a um único cálculo SQL de fatos, e helper final acrescenta OT/LL/capitães/cinco titulares. Helpers privados sem EXECUTE para anon/authenticated/service_role. Nenhuma projeção pública ou operação de publicação criada por esta unidade.

6 focais TS PASS:4 contratos/derivação/motivos/identidade,1 comparação SQL/TS com81 cenários finais,1 regressão335 cenários do motor de rascunho/propagação.11 cenários PostgreSQL criação/upgrade PASS. publication_final.sql e game_sheet.sql reais Supabase com rollback PASS após o refactor, inclusive papéis/grants. Types gerados (sem delta semântico após formatação),types/lint/format/segredos focais PASS. Builds/browsers/HTTP G3 inalterados reutilizados; sem novo gate completo por esta fundação ainda sem API/UI.

Pós-rollback: jogos/súmulas/fontes/revisõesPDF/elencos/objetosStorage0,pessoas1,inscrições2,Auth1 preservados. Advisor só WARN conhecido de senha vazada/Pro, sem contratação. Sem revisão independente/carga/corrida multi-conexão/WCAG completa. Motivos e composição imutável têm contrato TS, a guarda SQL definitiva virá com P1b e não está declarada implementada aqui.

Próximo P1b: escritor atômico da súmula confirmada, snapshot público mínimo, histórico/receipts/grants e guarda de revisão. DepoisPDF/domínios/suplementos/API/UI/consulta mínima. Etapa4 permanece em andamento.

## P1b transação e projeção manual

Migration20261024044610_manual_game_publication aplicada/reconciliada somente no projeto novo. Projeção pública mínima por jogo, histórico privado imutável com FKs de identidade, recibos idempotentes e escritor atômico. Admin fresco antes de replay, versões sob locks, guarda de camisas/relacionados confirmados e motivo também no salvamento. Participação corrigível; salvar não altera a versão pública. PDF associado exige fallback manual explícito e motivo. Leitor anônimo somente da projeção publicada, nunca documento/autor/motivo/campos privados.

publication.sql observado RED antes da DDL; PASS local e Supabase real com rollback: primeira publicação, correção, replay/resposta perdida, duas tentativas antigas, ator revogado, RLS/grants, privacidade, identidade, participação, motivo inclusive somente espaços/quebras e falha forçada depois do salvamento com rollback integral/retry. Upgrade preserva draft anterior.13 cenários PostgreSQL locais aprovados nas execuções focais/composição. Contrato TS confere projeção SQL e versão anterior. Dois focais PostgreSQL×TS novamente PASS em24/10 01:51UTC-03,3.09s. Types gerados, lint/types/segredos focais aprovados.

Primeiro gate encontrou somente timeout padrão5s nos dois testes novos PGlite sob paralelismo; isolados verdes. Orçamento20s alinhado aos testes existentes. Gate consolidado foi executado novamente; saída final não recuperável após compactação, portanto NÃO atribuir PASS a ele. CI do commit material deverá resolver essa evidência antes de deploy. Evidências G3/harness126 inalteradas reutilizadas, sem alegar nova revisão independente/carga/corrida multi-conexão/WCAG completa.

Pós-rollback real: jogos/súmulas/fontes/revisõesPDF/elencos/publicações/versões/recibos/objetosStorage0, pessoas1, inscrições2, Auth/admin1. Advisor permanece somente aviso conhecido de senha vazada/Pro, sem contratação. Nenhum resultado humano publicado. API/UI de publicação e autoridade PDF ainda pendentes; preview segue G3f2d634b.

## Reconciliação da CI em24/10 05:55UTC-03

CI40064059180/job120783464167 falhou no transporte PDF, após161unitários/38arquivos,5transportes,13PG e builds verdes;10/11workerd. Retry do upload duplicado retornou503 em30s. Localmente o caso inalterado passou5vezes; não foi reproduzido no Windows. O stub outbound respondia409 sem ler o corpo da segunda tentativa. Correção focal do simulador: consumir/verificar os bytes também no duplicado, e incluir endpoints seguros na mensagem de falha. Nenhum timeout da aplicação aumentado nem erro ocultado.11workerd locais PASS6.56s após ajuste. NovaCI necessária para confirmar no Linux; sucesso posterior não prova por si só causalidade exclusiva da falha anterior. Sem novo deploy/migration.

## P2a comparação e seleção explícita

Adaptador UUID do comparator fornecido, cópia comparator-reference.ts apenas formatada; dicionário compartilhado preserva identidades completas em resultados/diagnósticos. Comparação não deduz cobertura ausente, inversão é explícita, camisa divergente não troca identidade. Suplemento exige uma escolha de participação/titular/capitão para cada linha associada; cinco titulares/capitão por lado, comissão e regras técnico-capitão. Evidência real de participação impede marcar DNP, minuto zero permanece desconhecido na fonte Site. Não cria quartos ou resolve identidade por similaridade.8 testes RED→GREEN, types/lint PASS. Unidade pura, sem nova DDL/API/UI/deploy. Checagem atual da CI40079689771 confirma gate SUCCESS no fb3476f; browsers ainda em andamento. Não atribuir essa CI ao código P2a posterior.

## P2b autoridade por domínio (preparação pura)

CI40079689771/job120830458062 SUCCESS integral no fb3476f, gate161unit/38arquivos,5transportes,13PG,11workerd e prova4PDFs mais browsers Linux. Resolve a evidência consolidada P1 pendente; alteração do simulador aprovada no Linux, sem alegar causalidade exclusiva.

P2b oferece escolha explícita scorePoints/periodScores/playerAdvanced/foulsReceived/teamAdvanced/gameAdvanced. Site não ganha períodos, FR ou blocos inexistentes. Pontos oficiais e advanced_points podem divergir somente com fallback e aceite/motivo explícitos; mesma composição/participações contextualizadas antes de combinar. Marcadores/participação suplementares têm origem própria, nunca atribuídos ao PDF. Tempo do relatório não vira tempo em quadra. Tentativa de combinar linha relacionada ausente em outra fonte reproduziu acesso a undefined e foi corrigida por validação prévia de composição, sem inventar zeros.5 novos testes RED→GREEN com fixtures reais Site/FIBA,17 focais da composição PASS, types/lint/segredos PASS. Refactor do cálculo manual reutiliza função pura e mantém evidência SQL×TS81cenários focal. Não há writer SQL PDF/API/UI/novo deploy nesta unidade.
