# Consulta de equipes confirmadas — evidências

## ET2 — adapter/rotas locais, 26/10/2026 00:40UTC-03

GETs públicos específicos de tabela e detalhe, sem SessionStore/Auth. SóUUID canônico da disputa entra em get_public_statistics_source, com chave publicável apenas no Worker,timeout8s/read5MiB. Backend deriva DTO mínimo, correlaciona disputa/equipe/inscrição e recusa query desconhecida/duplicada/IDinválido antes da leitura; limite8192,405/400/404 explícitos. RPCnull significa ausência; falha técnica/JSONruim/fonte contaminada não vira404 nem limpa cookie administrativo.

Leitor de fonte read-only extraído do provider estatístico para reutilização estrita, sem CRUD genérico. RED de capacidade413 demonstrou conversão indevida em503; ambos consumidores agora preservam413 sanitizado e429, demais detalhes técnicos não são expostos. RED deUUID de origem em maiúsculas demonstrou comparação crua inconsistente; header canônico resolve sem ocultar fonte de outra disputa. RED workerd404 antes de registrar as rotas, GREEN após Worker/allowlist de compilação sem novoEnv.

**24focais/4arquivos PASS**, SHA256 .preview-artifacts/team-et2-composition.log **44a552639dd29ccfa8a3eda818808cfc1f9b15b7e578a8e750e550056d9aee14**. **21workerd de composição PASS**, log team-et2-workerd-composition.log SHA256 **58c696fa0e18cf5584818a6969a481bcaede58cc9068650e65f7675cde62fd82**; três públicos focais anteriores também PASS. Tipos app/Worker/lint/formato/buildWorkerPASS. Consulta de docsCF atual e metadata de tipos5.20261026.1 não levou a upgrade de dependências fixadas/configuração/compatibilidade.

Sem novaDDL ou deploy; RPC/43migrations existentes inalteradas, sem repetição de SQL/harness126. API de equipes ainda não está no preview84baf38. BuildWorker local agora contém mudanças posteriores: manifesto/payload84 continuam prova do preview antigo, não devem ser misturados ao Worker local. ET3 páginas/links/browsers pendentes; gate/CI da vertical sóquando estável. Outbound controlado/workerd não equivalem a prova AuthHTTP/Storage reais ou carga.

## ET1b — detalhe contextual puro, 26/10/2026 00:29UTC-03

Seleção explícita quando teamId tem duas inscrições; IDs divergentes não escolhem primeira linha. Detalhe sóderiva participantes e jogos publicados da inscrição. Homônimos mantêm IDs próprios,0/00/contexto e aliases, DNP permanece sem linha estatística observada, quem jogou sem ações mantém zero conhecido. Jogos e participantes têm páginas20 independentes e totais antes da paginação; fase sem fatos devolve vazio explícito com identidade jápública.

Coletivos FIBA mantêm partida/origem/versão; Site conserva null, não recebe métricas por soma inferida. Datas e horários continuam os realmente publicados, sem início/fim de vínculo ou equipe atual. Snapshot mínimo de jogo não inclui demais atletas; estatísticas individuais somente da inscrição selecionada.

RED inicial por módulo ausente, sem asserções; primeira implementação3/5 expôs adaptador tratando linha J0 do agregador como estatística de DNP, recusada pelo contrato. Corrigido para null apenas quando nenhum jogo foi disputado, sem alterar o agregador/tableau existente. TypeScript também apontou widening de side na flatMap; retorno tipado corrigido sem cast. GREEN **14cenários novos totais/50composição/6arquivos PASS**, tipos app/Worker/lint/formato PASS. Inclui25jogos/150identidades com páginas independentes e totais corretos, coletivos FIBA/Site, ambiguidades e contexto. Log .preview-artifacts/team-et1-final-composition.log SHA256 **391b6acd72296ba791dfb8ef095fc4027b852e3c86ff83e5b7f908543728397b**.

ET1 estável localmente; ainda sem API/UI/DDL/deploy de equipes. Não repetir gate473/324 do perfil por biblioteca pura: API/vertical ET2–ET4 terão seu próprio gate/CI. Sem claims de carga/capacidade real/WCAG/revisão independente.

## ET1a — domínio da tabela, 26/10/2026 00:22UTC-03

Contrato/URL fechados para total/per-game, regular/playoffs/all, busca80, ordem whitelist e páginas20. Fonte existente confirmed-statistics-v1 validada/normalizada integralmente antes do filtro. Duas inscrições da mesma equipe, inclusive confronto entre elas, produzem linhas separadas; Jcoletivo conta partida por inscrição e PP/PC/saldo usam placar oficial. Médias dividem somas por partidas; não somam médias de jogadores ou pontos avançados do PDF.

Nome/contexto de exibição vêm da publicação mais recente, com gameId/versão/data e aliases; não dependem da ordem da fonte. RED inicial foi sómódulo ausente (nenhuma asserção executada). Depois RED concreto de contexto exibia nome da primeira linha; corrigido para última publicação, GREEN incluindo reversão da fonte. Novaexportação validateConfirmedFacts apenas expõe o validador jáusado pelas estatísticas, sem alterar sua semântica; evita contexto/inscrição trocada fora do recorte esconder origem inválida.

**9novos cenários/45composição/5arquivos PASS**, cobrindo seis cruzamentos modo/escopo, saldo negativo/arredondamento, busca de aliases, correção, Jsem multiplicar pelo elenco/DNP, PDFSitecom fallback manual, fonte contaminada/duplicada e paginação26→20+6. Fronteira1000inscrições aceita/1002recusada mesmo em busca vazia provada localmente, sem alegar carga real. Log .preview-artifacts/team-et1-composition.log SHA256 **52f2b4913e29e25e4b4d35d5ca4d3d1e153abe7d4c58107756eb2e0870b31447**. Tipos app/Worker/lint/formato focais PASS.

Sem API/UI/DDL/deploy de equipes. Detalhe contextual/participantes/jogos ainda pendentesET1b; planoET1 não concluído integralmente. CI473/324 e preview84baf38 pertencem exclusivamente ao perfil/base, não a esta biblioteca. Não repetir gate/harness126/SQL por código puro ou sessão; consolidar quando vertical estável. Capacidade10000identidades/limite real4MiB/carga/PGmulticonexão/revisão independente/WCAGcompleta não foram provadas nesta unidade.
