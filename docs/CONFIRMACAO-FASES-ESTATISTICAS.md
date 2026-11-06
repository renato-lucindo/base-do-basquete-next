# Publicação controlada da fase dos jogos nas estatísticas

**Unidade:** `codex/fases-estatisticas-publicadas`. **Projeto confirmado:** Supabase `base-do-basquete-next-dev` (`nizmasjddyrhmevvfviz`). **Em 05/11/2026 a migration `20261105220937_confirm_published_game_stages` foi aplicada com autorização expressa. O backfill ainda NÃO foi executado**: exige uma sessão real de administrador, não fornecida pelo conector SQL; `execute_sql` conecta como `postgres`, sem `auth.uid()`. Uma sessão real foi aberta no preview Worker; conferir sua validade e a versão do endpoint antes da operação. Nenhuma sessão administrativa deve ser simulada para contornar esta restrição.

## Autoridade e fronteira

- `public.games.stage_kind` é a classificação administrativa autoritativa (`round_robin` por padrão; `knockout` opcional). `round_number` e `knockout_stage` são metadados internos, **não** são deduzidos pelos consumidores estatísticos.
- A publicação/correção confirmada de súmula ou PDF chama o trigger de `public.published_games`, que publica o `stage_kind` correspondente em `public.published_statistics_games.phase`. A projeção de cada jogador recebe a mesma fase pelo `private.refresh_player_game`. Campeonato e equipes leem a mesma fonte estatística paginada. Os contratos e filtros públicos não mudam.
- Salvar o editor de jogos **não** confirma estatísticas. A alteração de `stage_kind` de jogo já publicado só chega ao público após uma **nova publicação explícita e versionada** de resultado, ou confirmação administrativa de fase via `POST /api/statistics/stages`. Não há trigger em `public.games` para isso.
- A confirmação preserva `public.published_games`, `private.game_publication_versions`, `private.game_publication_entries`, documentos, fontes, placares e fatos individuais. Ela atualiza somente os heads/projeções estatísticos atuais e acrescenta histórico incremental imutável. `private.statistics_phase_commands` registra a intenção e o recibo, sem expor a tabela ao Data API.
- Locks seguem `commandId -> competition -> game`, versões esperadas controlam concorrência e o lote de até 100 jogos de uma mesma disputa é atômico. Reexecutar mesmo `requestId` e payload retorna o recibo; uma fase já publicada não gera nova versão.

## Procedimento obrigatório antes de qualquer operação no Supabase

1. Conferir **projeto e ref** novamente. Comparar `supabase_migrations.schema_migrations` com os arquivos da PR, o SQL da migration e o SHA aprovado. Conferir que a CI de `validate` e os testes SQL de `stage_phases.sql` estão aprovados em SHA atual; conferir RLS, privilégios, funções existentes, advisors e revisão humana.
2. Fazer uma leitura de prévia no Supabase, sem atualizar nada:

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

**Observação:** a subconsulta de participações evita duplicar jogos na prévia. O campo `targetPhase` serve apenas à revisão: **não** deve ser incluído no payload do comando. A prévia é sempre reexecutada antes de enviar comandos.

3. Medir antes da alteração os totais sem filtro, a quantidade de linhas `published_games`/`published_player_games`, as versões e os snapshots esportivos de todas as publicações afetadas na prévia atual e, onde permitido, armazenar a comparação em artefato de validação com acesso restrito. Não transportar dados pessoais para GitHub ou logs.
4. **Concluído em 05/11/2026:** a migration versionada foi aplicada pelo conector `apply_migration` e registrada no histórico em `20261105220937`. O nome do arquivo na branch foi alinhado ao histórico remoto. Ela não efetuou backfill nem criou versões de resultados.
5. **Autorização de DML recebida em 05/11/2026, execução pendente por limitação do conector.** Confirmar os jogos com diferenças **por disputa** através do RPC `public.confirm_game_stages(p_command jsonb)` com uma sessão _real_ de administrador autenticado. Após implantação autorizada do Worker, a rota `POST /api/statistics/stages` oferece o mesmo comando, usando a sessão do aplicativo. O conector nesta conversa só executa SQL como `postgres` sem JWT; a função corretamente rejeita esse contexto. **Não** usar `SET request.jwt.claim.sub`, credenciais simuladas nem modificações diretas nas projeções para contornar o registro de autoria. Este endpoint é um comando de publicação explícito, não um salvamento do editor. Exemplo de estrutura (IDs devem ser provenientes da prévia real):

```json
{
  "requestId": "<uuid-novo>",
  "disputeId": "<uuid-da-disputa>",
  "baseStatisticsVersion": 4,
  "reason": "Regularização auditada da fase dos jogos já publicados.",
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

O comando não informa a nova fase: o banco relê e usa `games.stage_kind` sob lock. Para cada disputa, enviar no máximo 100 jogos. Reaproveitar o **mesmo** `requestId` somente para repetir **exatamente** o mesmo payload após dúvida sobre a resposta. Um `409` exige nova leitura/inspeção; nunca forçar atualização nem reaproveitar um ID com payload diferente.

6. Conferir pós-condições sob leitura: `m.phase = g.stage_kind` para os jogos confirmados; `snapshot#>>'{fact,phase}' = m.phase` para todas as projeções dos jogadores afetados; `statistics_version` acompanha o head; nenhuma participação duplicada; `get_public_statistics_page` e leitores de campeonato/equipes/jogadores retornam as mesmas quantidades e placares, agora com fase. Comparar cabeçalhos/linhagem e números anteriores. Reexecutar a prévia deve produzir zero pendências; idempotência não deve adicionar versões.
7. Se qualquer passo falhar, parar. A transação do comando é atômica; **não** editar dados públicos diretamente para corrigir. Rastrear `requestId`, versões, erro e SHA. Reverter só por procedimento explícito, preservando o histórico.

## Impacto observado antes da aplicação

Em 05/11/2026, a prévia anterior registrou 23 jogos (17 publicados/391 projeções). **Na nova conferência antes da migration**, o banco registrou **26 jogos cadastrados (todos regulares), 25 jogos publicados com fase ausente e 575 projeções individuais também sem fase**, em duas disputas:

| Disputa                                | Head anterior | Jogos pendentes | Participações afetadas |
| -------------------------------------- | ------------: | --------------: | ---------------------: |
| `b350cd03-73fb-41a6-9887-ef5ea309389e` |             4 |               4 |                     92 |
| `b5433b13-a8f9-4baa-b4d9-08066ebf3e96` |            27 |              21 |                    483 |

Se esses números permanecerem, a correção controlada exigirá **2 confirmações**, **2 novas versões estatísticas**, **25 linhas de mapeamento de fase corrigidas** e **575 projeções de participação recalculadas**, mantendo placares, contagens de jogos e publicações dos resultados. Ela **não** reclassifica jogos privados nem publica regulamentos privados.

## Validação e limitações

A CI roda `npm run gate`, PGlite, teste de contratos e Playwright no SHA da PR. Antes de aplicar a migration no Supabase real, ainda são necessárias validação de execução real do SQL em ambiente isolado compatível, revisão dos privilégios e concorrência multi-conexão; os testes de PGlite não equivalem a esse ensaio real. A migration DDL já foi aplicada no projeto de desenvolvimento; DML, merge e deploy **não foram executados**. O backfill requer execução autenticada, revisão da prévia atual e validação posterior. A CI anterior ao alinhamento do nome da migration passou; acompanhar os checks do SHA atual.

## Execução autenticada e retomada da PR #61

O comando SQL existente não recebe um ator arbitrário: `private.confirm_game_stages` lê `auth.uid()` e exige `public.admin_access.enabled`. O conector Supabase disponível possui `apply_migration` e `execute_sql`, mas não possui operação que execute o RPC com **sessão de usuário administrador**; `execute_sql` foi verificado como `current_user=postgres` e `auth.uid()=null`. Por isso os dados foram mantidos intactos. A tentativa anterior de preparar manutenção por outro mecanismo, bloqueada pelas configurações de segurança, não deve ser retomada. Não contornar a checagem com identidade simulada, nem substituir o comando versionado por atualizações diretas.

A consulta somente leitura do item 2 gera os valores esperados. Para obter os comandos de forma automática e segura antes da publicação, usar a consulta a seguir (uma linha por disputa, sem JWT ou informações pessoais). O `requestId` deve ser preservado para um eventual retry da mesma intenção:

```sql
select jsonb_build_object(
  'requestId',gen_random_uuid(),
  'disputeId',m.dispute_id,
  'baseStatisticsVersion',h.version,
  'reason','Regularização aprovada das fases dos jogos publicados.',
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

O RPC instalado concede execução a `authenticated`, revoga `anon` e `service_role` e verifica o cadastro administrativo atual. Usar credenciais reais somente no ambiente seguro do aplicativo ou de um cliente autorizado; **não enviar JWT pelo chat ou salvar token na PR**. Conferir a PR e o SHA do Worker antes de executar. O registro final de integração, implantação e confirmação autenticada permanece nas evidências da PR, sem tratar merge como deploy ou correção dos dados.

## Evidências da reconciliação em 05/11/2026

- Projeto e leitura atual reconfirmados: migration `20261105220937` aplicada uma vez, 25 jogos e 575 projeções sem fase. Nenhum DDL/DML nesta reconciliação.
- Corpos das três funções aplicadas comparados com o arquivo imutável da branch por MD5: `private.refresh_confirmed_statistics` = `f6830630206b0d6cfd7c2c7f16bf40d0`; `private.confirm_game_stages` = `b957c01d0dabbd2476a07d3d135d9a44`; `public.confirm_game_stages` = `92de21a82c99d0a8519bff1f0bde7aa6`. Todos coincidem. RPC público invoker, função privada definer, search_path vazio e EXECUTE somente para authenticated reconfirmados; anon e service_role sem EXECUTE.
- Dois testes HTTP/Workerd adicionais PASS: sem sessão 401, método 405, query/corpo inválidos 400, origem indevida 403, tipo 415 e tamanho 413 sem RPC; sessão legítima da fixture envia somente `p_command` com JWT no backend, devolve recibo não cacheável, rejeita recibo divergente com 503 e revogação administrativa com 403/401 sem publicar. Fixtures são isoladas, sem dados humanos nem credenciais reais.
- Sessão real administrativa observada em `https://base-do-basquete-next-uiux.renato-lucindo-jr.workers.dev/admin`. O domínio principal é bloqueado na rede do responsável. GET de diagnóstico ao novo endpoint no preview retornou 404: o login está disponível, mas essa versão publicada ainda não contém a rota da PR. Implantação depende de artefato validado e autorização específica.
- Gate e CI finais, merge, eventual implantação e resultados da operação autenticada são registrados na [PR #61](https://github.com/renato-lucindo/base-do-basquete-next/pull/61). Até existir evidência explícita de DML e pós-condições, o backfill permanece pendente. Ensaio PostgreSQL concorrente multi-conexão não foi realizado; os testes PGlite não equivalem a ele.

Retomada em 06/11/2026: CI de `ab3c461` [42128700378](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42128700378) SUCCESS. A main avançou pela PR #63; sua composição foi preservada por novo merge explícito. Nova CI é exigida no HEAD reconciliado. Autorização expressa do responsável cobre o deploy exclusivo no Worker uiux e a correção auditada pela sessão real após CI aprovada.
