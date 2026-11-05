# PublicaÃ§Ã£o controlada da fase dos jogos nas estatÃ­sticas

**Unidade:** `codex/fases-estatisticas-publicadas`. **Projeto confirmado:** Supabase `base-do-basquete-next-dev` (`nizmasjddyrhmevvfviz`). **Em 05/11/2026 a migration `20261105220937_confirm_published_game_stages` foi aplicada com autorizaÃ§Ã£o expressa. O backfill ainda NÃƒO foi executado**: exige uma sessÃ£o real de administrador, indisponÃ­vel nos conectores desta conversa; `execute_sql` conecta como `postgres`, sem `auth.uid()`. Nenhuma sessÃ£o administrativa deve ser simulada para contornar esta restriÃ§Ã£o.

## Autoridade e fronteira

- `public.games.stage_kind` Ã© a classificaÃ§Ã£o administrativa autoritativa (`round_robin` por padrÃ£o; `knockout` opcional). `round_number` e `knockout_stage` sÃ£o metadados internos, **nÃ£o** sÃ£o deduzidos pelos consumidores estatÃ­sticos.
- A publicaÃ§Ã£o/correÃ§Ã£o confirmada de sÃºmula ou PDF chama o trigger de `public.published_games`, que publica o `stage_kind` correspondente em `public.published_statistics_games.phase`. A projeÃ§Ã£o de cada jogador recebe a mesma fase pelo `private.refresh_player_game`. Campeonato e equipes leem a mesma fonte estatÃ­stica paginada. Os contratos e filtros pÃºblicos nÃ£o mudam.
- Salvar o editor de jogos **nÃ£o** confirma estatÃ­sticas. A alteraÃ§Ã£o de `stage_kind` de jogo jÃ¡ publicado sÃ³ chega ao pÃºblico apÃ³s uma **nova publicaÃ§Ã£o explÃ­cita e versionada** de resultado, ou confirmaÃ§Ã£o administrativa de fase via `POST /api/statistics/stages`. NÃ£o hÃ¡ trigger em `public.games` para isso.
- A confirmaÃ§Ã£o preserva `public.published_games`, `private.game_publication_versions`, `private.game_publication_entries`, documentos, fontes, placares e fatos individuais. Ela atualiza somente os heads/projeÃ§Ãµes estatÃ­sticos atuais e acrescenta histÃ³rico incremental imutÃ¡vel. `private.statistics_phase_commands` registra a intenÃ§Ã£o e o recibo, sem expor a tabela ao Data API.
- Locks seguem `commandId -> competition -> game`, versÃµes esperadas controlam concorrÃªncia e o lote de atÃ© 100 jogos de uma mesma disputa Ã© atÃ´mico. Reexecutar mesmo `requestId` e payload retorna o recibo; uma fase jÃ¡ publicada nÃ£o gera nova versÃ£o.

## Procedimento obrigatÃ³rio antes de qualquer operaÃ§Ã£o no Supabase

1. Conferir **projeto e ref** novamente. Comparar `supabase_migrations.schema_migrations` com os arquivos da PR, o SQL da migration e o SHA aprovado. Conferir que a CI de `validate` e os testes SQL de `stage_phases.sql` estÃ£o aprovados em SHA atual; conferir RLS, privilÃ©gios, funÃ§Ãµes existentes, advisors e revisÃ£o humana.
2. Fazer uma leitura de prÃ©via no Supabase, sem atualizar nada:

```sql
with candidates as (
  select
    m.dispute_id,
    h.version as base_statistics_version,
    g.id as game_id,
    g.version as game_version,
    m.publication_version,
    m.phase as previous_phase,
    g.stage_kind as target_phase,
    (select count(*) from public.published_player_games p
     where p.game_id = m.game_id and p.dispute_id = m.dispute_id)
      as player_count
  from public.published_statistics_games m
  join public.games g on g.id = m.game_id and g.dispute_id = m.dispute_id
  join public.published_games pg on pg.game_id = m.game_id
    and pg.dispute_id = m.dispute_id and pg.version = m.publication_version
  join public.published_statistics h on h.dispute_id = m.dispute_id
)
select
  dispute_id,
  base_statistics_version,
  count(*) filter (where previous_phase is distinct from target_phase)
    as pending_games,
  sum(player_count) filter (where previous_phase is distinct from target_phase)
    as affected_player_projections,
  jsonb_agg(
    jsonb_build_object(
      'gameId', game_id,
      'gameVersion', game_version,
      'publicationVersion', publication_version,
      'previousPhase', previous_phase,
      'targetPhase', target_phase
    ) order by game_id
  ) filter (where previous_phase is distinct from target_phase) as proposed_games
from candidates
group by dispute_id, base_statistics_version
order by dispute_id;
```

**ObservaÃ§Ã£o:** a subconsulta de participaÃ§Ãµes evita duplicar jogos na prÃ©via. O campo `targetPhase` serve apenas Ã  revisÃ£o: **nÃ£o** deve ser incluÃ­do no payload do comando. A prÃ©via Ã© sempre reexecutada antes de enviar comandos.

3. Medir antes da alteraÃ§Ã£o os totais sem filtro, a quantidade de linhas `published_games`/`published_player_games`, as versÃµes e os snapshots esportivos das 17 publicaÃ§Ãµes e, onde permitido, armazenar a comparaÃ§Ã£o em artefato de validaÃ§Ã£o com acesso restrito. NÃ£o transportar dados pessoais para GitHub ou logs.
4. **ConcluÃ­do em 05/11/2026:** a migration versionada foi aplicada pelo conector `apply_migration` e registrada no histÃ³rico em `20261105220937`. O nome do arquivo na branch foi alinhado ao histÃ³rico remoto. Ela nÃ£o efetuou backfill nem criou versÃµes de resultados.
5. **AutorizaÃ§Ã£o de DML recebida em 05/11/2026, execuÃ§Ã£o pendente por limitaÃ§Ã£o do conector.** Confirmar os jogos com diferenÃ§as **por disputa** atravÃ©s do RPC `public.confirm_game_stages(p_command jsonb)` com uma sessÃ£o _real_ de administrador autenticado. ApÃ³s implantaÃ§Ã£o autorizada do Worker, a rota `POST /api/statistics/stages` oferece o mesmo comando, usando a sessÃ£o do aplicativo. O conector nesta conversa sÃ³ executa SQL como `postgres` sem JWT; a funÃ§Ã£o corretamente rejeita esse contexto. **NÃ£o** usar `SET request.jwt.claim.sub`, credenciais simuladas nem modificaÃ§Ãµes diretas nas projeÃ§Ãµes para contornar o registro de autoria. Este endpoint Ã© um comando de publicaÃ§Ã£o explÃ­cito, nÃ£o um salvamento do editor. Exemplo de estrutura (IDs devem ser provenientes da prÃ©via real):

```json
{
  "requestId": "<uuid-novo>",
  "disputeId": "<uuid-da-disputa>",
  "baseStatisticsVersion": 4,
  "reason": "RegularizaÃ§Ã£o auditada da fase dos jogos jÃ¡ publicados.",
  "games": [
    {
      "gameId": "<uuid-do-jogo>",
      "gameVersion": 3,
      "publicationVersion": 2,
      "previousPhase": null
    }
  ]
}
```

O comando nÃ£o informa a nova fase: o banco relÃª e usa `games.stage_kind` sob lock. Para cada disputa, enviar no mÃ¡ximo 100 jogos. Reaproveitar o **mesmo** `requestId` somente para repetir **exatamente** o mesmo payload apÃ³s dÃºvida sobre a resposta. Um `409` exige nova leitura/inspeÃ§Ã£o; nunca forÃ§ar atualizaÃ§Ã£o nem reaproveitar um ID com payload diferente.

6. Conferir pÃ³s-condiÃ§Ãµes sob leitura: `m.phase = g.stage_kind` para os jogos confirmados; `snapshot#>>'{fact,phase}' = m.phase` para todas as projeÃ§Ãµes dos jogadores afetados; `statistics_version` acompanha o head; nenhuma participaÃ§Ã£o duplicada; `get_public_statistics_page` e leitores de campeonato/equipes/jogadores retornam as mesmas quantidades e placares, agora com fase. Comparar cabeÃ§alhos/linhagem e nÃºmeros anteriores. Reexecutar a prÃ©via deve produzir zero pendÃªncias; idempotÃªncia nÃ£o deve adicionar versÃµes.
7. Se qualquer passo falhar, parar. A transaÃ§Ã£o do comando Ã© atÃ´mica; **nÃ£o** editar dados pÃºblicos diretamente para corrigir. Rastrear `requestId`, versÃµes, erro e SHA. Reverter sÃ³ por procedimento explÃ­cito, preservando o histÃ³rico.

## Impacto observado antes da aplicaÃ§Ã£o

Em 05/11/2026, a prÃ©via anterior registrou 23 jogos (17 publicados/391 projeÃ§Ãµes). **Na nova conferÃªncia antes da migration**, o banco registrou **26 jogos cadastrados (todos regulares), 25 jogos publicados com fase ausente e 575 projeÃ§Ãµes individuais tambÃ©m sem fase**, em duas disputas:

| Disputa                                | Head anterior | Jogos pendentes | ParticipaÃ§Ãµes afetadas |
| -------------------------------------- | ------------: | --------------: | -----------------------: |
| `b350cd03-73fb-41a6-9887-ef5ea309389e` |             4 |               4 |                       92 |
| `b5433b13-a8f9-4baa-b4d9-08066ebf3e96` |            27 |              21 |                      483 |

Se esses nÃºmeros permanecerem, a correÃ§Ã£o controlada exigirÃ¡ **2 confirmaÃ§Ãµes**, **2 novas versÃµes estatÃ­sticas**, **25 linhas de mapeamento de fase corrigidas** e **575 projeÃ§Ãµes de participaÃ§Ã£o recalculadas**, mantendo placares, contagens de jogos e publicaÃ§Ãµes dos resultados. Ela **nÃ£o** reclassifica jogos privados nem publica regulamentos privados.

## ValidaÃ§Ã£o e limitaÃ§Ãµes

A CI roda `npm run gate`, PGlite, teste de contratos e Playwright no SHA da PR. Antes de aplicar a migration no Supabase real, ainda sÃ£o necessÃ¡rias validaÃ§Ã£o de execuÃ§Ã£o real do SQL em ambiente isolado compatÃ­vel, revisÃ£o dos privilÃ©gios e concorrÃªncia multi-conexÃ£o; os testes de PGlite nÃ£o equivalem a esse ensaio real. A migration DDL jÃ¡ foi aplicada no projeto de desenvolvimento; DML, merge e deploy **nÃ£o foram executados**. O backfill requer execuÃ§Ã£o autenticada, revisÃ£o da prÃ©via atual e validaÃ§Ã£o posterior. A CI anterior ao alinhamento do nome da migration passou; acompanhar os checks do SHA atual.

## Impedimento de execuÃ§Ã£o autenticada no Chat

O comando SQL existente nÃ£o recebe um ator arbitrÃ¡rio: `private.confirm_game_stages` lÃª `auth.uid()` e exige `public.admin_access.enabled`. O conector Supabase disponÃ­vel possui `apply_migration` e `execute_sql`, mas nÃ£o possui operaÃ§Ã£o que execute o RPC com **sessÃ£o de usuÃ¡rio administrador**; `execute_sql` foi verificado como `current_user=postgres` e `auth.uid()=null`. Por isso os dados foram mantidos intactos, apÃ³s uma tentativa de preparar a execuÃ§Ã£o de manutenÃ§Ã£o ser bloqueada pelas configuraÃ§Ãµes de seguranÃ§a da ferramenta. NÃ£o contornar a checagem com identidade simulada, nem substituir o comando versionado por atualizaÃ§Ãµes diretas.

A consulta somente leitura do item 2 gera os valores esperados. Para obter os comandos de forma automÃ¡tica e segura antes da publicaÃ§Ã£o, usar a consulta a seguir (uma linha por disputa, sem JWT ou informaÃ§Ãµes pessoais). O `requestId` deve ser preservado para um eventual retry da mesma intenÃ§Ã£o:

```sql
select jsonb_build_object(
  'requestId',gen_random_uuid(),
  'disputeId',m.dispute_id,
  'baseStatisticsVersion',h.version,
  'reason','RegularizaÃ§Ã£o aprovada das fases dos jogos publicados.',
  'games',jsonb_agg(jsonb_build_object(
    'gameId',g.id,'gameVersion',g.version,
    'publicationVersion',m.publication_version,'previousPhase',m.phase
  ) order by m.game_id)
) as command
from public.published_statistics_games m
join public.games g on g.id=m.game_id and g.dispute_id=m.dispute_id
join public.published_games p on p.game_id=m.game_id and p.dispute_id=m.dispute_id
  and p.version=m.publication_version
join public.published_statistics h on h.dispute_id=m.dispute_id
where m.phase is distinct from g.stage_kind
group by m.dispute_id,h.version order by m.dispute_id;
```

O RPC instalado concede execuÃ§Ã£o a `authenticated`, revoga `anon` e `service_role` e verifica o cadastro administrativo atual. Usar credenciais reais somente no ambiente seguro do aplicativo ou de um cliente autorizado; **nÃ£o enviar JWT pelo chat ou salvar token na PR**. A PR ainda estÃ¡ draft e o Worker nÃ£o foi implantado.

## Evidências da reconciliação em 05/11/2026

- Projeto e leitura atual reconfirmados: migration `20261105220937` aplicada uma vez, 25 jogos e 575 projeções sem fase. Nenhum DDL/DML nesta reconciliação.
- Corpos das três funções aplicadas comparados com o arquivo imutável da branch por MD5: `private.refresh_confirmed_statistics` = `f6830630206b0d6cfd7c2c7f16bf40d0`; `private.confirm_game_stages` = `b957c01d0dabbd2476a07d3d135d9a44`; `public.confirm_game_stages` = `92de21a82c99d0a8519bff1f0bde7aa6`. Todos coincidem. RPC público invoker, função privada definer, search_path vazio e EXECUTE somente para authenticated reconfirmados; anon e service_role sem EXECUTE.
- Dois testes HTTP/Workerd adicionais PASS: sem sessão 401, método 405, query/corpo inválidos 400, origem indevida 403, tipo 415 e tamanho 413 sem RPC; sessão legítima da fixture envia somente `p_command` com JWT no backend, devolve recibo não cacheável, rejeita recibo divergente com 503 e revogação administrativa com 403/401 sem publicar. Fixtures são isoladas, sem dados humanos nem credenciais reais.
- Sessão real administrativa observada em `https://base-do-basquete-next-uiux.renato-lucindo-jr.workers.dev/admin`. O domínio principal é bloqueado na rede do responsável. GET de diagnóstico ao novo endpoint no preview retornou 404: o login está disponível, mas essa versão publicada ainda não contém a rota da PR. Implantação depende de artefato validado e autorização específica.
- Gate e CI finais, merge, eventual implantação e resultados da operação autenticada são registrados na [PR #61](https://github.com/renato-lucindo/base-do-basquete-next/pull/61). Até existir evidência explícita de DML e pós-condições, o backfill permanece pendente. Ensaio PostgreSQL concorrente multi-conexão não foi realizado; os testes PGlite não equivalem a ele.
