# Súmula desktop — execução autorizada26/10/2026

Plano aprovado na conversa: preparação automática/12vagas, desktop lado a lado, lançamento comQ4+OT nos jogadores eOT separado nas equipes, cores/contornos de faltas e histórico pesquisável. Mobile/PDF/texto fora do recorte. Branchcodex/sumula-desktop sobre03d7ed8; sem merge/produção.

## S1 — fonte administrativa e sugestão

Contrato/puro: RED por módulo ausente antes de implementar; quatro asserções finais PASS para11atletas,12entre23candidatos/0–00, papéis/última camisa sem participação de reservas, camisa ausente/conflito mantidos. ProviderRED método ausente; GREEN de DTO fechado/correlação/RPC/cabeçalho. Dois PostgreSQLRED de função ausente do zero/upgrade, depois GREEN com23candidatos, origem reorientada B→A, súmula futura salva excluída, última camisa77 distinta do cadastro00, leitura sem escrita,404/nãoadmin403/anon semEXECUTE. Composição7testes/3arquivosPASS.

Nova migration CLI20261026200307_sheet_preparation reconciliada com ledger real **20261026200550** após aplicação única; conteúdo preservado, agora46migrations imutáveis. Consulta somente leitura, limite2000atletas/200comissão por inscrição e4MiB, sem truncamento; nomes mínimos/contexto/IDs, RLS/autorização específica. Migration45 de remoção já aplicada foi trazida ao checkout para espelhar esquema, sem sua API/UI.

**Prova real BEGIN/ROLLBACK PASS**: supabase/tests/sheet_preparation.sql, somente dados sintéticosfd300000, semDML de admin_access. Usa admin existente apenas como ator; não acessa senha nem efetua login. Pós-rollback observado2jogos/1súmula/22ativos/4inscrições,0campeonatos sintéticos, dados humanos preservados. Tipos gerados do projeto real; typecheck/lint focaisPASS. WorkerdHTTPfocal1/1PASS: nova consulta privada, sessão/origem de rotas existentes preservadas, consulta indevida400/POST405/semcookie401.

Logs ignorados: desktop-preparation-red.log, desktop-preparation-db-red.log, desktop-preparation-composition.log, desktop-preparation-provider-red.log, desktop-s1-types.log, desktop-s1-lint.log, desktop-s1-worker.log, desktop-s1-http.log. Não atribuir gate consolidado/CI/preview aesta unidade ainda. Interface nova em desenvolvimento; nenhum deploy.

## Pendências

S2 tabelas/dropdowns/gate de preparação, S3 replay/projeções/filtros e browsers desktop. Gate/CI/revisão/preview/smokes apenas quando vertical estável. Provas inalteradas do harness126/SQL/nativos não se repetem por sessão; API/UI de inscrição vazia permanece em branch separada. Novos dados humanos devem ser preservados. Sem aceite humano do novo fluxo ainda.

## S2/S3 — implementação local e revisão final

Preparação única com12vagas por equipe, fonte visível, dropdown/busca/teclado/última camisa, papéis/comissão, limite de5titulares/capitão por lado para avançar e save de rascunho incompleto. Lançamento compacto com duas tabelas simultâneas, parciais separadas porOT, pontos individuaisQ4+OT/total, cinco posições de faltas e estadosGD/D/5ªfora das posições. Cor pelo quarto e contorno internoQ1/Q2 funcionam independentemente da posição. CampoEntrou na linha; primeira ação marca participação. Históricoúltimas10/checkboxquarto-equipe-tipo/paginação global, contadores do replay completo antes dos filtros, editar/excluir/undo preservados.

**20browsers desktop de composição PASS** em31,6s, incluindo cinco novos. Cobrem11atletas automáticos, mais12/seletores sem duplicados/última camisa editável, papéis/rascunho/retomada,OT1+OT2, bordas/cores/TCterceira→U2GD, participação ao lançar/reserva, filtros sobre ações antigas, sessões/conflitos/publicação/histórico. Capturas desktop inspecionadas: sheet-desktop-preparation.png, sheet-desktop-live.png e sheet-desktop-periods-fouls.png, somente fictícios/ignorados. Mobile dos casos de súmula real explicitamente adiado; as verificações novas são desktop. Não é aceite humano ou prova de WCAG completa.

**48focais/6arquivos PASS**, incluindo40de projeção/motor/ações. Staff teveRED real: fonte em modo capitão-técnico era substituída por técnico disponível; corrigido para preservar escolhas do histórico, inclusive ausência de assistente. SQL aplicado não foi alterado por isso. Typecheck/lint focaisPASS.

Gate local **PASS526unitários/108arquivos,5transportes,13PG,22workerd,quatroPDFs/builds/fronteira/segredos678** sobre materialb210d29+cherry-pick documental4ffb3f0 e formato do teste. Primeiro gate parou no formato de tests/sheet-desktop.spec.ts antes de testar; formato corrigido, log anterior preservado emdesktop-gate-format-stop.log. Gate aprovado: desktop-final-gate.log SHA256 `6c5441c8c73f292f4b1fafb92122ddf4133f5eaeeff454408b3bb8cdde385d527`. Isso é evidência local, não CI ou deploy.

Revisão separada do autor (sem ferramenta de subagente disponível): encontrou opção do próprio atleta ainda presente no dropdown, apesar da exigência de excluir todos já relacionados. Novo browserRED observado antes da correção do filtro. Focais posteriores/typecheck têm logdesktop-postreview-browsers.log/desktop-postreview-types.log; CI final precisa cobrir essa alteração de UI posterior ao gate local. Demais artefatos de backend/domínio permanecem inalterados. Não inventar parecer independente.

- Composição20: SHA256 `1511565c61af056c305b4c2ee95dc4ceff3cb0e7181d0c9c80a9b19487767bad`.
- Focais48: SHA256 `12dd038527f9da20a0b620dbbbdb4559e3005a590cff455577aac8d60dd43ad04`.
- Migration46 imutável: SHA256 `266678dd5a702fdf046df1ffe5cb78628f7fca9e9044d1fd54c2c786e4f31bfd`.
- Advisors apósDDL: sóWARN conhecido de [senha vazada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) eINFO antigos de FKs/índices sem uso; nenhuma contratação/alteração de plano.

Arquivo humano docs/boxscore/Box Score FIBA ALC vs IVV 02 junho.pdf mantido intacto; exclusão local exata em.git/info/exclude evita que prepare-foundation o trate como artefato de release ou que seja adicionado ao Git. Nenhum segredo extraído. Worker/Access reconciliados antes de deploy: ainda03d7ed8/08840940, só política do responsável/previewsOFF/DO/cofre/rate preservados. CI/pacote/preview/smoke desta unidade ainda pendentes nesta entrada.

Revisão de cronologia: novoRED real para TC emQ3 registrada antes deP emQ1 mostrou células de falta na ordem da digitação, embora contador já seguisse a cronologia do motor. Ordenação estável por período aplicada somente à projeção de células; sequência original/IDs dos lançamentos preservados. GREEN focal exigido antes de publicar. CI40397766951 em f8882e2 não cobre esse ajuste posterior; novaCI será observada, sem atribuir resultado de fonte anterior à versão final.
