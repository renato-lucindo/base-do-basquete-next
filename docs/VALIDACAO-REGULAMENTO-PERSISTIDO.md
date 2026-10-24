# Regulamento persistido — evidências

Branch `codex/regulamento-persistido`, base `5ffc8d6`/PR12 e PRdraft13. Plano2026-10-24-regulamento-persistido.md, decisão012 e ZIP preservado. Não consultar outro repositório. UI/previewG4 continuam source0166b14; esta unidade ainda não tem editor/API do regulamento no Worker.

## R3a — contratos e adaptação

Material **4b115a0bf89b1ca05b1b8e6c0b30bf348255a71f**.7novos/70focais do módulo, tipos/lint/formato PASS. Definição fechada com nomes separados de regras/referências, fases de mata-mata explícitas, versão/fingerprint/contexto autoritativo. Prévia usa somente fatos do contexto; comandos não aceitam placar/classificação/autor. Histórico exige algoritmo correspondente. Grafo topológico compartilhado mantém os casosR2c/e; não resolve dependência por nome/data.

## R3b — banco, histórico e acesso

MigrationCLI **20261024193039_dispute_regulations** aplicada/reconciliada como **20261024193855_dispute_regulations** no projeto novo `nizmasjddyrhmevvfviz`, somente vínculo `link_6adaa8aab5688191b1e7ae1cddc55a82`. Arquivo renomeado para a versão real; SHA256 **c32ebc264bf62c2b08c9b553a4c8a9199c1ba43f9262e12d70fffd4a1759acf3**. Não reaplicar. Cabeçalho atual aponta versão imutável, com definição/contexto/fingerprint/algoritmo/motivo/autor/data. Âncoras comFKs preservam inscrição/jogo/publicação histórica, inclusive jogo sem resultado removido da configuração posterior. Nenhuma tabela nova tem acesso direto poranon/authenticated/service-role; RLS defensiva e grants explícitos nosRPCs específicos, autorização fresca antes de recibo.

3cenários PostgreSQL/PGlite: zero/upgrade preservando G4 e matriz **40definições SQL×TypeScript**. RED inicial: RPC ausente antes de gerar migrationCLI. Cobrem formatos/slots/limites, objetos fechados/IDs/refs/ciclos/inscrições, contexto/fingerprint, motivo/confirmação com resultados, replay idêntico/divergente/outroautor, admin revogado, papéis/grants/RLS, histórico imutável/FKs, paginação eRecentes. Troca do operador no teste é reassociação temporária da conta única, não criação de segundo administrador; toda prova termina emrollback.

Guarda de grupo: testeRED reproduziu troca de adversário para inscrição fora do grupo aceitando gravação inconsistente. Trigger agora recusa isso comPT409 na configuração atual, mantendo permissão de edição após retirar explicitamente a atribuição. Não altera fatos nem adversários publicados; guardasG4 preservadas. FKRESTRICT foi verificada pelo nome da constraint e SQLSTATE23001 ou23503, conforme runtime, sem aceitar erro genérico como evidência.

Contrato real Supabase `regulation.sql` comG4fixture eBEGIN/ROLLBACK PASS, primeiro com prova5c8e192126cc0e757f28c4da26c7849600a91376771cceba1814d90672899f36 e depois com testes extras de outra disputa/operador. Tipos públicos gerados acrescentam somente3RPCs. Pós-rollback:0regulationHeads/versions/receipts/anchors,0games/publishedGames/objects,1pessoa/2inscrições/1Auth preservados. Advisors: sóWARN conhecido de senha vazada/Pro;10INFOFKs anteriores sem índice, nenhum novo de regulamento;31INFOíndices não usados no banco vazio, incluindo4novos — isso não prova carga/escala e não justifica remover índices dasFKs. Não houve contratação.

## Validador de chaves — complemento

Matriz ampliada reproduziu um caso em que `occurrenceRules:{}` era recusado no TypeScript mas aceito no SQL: `context_keys` retornavaNULL para objeto vazio e a negação noIF não entrava. MigrationCLI **20261024194358_context_keys_total_boolean**, aplicada/reconciliada como **20261024194626_context_keys_total_boolean**, torna o helper booleano total, preservando assinatura/ownership/grants; ausência de chave requerida agora éfalse, e um conjunto explicitamente vazio de chaves aceita apenas objeto vazio. Não editar/reaplicar migrations anteriores. SHA256 **bd352c5562c082753e9ab667c5bf1a4305a99f8e0459831da061ebc834743e06**; mudança só do corpo da função, tipos públicos inalterados.

3focaisPGlite/40definições após a correção PASS. Prova atual `.preview-artifacts/regulation-proof.sql` SHA256 **9c8b46d09776bff759faf8248562057a05a9b9005c4f61b4f122ae142cf1611d**, contrato realSupabaseBEGIN/ROLLBACK PASS após o complemento. Conferência remota confirmou required_keys_rejected=true e0heads/versions/receipts/games/published/objects;1pessoa/2inscrições/1Auth/1admin preservados.

Gate consolidado local **PASS264unit/57arquivos,5transportes,13regressõesPostgreSQL,13workerd e1prova4PDFs**, tipos/lint/format/builds/fronteira/segredos. Log `.preview-artifacts/r3-regulation-bank-gate.log` SHA256 **d90a04d342cf10ce7ef1d2607730d9ed7498dc6d4e81ac922e830d85c1dd8847**. Inclui o helper compartilhado corrigido e contratosC1/C2/C3/C4/G1/G2/G3/G4, não apenas a tabela nova. Arquivos SQL renomeados depois para versões reais sem alteração de bytes, portanto evidências preservadas. NovaCI será conferida no commit material. Sem API/UI/deploy desta unidade; não repetir suites por sessão/docs.

## Limites e próximo passo

Contratos locais/SQL não provam transporte autenticado da API nova, concorrência real multi-conexão, carga ouWCAG. Provider/SessionStore/rotas/editor/histórico visual/consulta pública de classificação e ocorrências persistidas ainda pendentes. Ao mapear409 de edição de jogo, diferenciar `regulation_group_opponents_locked` de versão antiga para orientar a revisar a atribuição; não dizer que outra aba alterou quando a causa é o grupo. Cálculo continua no backend, sem aceitar derivado enviado pelo browser. Avaliação humanaG4 e pilotoStorageHTTP real ainda não substituídos por estes testes.
