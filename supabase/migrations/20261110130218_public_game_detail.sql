-- Opt-in public detail; immutable publications and the legacy RPC are unchanged.
create function private.public_game_period_detail(payload jsonb,d jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare current_facts jsonb; previous_facts jsonb;
 cuts jsonb:='[]'; rows jsonb; teams jsonb; events jsonb; fouls jsonb; i integer; s text;
begin
 if payload is null then return null;end if;
 -- PDF sources do not establish individual participation or chronology by period.
 if payload->'source'->>'kind'<>'sheet' then return payload||'{"details":null}'::jsonb;end if;
 previous_facts:=private.compute_sheet_facts(jsonb_set(d,'{events}','[]'::jsonb));
 for i in 1..(d->>'periods')::integer loop
  select coalesce(jsonb_agg(e order by ordinal),'[]'::jsonb) into events
  from jsonb_array_elements(d->'events') with ordinality q(e,ordinal) where (e->>'period')::integer<=i;
  current_facts:=private.compute_sheet_facts(jsonb_set(d,'{events}',events));
  select jsonb_agg(jsonb_build_object(
   'side',p->'side','jersey',p->'jersey',
   'played',case when not (p->>'played')::boolean then 'false'::jsonb
    when (old->>'status')<>'eligible' then 'false'::jsonb
    when (i=1 and (p->>'starter')::boolean) or exists(
     select 1 from jsonb_array_elements(d->'events') e
     where (e->>'period')::integer=i and e->>'side'=p->>'side' and e->>'target'=p->>'jersey'
    ) then 'true'::jsonb else 'null'::jsonb end,
   'points',(p->>'points')::integer-(old->>'points')::integer,
   'two',(p->>'two')::integer-(old->>'two')::integer,
   'three',(p->>'three')::integer-(old->>'three')::integer,
   'free',(p->>'free')::integer-(old->>'free')::integer,
   'fouls',(p->>'fouls')::integer-(old->>'fouls')::integer,
   'technical',(p->>'technical')::integer-(old->>'technical')::integer,
   'unsportsmanlike',(p->>'unsportsmanlike')::integer-(old->>'unsportsmanlike')::integer,
   'status',p->'status') order by ordinal) into rows
  from jsonb_array_elements(current_facts->'players') with ordinality q(p,ordinal)
  join lateral (select value old from jsonb_array_elements(previous_facts->'players')
   where value->>'side'=p->>'side' and value->>'jersey'=p->>'jersey') b on true;
  teams:='{}'::jsonb;
  foreach s in array array['home','away'] loop
   teams:=teams||jsonb_build_object(s,jsonb_build_object(
    'points',(current_facts->'teams'->s->>'points')::integer-(previous_facts->'teams'->s->>'points')::integer,
    'freeMade',(current_facts->'teams'->s->>'freeMade')::integer-(previous_facts->'teams'->s->>'freeMade')::integer,
    'freeTaken',(current_facts->'teams'->s->>'freeTaken')::integer-(previous_facts->'teams'->s->>'freeTaken')::integer,
    'fouls',(select coalesce(sum((p->>'fouls')::integer),0) from jsonb_array_elements(rows) p where p->>'side'=s)));
  end loop;
  cuts:=cuts||jsonb_build_array(jsonb_build_object('players',rows,'teams',teams));
  previous_facts:=current_facts;
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('side',e->'side','jersey',e->'target','period',e->'period','code',e->'code') order by (e->>'period')::integer,ordinal),'[]'::jsonb)
 into fouls from jsonb_array_elements(d->'events') with ordinality q(e,ordinal)
 where e->>'target' ~ '^(00|0|[1-9][0-9]?)$' and e->>'code' ~ '^[PTUD][123C]?$';
 return payload||jsonb_build_object('details',jsonb_build_object('periods',cuts,'fouls',fouls));
end$$;
revoke all on function private.public_game_period_detail(jsonb,jsonb) from public,anon,authenticated,service_role;
create function private.get_public_game_detail(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare payload jsonb; d jsonb;
begin
 select p.snapshot,v.document into payload,d
 from public.published_games p join private.game_publication_versions v
 on v.game_id=p.game_id and v.version=p.version
 where p.game_id=p_id;
 if payload is null then return null;end if;
 return private.public_game_period_detail(payload,d);
end$$;
create function public.get_public_game_detail(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$select private.get_public_game_detail(p_id)$$;
revoke all on function private.get_public_game_detail(uuid),public.get_public_game_detail(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_public_game_detail(uuid) to anon,authenticated;

-- The same numeric rule must apply BEFORE pagination of administrative rosters.
create or replace function public.list_roster(p_registration_id uuid,p_active_only boolean default true,p_offset integer default 0) returns jsonb
language sql stable security invoker set search_path='' as $$
 with matches as(select r.id,r.jersey from public.roster_entries r where r.registration_id=p_registration_id and (not p_active_only or r.ended_at is null) and p_offset between 0 and 100000),
 page as(select * from matches order by case when jersey='00' then 100 else jersey::integer end nulls last,id limit 20 offset greatest(0,least(p_offset,100000)))
 select jsonb_build_object('items',coalesce((select jsonb_agg(public.get_roster_entry(id) order by case when jersey='00' then 100 else jersey::integer end nulls last,id) from page),'[]'::jsonb),
 'hasMore',(select p_offset<100000 and count(*)>p_offset+20 from matches))
$$;
