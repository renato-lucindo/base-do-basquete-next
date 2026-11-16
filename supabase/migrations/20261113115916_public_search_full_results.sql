-- Full public results, independent of the deployed autocomplete contract.
-- Team is the latest published registration by the same date/time/ID order as the athlete profile.
-- The indexed person lookup runs only for players on the requested page.
create function public.search_public_entities_full(p_query text,p_type text default 'all',p_page integer default 1,p_entity_id uuid default null)
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
       where p.person_id=v.id
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
revoke all on function public.search_public_entities_full(text,text,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.search_public_entities_full(text,text,integer,uuid) to anon,authenticated;
