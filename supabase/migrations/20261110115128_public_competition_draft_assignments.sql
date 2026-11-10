-- Public flexible standings must not expose assignments for private draft games.
-- The administrative competition setup remains untouched.
-- The public reader uses the same visible-game catalog as its published facts.
create or replace function public.get_live_competition_source(p_dispute_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  source jsonb;
  visible_assignments jsonb;
begin
  source := private.get_live_competition_source(p_dispute_id);
  if source is null or jsonb_typeof(source->'configuration') is distinct from 'object' then
    return source;
  end if;

  select coalesce(jsonb_agg(a.assignment order by a.position), '[]'::jsonb)
    into visible_assignments
  from jsonb_array_elements(source #> '{configuration,assignments}')
       with ordinality as a(assignment, position)
  where exists (
    select 1
    from jsonb_array_elements(source->'games') as g(game)
    where g.game->>'id' = a.assignment->>'gameId'
  );

  return jsonb_set(source, '{configuration,assignments}', visible_assignments);
end$$;
