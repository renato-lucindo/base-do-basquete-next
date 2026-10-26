# Perfil confirmado — evidências

## Gate da vertical — 26/10/2026 00:01UTC-03

Gate consolidado final **PASS**:473unitários/97arquivos,5transportes,13cenários PostgreSQL,20workerd,prova real do runtime com4PDFs,lint/formato/tipos app/Worker/builds/fronteira/segredos601. Log .preview-artifacts/profile-p4-gate.log SHA256 **3d1e9b7275ae440f905fd0f10830384e7515d32ba6f6c6695efae2e94a555c2f**. Sódocumentação posterior a esse gate. CI/preview da vertical ainda pendentes; não atribuir CI estatístico ao perfil. Sem repetir gate por atualização documental.

## P4b2/P4c — vertical local, 25/10/2026 23:59UTC-03

Página atleta.html com cinco seções, URL por identidade, filtros públicos de campeonato/temporada/disputa, modos/escopos e paginações independentes. Nenhuma consulta ao cadastro privado pelo browser; DTO validado/correlacionado no recebimento, resposta antiga abortada/recusada, inválida não mostra fonte. Somente metadados explicitamente confirmados são opcionais do perfil; nomes/camisas/equipes/datas nas linhas são da ocasião. Sem horários ou equipe atual inferidos. Conquistas separam destinatário individual e colocação contextual de equipe. Links estáveis por pessoa em resultados/estatísticas; entrada/allowlist/smoke preparados, ainda sem deploy.

RED público por página ausente, RED dos links ausentes e do detalhe privado observados. Primeira composição pública8/12: foco era consumido no render sem novo título; corrigido para esperar resposta atual e commit DOM, sem temporizador. Outros dois casos usavam getByLabel com label contendo select/opções; consulta por role/nome acessível corrigiu o teste. GREEN12/12 desktop/mobile. Composição posterior **60/60 browsers PASS**, inclui resultados/estatísticas/painel, duas abas com409 preservando motivo, histórico privado25→20+5 e snapshot da confirmação1 sem substituir proposta25. Log profile-p4-composition.log SHA256 **f39407ebf4664a7a29974925b66e46d2edfb28cb5e665895b13e595f8781a6b1**. Caso adicional RED revelou mensagem de resumo incorreta para DNP; correção e2focais desktop/mobile PASS em profile-dnp-green.log. Não atribuir composição60 ao texto posterior; CI consolidará a vertical.

Captura .preview-artifacts/player-public-320-mobile.png inspecionada: controles, navegação e valores cabem em320px, sem overflow global; tabelas longas têm região rolável focável. Tipos app/Worker e lint focais PASS. Banco reconciliado43migrations/última20261025221911,1pessoa/1Auth/0perfis/0participações públicas, sem novaDDL. Primeiro SELECT de contagem usou nome de tabela inexistente e falhou sem mutação; leitura corrigida persons reconfirmou o estado. Cloudflare deployment316098d6/versão23bfec3d e Access sóresponsável inalterados, sem token temporário novo.

Self-review da integração cobre campos opcionais, aliases/linhagem, DNP/zero, mínimos/fases, paginação sem reduzir totais, resposta obsoleta, ACK conhecido e foco. Sem revisor independente disponível; não equivale a parecer externo. Gate/CI vertical ainda a executar. Aceites humanos e piloto StorageHTTP permanecem pendentes; não repetir testes humanos adiados.

## P4c1 — paginação pública independente, 25/10/2026 23:48UTC-03

RED observado: histórico com25inscrições retornava25em vez de5na segunda página. Query historyPage e metadados historyPagination separados da página dos jogos;20por página, clamp e ordem determinística por IDs após ano/nome. Totais continuam sobre toda a fonte selecionada, sem depender de nenhuma página. GREEN19focais domínio/provider/carreira e tipos app/Worker PASS. Logs profile-p4c-pagination-red.log e profile-p4c-pagination-green.log em .preview-artifacts. Não altera SQL/serviços nem reaplica migrations. Reutilizar provas anteriores inalteradas; gate consolidado após vertical estável.

## P4b1 — painel administrativo local, 25/10/2026

Ação Perfil público na linha do atleta, inclusive vínculo histórico, abre conferência dos metadados salvos; guard próprio preserva motivo/envio durante navegação e reautenticação. Campos públicos são apresentados explicitamente, sem nascimento completo/sexo/registro; revisão exige motivo. Comando sóreferencia versões/identidade. ACK incerto mantém comando congelado; ACK conhecido com falha de leitura repete sóGET;409 preserva motivo e exige atualização/conferência. Link público sódepois de existir confirmação. Hook de foco roda após commit para cabeçalho/status/checkbox e retorno ao elenco.

RED browser por ação ausente, depois **10focais desktop/mobile PASS**, SHA256 **90e88740b6b644a3885872d5f927c2dc45a9d5948971a315eec2c370287baf15**. Composição com cadastro de pessoas e transferências **38browsers PASS**, SHA256 **167b1d4f0848962943d4c7265d011ec37c98d96f1ba9cbf1155c02cc8214f8b5**. Inclui reabrir, nenhuma propriedade person no comando, source409, reauth, perda deACK/GET e guarda/reflow320. Screenshot móvel inspecionada, SHA256 **3766a804a2de0fa1f80dbc7e74ac9f91396ac37ecee805bd132503af11b6b163**; sem overflow horizontal. Tipos app/Worker, lint/formato/buildfoundation/fronteira PASS após as alterações finais. Sem gate global novo por unidade local ainda sem página pública.

Fora do que foi provado: duas abas do painel de perfil real, detalhe visual de snapshots anteriores e paginação longa do painel ainda precisam casos próprios. Não confundir com os testes de duas abas de transferências já presentes na composição. Histórico do perfil público também precisa paginação independente em P3/P4c; a fonte completa permanece preservada e totais não podem depender da página.

Página atleta.html e links de resultados/estatísticas ainda ausentes. Portanto o link do painel é contrato da integração futura, NÃO motivo para publicar este build isolado. Preview segue e00ba15 estatístico, sem novo deploy/CI/DDL/credencial. Manifesto e payload e00ba15 preservam a prova do preview antigo; dist/Worker locais játêm alterações posteriores, regenerar manifesto de fonte limpa/gate/CI verificadas na futura publicação. Aceites humanos permanecem pendentes.

## P4a — API/Worker local, 25/10/2026

Provider específico para leitura pública, workspace administrativo/histórico e confirmação. Somente UUID entra na RPC pública; backend valida toda a fonte e produz a página, sem JWT/cookie/SDK no browser ou documento bruto de carreira no retorno. Corpo de resposta stream limitado5MiB, timeout8s, excesso413/limitação429 explícitos, erros técnicos sanitizados. Comando privado validado/correlacionado sem GET antes da mutação; workspace recusa leitura inconsistente entre pessoa e publicação, ACK precisa corresponder ao comando original.

Rotas privadas /api/people/:id/profile e /versions/:n usam SessionStore/runAuthorized e authfresh antes de ler o corpo, origem/tamanho/contexto fechados. Pública /api/public/players/:id independente da sessão app, sem limpar cookie inválido administrativo. Nenhuma mudança de namespace/cofre/configuração externa. Rota nova permanece excluída do projeto TS de browser e verificada no projeto Worker; erro inicial Env no projeto de browser corrigido nesse limite, sem declarar Env manualmente.

RED workerd público404/privado400 antes das rotas; GREEN2focais e **20cenários workerd de composição PASS** após integração, SHA256 **7a92824f4c8f94cb685c2989ba2d2472fcf95407256fea8766feb560e5376743**. Inclui ACK perdido/replay, ACK conhecido+GET falho sem novoPOST, origem e identidade divergente, administrador revogado antes de JSON inválido, públicos400/404/405/414 e ausência de Auth no provedor. **23unitários/4arquivos PASS**, SHA256 **af742c72814e6196f4db4be666a526eb31dc1521c9b66d83ba7928f1c6b759f1**; tipos app/Worker/lint/buildWorkerPASS. Fixture JSON própria extraída da transação sintética járevertida, sem dados humanos/credenciais; outbound controlado não prova AuthHTTP/Storage reais.

API/UI ainda NÃO publicadas. Falta confirmação de metadados no percurso da pessoa, página atleta.html, links, browsers/capturas e gate/CI da vertical. Histórico de apresentação do perfil ainda precisa paginação independente, antes de finalizar UI. Gate454 antecede estas mudanças; sem repeti-lo por documentação.

## P3 — domínio e consultas puras, 25/10/2026

Carreira valida cada disputa e identidade antes de reunir observações no mesmo observedMetrics usado nas estatísticas; consulta de uma disputa continua recusando contextos misturados. Percentuais ponderados e médias por cobertura permanecem sobre fatos, não médias intermediárias. Todas inscrições/nomes da ocasião são preservados, duplicidade global de jogo/pessoa e inscrição cruzada são recusadas. Sem nova DDL.

Resumo/Estatísticas/Conquistas e honrarias/Jogos/Histórico têm contrato de página e URL próprios. Nome principal vem do perfil explicitamente confirmado; sem ele, última ocasião pública com origem indicada, inclusive honraria explícita. Opcionais não são derivados dessa honraria. Histórico mantém inscrições, equipe, camisas, nomes e datas conhecidas de jogos; não inventa início/fim de vínculo ou equipe atual. Jogos paginam20 sem reduzir os totais. Fase desconhecida sóentra emall; mínimos de por30 diferentes bloqueiam esse modo até um recorte compatível. DNP aparece no histórico/jogos, sem linha estatística fictícia.

RED por domínio ausente, depois caso fora do recorte mostrou que uma origem inválida poderia ficar oculta. Validação de toda a fonte precede o filtro; RED→GREEN observado. **39focais/6arquivos PASS**, SHA256 **a460f05f7e9fa55a3a5bfb2b524cc48748df809be99aa0e7705aef13f46cb97c**, incluindo agregações/regressões da tabela, URL, identidade, mínimos, DNP, datas ausentes e paginação. Tipos app/Worker/lint/formato PASS. Não atribuir gate454 a este código posterior; consolidar com API/UI estáveis. Banco43 e provas reais anteriores inalterados; sem novo deploy/credencial/SQL.

## P2 — participações e fonte de carreira integradas, 25/10/2026 19:21UTC-03

Adaptador privado SQL comparado a normalizeConfirmedGame para súmula/DNP/0/00, quatro PDFs preservados e fallback misto. RED por função ausente antes de migration CLI. Projeção pública por pessoa+jogo, com FKs para participante/versão imutável e metadados estatísticos; source/nomes/equipes/camisas da ocasião. Trigger posterior ao estatístico, mesma transação, replay sem nova projeção e owner-backfill ordenado. Nenhuma leitura de pessoa/equipe/elenco live compõe os fatos.

Fonte fechada confirmed-player-career-v1 oferece somente perfil explicitamente publicado, participações da identidade, honrarias de destinatário explícito e colocações de equipe com prova contextual de inscrição E equipe em participação publicada. Vínculo privado sem jogo não comprova colocação individual. Perfil sem jogos e premiado sem jogos preservam vazios; cadastro privado isolado não cria fonte. Retirada de honraria sóao confirmar correção; histórico privado não reaparece. Consulta invoker/STABLE usa tabelas públicas/índices próprios e GIN dos destinatários, sem chave/SDK no browser.

RED de projeção/RPC observados, zero/upgrade/rollback e composição **218testes/44arquivos PASS**. Gate consolidado **454unit/94arquivos,5transportes,13PG,18workerd,4PDFs/builds/tipos/fronteira/segredos575 PASS**. Esse gate não inclui UI/API do perfil, ainda ausentes. Exportação posterior de fixture e consumo opcional do artefato real modificaram somente testes; focais pós-exportação/geração de tipos aprovados, sem repetição do gate inteiro.

Migration aplicada UMA vez no projeto novo e reconciliada como **20261025221911_player_participation_projection.sql**; arquivo CLI220548 renomeado para o timestamp real. **43migrations**, imutáveis após aplicação. SQL normalizador REAL correspondeu ao TS em6casos, **124participações** (11/24/22/23/20/24), sem persistir fixtures. Provas reais separadas BEGIN/ROLLBACK da linhagem/transação e carreira/honrarias também PASS. Quatro focais posteriores parsearam fontes reais pelos contratos TS. Tipos gerados, advisor sóWARN conhecido senha vazada/Pro e10INFOFKs antigas; nenhuma FK nova sem índice.

Pós-rollback1pessoa/2inscrições/1Auth/1adminativo;0perfis/versões/jogos/participações públicas/prêmios/estatísticas/objetos. Nenhum dado humano confirmado, removido ou sobrescrito. Preview continua e00ba15 e proteção anterior; não houve novo deploy nem credencial temporária nesta unidade.

Limites explícitos:10000participações/honrarias/colocações e4MiB de fonte; excedente é erro, sem totais silenciosamente truncados. Fronteiras de capacidade e carga reais ainda não comprovadas, nem corrida multiconexão. Perfil e histórico da UI/API/P3 continuam pendentes; não atribuir aceite humano ou CI estatístico a este bloco.

SHA256: gate454 **63ebc2d0578776fc54fd90083354d5cd90c51cbe42dae22782b9017342a5de09**; fontes reais ignoradas **d504b13f97ca6e9ef1fe5c2fe79f1be91659b6969f43978b001f4d36ff039871**; focais de tipos reais **ef684ad63ac5e411ecaad0410e00c483cd82628cc3454a7fa6dce47d2272604c**; migration43 **8a21e4a343c25bd1f7e76d7c9e5abc32c45246dbabc8a63403584c08e07ccb55**.

## P1 — banco novo reconciliado, 25/10/2026 19:01UTC-03

Migration aplicada UMA vez pelo plugin no projeto novo nizmasjddyrhmevvfviz/vínculo link_6adaa8aab5688191b1e7ae1cddc55a82. Versão real **20261025215954_player_profile_publications.sql**, arquivo CLI215131 renomeado para o timestamp remoto, sem reaplicar; SHA256 **5c12f0d86bc28b53e9bd5d0c873d40af49d3bf1f1e6e5878ce878137e1f4816e**.42migrations reconciliadas, imutáveis após aplicação.

Após gate450, revisão focal encontrou validação de offset antes da autorização no leitor de estado. Novo caso de administrador revogado com offset inválido observou RED; autorização passou para antes da validação e dois cenários zero/upgrade GREEN. Somente essa ordem de leitura mudou após o gate; não repetir450 por isso. Tipos gerados e typecheck/lint posteriores aprovados.

Prova real **BEGIN/ROLLBACK PASS**, inclusive23confirmações sintéticas, histórico20+3, versões/motivos/grants/RLS/imutabilidade/revogação/rollback após escrita da projeção. Identidade administrativa humana foi reutilizada, sem trocar bootstrap; duas identidades Auth de fixture foram criadas somente na transação descartável. Nenhuma credencial usada ou emitida. Resultado real parseado pelos contratos TS,7focais PASS com BDB_REAL_PROFILE_PROOF=1. Prova JSON ignorada SHA256 **83c2a9762936082c4d84c845e838bccce42dc6821c01118a2b8f37b1b6491735**, log de validação **cc7bf6b86f6af5dc4fd48bbfab46b92d49e3c858540261d9b2c2f549530346f8**. Gate450 anterior SHA256 **fd8a98cd55a1c34c64160fc7ea835b27bf2a93992988c754ef502722df5d0e2a**; composição10 SHA256 **b36f958211f25931aea0c7bebe81e7231e8a42e337b570efd1d7762d60908762**.

Pós-rollback:1pessoa/2inscrições/1Auth/1adminativo,0perfis/versões/recibos/jogos/estatísticas/objetos. Advisor segurança somenteWARN conhecido de senha vazada/Pro;10INFO de FKs antigas, nenhuma nova do perfil; índices sem uso são esperados no banco sem dados publicados, sem remoções especulativas. Consulta do changelog atual sem mudança relevante para esta DDL/RLS. PlanoFree mantido, sem contratação.

Próximo P2: fonte indexada de participações confirmadas e matriz de adaptação SQL×TS, depois domínio de carreira/API/UI. Nada do perfil foi publicado no Worker: preview permanece e00ba15 estatístico. Sem CI específico do perfil ainda, nem aceite humano/revisão independente/corrida real multiconexão/carga/WCAGcompleta.

## P1 — fundação local, 25/10/2026

Base material e00ba15 da tabela estatística; branch própria codex/perfil-confirmado, plano2026-10-25-perfil-confirmado e ADR017. Contratos novos de proposta, confirmação, publicação, estado/histórico e ACK; nomes homônimos porUUID, campos privados recusados, revisões com motivo e versões explícitas. Ainda sem API/DO/UI do perfil.

RED inicial de contrato por módulo ausente; depois asserções identificaram limites Unicode diferentes do esperado: max do runtime aceitou61emojis no nome/1001no motivo. Refinamento explícito string.length mantém limites UTF16 e rejeita nulo/surrogate solto.5contratos novos +2de pessoa PASS. Não alterou schema nem dados do cadastro anterior.

RED PostgreSQL do zero/upgrade: RPC ainda ausente. Migration gerada pela CLI fixada2.121.0 após help/RED: **20261025215131_player_profile_publications.sql**, SOMENTE LOCAL neste registro. Snapshots próprios, histórico/recibos/FKs/RLS/grants mínimos e guardas; authfresh, replay/versões, leitura serializada por identidade, revisão e Recentes. Nenhum bypass de autorização ou credencial de servidor no browser.

**10testes/4arquivos de composição PASS**: contratos, duas reconstruções do perfil, fonte estatística e projeção de resultados. SQL prova metadados opcionais nulos, nascimento privado sem inferência, homônimos, treinador sem atleta recusado, publicação/revisão, ACK original depois de nova publicação, edição não republica, histórico20+3, grants de anon/auth/service_role, RLS, imutabilidade/FKs, revogação e rollback atômico após escrita da projeção. Matriz TS×SQL de comandos/Unicode/metadados incluída. Falha intermediária no upgrade era harness tentando consultar helper depois do rollback da própria migration; movida a matriz para antes do rollback, sem enfraquecer produto.

Gate consolidado local **450unit/91arquivos,5transportes,13PG,18workerd,4PDFs/builds/tipos/fronteira/segredos565 PASS**. Sem nova suíte browser por contratos/SQL não consumidos; estatísticas e transferências usam CI e00ba15, que não inclui código do perfil. Artefatos inalterados/harness126 preservam evidências anteriores.

Pendente: aplicar uma vez no projeto novo após registrar a unidade, prova real BEGIN/ROLLBACK, reconciliar versão/tipos/advisors. Sem publicação humana de perfil, aceite humano, revisão independente, carga, corridaPGmulticonexão ou WCAGcompleta comprovados. Fonte de carreira e UI ainda não implementadas.
