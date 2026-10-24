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

## P2c1 derivação privada SQL

Migration20261024090443_pdf_publication_facts aplicada/reconciliada somente no projeto novo (CLI090142). Helper privado sem grants anon/authenticated/service_role calcula a partir de original/revisão/suplemento/autoridade. Nenhum writer PDF ou nova permissão pública criado. Concordância SQL×TS dos4PDFs×2orientações,15casos inválidos e mistura manual com aceite/rejeição de divergência: PASS local.19focais da composição PASS. Contradição FIBA NJ com fatos positivos reproduzida RED e bloqueada na seleção, sem deixar marcador ocultar participação real.

Prova real no Supabase com BEGIN/ROLLBACK:8 combinações dos4PDFs/orientações e grants PASS. Artefato regenerável via BDB_EXPORT_PDF_FACTS_PROOF=1 no teste pdf-authority-database, caminho ignorado .preview-artifacts/pdf-facts-proof.sql, SHA25625ba039e94d2cf4bc960118eb0fd9496586bf5cd64346cca65a46adf5d5995a8. Nenhum byte foi enviado a Storage e nenhum dado de negócio persistido por essa prova; não equivale à publicação real. Pós-rollback jogos/súmulas/fontes/revisões/publicações/versões/objetos0,pessoas1,inscrições2,Auth1; advisor só WARN conhecido. Schema público/tipos inalterados. Gate novo somente após integração da vertical estável; CI161/browsers do fb3476f continua evidência P1, não deste helper novo.

## P2c2 origem tipada

Migrations20261024090756_publication_typed_origins e20261024090900_publication_origin_index aplicadas/reconciliadas; CLI090704/090847. Registro tipado privado com FKs reais e jogo imutável substitui FK exclusiva de súmula sem reescrever versões. Teste de upgrade com versões manuais previamente publicadas compara histórico inteiro antes/depois, nova revisão manual, FK PDF existente/ausente, segundo jogo recusado, update/delete/grants bloqueados e rollback.2 focais PostgreSQL PASS, incluindo projeção manual anterior. publication.sql+publication_origins.sql reais com rollback PASS; índice novo conferido diretamente no schema real. Source PDF nesse teste é fixture de FK/metadados, não prova de bytes/fatos/publicação PDF.

Advisor segurança só aviso conhecido. Performance detectou FK nova sem índice cobrindo, teste RED antes de migration complementar, focal GREEN depois. Novo aviso eliminado; permanecem10 INFO de FKs anteriores e27 INFO índices sem uso em banco vazio, sem alegar escala nem excluir índices por essa observação. Pós-rollback jogos/sheets/fontes/revisões/publicações/versões/origens/objetos0,pessoas1,inscrições2,Auth1 preservados. Público/tipos/preview inalterados; sem writer PDF ainda.

## P2c3 escritor PDF e projeções

Migration20261024092328_pdf_game_publication aplicada/reconciliada (CLI091621) no projeto novo. Escritor recebe IDs/tokens/decisões, lê original pronto e revisão persistida sob recurso→raízes ordenadas→jogo, deriva no SQL, valida membros/naipe/comissão e preserva nomes históricos. Confirmação/projeção/histórico/entries/origem tipada/recibo/agenda são uma transação por jogo. Verifica metadados do original imutável, sem afirmar prova de bytes por essa checagem SQL. Review posterior exige motivo e mantém destino publicado; saver substituído in-place, sem caminho alternativo.

Composição manual+PDF congela o documento manual usado no histórico e possui FK tipada secundária, RLS/grants privados e imutabilidade. Isso evita depender do próximo rascunho mutável para recuperar a origem de advanced_points ou pontos oficiais anteriores. DTO público PDF estrito/union mantém manual anterior e remove source IDs, hashes, paths e campos de associação internos. Capacidades ausentes permanecem null; origem de domínio é explícita.

Testes RED→GREEN: primeira publicação/republicação/replay/resposta perdida/ator revogado/versões antigas/motivo/metadata/falha injetada/rollback/revisão sem publicar/destino fixo. Mistura oficial3 versus advanced2 com aceite/motivo e documento manual congelado. Quatro relatórios reais publicados em PostgreSQL descartável com DTO público validado, incluindo número divergente FIBA rejeitado antes de aceite explícito.2contratos DTO e2cenáriosPG, mais5regressõesPG G3/G4 PASS. pdf_publication.sql real Supabase com rollback PASS. Tipos gerados; advisor segurança só aviso conhecido; contagens pós-rollback jogos/sheets/fontes/revisões/publicações/versões/origens/secondary/objetos0,pessoas1,inscrições2,Auth1 preservadas.

Gate consolidado local **PASS181unitários/45arquivos,5transportes,13cenáriosPG,11workerd e1prova4PDFs**, lint/format/tipos/builds/fronteira/segredos. Saída completa preservada em .preview-artifacts/g4-db-gate.log; não repetir por sessão. CI do commit material ainda será conferida. API/UI de confirmar/publicar e consulta mínima ainda não conectadas; nenhum novo deploy. Piloto StorageHTTP autenticado/humano, revisão independente/carga/corrida multi-conexão/WCAG completa não comprovados. Etapa4 incompleta.

## P3a provider e HTTP

Migration20261024093639_publication_read_state aplicada/reconciliada (CLI092945); reader administrativo agora correlaciona gameId e informa somente requiresFallback, sem PDF privado no indicador. Contrato real publication+publication_read_state em rollback PASS, advisor segurança só conhecido, contagens preservadas.

Provider fixo para estado/histórico/publicar manual/PDF e consulta pública,6 testes RED→GREEN com ACKs/tokens/contextos/limites/motivos/conflitos/erros sanitizados. Consulta pública usa somente chave publicável no servidor e seu RPC/projeção; falha de configuração pública não expira sessão humana. Novos métodos SessionStore executam dentro de fresh runAuthorized, rotas específicas com IDs/origem/tamanho/esquemas. Dois novos cenários workerd RED→GREEN cobrem pós-commit503/retry mesmo comando, origem,correlação,524288/65536bytes,revogação antes de RPC,consulta anônima sem JWT/cookie/admin/draft e projeção inválida. Outbound controlado não substitui HTTP real.

Gate consolidado API **PASS187unit/46arquivos,5transportes,13PG,13workerd e prova4PDFs**, tipos/lint/format/builds/fronteira/segredos. Log .preview-artifacts/g4-api-gate.log preservado. Primeira tentativa falhou por uma asserção de reader novo executada antes da migration em teste de upgrade; asserção movida para contrato pós-upgrade próprio, preservando fixture histórica. Focais origem/projeção verdes antes do gate final. CI40082023804/job120837362377 SUCCESS integral no código de banco68bf4c6; não atribuir ao API posterior. Nenhuma interface nova/deploy nesta unidade.
