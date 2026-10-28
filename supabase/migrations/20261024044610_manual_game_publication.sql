-- G4b manual publication: one game's source, facts, immutable history and projection commit together.
alter table public.game_sheets drop constraint game_sheets_confirmed_check;
alter table public.games drop constraint games_state_check;
alter table public.games add constraint games_state_check check(state in('scheduled','finished'));

create table private.game_publication_versions (
 game_id uuid not null references public.games(id) on delete restrict,version integer not null check(version>0),
 source_kind text not null check(source_kind='sheet'),source_id uuid not null references public.game_sheets(game_id) on delete restrict check(source_id=game_id),source_version integer not null check(source_version>0),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=1048576),document jsonb not null,
 reason text not null check(length(reason)<=500),published_by uuid not null references auth.users(id) on delete restrict,
 published_at timestamptz not null,primary key(game_id,version)
);
create index game_publication_versions_actor on private.game_publication_versions(published_by);
create index game_publication_versions_source on private.game_publication_versions(source_id);
create table private.game_publication_entries (
 game_id uuid not null,version integer not null,person_id uuid not null references public.persons(id) on delete restrict,
 roster_entry_id uuid not null references public.roster_entries(id) on delete restrict,registration_id uuid not null references public.registrations(id) on delete restrict,
 side text not null check(side in('home','away')),jersey text not null check(jersey~'^(00|0|[1-9][0-9]?)$'),
 primary key(game_id,version,person_id),unique(game_id,version,side,jersey),
 foreign key(game_id,version) references private.game_publication_versions(game_id,version) on delete restrict
);
create index game_publication_entries_roster on private.game_publication_entries(roster_entry_id);
create index game_publication_entries_registration on private.game_publication_entries(registration_id);
create index game_publication_entries_person on private.game_publication_entries(person_id);
create table public.published_games (
 game_id uuid primary key,dispute_id uuid not null,version integer not null check(version>0),snapshot jsonb not null,
 published_at timestamptz not null,
 foreign key(game_id,dispute_id) references public.games(id,dispute_id) on delete restrict,
 foreign key(game_id,version) references private.game_publication_versions(game_id,version) on delete restrict deferrable initially deferred
);
create index published_games_context on public.published_games(dispute_id,published_at desc,game_id);
create table private.game_publication_commands (
 request_id uuid primary key,actor_id uuid not null references auth.users(id) on delete restrict,
 payload jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp()
);
create index game_publication_commands_actor on private.game_publication_commands(actor_id);
alter table private.game_publication_versions enable row level security;
alter table private.game_publication_entries enable row level security;
alter table private.game_publication_commands enable row level security;
alter table public.published_games enable row level security;
revoke all on private.game_publication_versions,private.game_publication_entries,private.game_publication_commands,public.published_games from public,anon,authenticated,service_role;
create policy never_direct_publication_versions on private.game_publication_versions as restrictive for all to public using(false) with check(false);
create policy never_direct_publication_entries on private.game_publication_entries as restrictive for all to public using(false) with check(false);
create policy never_direct_publication_commands on private.game_publication_commands as restrictive for all to public using(false) with check(false);
grant select on public.published_games to anon,authenticated;
create policy read_only_published_games on public.published_games for select to anon,authenticated using(true);

create function private.publication_person(p jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
 select case when p is null or p='null'::jsonb then 'null'::jsonb else jsonb_build_object('id',p->'id','name',p->'name','nickname',p->'nickname') end
$$;
create function private.confirmed_sheet_guard(gid uuid,d jsonb,reason text) returns void language plpgsql stable security invoker set search_path='' as $$
declare old public.game_sheets%rowtype;before_ids jsonb;after_ids jsonb;
begin
 select * into old from public.game_sheets where game_id=gid;
 if old.confirmed then
  if length(regexp_replace(reason,'^[[:space:]]+|[[:space:]]+$','','g')) not between 10 and 500 then raise sqlstate 'PT400' using message='review_reason_required';end if;
  select jsonb_agg(jsonb_build_object('id',q->'rosterEntryId','side',q->'side','jersey',q->'jersey') order by q->>'rosterEntryId') into before_ids from jsonb_array_elements(old.document->'participants') q;
  select jsonb_agg(jsonb_build_object('id',q->'rosterEntryId','side',q->'side','jersey',q->'jersey') order by q->>'rosterEntryId') into after_ids from jsonb_array_elements(d->'participants') q;
  if before_ids is distinct from after_ids then raise sqlstate 'PT409' using message='confirmed_roster_locked';end if;
 end if;
end$$;
create function private.publication_history_immutable() returns trigger language plpgsql security invoker set search_path='' as $$begin raise sqlstate 'PT409' using message='publication_history_immutable';end$$;
create trigger publication_versions_immutable before update or delete on private.game_publication_versions for each row execute function private.publication_history_immutable();
create trigger publication_entries_immutable before update or delete on private.game_publication_entries for each row execute function private.publication_history_immutable();
create function private.guard_published_game_context() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if (new.dispute_id<>old.dispute_id or new.home_registration_id<>old.home_registration_id or new.away_registration_id<>old.away_registration_id) and exists(select 1 from public.published_games where game_id=old.id) then raise sqlstate 'PT409' using message='published_game_context_locked';end if;return new;
end$$;
create trigger published_game_context before update of dispute_id,home_registration_id,away_registration_id on public.games for each row execute function private.guard_published_game_context();

create function public.get_public_game(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select snapshot from public.published_games where game_id=p_id$$;
create function private.get_game_publication_state(p_game_id uuid,p_offset integer) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not exists(select 1 from public.admin_access where user_id=(select auth.uid()) and enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 if not exists(select 1 from public.games where id=p_game_id) then return null;end if;
 return jsonb_build_object('version',coalesce((select version from public.published_games where game_id=p_game_id),0),'published',(select snapshot from public.published_games where game_id=p_game_id),
 'history',(select coalesce(jsonb_agg(jsonb_build_object('version',version,'sourceKind',source_kind,'sourceVersion',source_version,'reason',reason,'actorId',published_by,'publishedAt',published_at) order by version desc),'[]'::jsonb) from(select * from private.game_publication_versions where game_id=p_game_id order by version desc limit 20 offset greatest(0,least(coalesce(p_offset,0),100000))) h),
 'hasMore',(select count(*)>20 from(select 1 from private.game_publication_versions where game_id=p_game_id order by version desc limit 21 offset greatest(0,least(coalesce(p_offset,0),100000))) h));
end$$;
create function public.get_game_publication_state(p_game_id uuid,p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$select private.get_game_publication_state(p_game_id,p_offset)$$;
create function private.get_game_publication_version(p_game_id uuid,p_version integer) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not exists(select 1 from public.admin_access where user_id=(select auth.uid()) and enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 return(select jsonb_build_object('gameId',game_id,'version',version,'sourceKind',source_kind,'sourceVersion',source_version,'snapshot',snapshot,'document',document,'reason',reason,'actorId',published_by,'publishedAt',published_at) from private.game_publication_versions where game_id=p_game_id and version=p_version);
end$$;
create function public.get_game_publication_version(p_game_id uuid,p_version integer) returns jsonb language sql stable security invoker set search_path='' as $$select private.get_game_publication_version(p_game_id,p_version)$$;

create function private.publish_sheet_game(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;gid uuid;gv integer;pv integer;sv integer;root uuid;src jsonb;d jsonb;reason text;fallback boolean;g public.games%rowtype;current_pub public.published_games%rowtype;receipt private.game_publication_commands%rowtype;sh public.game_sheets%rowtype;facts jsonb;players jsonb;payload jsonb;staff jsonb:='{}';s text;st jsonb;now_at timestamptz;result jsonb;
begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['requestId','gameId','gameVersion','basePublicationVersion','source','reason','fallback']) or octet_length(p_command::text)>524288 then raise sqlstate 'PT400' using message='invalid_publication';end if;
 src:=p_command->'source';
 if not private.context_keys(src,array['kind','baseSheetVersion','document']) or src->>'kind' is distinct from 'sheet' or not private.pdf_number(p_command->'gameVersion') or not private.pdf_number(p_command->'basePublicationVersion') or not private.pdf_number(src->'baseSheetVersion') or jsonb_typeof(p_command->'reason') is distinct from 'string' or jsonb_typeof(p_command->'fallback') is distinct from 'boolean' then raise sqlstate 'PT400' using message='invalid_publication';end if;
 cmd:=(p_command->>'requestId')::uuid;gid:=(p_command->>'gameId')::uuid;gv:=(p_command->>'gameVersion')::integer;pv:=(p_command->>'basePublicationVersion')::integer;sv:=(src->>'baseSheetVersion')::integer;d:=src->'document';reason:=regexp_replace(p_command->>'reason','^[[:space:]]+|[[:space:]]+$','','g');fallback:=(p_command->>'fallback')::boolean;
 if cmd is null or gid is null or gv not between 1 and 2147483646 or pv not between 0 and 2147483646 or sv not between 0 and 2147483646 or length(reason)>500 then raise sqlstate 'PT400' using message='invalid_publication';end if;
 perform pg_advisory_xact_lock(hashtextextended('publication-command:'||cmd::text,0));
 select * into receipt from private.game_publication_commands where request_id=cmd;
 if found then if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;end if;
 -- Same command/resource -> root -> game order as the sheet writer; no athlete/person row lock here.
 perform pg_advisory_xact_lock(hashtextextended('sheet-command:'||cmd::text,0));
 select se.championship_id into root from public.games ga join public.disputes di on di.id=ga.dispute_id join public.seasons se on se.id=di.season_id where ga.id=gid;
 if root is null then raise sqlstate 'PT400' using message='invalid_publication_context';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));perform pg_advisory_xact_lock(hashtextextended('game:'||gid::text,0));
 select * into g from public.games where id=gid for update;
 select * into current_pub from public.published_games where game_id=gid for update;
 select * into sh from public.game_sheets where game_id=gid for update;
 if g.version<>gv or coalesce(current_pub.version,0)<>pv or coalesce(sh.version,0)<>sv then raise sqlstate 'PT409' using message='version_conflict';end if;
 if (pv>0 or fallback) and length(reason)<10 then raise sqlstate 'PT400' using message='review_reason_required';end if;
 if exists(select 1 from public.pdf_reviews r join public.pdf_sources so on so.id=r.source_id where r.game_id=gid and so.ready) and (not fallback or length(reason)<10) then raise sqlstate 'PT400' using message='fallback_decision_required';end if;
 facts:=private.final_sheet_facts(d);
 perform private.save_game_sheet(jsonb_build_object('requestId',cmd,'gameId',gid,'gameVersion',gv,'baseVersion',sv,'document',d,'confirm',false,'reason',reason));
 update public.game_sheets set confirmed=true where game_id=gid;
 select * into sh from public.game_sheets where game_id=gid;
 foreach s in array array['home','away'] loop
  st:=sh.staff_snapshot->s;
  staff:=jsonb_set(staff,array[s],jsonb_build_object('captain',private.publication_person(st->'captain'),'coach',private.publication_person(case when d->'staff'->s->>'coachStaffEntryId' is null then st->'captain' else st->'coach' end),'assistant',private.publication_person(st->'assistant'),'captainIsCoach',d->'staff'->s->>'coachStaffEntryId' is null));
 end loop;
 select jsonb_agg(jsonb_build_object('person',private.publication_person(en.person_snapshot),'registrationId',en.registration_id,'side',p->'side','jersey',p->'jersey','played',p->'played','starter',p->'starter','captain',p->'captain','two',p->'two','three',p->'three','free',p->'free','points',p->'points','fouls',p->'fouls','technical',p->'technical','unsportsmanlike',p->'unsportsmanlike','status',p->'status') order by n) into players from jsonb_array_elements(facts->'players') with ordinality x(p,n) join public.game_sheet_entries en on en.game_id=gid and en.roster_entry_id=(p->>'rosterEntryId')::uuid;
 facts:=jsonb_set(facts,'{players}',players);now_at:=clock_timestamp();
 select jsonb_build_object('id',gid,'disputeId',g.dispute_id,'version',pv+1,'publishedAt',now_at,'gameVersion',gv+1,
 'context',jsonb_build_object('championshipId',c.id,'name',c.name,'seasonId',se.id,'year',se.year,'gender',di.gender,'category',di.category,'division',di.division),
 'game',jsonb_build_object('date',g.scheduled_date,'time',case when g.scheduled_time is null then null else to_char(g.scheduled_time,'HH24:MI') end,'timeZone','America/Sao_Paulo','venue',g.venue,'number',g.game_number,
 'home',jsonb_build_object('registrationId',rh.id,'name',rh.name,'team',jsonb_build_object('id',th.id,'name',th.name,'abbreviation',th.abbreviation)),
 'away',jsonb_build_object('registrationId',ra.id,'name',ra.name,'team',jsonb_build_object('id',ta.id,'name',ta.name,'abbreviation',ta.abbreviation))),
 'source',jsonb_build_object('kind','sheet','version',sh.version,'rulesVersion','FIBA_2024'),'staff',staff,'facts',facts) into payload
 from public.disputes di join public.seasons se on se.id=di.season_id join public.championships c on c.id=se.championship_id join public.registrations rh on rh.id=g.home_registration_id join public.teams th on th.id=rh.team_id join public.registrations ra on ra.id=g.away_registration_id join public.teams ta on ta.id=ra.team_id where di.id=g.dispute_id;
 if payload is null or jsonb_array_length(players)<>jsonb_array_length(d->'participants') then raise sqlstate 'PT400' using message='invalid_publication_context';end if;
 insert into private.game_publication_versions(game_id,version,source_kind,source_id,source_version,snapshot,document,reason,published_by,published_at) values(gid,pv+1,'sheet',gid,sh.version,payload,d,reason,actor,now_at);
 insert into private.game_publication_entries(game_id,version,person_id,roster_entry_id,registration_id,side,jersey) select gid,pv+1,person_id,roster_entry_id,registration_id,side,jersey from public.game_sheet_entries where game_id=gid;
 insert into public.published_games(game_id,dispute_id,version,snapshot,published_at) values(gid,g.dispute_id,pv+1,payload,now_at) on conflict(game_id) do update set version=excluded.version,snapshot=excluded.snapshot,published_at=excluded.published_at;
 update public.games set state='finished',version=gv+1,saved_at=now_at where id=gid;
 update public.championships set saved_at=now_at where id=root;
 result:=jsonb_build_object('requestId',cmd,'gameId',gid,'version',pv+1,'sourceVersion',sh.version,'gameVersion',gv+1,'publishedAt',now_at);
 insert into private.game_publication_commands(request_id,actor_id,payload,result) values(cmd,actor,p_command,result);return result;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_publication';
end$$;
create function public.publish_sheet_game(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.publish_sheet_game(p_command)$$;
revoke all on function private.publication_person(jsonb),private.confirmed_sheet_guard(uuid,jsonb,text),private.publication_history_immutable(),private.guard_published_game_context(),public.get_public_game(uuid),private.get_game_publication_state(uuid,integer),public.get_game_publication_state(uuid,integer),private.get_game_publication_version(uuid,integer),public.get_game_publication_version(uuid,integer),private.publish_sheet_game(jsonb),public.publish_sheet_game(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.get_public_game(uuid) to anon,authenticated;
grant execute on function private.get_game_publication_state(uuid,integer),public.get_game_publication_state(uuid,integer),private.get_game_publication_version(uuid,integer),public.get_game_publication_version(uuid,integer),private.publish_sheet_game(jsonb),public.publish_sheet_game(jsonb) to authenticated;

-- Replace the existing bounded writer in place; no alternate unguarded helper remains.
create or replace function private.save_game_sheet(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;gid uuid;expected integer;gv integer;root uuid;g public.games%rowtype;old public.game_sheets%rowtype;receipt private.game_sheet_commands%rowtype;d jsonb;p jsonb;rid uuid;pid uuid;reg uuid;ended timestamptz;sex text;gender text;old_entries jsonb;s text;st jsonb;entry uuid;staff_role text;person jsonb;ss jsonb:='{}';one jsonb;ordinal integer:=0;result jsonb;snapshot jsonb;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['requestId','gameId','gameVersion','baseVersion','document','confirm','reason']) or octet_length(p_command::text)>524288 or p_command->'confirm'<>'false'::jsonb or jsonb_typeof(p_command->'reason') is distinct from 'string' or length(p_command->>'reason')>500 or jsonb_typeof(p_command->'baseVersion') is distinct from 'number' or (p_command->>'baseVersion')!~'^[0-9]+$' or jsonb_typeof(p_command->'gameVersion') is distinct from 'number' or (p_command->>'gameVersion')!~'^[0-9]+$' then raise sqlstate 'PT400' using message='invalid_sheet';end if;
 cmd:=(p_command->>'requestId')::uuid;gid:=(p_command->>'gameId')::uuid;expected:=(p_command->>'baseVersion')::integer;gv:=(p_command->>'gameVersion')::integer;d:=p_command->'document';
 if cmd is null or gid is null or expected not between 0 and 2147483646 or gv not between 1 and 2147483646 then raise sqlstate 'PT400' using message='invalid_sheet';end if;
 perform private.validate_sheet_document(d);
 perform pg_advisory_xact_lock(hashtextextended('sheet-command:'||cmd::text,0));
 select * into receipt from private.game_sheet_commands where request_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;
 end if;
 select se.championship_id into root from public.games ga join public.disputes di on di.id=ga.dispute_id join public.seasons se on se.id=di.season_id where ga.id=gid;
 if root is null then raise sqlstate 'PT400' using message='invalid_sheet_context';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 perform pg_advisory_xact_lock(hashtextextended('game:'||gid::text,0));
 select * into g from public.games where id=gid for update;
 select * into old from public.game_sheets where game_id=gid for update;
 if g.version<>gv or (old.game_id is null and expected<>0) or (old.game_id is not null and old.version<>expected) then raise sqlstate 'PT409' using message='version_conflict';end if;
 perform private.confirmed_sheet_guard(gid,d,p_command->>'reason');
 select case when di.gender='feminino' then 'female' else 'male' end into gender from public.disputes di where di.id=g.dispute_id;
 select coalesce(jsonb_object_agg(e.roster_entry_id::text,to_jsonb(e)),'{}'::jsonb) into old_entries from public.game_sheet_entries e where e.game_id=gid;
 -- Resolve all membership and commission identities from the authorized game context.
 for p in select value from jsonb_array_elements(d->'participants') loop
  rid:=(p->>'rosterEntryId')::uuid;reg:=case when p->>'side'='home' then g.home_registration_id else g.away_registration_id end;
  select r.person_id,r.ended_at,a.sex into pid,ended,sex from public.roster_entries r join private.athletes a on a.person_id=r.person_id where r.id=rid and r.registration_id=reg and r.dispute_id=g.dispute_id;
  if pid is null or sex<>gender or (ended is not null and not(old_entries ? rid::text)) then raise sqlstate 'PT400' using message='invalid_sheet_context';end if;
 end loop;
 foreach s in array array['home','away'] loop
  st:=d->'staff'->s;reg:=case when s='home' then g.home_registration_id else g.away_registration_id end;
  one:=jsonb_build_object('captain',null,'coach',null,'assistant',null);
  for staff_role,entry in select * from (values('coach',(st->>'coachStaffEntryId')::uuid),('assistant',(st->>'assistantStaffEntryId')::uuid)) x(role,entry) loop
   if entry is null then continue;end if;
   select jsonb_build_object('id',p2.id,'name',p2.name,'nickname',p2.nickname) into person from public.staff_entries se join public.persons p2 on p2.id=se.person_id join public.coaches co on co.person_id=se.person_id where se.id=entry and se.registration_id=reg and se.dispute_id=g.dispute_id and se.role=case when staff_role='coach' then 'head' else 'assistant' end and (se.ended_at is null or old.document->'staff'->s->>(case when staff_role='coach' then 'coachStaffEntryId' else 'assistantStaffEntryId' end)=entry::text);
   if person is null then raise sqlstate 'PT400' using message='invalid_sheet_staff';end if;
   if old.document->'staff'->s->>(case when staff_role='coach' then 'coachStaffEntryId' else 'assistantStaffEntryId' end)=entry::text then person:=old.staff_snapshot->s->staff_role;end if;
   one:=jsonb_set(one,array[staff_role],person);
  end loop;
  if st->>'captainRosterEntryId' is not null then
   rid:=(st->>'captainRosterEntryId')::uuid;
   select coalesce(old_entries->rid::text->'person_snapshot',jsonb_build_object('id',p2.id,'name',p2.name,'nickname',p2.nickname)) into person from public.roster_entries r join public.persons p2 on p2.id=r.person_id where r.id=rid;
   one:=jsonb_set(one,'{captain}',person);
  end if;
  ss:=jsonb_set(ss,array[s],one);
 end loop;
 if old.game_id is null then insert into public.game_sheets(game_id,document,staff_snapshot) values(gid,d,ss);
 else update public.game_sheets set document=d,staff_snapshot=ss,version=old.version+1,saved_at=clock_timestamp() where game_id=gid;end if;
 delete from public.game_sheet_entries where game_id=gid;
 for p in select value from jsonb_array_elements(d->'participants') loop
  ordinal:=ordinal+1;rid:=(p->>'rosterEntryId')::uuid;reg:=case when p->>'side'='home' then g.home_registration_id else g.away_registration_id end;
  select r.person_id,coalesce(old_entries->rid::text->'person_snapshot',jsonb_build_object('id',p2.id,'name',p2.name,'nickname',p2.nickname)) into pid,snapshot from public.roster_entries r join public.persons p2 on p2.id=r.person_id where r.id=rid;
  insert into public.game_sheet_entries(game_id,roster_entry_id,registration_id,person_id,side,jersey,ordinal,person_snapshot) values(gid,rid,reg,pid,p->>'side',p->>'jersey',ordinal,snapshot);
 end loop;
 update public.championships set saved_at=clock_timestamp() where id=root;
 result:=jsonb_build_object('requestId',cmd,'version',coalesce(old.version,0)+1,'confirmed',coalesce(old.confirmed,false));
 insert into private.game_sheet_commands(request_id,actor_id,payload,result) values(cmd,actor,p_command,result);return result;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_sheet';
end
$$;
