# Consulta de equipes confirmadas — evidências

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
