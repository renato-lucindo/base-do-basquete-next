# Publicação controlada da fase dos jogos nas estatísticas

**Unidade:** `codex/fases-estatisticas-publicadas`. **Alvo futuro, somente após autorização específica:** Supabase `base-do-basquete-next-dev` (`nizmasjddyrhmevvfviz`). **Não há autorização para aplicar a migration nem atualizar dados por esta PR.**

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
select
  m.dispute_id,
  h.version as base_statistics_version,
  count(distinct m.game_id) filter (where m.phase is distinct from g.stage_kind) as pending_games,
  count(p.person_id) filter (where m.phase is distinct from g.stage_kind)
    as affected_player_projections,
  jsonb_agg(
    jsonb_build_object(
      'gameId', g.id,
      'gameVersion', g.version,
      'publicationVersion', m.publication_version,
      'previousPhase', m.phase,
      'targetPhase', g.stage_kind
    ) order by g.id
  ) filter (where m.phase is distinct from g.stage_kind) as proposed_games
from public.published_statistics_games m
join public.games g on g.id = m.game_id and g.dispute_id = m.dispute_id
join public.published_games pg on pg.game_id = m.game_id
  and pg.dispute_id = m.dispute_id and pg.version = m.publication_version
join public.published_statistics h on h.dispute_id = m.dispute_id
left join public.published_player_games p on p.game_id = m.game_id
  and p.dispute_id = m.dispute_id
group by m.dispute_id, h.version
order by m.dispute_id;
```

**Observação:** o total de jogos usa `count(distinct m.game_id)` porque o join às participações multiplica as linhas. A prévia é sempre reexecutada antes de enviar comandos.

3. Medir antes da alteração os totais sem filtro, a quantidade de linhas `published_games`/`published_player_games`, as versões e os snapshots esportivos das 17 publicações e, onde permitido, armazenar a comparação em artefato de validação com acesso restrito. Não transportar dados pessoais para GitHub ou logs.
4. Somente após autorização **específica para DDL**, aplicar **uma vez** a migration versionada pela ferramenta de migrations; ela **não** contém DML de backfill e não cria versões de resultados.
5. Somente após autorização **específica para DML/publicação**, confirmar os jogos com diferenças **por disputa** através da API administrativa, usando sessão autenticada e origem permitida. Este endpoint é um comando de publicação explícito, não um salvamento do editor. Exemplo de estrutura (IDs devem ser provenientes da prévia real):

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

Em 05/11/2026, a leitura somente consulta registrou 23 jogos cadastrados (todos regulares), 17 jogos publicados com fase ausente, 391 projeções de jogadores também sem fase, distribuídos em duas disputas:

| Disputa                                | Head anterior | Jogos pendentes | Participações afetadas |
| -------------------------------------- | ------------: | --------------: | ---------------------: |
| `b350cd03-73fb-41a6-9887-ef5ea309389e` |             4 |               4 |                     92 |
| `b5433b13-a8f9-4baa-b4d9-08066ebf3e96` |            17 |              13 |                    299 |

Se esses números permanecerem, a correção controlada exigirá **2 confirmações**, **2 novas versões estatísticas**, **17 linhas de mapeamento de fase corrigidas** e **391 projeções de participação recalculadas**, mantendo placares, contagens de jogos e publicações dos resultados. Ela **não** reclassifica jogos privados nem publica regulamentos privados.

## Validação e limitações

A CI roda `npm run gate`, PGlite, teste de contratos e Playwright no SHA da PR. Antes de aplicar a migration no Supabase real, ainda são necessárias validação de execução real do SQL em ambiente isolado compatível, revisão dos privilégios e concorrência multi-conexão; os testes de PGlite não equivalem a esse ensaio real. Nenhum merge, deploy, DDL ou DML está incluído no escopo autorizado desta unidade.
