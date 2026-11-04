-- Read-only discovery over current, explicitly published projections. No cadastre/draft joins.
-- The narrowly privileged boundary also reads the frozen ADR013 public heads, never private live heads.
create function private.public_search_key(value text) returns text
language sql immutable strict parallel safe set search_path='' as $$
 select btrim(regexp_replace(lower(regexp_replace(normalize(value,NFD),
  '['||chr(768)||'-'||chr(879)||chr(6832)||'-'||chr(6911)||chr(7616)||'-'||chr(7679)||chr(8400)||'-'||chr(8447)||chr(65056)||'-'||chr(65071)||']','','g')),'[[:space:]]+',' ','g'))
$$;

create function private.public_search_entities() returns table(
 kind text, id uuid, name text, nickname text, abbreviation text, dispute_id uuid, aliases text[], scopes jsonb
) language sql stable security definer set search_path='' as $$
 with
 public_contexts as materialized (
  select g.dispute_id,g.snapshot->'context' context,(g.snapshot->>'publishedAt')::timestamptz stamp from public.published_games g
  union all
  select h.dispute_id,v.snapshot->'context',(v.snapshot->>'publishedAt')::timestamptz
   from private.public_standings_heads h join private.public_standings_versions v using(dispute_id,version)
  union all
  select a.dispute_id,a.snapshot->'context',a.confirmed_at from public.published_achievements a
 ),
 contexts as materialized (
  select distinct on(dispute_id) dispute_id,context,stamp from public_contexts order by dispute_id,stamp desc,context::text
 ),
 players as materialized (
  select p.person_id id,p.snapshot#>>'{fact,person,name}' name,p.snapshot#>>'{fact,person,nickname}' nickname,
   p.dispute_id,(p.snapshot#>>'{fact,publishedAt}')::timestamptz stamp,1 priority from public.published_player_games p
  union all
  select p.person_id,p.snapshot#>>'{person,name}',p.snapshot#>>'{person,nickname}',null::uuid,
   (p.snapshot->>'confirmedAt')::timestamptz,0 from public.published_player_profiles p
  union all
  select (r->>'personId')::uuid,r->>'name',r->>'nickname',a.dispute_id,a.confirmed_at,2
   from public.published_achievements a cross join lateral jsonb_array_elements(a.snapshot->'honors') h
   cross join lateral jsonb_array_elements(h->'athletes') r
 ),
 player_names as (
  select distinct on(id) id,name,nickname,dispute_id from players
   order by id,stamp desc nulls last,priority,name,nickname,dispute_id
 ),
 registrations as materialized (
  select g.dispute_id,(r->>'registrationId')::uuid registration_id,r->>'name' name,
   (r#>>'{team,id}')::uuid team_id,r#>>'{team,name}' team_name,r#>>'{team,abbreviation}' abbreviation,
   (g.snapshot->>'publishedAt')::timestamptz stamp,true has_results
   from public.published_games g cross join lateral jsonb_array_elements(jsonb_build_array(g.snapshot#>'{game,home}',g.snapshot#>'{game,away}')) r
  union all
  select h.dispute_id,(r->>'id')::uuid,r->>'name',(r#>>'{team,id}')::uuid,r#>>'{team,name}',r#>>'{team,abbreviation}',
   (v.snapshot->>'publishedAt')::timestamptz,false
   from private.public_standings_heads h join private.public_standings_versions v using(dispute_id,version)
   cross join lateral jsonb_array_elements(v.snapshot->'registrations') r
  union all
  select a.dispute_id,(r->>'registrationId')::uuid,r->>'name',(r->>'teamId')::uuid,r->>'name',null::text,a.confirmed_at,false
   from public.published_achievements a cross join lateral jsonb_array_elements(a.snapshot->'placements') p
   cross join lateral jsonb_array_elements(p->'registrations') r
 ),
 team_names as (
  select distinct on(team_id) team_id,team_name,abbreviation from registrations
   order by team_id,stamp desc nulls last,team_name,abbreviation,registration_id
 ),
 team_scopes as (
  select distinct on(r.team_id,r.dispute_id,r.registration_id) r.team_id,r.dispute_id,r.registration_id,r.name,c.context,
   bool_or(r.has_results) over(partition by r.team_id,r.dispute_id,r.registration_id) has_results
   from registrations r join contexts c using(dispute_id)
   order by r.team_id,r.dispute_id,r.registration_id,r.stamp desc nulls last,r.name
 ),
 competition_names as (
  select distinct on(context->>'championshipId') (context->>'championshipId')::uuid id,context->>'name' name
   from contexts order by context->>'championshipId',stamp desc nulls last,context::text
 )
 select 'players',p.id,p.name,p.nickname,null::text,p.dispute_id,
  array(select distinct unnest(array[r.name,r.nickname]) from players r where r.id=p.id),'[]'::jsonb from player_names p
 union all
 select 'teams',t.team_id,t.team_name,null::text,t.abbreviation,null::uuid,
  array(select distinct unnest(array[r.name,r.team_name,r.abbreviation]) from registrations r where r.team_id=t.team_id),
  (select jsonb_agg(jsonb_build_object('disputeId',s.dispute_id,'registrationId',s.registration_id,'name',s.name,'context',s.context,'hasResults',s.has_results)
   order by (s.context->>'year')::integer desc,s.context->>'name',s.context->>'gender',s.context->>'category',s.context->>'division',s.registration_id)
   from team_scopes s where s.team_id=t.team_id) from team_names t
 union all
 select 'competitions',c.id,c.name,null::text,null::text,null::uuid,
  array(select distinct unnest(array[r.context->>'name',concat_ws(' ',r.context->>'name',r.context->>'year',case r.context->>'gender' when 'masculino' then 'Masculino' else 'Feminino' end,r.context->>'category',r.context->>'division')]) from contexts r where r.context->>'championshipId'=c.id::text),
  (select jsonb_agg(jsonb_build_object('disputeId',r.dispute_id,'context',r.context)
   order by (r.context->>'year')::integer desc,r.context->>'gender',r.context->>'category',r.context->>'division',r.dispute_id)
   from contexts r where r.context->>'championshipId'=c.id::text) from competition_names c
$$;

create function public.search_public_entities(p_query text,p_type text default 'all',p_page integer default 1,p_entity_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare needle text;page_size integer;body jsonb;begin
 if p_query is null or length(p_query)>120 or p_query~'[[:cntrl:]]' or p_type is null or p_type not in('all','players','teams','competitions') or p_page is null or p_page<1 or (p_entity_id is not null and p_type='all') then
  raise sqlstate 'PT400' using message='invalid_public_search';
 end if;
 needle:=private.public_search_key(p_query);
 if length(needle)<2 then raise sqlstate 'PT400' using message='invalid_public_search';end if;
 page_size:=case when p_type='all' then 5 else 20 end;
 with matches as materialized (
  select e.*,score.rank from private.public_search_entities() e
   cross join lateral (
    select min(case when key=needle then 0 when starts_with(key,needle) then 1 else 2 end) rank
    from unnest(e.aliases) alias cross join lateral (select private.public_search_key(alias) key) folded
    where strpos(key,needle)>0
   ) score
   where score.rank is not null and (p_type='all' or p_type=e.kind) and (p_entity_id is null or p_entity_id=e.id)
 ),
 totals as (
  select count(*) filter(where kind='players') players,count(*) filter(where kind='teams') teams,count(*) filter(where kind='competitions') competitions from matches
 ),
 bounds as (
  select greatest(1,ceil(greatest(players,teams,competitions)::numeric/page_size))::integer pages,* from totals
 ),
 numbered as (
  select m.*,row_number() over(partition by kind order by rank,private.public_search_key(name),id) n from matches m
 ),
 visible as (
  select m.* from numbered m cross join bounds b where m.n>(least(p_page,b.pages)::bigint-1)*page_size and m.n<=least(p_page,b.pages)::bigint*page_size
 )
 select jsonb_build_object('query',btrim(p_query),'type',p_type,'entityId',p_entity_id,'page',least(p_page,b.pages),'totalPages',b.pages,
  'counts',jsonb_build_object('players',b.players,'teams',b.teams,'competitions',b.competitions),
  'results',coalesce((select jsonb_agg(
    jsonb_build_object('kind',v.kind,'id',v.id,'name',v.name)||case v.kind
     when 'players' then jsonb_build_object('nickname',v.nickname,'disputeId',v.dispute_id)
     when 'teams' then jsonb_build_object('abbreviation',v.abbreviation,'participations',v.scopes)
     else jsonb_build_object('disputes',v.scopes,'directDisputeId',case when strpos(private.public_search_key(v.name),needle)=0 then
       (select case when count(*)=1 then min(s->>'disputeId') else null end from jsonb_array_elements(v.scopes) s
        where strpos(private.public_search_key(concat_ws(' ',s#>>'{context,name}',s#>>'{context,year}',case s#>>'{context,gender}' when 'masculino' then 'Masculino' else 'Feminino' end,s#>>'{context,category}',s#>>'{context,division}')),needle)>0)
       else null end) end order by v.kind,v.n) from visible v),'[]'::jsonb)) into body from bounds b;
 if octet_length(body::text)>1048576 then raise sqlstate 'PT413' using message='public_search_too_large';end if;
 return body;
end$$;
revoke all on function private.public_search_key(text),private.public_search_entities(),public.search_public_entities(text,text,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.search_public_entities(text,text,integer,uuid) to anon,authenticated;
