-- Read-time gates compose dispute visibility with the existing per-game rules.
create function private.preview_dispute_id() returns uuid
language sql stable set search_path='' as $$
  select nullif(current_setting('bdb.preview_dispute',true),'')::uuid
$$;

create function private.dispute_is_visible(did uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select from private.dispute_administration a where a.dispute_id=did
    and case when private.preview_dispute_id() is null
      then a.visibility in ('public','legacy') and not a.is_test
      else a.dispute_id=private.preview_dispute_id() and a.is_test
      end)
$$;

create or replace function private.game_is_public(gid uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(
    select from public.games g join private.dispute_administration a on a.dispute_id=g.dispute_id
    where g.id=gid and private.dispute_is_visible(g.dispute_id)
    and not exists(select from private.game_visibility_heads h where h.game_id=g.id and h.visibility='draft')
    and (a.status<>'cancelled'
      or exists(select from public.published_games p where p.game_id=g.id)
      or private.dispute_game_decision(g.id) in ('wo','award'))
  )
$$;
alter policy read_confirmed_statistics on public.published_statistics
  using (private.dispute_is_visible(dispute_id));
alter policy read_confirmed_achievements on public.published_achievements
  using (private.dispute_is_visible(dispute_id) and not private.dispute_has_game_drafts(dispute_id));

create function private.dispute_current_context(did uuid, original jsonb default null) returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(original,jsonb_build_object('championshipId',c.id,'seasonId',s.id,'year',s.year,
      'gender',d.gender,'category',d.category,'division',d.division))
    || jsonb_build_object('name',c.name)
  from public.disputes d join public.seasons s on s.id=d.season_id
  join public.championships c on c.id=s.championship_id
  where d.id=did and private.dispute_is_visible(did)
$$;

-- A confirmed profile is independent in public. Within a test preview it
-- appears only for someone whose participation or honor is in that test.
create function private.preview_player_is_visible(pid uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select private.preview_dispute_id() is null or exists(
    select from public.published_player_games p where p.person_id=pid
      and p.dispute_id=private.preview_dispute_id() and private.game_is_public(p.game_id)
  ) or exists(
    select from public.published_achievements a where a.dispute_id=private.preview_dispute_id()
      and private.dispute_is_visible(a.dispute_id) and not private.dispute_has_game_drafts(a.dispute_id)
      and a.snapshot @> jsonb_build_object('honors',jsonb_build_array(
        jsonb_build_object('athletes',jsonb_build_array(jsonb_build_object('personId',pid)))))
  )
$$;
alter policy read_confirmed_player_profiles on public.published_player_profiles
  using (private.preview_player_is_visible(person_id));

create function private.replace_public_game_context(payload jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_set(payload,'{context}',private.dispute_current_context(
    (payload->>'disputeId')::uuid,payload->'context'))
$$;

create or replace function public.get_public_game(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select private.replace_public_game_context(snapshot)
  from public.published_games where game_id=p_id and private.game_is_public(game_id)
$$;
create or replace function public.get_public_game_detail(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare allowed boolean;
begin
  if not exists(select from public.published_games p
    where p.game_id=p_id and private.dispute_is_visible(p.dispute_id)) then return null; end if;
  if pg_catalog.to_regclass('private.game_visibility_heads') is not null then
    if pg_catalog.to_regprocedure('private.game_is_public(uuid)') is null then return null; end if;
    execute 'select private.game_is_public($1)' into allowed using p_id;
    if allowed is distinct from true then return null; end if;
  end if;
  return private.replace_public_game_context(private.get_public_game_detail(p_id));
end
$$;

create function private.dispute_listed_explicitly(did uuid) returns boolean
language sql stable set search_path='' as $$
  select exists(select from private.dispute_administration a where a.dispute_id=did
    and (a.visibility='public' or a.is_test))
$$;

create or replace function private.list_public_disputes(did uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare n integer; result jsonb;
begin
  select count(*),coalesce(jsonb_agg(jsonb_build_object(
    'disputeId',d.id,'context',private.dispute_current_context(d.id,v.snapshot->'context'),
    'registrations',coalesce(v.snapshot->'registrations','[]')) order by d.id),'[]')
    into n,result
  from public.disputes d
  left join private.public_standings_heads h on h.dispute_id=d.id
  left join private.public_standings_versions v on v.dispute_id=h.dispute_id and v.version=h.version
  where (did is null or d.id=did) and private.dispute_is_visible(d.id)
    and (h.dispute_id is not null or private.dispute_listed_explicitly(d.id));
  if n>1000 then raise sqlstate 'PT413' using message='public_catalog_too_large'; end if;
  return result;
end
$$;

create or replace function public.list_live_competition_disputes(p_dispute_id uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('disputeId',q.id,
    'context',private.dispute_current_context(q.id,q.doc->'context'),
    'registrations',coalesce(q.doc->'registrations','[]')) order by q.id),'[]')
  from (
    select d.id,private.get_live_competition_source(d.id) doc
    from public.disputes d
    where (p_dispute_id is null or d.id=p_dispute_id) and private.dispute_is_visible(d.id)
      and (private.dispute_listed_explicitly(d.id)
        or exists(select from private.competition_setups s where s.dispute_id=d.id)
        or exists(select from private.public_standings_heads h where h.dispute_id=d.id)
        or exists(select from public.published_games g where g.dispute_id=d.id))
    order by d.id limit 1000
  ) q where q.doc is not null or private.dispute_listed_explicitly(q.id)
$$;

create function public.get_public_dispute_status(p_dispute_id uuid) returns text
language sql stable security definer set search_path='' as $$
  select a.status from private.dispute_administration a
  where a.dispute_id=p_dispute_id and private.dispute_is_visible(a.dispute_id)
$$;

-- RLS applies to the narrow catalog projection, including cursor pages.
create function public.list_public_catalog_games(p_dispute_id uuid,p_after uuid) returns jsonb
language sql stable security invoker set search_path='' begin atomic
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.game_id,'disputeId',p.dispute_id,'context',private.dispute_current_context(p.dispute_id,p.snapshot->'context'),
    'game',p.snapshot->'game','home',p.snapshot#>'{facts,teams,home,points}',
    'away',p.snapshot#>'{facts,teams,away,points}') order by p.game_id),'[]')
  from (select * from public.published_games
    where (p_dispute_id is null or dispute_id=p_dispute_id)
      and (p_after is null or game_id>p_after) order by game_id limit 100) p;
end;

revoke all on function private.preview_dispute_id(),private.dispute_is_visible(uuid),
  private.dispute_current_context(uuid,jsonb),private.preview_player_is_visible(uuid),
  private.dispute_listed_explicitly(uuid),private.replace_public_game_context(jsonb),
  public.get_public_dispute_status(uuid),public.list_public_catalog_games(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function private.dispute_is_visible(uuid),private.preview_player_is_visible(uuid),
  private.dispute_current_context(uuid,jsonb),
  public.get_public_dispute_status(uuid),public.list_public_catalog_games(uuid,uuid) to anon,authenticated;
create or replace function public.get_public_standings(p_dispute_id uuid)
returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  source jsonb;
  allowed uuid[];
  group_phases jsonb;
  series jsonb;
begin
  if not private.dispute_is_visible(p_dispute_id) then return null; end if;
  source := private.get_public_standings(p_dispute_id);
  if source is not null then
    source := jsonb_set(source,'{context}',private.dispute_current_context(p_dispute_id,source->'context'));
  end if;
  if source is null or (not private.dispute_has_game_drafts(p_dispute_id) and not exists(select from private.dispute_administration where dispute_id=p_dispute_id and status='cancelled')) then
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
create or replace function public.get_live_competition_source(p_dispute_id uuid)
returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare source jsonb; visible_assignments jsonb;
begin
  if not private.dispute_is_visible(p_dispute_id) then return null; end if;
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
create or replace function private.public_search_entities() returns table(
 kind text, id uuid, name text, nickname text, abbreviation text, dispute_id uuid, aliases text[], scopes jsonb
) language sql stable security definer set search_path='' as $$
 with
 public_contexts as materialized (
  select g.dispute_id,g.snapshot->'context' context,(g.snapshot->>'publishedAt')::timestamptz stamp from public.published_games g where private.game_is_public(g.game_id)
  union all
  select h.dispute_id,v.snapshot->'context',(v.snapshot->>'publishedAt')::timestamptz
   from private.public_standings_heads h join private.public_standings_versions v using(dispute_id,version) where private.dispute_is_visible(h.dispute_id)
  union all
  select a.dispute_id,a.snapshot->'context',a.confirmed_at from public.published_achievements a where private.dispute_is_visible(a.dispute_id) and not private.dispute_has_game_drafts(a.dispute_id)
  union all
  select a.dispute_id,private.dispute_current_context(a.dispute_id),'-infinity'::timestamptz
  from private.dispute_administration a where private.dispute_is_visible(a.dispute_id)
    and private.dispute_listed_explicitly(a.dispute_id)
 ),
 contexts as materialized (
  select distinct on(dispute_id) dispute_id,private.dispute_current_context(dispute_id,context) context,stamp from public_contexts order by dispute_id,stamp desc,context::text
 ),
 players as materialized (
  select p.person_id id,p.snapshot#>>'{fact,person,name}' name,p.snapshot#>>'{fact,person,nickname}' nickname,
   p.dispute_id,(p.snapshot#>>'{fact,publishedAt}')::timestamptz stamp,1 priority from public.published_player_games p where private.game_is_public(p.game_id)
  union all
  select p.person_id,p.snapshot#>>'{person,name}',p.snapshot#>>'{person,nickname}',null::uuid,
   (p.snapshot->>'confirmedAt')::timestamptz,0 from public.published_player_profiles p where private.preview_player_is_visible(p.person_id)
  union all
  select (r->>'personId')::uuid,r->>'name',r->>'nickname',a.dispute_id,a.confirmed_at,2
   from public.published_achievements a cross join lateral jsonb_array_elements(a.snapshot->'honors') h
   cross join lateral jsonb_array_elements(h->'athletes') r where private.dispute_is_visible(a.dispute_id) and not private.dispute_has_game_drafts(a.dispute_id)
 ),
 player_names as (
  select distinct on(id) id,name,nickname,dispute_id from players
   order by id,stamp desc nulls last,priority,name,nickname,dispute_id
 ),
 registrations as materialized (
  select g.dispute_id,(r->>'registrationId')::uuid registration_id,r->>'name' name,
   (r#>>'{team,id}')::uuid team_id,r#>>'{team,name}' team_name,r#>>'{team,abbreviation}' abbreviation,
   (g.snapshot->>'publishedAt')::timestamptz stamp,true has_results
   from public.published_games g cross join lateral jsonb_array_elements(jsonb_build_array(g.snapshot#>'{game,home}',g.snapshot#>'{game,away}')) r where private.game_is_public(g.game_id)
  union all
  select h.dispute_id,(r->>'id')::uuid,r->>'name',(r#>>'{team,id}')::uuid,r#>>'{team,name}',r#>>'{team,abbreviation}',
   (v.snapshot->>'publishedAt')::timestamptz,false
   from private.public_standings_heads h join private.public_standings_versions v using(dispute_id,version)
   cross join lateral jsonb_array_elements(v.snapshot->'registrations') r where private.dispute_is_visible(h.dispute_id)
  union all
  select a.dispute_id,(r->>'registrationId')::uuid,r->>'name',(r->>'teamId')::uuid,r->>'name',null::text,a.confirmed_at,false
   from public.published_achievements a cross join lateral jsonb_array_elements(a.snapshot->'placements') p
   cross join lateral jsonb_array_elements(p->'registrations') r where private.dispute_is_visible(a.dispute_id) and not private.dispute_has_game_drafts(a.dispute_id)
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
  array(select distinct unnest(array[r.context->>'name',concat_ws(' ',r.context->>'name',r.context->>'year',case r.context->>'gender' when 'masculino' then 'Masculino' else 'Feminino' end,r.context->>'category',r.context->>'division')]) from contexts r where r.context->>'championshipId'=c.id::text) || array(select distinct r.context->>'name' from public_contexts r where r.context->>'championshipId'=c.id::text),
  (select jsonb_agg(jsonb_build_object('disputeId',r.dispute_id,'context',r.context)
   order by (r.context->>'year')::integer desc,r.context->>'gender',r.context->>'category',r.context->>'division',r.dispute_id)
   from contexts r where r.context->>'championshipId'=c.id::text) from competition_names c
$$;
create or replace function public.search_public_entities_full(p_query text,p_type text default 'all',p_page integer default 1,p_entity_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare needle text;page_size integer;body jsonb;begin
 if p_query is null or length(p_query)>120 or p_query~'[[:cntrl:]]' or p_type is null or p_type not in('all','players','teams','competitions') or p_page is null or p_page<1 or (p_entity_id is not null and p_type='all') then
  raise sqlstate 'PT400' using message='invalid_public_search';
 end if;
 needle:=private.public_search_key(p_query);
 if length(needle)<2 then raise sqlstate 'PT400' using message='invalid_public_search';end if;
 page_size:=20;
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
 select jsonb_build_object('query',btrim(p_query),'type',p_type,'view','results','entityId',p_entity_id,'page',least(p_page,b.pages),'totalPages',b.pages,
  'counts',jsonb_build_object('players',b.players,'teams',b.teams,'competitions',b.competitions),
  'results',coalesce((select jsonb_agg(
    jsonb_build_object('kind',v.kind,'id',v.id,'name',v.name)||case v.kind
     when 'players' then jsonb_build_object('nickname',v.nickname,'disputeId',v.dispute_id,'latestTeam',(
       select p.snapshot#>>'{fact,registration,name}' from public.published_player_games p
       where p.person_id=v.id and private.game_is_public(p.game_id)
       order by p.snapshot#>>'{game,date}' desc nulls last,
                p.snapshot#>>'{game,time}' desc nulls last,p.game_id desc
       limit 1))
     when 'teams' then jsonb_build_object('abbreviation',v.abbreviation,'participations',v.scopes)
     else jsonb_build_object('disputes',v.scopes,'directDisputeId',case when strpos(private.public_search_key(v.name),needle)=0 then
       (select case when count(*)=1 then min(s->>'disputeId') else null end from jsonb_array_elements(v.scopes) s
        where strpos(private.public_search_key(concat_ws(' ',s#>>'{context,name}',s#>>'{context,year}',case s#>>'{context,gender}' when 'masculino' then 'Masculino' else 'Feminino' end,s#>>'{context,category}',s#>>'{context,division}')),needle)>0)
       else null end) end order by v.kind,v.n) from visible v),'[]'::jsonb)) into body from bounds b;
 if octet_length(body::text)>1048576 then raise sqlstate 'PT413' using message='public_search_too_large';end if;
 return body;
end$$;

-- Current labels belong to presentation projections. Stored publication
-- payloads and audit versions remain the original documents.
create function public.get_public_dispute_context(p_dispute_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select private.dispute_current_context(p_dispute_id)
$$;
revoke all on function public.get_public_dispute_context(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_public_dispute_context(uuid) to anon,authenticated;

create or replace function public.get_public_achievements(p_dispute_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_set(snapshot,'{context,name}',public.get_public_dispute_context(dispute_id)->'name')
  from public.published_achievements where dispute_id=p_dispute_id
$$;
create or replace function public.get_public_statistics_page(p_dispute_id uuid,p_version integer,p_after uuid default null) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare h public.published_statistics%rowtype;r record;items jsonb[]:='{}';item jsonb;total integer:=0;bytes integer:=0;last_id uuid;more boolean:=false;body jsonb;begin
 if p_dispute_id is null or p_version is null or p_version<1 then raise sqlstate 'PT400' using message='invalid_statistics_page';end if;
 select * into h from public.published_statistics where dispute_id=p_dispute_id;
 if not found then raise sqlstate 'PT404' using message='statistics_context_not_found';end if;
 if h.version<>p_version then raise sqlstate 'PT409' using message='statistics_source_changed';end if;
 for r in select m.game_id,m.phase,jsonb_set(p.snapshot,'{context,name}',public.get_public_dispute_context(m.dispute_id)->'name') snapshot from public.published_statistics_games m
  join public.published_games p on p.game_id=m.game_id and p.dispute_id=m.dispute_id and p.version=m.publication_version
  where m.dispute_id=p_dispute_id and (p_after is null or m.game_id>p_after) order by m.game_id limit 101
 loop
  item:=jsonb_build_object('phase',r.phase,'snapshot',r.snapshot);
  if total=100 or bytes+octet_length(item::text)>3145728 then more:=true;exit;end if;
  items:=array_append(items,item);total:=total+1;bytes:=bytes+octet_length(item::text)+2;last_id:=r.game_id;
 end loop;
 if more and total=0 then raise sqlstate 'PT413' using message='statistics_page_too_large';end if;
 body:=jsonb_build_object('kind','confirmed-statistics-page-v1','disputeId',p_dispute_id,'version',h.version,'after',p_after,'next',case when more then last_id else null end,'games',to_jsonb(items));
 if octet_length(body::text)>4194304 then raise sqlstate 'PT413' using message='statistics_page_too_large';end if;
 return body;
end$$;
create or replace function public.get_public_statistics_source(p_dispute_id uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare h public.published_statistics%rowtype;body jsonb;games jsonb;bytes bigint;n integer;begin
 select * into h from public.published_statistics where dispute_id=p_dispute_id;
 if not found then return null;end if;
 body:=(h.snapshot-'gameCount')||jsonb_build_object('kind','confirmed-statistics-v1','games','[]'::jsonb);
 select count(*),coalesce(sum(octet_length(jsonb_build_object('phase',m.phase,'snapshot',jsonb_set(p.snapshot,'{context,name}',public.get_public_dispute_context(m.dispute_id)->'name'))::text)),0) into n,bytes
 from public.published_statistics_games m join public.published_games p on p.game_id=m.game_id and p.dispute_id=m.dispute_id and p.version=m.publication_version where m.dispute_id=p_dispute_id;
 if bytes+2*greatest(n-1,0)+octet_length(body::text)>4194304 then raise sqlstate 'PT413' using message='statistics_source_too_large';end if;
 select coalesce(jsonb_agg(jsonb_build_object('phase',m.phase,'snapshot',jsonb_set(p.snapshot,'{context,name}',public.get_public_dispute_context(m.dispute_id)->'name')) order by m.game_id),'[]'::jsonb) into games
 from public.published_statistics_games m join public.published_games p on p.game_id=m.game_id and p.dispute_id=m.dispute_id and p.version=m.publication_version where m.dispute_id=p_dispute_id;
 return jsonb_set(body,'{games}',games);
end$$;
create or replace function public.get_player_career_source(p_person_id uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare profile jsonb;parts jsonb;honors jsonb;placements jsonb;body jsonb;begin
 if p_person_id is null then raise sqlstate 'PT400' using message='invalid_player_identity';end if;
 profile:=public.get_public_player_profile(p_person_id);
 select coalesce(jsonb_agg(x.snapshot order by x.game_id),'[]'::jsonb) into parts
 from (select jsonb_set(snapshot,'{fact,context,name}',public.get_public_dispute_context(dispute_id)->'name',false) snapshot,game_id from public.published_player_games where person_id=p_person_id order by game_id limit 10001) x;
 if jsonb_array_length(parts)>10000 then raise sqlstate 'PT413' using message='player_career_source_too_large';end if;
 select coalesce(jsonb_agg(x.value order by x.dispute_id,x.honor_id),'[]'::jsonb) into honors from (
  select a.dispute_id,h->>'id' honor_id,jsonb_build_object('disputeId',a.dispute_id,'version',a.version,'confirmedAt',a.snapshot->'confirmedAt','context',jsonb_set(a.snapshot->'context','{name}',public.get_public_dispute_context(a.dispute_id)->'name'),
   'honor',jsonb_build_object('id',h->'id','title',h->'title'),
   'recipient',jsonb_build_object('personId',r->'personId','name',r->'name','nickname',r->'nickname','publicBirthYear',r->'publicBirthYear')) value
  from public.published_achievements a cross join lateral jsonb_array_elements(a.snapshot->'honors') h cross join lateral jsonb_array_elements(h->'athletes') r
  where a.snapshot @> jsonb_build_object('honors',jsonb_build_array(jsonb_build_object('athletes',jsonb_build_array(jsonb_build_object('personId',p_person_id)))))
   and r->>'personId'=p_person_id::text
  limit 10001
 ) x;
 if jsonb_array_length(honors)>10000 then raise sqlstate 'PT413' using message='player_career_source_too_large';end if;
 select coalesce(jsonb_agg(x.value order by x.dispute_id,x.registration_id),'[]'::jsonb) into placements from (
  select a.dispute_id,r->>'registrationId' registration_id,
   jsonb_build_object('disputeId',a.dispute_id,'version',a.version,'confirmedAt',a.snapshot->'confirmedAt','context',jsonb_set(a.snapshot->'context','{name}',public.get_public_dispute_context(a.dispute_id)->'name'),'position',p->'position','registration',r) value
  from public.published_achievements a cross join lateral jsonb_array_elements(a.snapshot->'placements') p cross join lateral jsonb_array_elements(p->'registrations') r
  where exists(select 1 from public.published_player_games g where g.person_id=p_person_id and g.dispute_id=a.dispute_id and g.snapshot#>>'{fact,registration,registrationId}'=r->>'registrationId' and g.snapshot#>>'{fact,registration,team,id}'=r->>'teamId')
  limit 10001
 ) x;
 if jsonb_array_length(placements)>10000 then raise sqlstate 'PT413' using message='player_career_source_too_large';end if;
 if profile is null and jsonb_array_length(parts)=0 and jsonb_array_length(honors)=0 then return null;end if;
 body:=jsonb_build_object('kind','confirmed-player-career-v1','personId',p_person_id,'profile',profile,'participations',parts,'honors',honors,'teamPlacements',placements);
 if octet_length(body::text)>4194304 then raise sqlstate 'PT413' using message='player_career_source_too_large';end if;
 return body;
end$$;

create function private.require_test_dispute(did uuid) returns void
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select from public.admin_access where user_id=auth.uid() and enabled)
    then raise sqlstate 'PT403' using message='forbidden'; end if;
  if not exists(select from private.dispute_administration where dispute_id=did and is_test)
    then raise sqlstate 'PT404' using message='test_dispute_not_found'; end if;
end
$$;

-- Keep the authenticated role when reusing public readers, so the same RLS
-- policies apply. The transaction-local scope is restored before returning.
create function public.read_test_dispute(p_id uuid,p_operation text,p_args jsonb) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare
  previous_scope text:=current_setting('bdb.preview_dispute',true);
  result jsonb;
  q text:=p_args->>'p_query';
  filter_id uuid:=(p_args->>'p_dispute_id')::uuid;
  person_id uuid:=(p_args->>'p_person_id')::uuid;
  game_id uuid:=(p_args->>'p_id')::uuid;
  needle text:=p_args->>'term';
begin
  perform private.require_test_dispute(p_id);
  perform set_config('bdb.preview_dispute',p_id::text,true);
  case p_operation
    when 'list_public_catalog_games' then
      result:=public.list_public_catalog_games(filter_id,(p_args->>'p_after')::uuid);
    when 'list_public_disputes' then result:=public.list_public_disputes(filter_id);
    when 'list_live_competition_disputes' then result:=public.list_live_competition_disputes(filter_id);
    when 'get_public_dispute_status' then result:=to_jsonb(public.get_public_dispute_status(filter_id));
    when 'get_public_game' then result:=public.get_public_game(game_id);
    when 'get_public_game_detail' then result:=public.get_public_game_detail(game_id);
    when 'get_public_standings' then result:=public.get_public_standings(filter_id);
    when 'get_live_competition_source' then result:=public.get_live_competition_source(filter_id);
    when 'get_public_achievements' then result:=public.get_public_achievements(filter_id);
    when 'get_public_statistics_head' then result:=public.get_public_statistics_head(filter_id);
    when 'get_public_statistics_page' then
      result:=public.get_public_statistics_page(filter_id,(p_args->>'p_version')::integer,(p_args->>'p_after')::uuid);
    when 'get_player_career_source' then result:=public.get_player_career_source(person_id);
    when 'get_player_career_with_age' then result:=public.get_player_career_with_age(person_id);
    when 'search_public_entities' then
      result:=public.search_public_entities(q,p_args->>'p_type',(p_args->>'p_page')::integer,(p_args->>'p_entity_id')::uuid);
    when 'search_public_entities_full' then
      result:=public.search_public_entities_full(q,p_args->>'p_type',(p_args->>'p_page')::integer,(p_args->>'p_entity_id')::uuid);
    when 'published_player_games' then
      select coalesce(jsonb_agg(x.item order by x.person_id,x.game_id),'[]') into result
      from (select p.person_id,p.game_id,jsonb_build_object('person',p.snapshot#>'{fact,person}','disputeId',p.dispute_id) item
        from public.published_player_games p where p.dispute_id=p_id
        and (strpos(lower(p.snapshot#>>'{fact,person,name}'),lower(needle))>0
         or strpos(lower(p.snapshot#>>'{fact,person,nickname}'),lower(needle))>0)
        order by p.person_id,p.game_id limit 50) x;
    when 'published_player_profiles' then
      select coalesce(jsonb_agg(x.item order by x.person_id),'[]') into result
      from (select p.person_id,jsonb_build_object('id',p.person_id,'name',p.snapshot#>'{person,name}',
        'nickname',p.snapshot#>'{person,nickname}') item from public.published_player_profiles p
        where strpos(lower(p.snapshot#>>'{person,name}'),lower(needle))>0
         or strpos(lower(p.snapshot#>>'{person,nickname}'),lower(needle))>0
        order by p.person_id limit 50) x;
    else raise sqlstate 'PT400' using message='invalid_test_preview_operation';
  end case;
  perform set_config('bdb.preview_dispute',coalesce(previous_scope,''),true);
  return result;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise sqlstate 'PT400' using message='invalid_test_preview_query';
end
$$;
revoke all on function private.require_test_dispute(uuid),public.read_test_dispute(uuid,text,jsonb)
  from public,anon,authenticated,service_role;
grant execute on function private.require_test_dispute(uuid),public.read_test_dispute(uuid,text,jsonb)
  to authenticated;
