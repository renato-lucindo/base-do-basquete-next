-- Do not leak draft game identifiers inside raw legacy or custom brackets.
-- A JSON-only helper preserves published definitions without touching admin history.
create function private.public_visible_definition(p_definition jsonb, p_games jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare phases jsonb; series jsonb;
begin
  if p_definition is null or jsonb_typeof(p_definition)<>'object' then
    return p_definition;
  end if;
  select coalesce(jsonb_agg(
    jsonb_set(phase.item,'{groups}',(
      select coalesce(jsonb_agg(
        jsonb_set(grp.item,'{gameIds}',(
          select coalesce(jsonb_agg(gid.item order by gid.ord),'[]'::jsonb)
          from jsonb_array_elements(grp.item->'gameIds') with ordinality as gid(item,ord)
          where exists(
            select 1 from jsonb_array_elements(p_games) as public_game(item)
            where public_game.item->>'id'=gid.item#>>'{}'
          )
        )) order by grp.ord),'[]'::jsonb)
      from jsonb_array_elements(phase.item->'groups') with ordinality as grp(item,ord)
    )) order by phase.ord),'[]'::jsonb)
  into phases
  from jsonb_array_elements(p_definition->'groupPhases') with ordinality as phase(item,ord);

  select coalesce(jsonb_agg(
    jsonb_set(series_node.item,'{games}',(
      select coalesce(jsonb_agg(slot.item order by slot.ord),'[]'::jsonb)
      from jsonb_array_elements(series_node.item->'games') with ordinality as slot(item,ord)
      where exists(
        select 1 from jsonb_array_elements(p_games) as public_game(item)
        where public_game.item->>'id'=slot.item->>'gameId'
      )
    )) order by series_node.ord),'[]'::jsonb)
  into series
  from jsonb_array_elements(p_definition->'series') with ordinality as series_node(item,ord);

  return jsonb_set(
    jsonb_set(p_definition,'{groupPhases}',phases),
    '{series}',series
  );
end$$;
revoke all on function private.public_visible_definition(jsonb,jsonb)
from public,anon,authenticated,service_role;

-- The public source must also strip game IDs embedded in nested definitions,
-- not just the top-level competition assignments.
create or replace function public.get_live_competition_source(p_dispute_id uuid)
returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare source jsonb; visible_assignments jsonb;
begin
  source := private.get_live_competition_source(p_dispute_id);
  if source is null then return null;end if;
  if jsonb_typeof(source->'configuration')='object' then
    select coalesce(jsonb_agg(a.assignment order by a.position),'[]'::jsonb)
      into visible_assignments
    from jsonb_array_elements(source#>'{configuration,assignments}')
         with ordinality as a(assignment,position)
    where exists(
      select 1 from jsonb_array_elements(source->'games') as game(item)
      where game.item->>'id'=a.assignment->>'gameId'
    );
    source := jsonb_set(source,'{configuration,assignments}',visible_assignments);
    if jsonb_typeof(source#>'{configuration,customDefinition}')='object' then
      source := jsonb_set(source,'{configuration,customDefinition}',
        private.public_visible_definition(
          source#>'{configuration,customDefinition}',source->'games'
        ));
    end if;
  end if;
  if jsonb_typeof(source->'legacyDefinition')='object' then
    source := jsonb_set(source,'{legacyDefinition}',
      private.public_visible_definition(source->'legacyDefinition',source->'games'));
  end if;
  return source;
end$$;
