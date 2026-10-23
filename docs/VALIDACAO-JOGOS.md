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

## G2a — persistência de relacionados e documento

Branch codex/sumula-persistida sobre G1e43246e. Migration20261023225837_game_sheet_drafts aplicada somente no projeto novo; CLI gerou225403 e arquivo foi reconciliado com versão real225837. Contrato real game_sheet.sql com rollback PASS, dados humanos preservados: jogos/súmulas/participantes/recibosG2 zero,pessoas1,inscrições2,conferências6,Auth1. Tipos gerados. Advisor apenas aviso conhecido de senha vazada/Pro.

Oito testes focais TS PASS, incluindo comparação de335 sequências de ações entre motor e PostgreSQL (7 sequências de exclusão/propagação,208 combinações código/alvo/lado,120 sequências determinísticas). Dois cenários PostgreSQL G2 de contrato e upgradeG1 PASS; seis cenários anteriores PASS no mesmo código de migrations, sem repetir após ajuste exclusivo da expectativa do teste de naipe (a guarda anterior também pode rejeitar antes da nova). Typecheck/lint/formatação/segredos focais PASS. Sem API/UI G2 ou gate consolidado G2 ainda.

Rascunho incompleto permitido, ações exigem relacionados e participação válida. Capitão/técnico/assistente por identidade e contexto, camisas0/00 distintas e da ocasião, nomes/snapshots resolvidos pelo servidor. Troca de oponentes/naipe após súmula bloqueada; manutenção do vínculo histórico não transforma vínculo inativo em elegível para nova inclusão. Nenhuma publicação implementada por esta migration; confirm=true rejeitado. Backend Worker ainda deve integrar o adaptador e API.

CI G1 **40036191186 SUCCESS** em e43246ed541fe5ea35e621f21d4aae4e575aff01. Publicação G1 continua bloqueada por reconexão Cloudflare pendente.

## G2b — API administrativa

Provider e SessionStore validam novamente o comando/documento e executam apenas RPCs fixos. GET sem documento retorna null; POST aceita rascunho, correlaciona path/gameId e ACK/requestId/version, limite512KiB, origem de configuração. Dois testes provider RED→GREEN e dois anteriores PASS; nove workerd/DO PASS após RED da rota, com participação inválida barrada no servidor antes do RPC, sessão/origem/query/path/limites e nenhuma credencial na resposta. Typecheck/lint/format/segredos focais PASS. SQL/contrato real inalterados reutilizados, gate vertical G2 aguardando UI. Nenhuma publicação G2.

## G2c — editor integrado estável

Relacionados/comissão reais na própria área do jogo; seleção explícita/ordem0 antes00, cinco titulares por equipe na validação final, capitão-técnico sem criar comissão global e assistente apenas com técnico próprio. Entrada Camisa+Enter+Ação+Enter, atalhosAlt+A/B/Q/1–4, cores leves por quarto, ordenação e editar/excluir ação com confirmação, desfazer/refazer até50 mudanças. Preparação recolhível, retorno do elenco com foco/dados preservados, vínculo inativado não reaparece como novo candidato. Sem dado privado de pessoa na súmula.

Dez browsers focais G2 PASS e58 cenários da composição C1–C4/G1/G2 PASS, desktop/mobile; capturas de relacionados, entrada e ações em320px inspecionadas sem cortes. RED reproduzido antes da UI, depois nomes acessíveis dos selects corrigidos a partir dos novos testes. Envio incerto repete requestId,401 conserva documento em memória e409 só avança após recarga explícita; rascunho retomado após reload. Extração da fixture G1 compartilhada não alterou comportamentos, dez browsers G1 PASS.

Gate consolidado G2 PASS em23/10/2026:128 unitários/27 arquivos,5 transportes,8 cenários PostgreSQL,9 workerd, tipos/lint/formatação/builds/fronteira/segredos. Contrato real SQL G2 anterior inalterado reutilizado. Harness126 imutável não repetido localmente. CI do source G2 ainda será disparada; preview continua22529ea por OAuth Cloudflare, sem deploy/smoke remoto novos.

Limitações: sem publicação/imutabilidade confirmada/fallback nesta unidade (G4), sem PDFs/fontes (G3), sem revisão independente/carga/corrida multi-conexão/WCAG completa. Guardas/versões e testes reais não são evidência dessas verificações adicionais.

## Correção da CI G2

CI40038527019/source56a8701: gate completo PASS,90/92 browsers PASS; dois desktops expiraram no início da seleção de relacionados. Rastros baixados pelo plugin GitHub mostram helper usando locator.all antes da conclusão do GET da súmula (zero summaries), deixando detalhes fechados. Falha reproduzida localmente com120ms de latência, sem alterar comportamento da aplicação. Helper agora aguarda os dois seletores antes de enumerá-los;10 browsers focais G2 PASS com a mesma latência. Sem aumentar timeout, remover cenários ou repetir gate SQL/código inalterado. Nova CI deve confirmar o ajuste.
