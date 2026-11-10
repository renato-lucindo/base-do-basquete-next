-- Keep a confirmed dispute visible when any one game moves to a private draft.
-- Only the public read projection changes; snapshots, audit and game facts remain intact.
create or replace function public.get_public_standings(p_dispute_id uuid)
returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  source jsonb;
  allowed uuid[];
  group_phases jsonb;
  series jsonb;
begin
  source := private.get_public_standings(p_dispute_id);
  if source is null or not private.dispute_has_game_drafts(p_dispute_id) then
    return source;
  end if;

  -- A single allowlist keeps assignments, scores and source games consistent.
  select coalesce(array_agg((game.item->>'id')::uuid), '{}'::uuid[])
    into allowed
  from jsonb_array_elements(source->'games') as game(item)
  where private.game_is_public((game.item->>'id')::uuid);

  -- Exclude draft games from group fixture assignments. Keeping a dangling
  -- assignment would fail the public source schema's exact-ID validation.
  select coalesce(jsonb_agg(
    jsonb_set(phase.item, '{groups}', (
      select coalesce(jsonb_agg(
        jsonb_set(grp.item, '{gameIds}', (
          select coalesce(jsonb_agg(gid.item order by gid.ord), '[]'::jsonb)
          from jsonb_array_elements(grp.item->'gameIds') with ordinality as gid(item, ord)
          where (gid.item #>> '{}')::uuid = any(allowed)
        )) order by grp.ord), '[]'::jsonb)
      from jsonb_array_elements(phase.item->'groups') with ordinality as grp(item, ord)
    )) order by phase.ord), '[]'::jsonb)
  into group_phases
  from jsonb_array_elements(source #> '{definition,groupPhases}') with ordinality as phase(item, ord);

  -- Keep the bracket definition and participants, but remove the private
  -- game-to-series assignment; the score and winner must not remain visible.
  select coalesce(jsonb_agg(
    jsonb_set(node.item, '{games}', (
      select coalesce(jsonb_agg(assignment.item order by assignment.ord), '[]'::jsonb)
      from jsonb_array_elements(node.item->'games') with ordinality as assignment(item, ord)
      where (assignment.item->>'gameId')::uuid = any(allowed)
    )) order by node.ord), '[]'::jsonb)
  into series
  from jsonb_array_elements(source #> '{definition,series}') with ordinality as node(item, ord);

  source := jsonb_set(source, '{definition,groupPhases}', group_phases);
  source := jsonb_set(source, '{definition,series}', series);
  source := jsonb_set(source, '{games}', (
    select coalesce(jsonb_agg(game.item order by game.ord), '[]'::jsonb)
    from jsonb_array_elements(source->'games') with ordinality as game(item, ord)
    where (game.item->>'id')::uuid = any(allowed)
  ));
  source := jsonb_set(source, '{publishedGames}', (
    select coalesce(jsonb_agg(fact.item order by fact.ord), '[]'::jsonb)
    from jsonb_array_elements(source->'publishedGames') with ordinality as fact(item, ord)
    where (fact.item->>'gameId')::uuid = any(allowed)
  ));
  source := jsonb_set(source, '{occurrences}', (
    select coalesce(jsonb_agg(occ.item order by occ.ord), '[]'::jsonb)
    from jsonb_array_elements(source->'occurrences') with ordinality as occ(item, ord)
    where (occ.item->>'gameId')::uuid = any(allowed)
  ));
  source := jsonb_set(source, '{withdrawals}', (
    select coalesce(jsonb_agg(jsonb_set(w.item, '{previousGameIds}', (
      select coalesce(jsonb_agg(gid.item order by gid.ord), '[]'::jsonb)
      from jsonb_array_elements(w.item->'previousGameIds') with ordinality as gid(item, ord)
      where (gid.item #>> '{}')::uuid = any(allowed)
    )) order by w.ord), '[]'::jsonb)
    from jsonb_array_elements(source->'withdrawals') with ordinality as w(item, ord)
  ));
  if source ? 'organizationPendingGameIds' then
    source := jsonb_set(source, '{organizationPendingGameIds}', (
      select coalesce(jsonb_agg(gid.item order by gid.ord), '[]'::jsonb)
      from jsonb_array_elements(source->'organizationPendingGameIds') with ordinality as gid(item, ord)
      where (gid.item #>> '{}')::uuid = any(allowed)
    ));
  end if;
  return source;
end$$;
