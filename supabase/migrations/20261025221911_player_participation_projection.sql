-- Internal adapter of ALREADY CONFIRMED public snapshots. No live identity/roster reads.
create function private.normalize_player_publication(g jsonb,stats_version integer,minimum_seconds integer,confirmed_phase text) returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare players jsonb;pdf boolean;p jsonb;person jsonb;registration jsonb;base jsonb;fact jsonb;advanced jsonb;score_origin jsonb;advanced_origin jsonb;result jsonb:='[]';side text;played boolean;seen uuid[]:='{}';pid uuid;
begin
 if stats_version is null or stats_version<1 or minimum_seconds is null or minimum_seconds<1 or (confirmed_phase is not null and confirmed_phase not in ('round_robin','knockout'))
 or not private.regulation_uuid(g->'id') or not private.regulation_uuid(g->'disputeId')
 or not private.regulation_integer(g->'version',1,2147483647)
 or jsonb_typeof(g->'publishedAt') is distinct from 'string'
 or not coalesce(g#>>'{source,kind}' in ('sheet','pdf'),false)
 or not private.context_keys(g->'context',array['championshipId','seasonId','name','year','gender','category','division'])
 or not private.context_keys(g->'game',array['date','time','timeZone','venue','number','home','away'])
 then raise sqlstate 'PT400' using message='invalid_confirmed_player_source';end if;
 players:=g#>'{facts,players}';pdf:=g#>>'{source,kind}'='pdf';
 if jsonb_typeof(players) is distinct from 'array' or jsonb_array_length(players) not between 10 and 24
 or (pdf and jsonb_typeof(g#>'{facts,origins}') is distinct from 'object')
 then raise sqlstate 'PT400' using message='invalid_confirmed_player_source';end if;
 base:=jsonb_build_object('normalizationVersion','confirmed-statistics-v1','gameId',(g->>'id')::uuid,'disputeId',(g->>'disputeId')::uuid,'publicationVersion',g->'version','publishedAt',g->'publishedAt','context',g->'context','source',g->'source','phase',confirmed_phase);
 score_origin:=case when pdf then g#>'{facts,origins,scorePoints}' else jsonb_build_object('kind','sheet','version',g#>'{source,version}') end;
 advanced_origin:=case when pdf then g#>'{facts,origins,playerAdvanced}' else null end;
 for p in select value from jsonb_array_elements(players) loop
  if not private.context_keys(p->'person',array['id','name','nickname']) or not private.regulation_uuid(p#>'{person,id}')
  or jsonb_typeof(p->'played') is distinct from 'boolean' or jsonb_typeof(p->'starter') is distinct from 'boolean' or jsonb_typeof(p->'captain') is distinct from 'boolean'
  or p->>'side' not in ('home','away')
  then raise sqlstate 'PT400' using message='invalid_confirmed_player_source';end if;
  pid:=(p#>>'{person,id}')::uuid;
  if pid=any(seen) then raise sqlstate 'PT400' using message='duplicate_confirmed_player';end if;seen:=array_append(seen,pid);
  side:=p->>'side';played:=(p->>'played')::boolean;registration:=g->'game'->side;
  if not private.context_keys(registration,array['registrationId','name','team']) or not private.context_keys(registration->'team',array['id','name','abbreviation'])
  or not private.regulation_uuid(registration->'registrationId') or not private.regulation_uuid(registration#>'{team,id}')
  or not private.regulation_uuid(p->'registrationId') or (p->>'registrationId')::uuid<>(registration->>'registrationId')::uuid
  then raise sqlstate 'PT400' using message='invalid_confirmed_player_registration';end if;
  person:=jsonb_build_object('id',pid,'name',p#>'{person,name}','nickname',p#>'{person,nickname}');
  registration:=jsonb_set(jsonb_set(registration,'{registrationId}',to_jsonb((registration->>'registrationId')::uuid)),'{team,id}',to_jsonb((registration#>>'{team,id}')::uuid));
  advanced:=case when pdf and played and jsonb_typeof(p->'advanced')='object' then p->'advanced' else null end;
  fact:=base||jsonb_build_object('person',person,'registration',registration,'side',side,'jersey',p->'jersey','played',p->'played','starter',p->'starter','captain',p->'captain',
   'scoring',case when played then jsonb_build_object('origin',score_origin,'points',p->'points','twoMade',p->'two','threeMade',p->'three','freeMade',p->'free') else null end,
   'advanced',case when advanced is not null then jsonb_build_object('origin',advanced_origin,'statistics',advanced) else null end,
   'foulsCommitted',case when played and not pdf then jsonb_build_object('origin',score_origin,'value',p->'fouls') when advanced is not null then jsonb_build_object('origin',advanced_origin,'value',advanced->'foulsCommitted') else null end,
   'foulsReceived',case when pdf and played and p->'foulsReceived'<>'null'::jsonb then jsonb_build_object('origin',g#>'{facts,origins,foulsReceived}','value',p->'foulsReceived') else null end,
   'discipline',case when not pdf and played then p->'status' else null end);
  result:=result||jsonb_build_array(jsonb_build_object('kind','confirmed-player-game-v1','statisticsVersion',stats_version,'minimumSeconds',minimum_seconds,'game',g->'game','fact',fact));
 end loop;
 return result;
exception when invalid_text_representation or numeric_value_out_of_range then raise sqlstate 'PT400' using message='invalid_confirmed_player_source';
end$$;

-- Recipient lookup is indexed; placements use the person's confirmed dispute/registration keys.
create index published_achievements_recipient_lookup on public.published_achievements using gin(snapshot jsonb_path_ops);
create function public.get_player_career_source(p_person_id uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare profile jsonb;parts jsonb;honors jsonb;placements jsonb;body jsonb;begin
 if p_person_id is null then raise sqlstate 'PT400' using message='invalid_player_identity';end if;
 profile:=public.get_public_player_profile(p_person_id);
 select coalesce(jsonb_agg(x.snapshot order by x.game_id),'[]'::jsonb) into parts
 from (select snapshot,game_id from public.published_player_games where person_id=p_person_id order by game_id limit 10001) x;
 if jsonb_array_length(parts)>10000 then raise sqlstate 'PT413' using message='player_career_source_too_large';end if;
 select coalesce(jsonb_agg(x.value order by x.dispute_id,x.honor_id),'[]'::jsonb) into honors from (
  select a.dispute_id,h->>'id' honor_id,jsonb_build_object('disputeId',a.dispute_id,'version',a.version,'confirmedAt',a.snapshot->'confirmedAt','context',a.snapshot->'context',
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
   jsonb_build_object('disputeId',a.dispute_id,'version',a.version,'confirmedAt',a.snapshot->'confirmedAt','context',a.snapshot->'context','position',p->'position','registration',r) value
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
revoke all on function public.get_player_career_source(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_player_career_source(uuid) to anon,authenticated;
revoke all on function private.normalize_player_publication(jsonb,integer,integer,text) from public,anon,authenticated,service_role;

create table public.published_player_games (
 person_id uuid not null,game_id uuid not null,dispute_id uuid not null,
 publication_version integer not null,statistics_version integer not null,
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=65536),
 primary key(person_id,game_id),
 foreign key(game_id,publication_version,person_id) references private.game_publication_entries(game_id,version,person_id) on delete restrict,
 foreign key(game_id,dispute_id) references public.games(id,dispute_id) on delete restrict,
 foreign key(dispute_id,statistics_version) references private.statistics_publication_versions(dispute_id,version) on delete restrict,
 check(snapshot->>'kind'='confirmed-player-game-v1' and snapshot#>>'{fact,person,id}'=person_id::text and snapshot#>>'{fact,gameId}'=game_id::text and snapshot#>>'{fact,disputeId}'=dispute_id::text and snapshot#>>'{fact,publicationVersion}'=publication_version::text and snapshot->>'statisticsVersion'=statistics_version::text)
);
create index published_player_games_person_context on public.published_player_games(person_id,dispute_id,game_id);
create index published_player_games_publication on public.published_player_games(game_id,publication_version,person_id);
create index published_player_games_context on public.published_player_games(game_id,dispute_id);
create index published_player_games_statistics on public.published_player_games(dispute_id,statistics_version);
alter table public.published_player_games enable row level security;
revoke all on public.published_player_games from public,anon,authenticated,service_role;
grant select on public.published_player_games to anon,authenticated;
create policy read_confirmed_player_games on public.published_player_games for select to anon,authenticated using(true);

create function private.refresh_player_game(gid uuid) returns void language plpgsql volatile security definer set search_path='' as $$
declare root uuid;g public.published_games%rowtype;stats_version integer;minimum_seconds integer;phase text;items jsonb;begin
 select s.championship_id into root from public.games x join public.disputes d on d.id=x.dispute_id join public.seasons s on s.id=d.season_id where x.id=gid;
 if root is null then raise sqlstate 'PT404' using message='player_game_not_found';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 select * into g from public.published_games where game_id=gid for share;
 if not found then delete from public.published_player_games where game_id=gid;return;end if;
 if not exists(select 1 from private.game_publication_versions v where v.game_id=gid and v.version=g.version and v.snapshot=g.snapshot)
 then raise sqlstate 'PT409' using message='player_game_source_conflict';end if;
 -- The statistics trigger runs first; only its already-public metadata is eligible.
 select h.version,m.minimum_seconds,item->>'phase' into stats_version,minimum_seconds,phase
 from public.published_statistics h join private.statistics_publication_versions m on m.dispute_id=h.dispute_id and m.version=h.version
 cross join lateral jsonb_array_elements(h.snapshot->'games') item
 where h.dispute_id=g.dispute_id and item#>>'{snapshot,id}'=gid::text and item#>>'{snapshot,version}'=g.version::text
 and (h.snapshot->>'minimumSeconds')::integer=m.minimum_seconds;
 if not found then raise sqlstate 'PT409' using message='player_statistics_source_conflict';end if;
 items:=private.normalize_player_publication(g.snapshot,stats_version,minimum_seconds,phase);
 delete from public.published_player_games where game_id=gid;
 insert into public.published_player_games(person_id,game_id,dispute_id,publication_version,statistics_version,snapshot)
 select (x#>>'{fact,person,id}')::uuid,gid,g.dispute_id,g.version,stats_version,x from jsonb_array_elements(items) x;
end$$;
create function private.on_confirmed_player_games() returns trigger language plpgsql volatile security definer set search_path='' as $$begin
 if tg_op='UPDATE' and new.version=old.version and new.snapshot=old.snapshot then return new;end if;
 if tg_op='DELETE' then perform private.refresh_player_game(old.game_id);return old;end if;
 perform private.refresh_player_game(new.game_id);return new;
end$$;
-- PostgreSQL executes same-event triggers alphabetically: confirmed_game_statistics precedes this.
create trigger confirmed_player_games after insert or update or delete on public.published_games for each row execute function private.on_confirmed_player_games();
revoke all on function private.refresh_player_game(uuid),private.on_confirmed_player_games() from public,anon,authenticated,service_role;
-- Owner-only backfill is deterministic and leaves result/history/cadastre unchanged.
do $$declare gid uuid;begin
 for gid in select p.game_id from public.published_games p join public.disputes d on d.id=p.dispute_id join public.seasons s on s.id=d.season_id order by s.championship_id,p.game_id loop
  perform private.refresh_player_game(gid);
 end loop;
end$$;
