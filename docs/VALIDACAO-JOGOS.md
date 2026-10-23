# Validação de jogos — etapa4

G1 permite cadastrar partidas diretamente entre duas inscrições distintas da disputa, inclusive inscrições da mesma equipe global. Agenda opcional, data sem horário preservada sem meia-noite artificial, sem placar fictício ou publicação implícita. Banco e API administrativos, autorização fresca, RLS/grants/versões/idempotência, contexto imutável e Recentes ao salvar.

## Evidências G1

- Migration20261023192926_direct_games aplicada exclusivamente no projeto novo nizmasjddyrhmevvfviz. Contrato real supabase/tests/games.sql com rollback PASS, sem fixtures persistidas; tipos gerados. SQL de criação do zero e upgrades preservando C1–C4: seis cenários PASS.
- Gate consolidado local em23/10/2026:118 unitários/24 arquivos,5 transportes,8 workerd/DO, tipos/lint/formatação/builds/fronteira/segredos PASS. Seis cenários PostgreSQL incluídos no mesmo gate. Harness126 imutável reutilizado.
- Dez browsers G1 desktop/mobile PASS: criar/retomar/data sem hora, retry da mesma intenção/conflito explícito, reautenticação/guarda, criação contextual de inscrição com retorno preservado e foco, seleção entre páginas/buscas.38 regressões da composição C1–C4 PASS. Capturas ignoradas .preview-artifacts/jogos-desktop.png e jogos-320-mobile.png inspecionadas.
- O teste de retorno de foco falhou antes da correção e passou após o ajuste. Banco/SQL não alterados nesta correção; evidência real anterior reutilizada.

## Estado de publicação e limites

Jogos ainda não publicado: conexão oficial Cloudflare requer reautenticação humana. Preview protegido continua no importador22529ea. Smoke preparado inclui GET/api/games e GET/api/games/:id, mas ainda não executado no ambiente remoto. Não atribuir a G1 os smokes/CI do importador. CI de G1 será registrada após commit estável. Nenhuma revisão independente, carga, corrida PostgreSQL multi-conexão ou auditoria WCAG completa comprovada.

G2 participantes/súmula, G3 PDFs/fontes e G4 confirmar/publicar ainda pendentes. Não declarar etapa4 concluída por este cadastro de agenda. Nenhum dado humano foi criado/editado pelos testes.
