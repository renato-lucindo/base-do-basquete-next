-- R3b: immutable declarative definitions; private entry points re-read official facts.
create function private.regulation_uuid(v jsonb) returns boolean language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_typeof(v)='string' and (v#>>'{}')~'^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',false)
$$;
create function private.regulation_ids(v jsonb,maximum integer) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare x jsonb;begin
 if jsonb_typeof(v) is distinct from 'array' or jsonb_array_length(v)>maximum then return false;end if;
 for x in select value from jsonb_array_elements(v) loop if not private.regulation_uuid(x) then return false;end if;end loop;
 return (select count(*)=count(distinct (value#>>'{}')::uuid) from jsonb_array_elements(v));
end$$;
create function private.regulation_integer(v jsonb,minimum integer,maximum integer) returns boolean language sql immutable security invoker set search_path='' as $$
 select coalesce(private.pdf_number(v,false,true,true) and (v::text)::numeric between minimum and maximum,false)
$$;
create function private.regulation_reference(v jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$begin
 case v->>'kind'
 when 'registration' then return private.context_keys(v,array['kind','registrationId']) and private.regulation_uuid(v->'registrationId');
 when 'group_rank' then return private.context_keys(v,array['kind','phaseId','groupId','position']) and private.regulation_uuid(v->'phaseId') and private.regulation_uuid(v->'groupId') and private.regulation_integer(v->'position',1,1000);
 when 'series_winner','series_loser' then return private.context_keys(v,array['kind','seriesId']) and private.regulation_uuid(v->'seriesId');
 else return false;end case;
end$$;
create function private.valid_regulation_definition(d jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare p jsonb;g jsonb;n jsonb;r jsonb;x jsonb;target jsonb;wo jsonb;points jsonb;refs uuid[];phases uuid[]:='{}';knockouts uuid[]:='{}';series_ids uuid[]:='{}';group_ids uuid[];members uuid[];group_members uuid[];assigned uuid[]:='{}';ids uuid[];slots integer[];slot integer;maximum integer;group_count integer:=0;
begin
 if octet_length(d::text)>1048576 or not private.context_keys(d,array['registrationIds','occurrenceRules','groupPhases','knockoutPhases','series']) or not private.regulation_ids(d->'registrationIds',1000) then return false;end if;
 if not private.context_keys(d->'occurrenceRules',array['wo']) then return false;end if;
 wo:=d#>'{occurrenceRules,wo}';
 if wo<>'null'::jsonb then
  if not private.context_keys(wo,array['winnerLeaguePoints','loserLeaguePoints','score']) or not private.regulation_integer(wo->'winnerLeaguePoints',-1000000,1000000) or not private.regulation_integer(wo->'loserLeaguePoints',-1000000,1000000) then return false;end if;
  if wo->'score'<>'null'::jsonb and (not private.context_keys(wo->'score',array['winner','loser']) or not private.regulation_integer(wo#>'{score,winner}',0,2147483647) or not private.regulation_integer(wo#>'{score,loser}',0,2147483647) or (wo#>>'{score,winner}')::numeric<=(wo#>>'{score,loser}')::numeric) then return false;end if;
 end if;
 if jsonb_typeof(d->'groupPhases') is distinct from 'array' or jsonb_array_length(d->'groupPhases')>64 or jsonb_typeof(d->'knockoutPhases') is distinct from 'array' or jsonb_array_length(d->'knockoutPhases')>64 or jsonb_typeof(d->'series') is distinct from 'array' or jsonb_array_length(d->'series')>256 then return false;end if;
 select coalesce(array_agg((value#>>'{}')::uuid),'{}') into refs from jsonb_array_elements(d->'registrationIds');
 for p in select value from jsonb_array_elements(d->'groupPhases') loop
  if not private.context_keys(p,array['phaseId','name','rules','groups']) or not private.regulation_uuid(p->'phaseId') or not private.pdf_text(p->'name',100,1) or btrim(p->>'name')='' or (p->>'phaseId')::uuid=any(phases) then return false;end if;
  phases:=array_append(phases,(p->>'phaseId')::uuid);r:=p->'rules';points:=r->'points';
  if not private.context_keys(r,array['format','points','tieBreakers']) or r->>'format' is distinct from 'round_robin' or not private.context_keys(points,array['win','loss']) or not private.regulation_integer(points->'win',-1000000,1000000) or not private.regulation_integer(points->'loss',-1000000,1000000) or jsonb_typeof(r->'tieBreakers') is distinct from 'array' or jsonb_array_length(r->'tieBreakers')>6 then return false;end if;
  if exists(select 1 from jsonb_array_elements(r->'tieBreakers') value where jsonb_typeof(value)<>'string' or (value#>>'{}') not in('wins','point_difference','points_for','head_to_head_points','head_to_head_difference','head_to_head_for')) or (select count(*)<>count(distinct value) from jsonb_array_elements(r->'tieBreakers') value) then return false;end if;
  if jsonb_typeof(p->'groups') is distinct from 'array' or jsonb_array_length(p->'groups')>1000 then return false;end if;
  group_ids:='{}';members:='{}';group_count:=group_count+jsonb_array_length(p->'groups');
  for g in select value from jsonb_array_elements(p->'groups') loop
   if not private.context_keys(g,array['id','name','registrationIds','gameIds']) or not private.regulation_uuid(g->'id') or not private.pdf_text(g->'name',100,1) or btrim(g->>'name')='' or (g->>'id')::uuid=any(group_ids) or not private.regulation_ids(g->'registrationIds',1000) or not private.regulation_ids(g->'gameIds',10000) then return false;end if;
   group_ids:=array_append(group_ids,(g->>'id')::uuid);
   select coalesce(array_agg((value#>>'{}')::uuid),'{}') into group_members from jsonb_array_elements(g->'registrationIds');
   if not group_members<@refs or group_members&&members then return false;end if;members:=members||group_members;
   select coalesce(array_agg((value#>>'{}')::uuid),'{}') into ids from jsonb_array_elements(g->'gameIds');
   if assigned&&ids then return false;end if;assigned:=assigned||ids;
  end loop;
 end loop;
 for p in select value from jsonb_array_elements(d->'knockoutPhases') loop
  if not private.context_keys(p,array['id','name']) or not private.regulation_uuid(p->'id') or not private.pdf_text(p->'name',100,1) or btrim(p->>'name')='' or (p->>'id')::uuid=any(phases) then return false;end if;
  knockouts:=array_append(knockouts,(p->>'id')::uuid);phases:=array_append(phases,(p->>'id')::uuid);
 end loop;
 for n in select value from jsonb_array_elements(d->'series') loop
  if not private.context_keys(n,array['id','phaseId','name','format','home','away','games']) or not private.regulation_uuid(n->'id') or not private.regulation_uuid(n->'phaseId') or not private.pdf_text(n->'name',100,1) or btrim(n->>'name')='' or (n->>'id')::uuid=any(series_ids) or not (n->>'phaseId')::uuid=any(knockouts) or coalesce(n->>'format','') not in('single','two_leg','best_of_3','best_of_5','best_of_7') then return false;end if;
  series_ids:=array_append(series_ids,(n->>'id')::uuid);
 end loop;
 for n in select value from jsonb_array_elements(d->'series') loop
  for x in select v from (values(n->'home'),(n->'away')) r(v) loop
   if not private.regulation_reference(x) then return false;end if;
   if x->>'kind'='registration' and not (x->>'registrationId')::uuid=any(refs) then return false;end if;
   if x->>'kind' in('series_winner','series_loser') and not (x->>'seriesId')::uuid=any(series_ids) then return false;end if;
   if x->>'kind'='group_rank' then
    select gg.value into target from jsonb_array_elements(d->'groupPhases') pp cross join lateral jsonb_array_elements(pp.value->'groups') gg where (pp.value->>'phaseId')::uuid=(x->>'phaseId')::uuid and (gg.value->>'id')::uuid=(x->>'groupId')::uuid;
    if not found or (x->>'position')::numeric>jsonb_array_length(target->'registrationIds') then return false;end if;
   end if;
  end loop;
  maximum:=case n->>'format' when 'single' then 1 when 'two_leg' then 2 when 'best_of_3' then 3 when 'best_of_5' then 5 else 7 end;slots:='{}';
  if jsonb_typeof(n->'games') is distinct from 'array' or jsonb_array_length(n->'games')>7 then return false;end if;
  for g in select value from jsonb_array_elements(n->'games') loop
   if not private.context_keys(g,array['slot','gameId']) or not private.regulation_integer(g->'slot',1,maximum) or not private.regulation_uuid(g->'gameId') then return false;end if;
   slot:=(g->>'slot')::numeric::integer;
   if slot=any(slots) or (g->>'gameId')::uuid=any(assigned) then return false;end if;
   slots:=array_append(slots,slot);assigned:=array_append(assigned,(g->>'gameId')::uuid);
  end loop;
 end loop;
 if cardinality(assigned)>10000 or group_count>1000 then return false;end if;
 return not exists(with recursive edges(a,b) as (
   select (n.value->>'id')::uuid,(r.ref->>'seriesId')::uuid from jsonb_array_elements(d->'series') n cross join lateral(values(n.value->'home'),(n.value->'away')) r(ref) where r.ref->>'kind' in('series_winner','series_loser')
  ), reach(a,b) as(select a,b from edges union select r.a,e.b from reach r join edges e on e.a=r.b) select 1 from reach where a=b);
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then return false;
end$$;

create table private.regulation_versions (
 dispute_id uuid not null references public.disputes(id) on delete restrict,version integer not null check(version>0),
 definition jsonb not null check(private.valid_regulation_definition(definition)),context jsonb not null check(jsonb_typeof(context)='object' and octet_length(context::text)<=16777216),
 context_fingerprint text not null check(context_fingerprint~'^[a-f0-9]{64}$'),algorithm_version text not null check(algorithm_version='organized-v1'),
 reason text not null check(length(reason)<=2000),saved_by uuid not null references auth.users(id) on delete restrict,saved_at timestamptz not null,
 primary key(dispute_id,version)
);
create index regulation_versions_actor on private.regulation_versions(saved_by);
create table private.regulation_heads (
 dispute_id uuid primary key references public.disputes(id) on delete restrict,version integer not null,
 foreign key(dispute_id,version) references private.regulation_versions(dispute_id,version) on delete restrict
);
create index regulation_heads_version on private.regulation_heads(dispute_id,version);
create table private.regulation_registration_links (
 dispute_id uuid not null,version integer not null,registration_id uuid not null,primary key(dispute_id,version,registration_id),
 foreign key(dispute_id,version) references private.regulation_versions(dispute_id,version) on delete restrict,
 foreign key(registration_id,dispute_id) references public.registrations(id,dispute_id) on delete restrict
);
create index regulation_registration_link_target on private.regulation_registration_links(registration_id,dispute_id);
create table private.regulation_game_links (
 dispute_id uuid not null,version integer not null,game_id uuid not null,game_version integer not null check(game_version>0),publication_version integer check(publication_version>0),
 primary key(dispute_id,version,game_id),foreign key(dispute_id,version) references private.regulation_versions(dispute_id,version) on delete restrict,
 foreign key(game_id,dispute_id) references public.games(id,dispute_id) on delete restrict,
 foreign key(game_id,publication_version) references private.game_publication_versions(game_id,version) on delete restrict
);
create index regulation_game_link_target on private.regulation_game_links(game_id,dispute_id);
create index regulation_game_link_publication on private.regulation_game_links(game_id,publication_version);
create table private.regulation_commands (
 command_id uuid primary key,actor_id uuid not null references auth.users(id) on delete restrict,payload jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp()
);
create index regulation_commands_actor on private.regulation_commands(actor_id);
alter table private.regulation_versions enable row level security;
alter table private.regulation_heads enable row level security;
alter table private.regulation_registration_links enable row level security;
alter table private.regulation_game_links enable row level security;
alter table private.regulation_commands enable row level security;
revoke all on private.regulation_versions,private.regulation_heads,private.regulation_registration_links,private.regulation_game_links,private.regulation_commands from public,anon,authenticated,service_role;
create policy never_direct_regulation_versions on private.regulation_versions as restrictive for all to public using(false) with check(false);
create policy never_direct_regulation_heads on private.regulation_heads as restrictive for all to public using(false) with check(false);
create policy never_direct_regulation_registration_links on private.regulation_registration_links as restrictive for all to public using(false) with check(false);
create policy never_direct_regulation_game_links on private.regulation_game_links as restrictive for all to public using(false) with check(false);
create policy never_direct_regulation_commands on private.regulation_commands as restrictive for all to public using(false) with check(false);
create function private.regulation_history_immutable() returns trigger language plpgsql security invoker set search_path='' as $$begin raise sqlstate 'PT409' using message='regulation_history_immutable';end$$;
create trigger regulation_versions_immutable before update or delete on private.regulation_versions for each row execute function private.regulation_history_immutable();
create trigger regulation_registrations_immutable before update or delete on private.regulation_registration_links for each row execute function private.regulation_history_immutable();
create trigger regulation_games_immutable before update or delete on private.regulation_game_links for each row execute function private.regulation_history_immutable();
create trigger regulation_commands_immutable before update or delete on private.regulation_commands for each row execute function private.regulation_history_immutable();

create function private.guard_regulation_group_opponents() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if exists(select 1 from private.regulation_heads h join private.regulation_versions v on v.dispute_id=h.dispute_id and v.version=h.version
  cross join lateral jsonb_array_elements(v.definition->'groupPhases') p cross join lateral jsonb_array_elements(p.value->'groups') g
  where h.dispute_id=old.dispute_id and exists(select 1 from jsonb_array_elements_text(g.value->'gameIds') a(id) where a.id::uuid=old.id)
  and (new.dispute_id<>old.dispute_id or not exists(select 1 from jsonb_array_elements_text(g.value->'registrationIds') r(id) where r.id::uuid=new.home_registration_id) or not exists(select 1 from jsonb_array_elements_text(g.value->'registrationIds') r(id) where r.id::uuid=new.away_registration_id)))
 then raise sqlstate 'PT409' using message='regulation_group_opponents_locked';end if;return new;
end$$;
create trigger regulation_group_opponents before update of dispute_id,home_registration_id,away_registration_id on public.games for each row when(old.dispute_id is distinct from new.dispute_id or old.home_registration_id is distinct from new.home_registration_id or old.away_registration_id is distinct from new.away_registration_id) execute function private.guard_regulation_group_opponents();

-- Caller holds the competition root lock; internal function is not executable by API roles.
create function private.regulation_context(did uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare r jsonb;begin
 if (select count(*)>1000 from public.registrations where dispute_id=did) or (select count(*)>10000 from public.games where dispute_id=did) then raise sqlstate 'PT413' using message='regulation_context_too_large';end if;
 select jsonb_build_object('registrationIds',coalesce((select jsonb_agg(id order by id) from public.registrations where dispute_id=did),'[]'::jsonb),
  'games',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'version',g.version,'disputeId',g.dispute_id,'homeRegistrationId',g.home_registration_id,'awayRegistrationId',g.away_registration_id) order by g.id) from public.games g where g.dispute_id=did),'[]'::jsonb),
  'publishedGames',coalesce((select jsonb_agg(jsonb_build_object('gameId',p.game_id,'publicationVersion',p.version,'disputeId',p.dispute_id,'homeRegistrationId',g.home_registration_id,'awayRegistrationId',g.away_registration_id,'homePoints',p.snapshot#>'{facts,teams,home,points}','awayPoints',p.snapshot#>'{facts,teams,away,points}','status','played','pointsSource',case when p.snapshot#>'{facts,origins,scorePoints}' is not null then p.snapshot#>'{facts,origins,scorePoints}' else jsonb_build_object('kind',p.snapshot#>'{source,kind}','version',p.snapshot#>'{source,version}') end) order by p.game_id) from public.published_games p join public.games g on g.id=p.game_id where p.dispute_id=did),'[]'::jsonb),
  'occurrences','[]'::jsonb,'withdrawals','[]'::jsonb) into r;
 return r;
end$$;
create function private.get_regulation_state(did uuid,off integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare root uuid;v private.regulation_versions%rowtype;ctx jsonb;begin
 perform 1 from public.admin_access a where a.user_id=auth.uid() and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if root is null then raise sqlstate 'PT404' using message='regulation_not_found';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('competition:'||root::text,0));
 select r.* into v from private.regulation_heads h join private.regulation_versions r on r.dispute_id=h.dispute_id and r.version=h.version where h.dispute_id=did;
 ctx:=private.regulation_context(did);
 return jsonb_build_object('disputeId',did,'version',coalesce(v.version,0),'definition',v.definition,'savedAt',v.saved_at,'contextFingerprint',encode(sha256(convert_to(ctx::text,'UTF8')),'hex'),'context',ctx,
  'history',coalesce((select jsonb_agg(jsonb_build_object('version',q.version,'savedAt',q.saved_at,'actorId',q.saved_by,'reason',q.reason) order by q.version desc) from(select * from private.regulation_versions where dispute_id=did order by version desc limit 20 offset greatest(0,least(coalesce(off,0),100000))) q),'[]'::jsonb),
  'hasMore',(select count(*)>20 from(select 1 from private.regulation_versions where dispute_id=did order by version desc limit 21 offset greatest(0,least(coalesce(off,0),100000))) q));
end$$;
create function private.get_regulation_version(did uuid,wanted integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform 1 from public.admin_access a where a.user_id=auth.uid() and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 return (select jsonb_build_object('disputeId',r.dispute_id,'version',r.version,'definition',r.definition,'contextFingerprint',r.context_fingerprint,'context',r.context,'savedAt',r.saved_at,'actorId',r.saved_by,'reason',r.reason,'algorithmVersion',r.algorithm_version) from private.regulation_versions r where r.dispute_id=did and r.version=wanted);
end$$;
create function private.save_regulation(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;did uuid;expected integer;root uuid;old integer;ctx jsonb;fp text;d jsonb;receipt private.regulation_commands%rowtype;next_version integer;now_at timestamptz;msg text;result jsonb;link record;g jsonb;p jsonb;rid uuid;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','disputeId','expectedVersion','expectedContextFingerprint','definition','reason','acknowledgeImpact']) or octet_length(p_command::text)>1048576 or not private.regulation_uuid(p_command->'commandId') or not private.regulation_uuid(p_command->'disputeId') or not private.regulation_integer(p_command->'expectedVersion',0,2147483646) or jsonb_typeof(p_command->'expectedContextFingerprint') is distinct from 'string' or (p_command->>'expectedContextFingerprint')!~'^[a-f0-9]{64}$' or jsonb_typeof(p_command->'reason') is distinct from 'string' or length(btrim(p_command->>'reason'))>2000 or jsonb_typeof(p_command->'acknowledgeImpact') is distinct from 'boolean' or not private.valid_regulation_definition(p_command->'definition') then raise sqlstate 'PT400' using message='invalid_regulation';end if;
 cmd:=(p_command->>'commandId')::uuid;did:=(p_command->>'disputeId')::uuid;expected:=(p_command->>'expectedVersion')::numeric::integer;d:=p_command->'definition';msg:=btrim(p_command->>'reason');
 perform pg_advisory_xact_lock(hashtextextended('regulation-command:'||cmd::text,0));
 select * into receipt from private.regulation_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;
 end if;
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if root is null then raise sqlstate 'PT400' using message='invalid_regulation';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 select version into old from private.regulation_heads where dispute_id=did for update;
 if coalesce(old,0)<>expected then raise sqlstate 'PT409' using message='version_conflict';end if;
 ctx:=private.regulation_context(did);fp:=encode(sha256(convert_to(ctx::text,'UTF8')),'hex');
 if fp<>p_command->>'expectedContextFingerprint' then raise sqlstate 'PT409' using message='context_conflict';end if;
 if jsonb_array_length(ctx->'publishedGames')>0 and (length(msg)<3 or p_command->'acknowledgeImpact'<>'true'::jsonb) then raise sqlstate 'PT400' using message='regulation_impact_required';end if;
 for rid in select (value#>>'{}')::uuid from jsonb_array_elements(d->'registrationIds') loop
  if not exists(select 1 from public.registrations where id=rid and dispute_id=did) then raise sqlstate 'PT400' using message='invalid_regulation_registration';end if;
 end loop;
 -- A group assignment must match the current opponents; series qualifiers are previewed, never written here.
 for p in select value from jsonb_array_elements(d->'groupPhases') loop for g in select value from jsonb_array_elements(p->'groups') loop
  if exists(select 1 from jsonb_array_elements_text(g->'gameIds') a(id) left join public.games game on game.id=a.id::uuid and game.dispute_id=did where game.id is null or not exists(select 1 from jsonb_array_elements_text(g->'registrationIds') r(id) where r.id::uuid=game.home_registration_id) or not exists(select 1 from jsonb_array_elements_text(g->'registrationIds') r(id) where r.id::uuid=game.away_registration_id)) then raise sqlstate 'PT400' using message='invalid_regulation_assignment';end if;
 end loop;end loop;
 next_version:=coalesce(old,0)+1;now_at:=clock_timestamp();
 insert into private.regulation_versions(dispute_id,version,definition,context,context_fingerprint,algorithm_version,reason,saved_by,saved_at) values(did,next_version,d,ctx,fp,'organized-v1',msg,actor,now_at);
 insert into private.regulation_registration_links(dispute_id,version,registration_id) select did,next_version,(value#>>'{}')::uuid from jsonb_array_elements(d->'registrationIds');
 for link in select q.id from (
   select a.value#>>'{}' as id from jsonb_array_elements(d->'groupPhases') p cross join lateral jsonb_array_elements(p.value->'groups') g cross join lateral jsonb_array_elements(g.value->'gameIds') a
   union all select a.value->>'gameId' from jsonb_array_elements(d->'series') n cross join lateral jsonb_array_elements(n.value->'games') a
 ) q loop
  insert into private.regulation_game_links(dispute_id,version,game_id,game_version,publication_version)
   select did,next_version,game.id,game.version,pub.version from public.games game left join public.published_games pub on pub.game_id=game.id where game.id=link.id::uuid and game.dispute_id=did;
  if not found then raise sqlstate 'PT400' using message='invalid_regulation_assignment';end if;
 end loop;
 insert into private.regulation_heads(dispute_id,version) values(did,next_version) on conflict(dispute_id) do update set version=excluded.version;
 update public.championships set saved_at=now_at where id=root;
 result:=jsonb_build_object('commandId',cmd,'disputeId',did,'version',next_version,'savedAt',now_at,'contextFingerprint',fp);
 insert into private.regulation_commands(command_id,actor_id,payload,result) values(cmd,actor,p_command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_regulation';
end$$;
create function public.get_regulation_state(p_dispute_id uuid,p_offset integer default 0) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_regulation_state(p_dispute_id,p_offset)$$;
create function public.get_regulation_version(p_dispute_id uuid,p_version integer) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_regulation_version(p_dispute_id,p_version)$$;
create function public.save_regulation(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_regulation(p_command)$$;
revoke all on function private.regulation_uuid(jsonb),private.regulation_ids(jsonb,integer),private.regulation_integer(jsonb,integer,integer),private.regulation_reference(jsonb),private.valid_regulation_definition(jsonb),private.regulation_history_immutable(),private.regulation_context(uuid),private.get_regulation_state(uuid,integer),private.get_regulation_version(uuid,integer),private.save_regulation(jsonb),public.get_regulation_state(uuid,integer),public.get_regulation_version(uuid,integer),public.save_regulation(jsonb) from public,anon,authenticated,service_role;
revoke all on function private.guard_regulation_group_opponents() from public,anon,authenticated,service_role;
grant execute on function private.get_regulation_state(uuid,integer),private.get_regulation_version(uuid,integer),private.save_regulation(jsonb),public.get_regulation_state(uuid,integer),public.get_regulation_version(uuid,integer),public.save_regulation(jsonb) to authenticated;
