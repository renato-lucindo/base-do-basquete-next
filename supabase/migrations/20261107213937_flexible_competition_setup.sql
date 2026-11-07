-- Additive preview contracts. Existing regulation/publication RPCs keep their behavior.
create table private.competition_setups (
 dispute_id uuid primary key references public.disputes(id) on delete restrict,
 version integer not null check(version>0), document jsonb not null check(octet_length(document::text)<=1048576),
 actor_id uuid not null references auth.users(id) on delete restrict, saved_at timestamptz not null
);
create table private.competition_setup_versions (
 dispute_id uuid not null references public.disputes(id) on delete restrict, version integer not null check(version>0),
 document jsonb not null check(octet_length(document::text)<=1048576), actor_id uuid not null references auth.users(id) on delete restrict,
 saved_at timestamptz not null, primary key(dispute_id,version)
);
create table private.competition_setup_commands (
 command_id uuid primary key, actor_id uuid not null references auth.users(id) on delete restrict,
 payload jsonb not null, result jsonb not null
);
create index competition_setups_actor on private.competition_setups(actor_id);
create index competition_setup_versions_actor on private.competition_setup_versions(actor_id);
create index competition_setup_commands_actor on private.competition_setup_commands(actor_id);
alter table private.competition_setups enable row level security;
alter table private.competition_setup_versions enable row level security;
alter table private.competition_setup_commands enable row level security;
revoke all on private.competition_setups,private.competition_setup_versions,private.competition_setup_commands from public,anon,authenticated,service_role;
create policy never_direct_setup on private.competition_setups as restrictive for all to public using(false) with check(false);
create policy never_direct_setup_versions on private.competition_setup_versions as restrictive for all to public using(false) with check(false);
create policy never_direct_setup_commands on private.competition_setup_commands as restrictive for all to public using(false) with check(false);
create trigger competition_setup_history_immutable before update or delete on private.competition_setup_versions for each row execute function private.publication_history_immutable();

create function private.valid_competition_setup(d jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare x jsonb;r jsonb;k text;v jsonb;begin
 if not private.context_keys(d,array['schemaVersion','mode','groupCount','turns','directPerGroup','extras','comparison','knockoutSize','seriesFormat','roundFormats','groupNames','memberships','assignments','manualOrder','manualEntrants','rules','occurrenceRules','tieDecisions','tieNotes','customDefinition']) or octet_length(d::text)>1048576 or d->>'schemaVersion' is distinct from 'competition-setup-v1' or coalesce(d->>'mode','') not in('standard','custom') then return false;end if;
 if not private.regulation_integer(d->'groupCount',0,32) or not private.regulation_integer(d->'turns',1,2) or not private.regulation_integer(d->'directPerGroup',0,1000) or not private.regulation_integer(d->'knockoutSize',0,64) or (d->>'knockoutSize')::int not in(0,2,4,8,16,32,64) then return false;end if;
 if coalesce(d->>'seriesFormat','') not in('single','two_leg','best_of_3','best_of_5','best_of_7') or jsonb_typeof(d->'roundFormats') is distinct from 'object' or jsonb_typeof(d->'memberships') is distinct from 'object' or jsonb_typeof(d->'manualEntrants') is distinct from 'object' then return false;end if;
 for k,v in select * from jsonb_each(d->'roundFormats') loop if k not in('2','4','8','16','32','64') or jsonb_typeof(v) is distinct from 'string' or v#>>'{}' not in('single','two_leg','best_of_3','best_of_5','best_of_7') then return false;end if;end loop;
 if (select count(*) from jsonb_each(d->'memberships'))>1000 or (select count(*) from jsonb_each(d->'manualEntrants'))>256 then return false;end if;
 for k,v in select * from jsonb_each(d->'memberships') loop if not private.regulation_uuid(to_jsonb(k)) or (v<>'null'::jsonb and not private.regulation_integer(v,0,31)) then return false;end if;end loop;
 for k,v in select * from jsonb_each(d->'manualEntrants') loop if not private.regulation_uuid(to_jsonb(k)) or not private.context_keys(v,array['home','away']) then return false;end if;for x in select value from jsonb_each(v) loop if x<>'null'::jsonb and not private.regulation_uuid(x) then return false;end if;end loop;end loop;
 if jsonb_typeof(d->'extras') is distinct from 'array' or jsonb_array_length(d->'extras')>32 or jsonb_typeof(d->'groupNames') is distinct from 'array' or jsonb_array_length(d->'groupNames')>32 or jsonb_typeof(d->'assignments') is distinct from 'array' or jsonb_array_length(d->'assignments')>10000 or jsonb_typeof(d->'manualOrder') is distinct from 'array' or jsonb_array_length(d->'manualOrder')>1000 then return false;end if;
 if exists(select 1 from jsonb_array_elements(d->'manualOrder') r where r.value<>'null'::jsonb and not private.regulation_uuid(r.value)) or (select count(distinct value) from jsonb_array_elements(d->'manualOrder') where value<>'null'::jsonb)<>(select count(*) from jsonb_array_elements(d->'manualOrder') where value<>'null'::jsonb) then return false;end if;
 for x in select value from jsonb_array_elements(d->'extras') loop if not private.context_keys(x,array['position','count']) or not private.regulation_integer(x->'position',1,1000) or not private.regulation_integer(x->'count',1,1000) then return false;end if;end loop;
 for x in select value from jsonb_array_elements(d->'groupNames') loop if jsonb_typeof(x) is distinct from 'string' or length(btrim(x#>>'{}')) not between 1 and 100 then return false;end if;end loop;
 if jsonb_typeof(d->'comparison') is distinct from 'array' or jsonb_array_length(d->'comparison') not between 1 and 8 or (select count(distinct value) from jsonb_array_elements(d->'comparison'))<>jsonb_array_length(d->'comparison') then return false;end if;
 for x in select value from jsonb_array_elements(d->'comparison') loop if jsonb_typeof(x) is distinct from 'string' or x#>>'{}' not in('league_points_per_game','difference_per_game','points_for_per_game','wins_per_game','league_points','difference','points_for','wins') then return false;end if;end loop;
 for x in select value from jsonb_array_elements(d->'assignments') loop
  if not private.regulation_uuid(x->'gameId') then return false;end if;
  if x->>'kind'='unassigned' then if not private.context_keys(x,array['gameId','kind']) then return false;end if;
  elsif x->>'kind'='group' then if not private.context_keys(x,array['gameId','kind','groupId']) or not private.regulation_uuid(x->'groupId') then return false;end if;
  elsif x->>'kind'='series' then if not private.context_keys(x,array['gameId','kind','seriesId','slot']) or not private.regulation_uuid(x->'seriesId') or not private.regulation_integer(x->'slot',1,7) then return false;end if;
  else return false;end if;
 end loop;
 if (select count(distinct value->>'gameId') from jsonb_array_elements(d->'assignments'))<>jsonb_array_length(d->'assignments') then return false;end if;
 -- Reuse the bounded rendering validator for sporting rule fields; no completeness gate.
 r:=jsonb_build_object('registrationIds','[]'::jsonb,'occurrenceRules',d->'occurrenceRules','groupPhases',jsonb_build_array(jsonb_build_object('phaseId','00000000-0000-4000-8000-000000000001','name','Rules','rules',d->'rules','groups','[]'::jsonb)),'knockoutPhases','[]'::jsonb,'series','[]'::jsonb);
 if not private.valid_regulation_definition(r) then return false;end if;
 if not private.regulation_integer(d#>'{rules,points,win}',-1000000,1000000) or not private.regulation_integer(d#>'{rules,points,loss}',-1000000,1000000) then return false;end if;
 if d->'customDefinition'<>'null'::jsonb and not private.valid_regulation_definition(d->'customDefinition') then return false;end if;
 if jsonb_typeof(d->'tieDecisions') is distinct from 'array' or jsonb_array_length(d->'tieDecisions')>1000 or jsonb_typeof(d->'tieNotes') is distinct from 'array' or jsonb_array_length(d->'tieNotes')>1000 then return false;end if;
 for x in select value from jsonb_array_elements(d->'tieDecisions') loop
  if not private.context_keys(x,array['id','phaseId','groupId','order','basis']) or not private.regulation_uuid(x->'id') or not private.regulation_uuid(x->'phaseId') or not private.regulation_uuid(x->'groupId') or not private.regulation_ids(x->'order',1000) or jsonb_array_length(x->'order')<2 or jsonb_typeof(x->'basis') is distinct from 'string' or length(x->>'basis') not between 1 and 1048576 then return false;end if;
  if not exists(select 1 from jsonb_array_elements(d->'tieNotes') n where n.value->>'id'=x->>'id' and jsonb_typeof(n.value->'comment')='string' and length(btrim(n.value->>'comment')) between 1 and 2000) then return false;end if;
 end loop;
 for x in select value from jsonb_array_elements(d->'tieNotes') loop if not private.context_keys(x-array['actorId','decidedAt'],array['id','comment']) or not private.regulation_uuid(x->'id') or jsonb_typeof(x->'comment') is distinct from 'string' or length(btrim(x->>'comment')) not between 1 and 2000 or not exists(select 1 from jsonb_array_elements(d->'tieDecisions') n where n.value->>'id'=x->>'id') then return false;end if;end loop;
 return true;
exception when others then return false;end$$;

create function private.get_competition_setup(did uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb;head private.competition_setups%rowtype;begin
 if not exists(select 1 from public.admin_access where user_id=auth.uid() and enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 if not exists(select 1 from public.disputes where id=did) then raise sqlstate 'PT404' using message='context_not_found';end if;
 ctx:=private.regulation_context(did);select * into head from private.competition_setups where dispute_id=did;
 return jsonb_build_object('disputeId',did,'version',coalesce(head.version,0),'savedAt',head.saved_at,'document',head.document,
 'legacyDefinition',(select v.definition from private.regulation_heads h join private.regulation_versions v on v.dispute_id=h.dispute_id and v.version=h.version where h.dispute_id=did),
 'legacyRegulationVersion',coalesce((select h.version from private.regulation_heads h where h.dispute_id=did),0),
 'context',ctx,'contextFingerprint',encode(sha256(convert_to(ctx::text,'UTF8')),'hex'),
 'registrations',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'teamName',t.name) order by r.name,r.id) from public.registrations r join public.teams t on t.id=r.team_id where r.dispute_id=did),'[]'),
 'games',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'disputeId',did,'version',g.version,'homeRegistrationId',g.home_registration_id,'awayRegistrationId',g.away_registration_id,'stageKind',g.stage_kind,'number',g.game_number,'date',g.scheduled_date) order by g.id) from public.games g where g.dispute_id=did),'[]'),
 'history',coalesce((select jsonb_agg(q.doc order by q.version desc) from (select v.version,jsonb_build_object('version',v.version,'savedAt',v.saved_at,'actorId',v.actor_id) doc from private.competition_setup_versions v where v.dispute_id=did order by v.version desc limit 20) q),'[]'));
end$$;

create function private.save_competition_setup(c jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;did uuid;root uuid;old private.competition_setups%rowtype;receipt private.competition_setup_commands%rowtype;d jsonb;ctx jsonb;result jsonb;note jsonb;prior jsonb;notes jsonb:='[]';now_at timestamptz;target jsonb;previous_definition jsonb;scope text;begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(c,array['commandId','disputeId','expectedVersion','expectedContextFingerprint','document']) or not private.regulation_uuid(c->'commandId') or not private.regulation_uuid(c->'disputeId') or not private.regulation_integer(c->'expectedVersion',0,2147483646) or jsonb_typeof(c->'expectedContextFingerprint') is distinct from 'string' or (c->>'expectedContextFingerprint')!~'^[a-f0-9]{64}$' or not private.valid_competition_setup(c->'document') then raise sqlstate 'PT400' using message='invalid_setup';end if;
 cmd:=(c->>'commandId')::uuid;did:=(c->>'disputeId')::uuid;d:=c->'document';
 perform pg_advisory_xact_lock(hashtextextended('competition-setup-command:'||cmd::text,0));
 select * into receipt from private.competition_setup_commands where command_id=cmd;
 if found then if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;if receipt.payload<>c then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;end if;
 select s.championship_id into root from public.disputes di join public.seasons s on s.id=di.season_id where di.id=did;if root is null then raise sqlstate 'PT400' using message='invalid_setup';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 select * into old from private.competition_setups where dispute_id=did for update;
 if coalesce(old.version,0)<>(c->>'expectedVersion')::int then raise sqlstate 'PT409' using message='version_conflict';end if;
 ctx:=private.regulation_context(did);if encode(sha256(convert_to(ctx::text,'UTF8')),'hex')<>c->>'expectedContextFingerprint' then raise sqlstate 'PT409' using message='context_conflict';end if;
 if exists(select 1 from jsonb_object_keys(d->'memberships') r(id) where not exists(select 1 from public.registrations where id=r.id::uuid and dispute_id=did)) or exists(select 1 from jsonb_array_elements(d->'assignments') a where not exists(select 1 from public.games where id=(a.value->>'gameId')::uuid and dispute_id=did)) then raise sqlstate 'PT400' using message='invalid_setup_context';end if;
 if exists(select 1 from jsonb_array_elements_text(d->'manualOrder') r(id) where r.id is not null and not exists(select 1 from public.registrations where id=r.id::uuid and dispute_id=did)) or exists(select 1 from jsonb_each(d->'manualEntrants') e cross join lateral jsonb_each(e.value) r where r.value<>'null'::jsonb and not exists(select 1 from public.registrations where id=(r.value#>>'{}')::uuid and dispute_id=did)) then raise sqlstate 'PT400' using message='invalid_setup_context';end if;
 now_at:=clock_timestamp();
 foreach scope in array array['root','customDefinition'] loop
  target:=case when scope='root' then d else d->'customDefinition' end;
  previous_definition:=case when scope='root' then old.document else old.document->'customDefinition' end;
  if target is null or target='null'::jsonb then continue;end if;
  if exists(select 1 from jsonb_array_elements(coalesce(target->'tieDecisions','[]')) t where not exists(select 1 from jsonb_array_elements(coalesce(target->'tieNotes','[]')) n where n.value->>'id'=t.value->>'id' and length(btrim(n.value->>'comment'))>0)) then raise sqlstate 'PT400' using message='tie_comment_required';end if;
  notes:='[]';
  for note in select value from jsonb_array_elements(coalesce(target->'tieNotes','[]')) loop
   select n.value into prior from jsonb_array_elements(coalesce(previous_definition->'tieNotes','[]')) n where n.value->>'id'=note->>'id' and n.value->>'comment'=note->>'comment' and (select v.value from jsonb_array_elements(coalesce(previous_definition->'tieDecisions','[]')) v where v.value->>'id'=note->>'id') is not distinct from (select v.value from jsonb_array_elements(coalesce(target->'tieDecisions','[]')) v where v.value->>'id'=note->>'id');
   notes:=notes||jsonb_build_array(coalesce(prior,(note-array['actorId','decidedAt'])||jsonb_build_object('actorId',actor,'decidedAt',now_at)));
  end loop;
  if target ? 'tieNotes' then target:=jsonb_set(target,'{tieNotes}',notes);end if;
  if scope='root' then d:=target;else d:=jsonb_set(d,'{customDefinition}',target);end if;
 end loop;
 insert into private.competition_setups(dispute_id,version,document,actor_id,saved_at) values(did,coalesce(old.version,0)+1,d,actor,now_at) on conflict(dispute_id) do update set version=excluded.version,document=excluded.document,actor_id=excluded.actor_id,saved_at=excluded.saved_at;
 insert into private.competition_setup_versions values(did,coalesce(old.version,0)+1,d,actor,now_at);
 result:=jsonb_build_object('commandId',cmd,'disputeId',did,'version',coalesce(old.version,0)+1,'savedAt',now_at);
 insert into private.competition_setup_commands values(cmd,actor,c,result);return result;
end$$;

-- No new publication event for standings: read the same committed game facts.
create function private.get_live_competition_source(did uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d jsonb;legacy jsonb;legacy_saved timestamptz;legacy_reg integer;ctx jsonb;rids uuid[];gids uuid[];saved timestamptz;rev integer;regs jsonb;games jsonb;context_public jsonb;begin
 select document,saved_at,version into d,saved,rev from private.competition_setups where dispute_id=did;
 select v.snapshot->'definition',(v.snapshot->>'publishedAt')::timestamptz,(v.snapshot->>'regulationVersion')::int into legacy,legacy_saved,legacy_reg from private.public_standings_heads h join private.public_standings_versions v on v.dispute_id=h.dispute_id and v.version=h.version where h.dispute_id=did;
 if d is null and legacy is null and not exists(select 1 from public.published_games where dispute_id=did) then return null;end if;
 if d is not null then d:=d-'tieNotes';if d->'customDefinition'<>'null'::jsonb then d:=jsonb_set(d,'{customDefinition}',(d->'customDefinition')-array['tieNotes','customReason']);end if;end if;
 legacy:=legacy-array['tieNotes','customReason'];
 if d->>'mode'='custom' then legacy:=d->'customDefinition';end if;
 if d is not null then select coalesce(array_agg(id),'{}') into rids from public.registrations where dispute_id=did;
 else select coalesce(array_agg(distinct rid),'{}') into rids from(
  select value::uuid rid from jsonb_array_elements_text(coalesce(legacy->'registrationIds','[]'))
  union select g.home_registration_id from public.games g join public.published_games p on p.game_id=g.id where g.dispute_id=did
  union select g.away_registration_id from public.games g join public.published_games p on p.game_id=g.id where g.dispute_id=did
 ) q;end if;
 select coalesce(array_agg(g.id),'{}') into gids from public.games g where g.dispute_id=did and g.home_registration_id=any(rids) and g.away_registration_id=any(rids) and (d is not null or exists(select 1 from public.published_games p where p.game_id=g.id) or exists(select 1 from private.public_standings_heads h join private.public_standings_versions v on v.dispute_id=h.dispute_id and v.version=h.version cross join lateral jsonb_array_elements(v.snapshot->'games') game where h.dispute_id=did and game.value->>'id'=g.id::text));
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'team',jsonb_build_object('id',t.id,'name',t.name,'abbreviation',t.abbreviation)) order by r.id),'[]') into regs from public.registrations r join public.teams t on t.id=r.team_id where r.id=any(rids) and r.dispute_id=did;
 select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'disputeId',did,'version',g.version,'homeRegistrationId',g.home_registration_id,'awayRegistrationId',g.away_registration_id,'date',g.scheduled_date,'time',to_char(g.scheduled_time,'HH24:MI'),'venue',g.venue,'number',g.game_number,'stageKind',g.stage_kind,'round',g.round_number,'knockoutStage',g.knockout_stage,'timeZone','America/Sao_Paulo') order by g.id),'[]') into games from public.games g where g.id=any(gids);
 select jsonb_build_object('championshipId',c.id,'name',c.name,'seasonId',s.id,'year',s.year,'gender',di.gender,'category',di.category,'division',di.division) into context_public from public.disputes di join public.seasons s on s.id=di.season_id join public.championships c on c.id=s.championship_id where di.id=did;
 if context_public is null then return null;end if;
 ctx:=private.regulation_context(did);
 return jsonb_build_object('disputeId',did,'configuration',d,'legacyDefinition',legacy,'publicationVersion',least(2147483647,greatest(1,coalesce(rev,0)+(select coalesce(sum(version::bigint),0) from public.published_games where game_id=any(gids)))),'regulationVersion',greatest(1,coalesce(rev,legacy_reg,0)),'publishedAt',greatest(saved,legacy_saved,(select max(published_at) from public.published_games where game_id=any(gids))),'context',context_public,'registrations',regs,'games',games,
 'publishedGames',coalesce((select jsonb_agg(x.value order by x.value->>'gameId') from jsonb_array_elements(ctx->'publishedGames') x where (x.value->>'gameId')::uuid=any(gids)),'[]'),
 'occurrences',coalesce((select jsonb_agg(x.value-'reason') from jsonb_array_elements(ctx->'occurrences') x where (x.value->>'gameId')::uuid=any(gids)),'[]'),
 'withdrawals',coalesce((select jsonb_agg(jsonb_set(x.value-'reason','{previousGameIds}',coalesce((select jsonb_agg(a.value) from jsonb_array_elements(x.value->'previousGameIds') a where (a.value#>>'{}')::uuid=any(gids)),'[]'))) from jsonb_array_elements(ctx->'withdrawals') x where (x.value->>'registrationId')::uuid=any(rids)),'[]'));
end$$;

-- Optional human comments; explicit system audit text keeps historical RPCs immutable.
create function private.finalize_sheet_game(c jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_access where user_id=auth.uid() and enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 if jsonb_typeof(c->'reason') is distinct from 'string' or length(c->>'reason')>500 then raise sqlstate 'PT400' using message='invalid_publication';end if;
 if length(btrim(c->>'reason'))<10 then c:=jsonb_set(c,'{reason}',to_jsonb('Finalização/correção automática. Comentário: '||coalesce(nullif(btrim(c->>'reason'),''),'não informado')));end if;
 return private.publish_sheet_game(c);
end$$;
create function private.finalize_pdf_game(c jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_access where user_id=auth.uid() and enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 if jsonb_typeof(c->'reason') is distinct from 'string' or length(c->>'reason')>500 then raise sqlstate 'PT400' using message='invalid_publication';end if;
 if length(btrim(c->>'reason'))<10 then c:=jsonb_set(c,'{reason}',to_jsonb('Finalização/correção automática. Comentário: '||coalesce(nullif(btrim(c->>'reason'),''),'não informado')));end if;
 return private.publish_pdf_game(c);
end$$;
create function private.save_flexible_game_sheet(c jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_access where user_id=auth.uid() and enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 if jsonb_typeof(c->'reason') is distinct from 'string' or length(c->>'reason')>500 then raise sqlstate 'PT400' using message='invalid_sheet';end if;
 if length(btrim(c->>'reason'))<10 then c:=jsonb_set(c,'{reason}',to_jsonb('Rascunho de correção; comentário opcional: '||coalesce(nullif(btrim(c->>'reason'),''),'não informado')));end if;
 return private.save_game_sheet(c);
end$$;

create function public.get_competition_setup(p_dispute_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.get_competition_setup(p_dispute_id)$$;
create function public.save_competition_setup(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_competition_setup(p_command)$$;
create function public.finalize_sheet_game(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.finalize_sheet_game(p_command)$$;
create function public.finalize_pdf_game(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.finalize_pdf_game(p_command)$$;
create function public.save_flexible_game_sheet(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_flexible_game_sheet(p_command)$$;
create function public.get_live_competition_source(p_dispute_id uuid) returns jsonb language sql stable security definer set search_path='' as $$select private.get_live_competition_source(p_dispute_id)$$;
create function public.list_live_competition_disputes(p_dispute_id uuid default null) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('disputeId',q.id,'context',q.doc->'context','registrations',q.doc->'registrations') order by q.id),'[]') from(select di.id,private.get_live_competition_source(di.id) doc from public.disputes di where (p_dispute_id is null or di.id=p_dispute_id) and (exists(select 1 from private.competition_setups where dispute_id=di.id) or exists(select 1 from private.public_standings_heads where dispute_id=di.id) or exists(select 1 from public.published_games where dispute_id=di.id)) order by di.id limit 1000) q where q.doc is not null
$$;
revoke all on function private.valid_competition_setup(jsonb),private.get_competition_setup(uuid),private.save_competition_setup(jsonb),private.get_live_competition_source(uuid),private.finalize_sheet_game(jsonb),private.finalize_pdf_game(jsonb),private.save_flexible_game_sheet(jsonb),public.get_competition_setup(uuid),public.save_competition_setup(jsonb),public.finalize_sheet_game(jsonb),public.finalize_pdf_game(jsonb),public.save_flexible_game_sheet(jsonb),public.get_live_competition_source(uuid),public.list_live_competition_disputes(uuid) from public,anon,authenticated,service_role;
grant execute on function private.get_competition_setup(uuid),private.save_competition_setup(jsonb),private.finalize_sheet_game(jsonb),private.finalize_pdf_game(jsonb),private.save_flexible_game_sheet(jsonb),public.get_competition_setup(uuid),public.save_competition_setup(jsonb),public.finalize_sheet_game(jsonb),public.finalize_pdf_game(jsonb),public.save_flexible_game_sheet(jsonb) to authenticated;
grant execute on function public.get_live_competition_source(uuid),public.list_live_competition_disputes(uuid) to anon,authenticated;

-- Organization cannot lock the preview writer. Other writers retain the historical guard.
create or replace function private.guard_regulation_group_opponents() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if current_setting('base_do_basquete.flexible_game_editor',true)='true' and new.dispute_id=old.dispute_id and exists(select 1 from public.admin_access where user_id=auth.uid() and enabled) then return new;end if;
 if exists(select 1 from private.regulation_heads h join private.regulation_versions v on v.dispute_id=h.dispute_id and v.version=h.version
  cross join lateral jsonb_array_elements(v.definition->'groupPhases') p cross join lateral jsonb_array_elements(p.value->'groups') g
  where h.dispute_id=old.dispute_id and exists(select 1 from jsonb_array_elements_text(g.value->'gameIds') a(id) where a.id::uuid=old.id)
  and (new.dispute_id<>old.dispute_id or not exists(select 1 from jsonb_array_elements_text(g.value->'registrationIds') r(id) where r.id::uuid=new.home_registration_id) or not exists(select 1 from jsonb_array_elements_text(g.value->'registrationIds') r(id) where r.id::uuid=new.away_registration_id)))
 then raise sqlstate 'PT409' using message='regulation_group_opponents_locked';end if;return new;
end$$;
create function private.save_flexible_game_editor(c jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare previous_setting text:=coalesce(current_setting('base_do_basquete.flexible_game_editor',true),'');r jsonb;begin
 if not exists(select 1 from public.admin_access where user_id=auth.uid() and enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 perform set_config('base_do_basquete.flexible_game_editor','true',true);
 r:=private.save_game_editor(c);
 perform set_config('base_do_basquete.flexible_game_editor',previous_setting,true);return r;
exception when others then perform set_config('base_do_basquete.flexible_game_editor',previous_setting,true);raise;
end$$;
create function public.save_flexible_game_editor(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_flexible_game_editor(p_command)$$;
revoke all on function private.save_flexible_game_editor(jsonb),public.save_flexible_game_editor(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.save_flexible_game_editor(jsonb),public.save_flexible_game_editor(jsonb) to authenticated;
