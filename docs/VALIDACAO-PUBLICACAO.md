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
