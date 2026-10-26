# Súmula desktop — execução autorizada26/10/2026

Plano aprovado na conversa: preparação automática/12vagas, desktop lado a lado, lançamento comQ4+OT nos jogadores eOT separado nas equipes, cores/contornos de faltas e histórico pesquisável. Mobile/PDF/texto fora do recorte. Branchcodex/sumula-desktop sobre03d7ed8; sem merge/produção.

## S1 — fonte administrativa e sugestão

Contrato/puro: RED por módulo ausente antes de implementar; quatro asserções finais PASS para11atletas,12entre23candidatos/0–00, papéis/última camisa sem participação de reservas, camisa ausente/conflito mantidos. ProviderRED método ausente; GREEN de DTO fechado/correlação/RPC/cabeçalho. Dois PostgreSQLRED de função ausente do zero/upgrade, depois GREEN com23candidatos, origem reorientada B→A, súmula futura salva excluída, última camisa77 distinta do cadastro00, leitura sem escrita,404/nãoadmin403/anon semEXECUTE. Composição7testes/3arquivosPASS.

Nova migration CLI20261026200307_sheet_preparation reconciliada com ledger real **20261026200550** após aplicação única; conteúdo preservado, agora46migrations imutáveis. Consulta somente leitura, limite2000atletas/200comissão por inscrição e4MiB, sem truncamento; nomes mínimos/contexto/IDs, RLS/autorização específica. Migration45 de remoção já aplicada foi trazida ao checkout para espelhar esquema, sem sua API/UI.

**Prova real BEGIN/ROLLBACK PASS**: supabase/tests/sheet_preparation.sql, somente dados sintéticosfd300000, semDML de admin_access. Usa admin existente apenas como ator; não acessa senha nem efetua login. Pós-rollback observado2jogos/1súmula/22ativos/4inscrições,0campeonatos sintéticos, dados humanos preservados. Tipos gerados do projeto real; typecheck/lint focaisPASS. WorkerdHTTPfocal1/1PASS: nova consulta privada, sessão/origem de rotas existentes preservadas, consulta indevida400/POST405/semcookie401.

Logs ignorados: desktop-preparation-red.log, desktop-preparation-db-red.log, desktop-preparation-composition.log, desktop-preparation-provider-red.log, desktop-s1-types.log, desktop-s1-lint.log, desktop-s1-worker.log, desktop-s1-http.log. Não atribuir gate consolidado/CI/preview aesta unidade ainda. Interface nova em desenvolvimento; nenhum deploy.

## Pendências

S2 tabelas/dropdowns/gate de preparação, S3 replay/projeções/filtros e browsers desktop. Gate/CI/revisão/preview/smokes apenas quando vertical estável. Provas inalteradas do harness126/SQL/nativos não se repetem por sessão; API/UI de inscrição vazia permanece em branch separada. Novos dados humanos devem ser preservados. Sem aceite humano do novo fluxo ainda.
