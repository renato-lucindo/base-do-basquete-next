# Perfil confirmado — evidências

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
