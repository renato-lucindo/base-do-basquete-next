-- Use the current decision before the published score, as the regulation preview does.
create or replace function private.dispute_pending_games(did uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'number',g.game_number,
    'home',home.name,'away',away.name) order by g.game_number nulls last,g.id),'[]')
  from public.games g
  join public.registrations home on home.id=g.home_registration_id
  join public.registrations away on away.id=g.away_registration_id
  left join public.published_games p on p.game_id=g.id
  left join private.game_occurrence_records r on r.game_id=g.id
  left join private.game_occurrence_heads h on h.id=r.id
  left join private.game_occurrence_versions v on v.id=h.id and v.version=h.version
  left join private.regulation_heads regulation on regulation.dispute_id=g.dispute_id
  left join private.regulation_versions rules
    on rules.dispute_id=regulation.dispute_id and rules.version=regulation.version
  where g.dispute_id=did and case
    when v.effect is null then p.game_id is null
    when v.game_version<>g.version or v.publication_version is distinct from p.version then true
    when v.effect->>'kind'='wo'
      then coalesce(rules.definition#>'{occurrenceRules,wo}','null'::jsonb)='null'::jsonb
    else v.effect->>'kind' in ('interrupted','postponed')
  end
$$;
