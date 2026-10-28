-- G2: private draft sheet, stable membership identity and server-derived snapshots.
create table public.game_sheets (
 game_id uuid primary key references public.games(id) on delete restrict,
 document jsonb not null,
 staff_snapshot jsonb not null,
 version integer not null default 1 check(version>0),
 confirmed boolean not null default false check(not confirmed),
 saved_at timestamptz not null default clock_timestamp()
);
create table public.game_sheet_entries (
 game_id uuid not null references public.game_sheets(game_id) on delete restrict,
 roster_entry_id uuid not null references public.roster_entries(id) on delete restrict,
 registration_id uuid not null references public.registrations(id) on delete restrict,
 person_id uuid not null references public.persons(id) on delete restrict,
 side text not null check(side in('home','away')),
 jersey text not null check(jersey~'^(00|0|[1-9][0-9]?)$'),
 ordinal integer not null check(ordinal between 1 and 24),
 person_snapshot jsonb not null,
 primary key(game_id,roster_entry_id), unique(game_id,person_id),unique(game_id,side,jersey),unique(game_id,ordinal)
);
create index game_sheet_entries_roster on public.game_sheet_entries(roster_entry_id);
create index game_sheet_entries_registration on public.game_sheet_entries(registration_id);
create index game_sheet_entries_person on public.game_sheet_entries(person_id);
create table private.game_sheet_commands (
 request_id uuid primary key, actor_id uuid not null references auth.users(id) on delete restrict,
 payload jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp()
);
create index game_sheet_commands_actor on private.game_sheet_commands(actor_id);
alter table public.game_sheets enable row level security;
alter table public.game_sheet_entries enable row level security;
alter table private.game_sheet_commands enable row level security;
revoke all on public.game_sheets,public.game_sheet_entries,private.game_sheet_commands from public,anon,authenticated,service_role;
grant select on public.game_sheets,public.game_sheet_entries to authenticated;
create policy admin_reads_game_sheets on public.game_sheets for select to authenticated using(exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy admin_reads_game_sheet_entries on public.game_sheet_entries for select to authenticated using(exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy never_access_game_sheet_commands on private.game_sheet_commands as restrictive for all to public using(false) with check(false);

create function private.validate_sheet_document(d jsonb) returns void language plpgsql immutable security invoker set search_path='' as $$
declare p jsonb;e jsonb;s text;st jsonb;pid uuid;periods integer;states jsonb:='{}';teams jsonb:='{"home":{"b":0,"c":0,"status":"eligible"},"away":{"b":0,"c":0,"status":"eligible"}}';
 key text;target text;code text;kind text;fouls integer;t integer;u integer;status text;own jsonb;captain text;coachkey text;coach jsonb;
begin
 if not private.context_keys(d,array['rulesVersion','periods','participants','staff','events']) or d->>'rulesVersion' is distinct from 'FIBA_2024' or jsonb_typeof(d->'periods') is distinct from 'number' or (d->>'periods')!~'^[0-9]+$' or jsonb_typeof(d->'participants') is distinct from 'array' or jsonb_typeof(d->'events') is distinct from 'array' or not private.context_keys(d->'staff',array['home','away']) then raise sqlstate 'PT400' using message='invalid_sheet';end if;
 periods:=(d->>'periods')::integer;
 if periods not between 4 and 12 or jsonb_array_length(d->'participants')>24 or jsonb_array_length(d->'events')>2000 then raise sqlstate 'PT400' using message='invalid_sheet';end if;
 for p in select value from jsonb_array_elements(d->'participants') loop
  if not private.context_keys(p,array['rosterEntryId','side','jersey','played','starter']) or jsonb_typeof(p->'rosterEntryId') is distinct from 'string' or jsonb_typeof(p->'jersey') is distinct from 'string' or jsonb_typeof(p->'played') is distinct from 'boolean' or jsonb_typeof(p->'starter') is distinct from 'boolean' or coalesce(p->>'side','') not in('home','away') or (p->>'jersey')!~'^(00|0|[1-9][0-9]?)$' then raise sqlstate 'PT400' using message='invalid_sheet';end if;
  pid:=(p->>'rosterEntryId')::uuid;
  if pid is null or ((p->>'starter')::boolean and not(p->>'played')::boolean) then raise sqlstate 'PT400' using message='invalid_sheet';end if;
  states:=jsonb_set(states,array[(p->>'side')||':'||(p->>'jersey')],jsonb_build_object('f',0,'t',0,'u',0,'status','eligible','played',(p->>'played')::boolean));
 end loop;
 if exists(select 1 from jsonb_array_elements(d->'participants') q group by (q->>'rosterEntryId')::uuid having count(*)>1) or exists(select 1 from jsonb_array_elements(d->'participants') q group by q->>'side',q->>'jersey' having count(*)>1) then raise sqlstate 'PT400' using message='invalid_sheet';end if;
 foreach s in array array['home','away'] loop
  st:=d->'staff'->s;
  if not private.context_keys(st,array['captainRosterEntryId','coachStaffEntryId','assistantStaffEntryId']) or jsonb_typeof(st->'captainRosterEntryId') not in('string','null') or jsonb_typeof(st->'coachStaffEntryId') not in('string','null') or jsonb_typeof(st->'assistantStaffEntryId') not in('string','null') then raise sqlstate 'PT400' using message='invalid_sheet';end if;
  perform (st->>'captainRosterEntryId')::uuid,(st->>'coachStaffEntryId')::uuid,(st->>'assistantStaffEntryId')::uuid;
  if (select count(*)>12 or count(*) filter(where (q->>'starter')::boolean)>5 from jsonb_array_elements(d->'participants') q where q->>'side'=s) or (st->>'captainRosterEntryId' is not null and not exists(select 1 from jsonb_array_elements(d->'participants') q where q->>'side'=s and (q->>'rosterEntryId')::uuid=(st->>'captainRosterEntryId')::uuid)) or (st->>'assistantStaffEntryId' is not null and (st->>'coachStaffEntryId' is null or (st->>'coachStaffEntryId')::uuid=(st->>'assistantStaffEntryId')::uuid)) then raise sqlstate 'PT400' using message='invalid_sheet';end if;
 end loop;
 if jsonb_array_length(d->'events')>0 and (not exists(select 1 from jsonb_array_elements(d->'participants') q where q->>'side'='home') or not exists(select 1 from jsonb_array_elements(d->'participants') q where q->>'side'='away')) then raise sqlstate 'PT400' using message='invalid_sheet';end if;
 -- Validate event shape before ordering or casting it.
 for e in select value from jsonb_array_elements(d->'events') loop
  if not private.context_keys(e,array['id','side','period','target','code']) or jsonb_typeof(e->'id') is distinct from 'string' or coalesce(e->>'side','') not in('home','away') or jsonb_typeof(e->'period') is distinct from 'number' or (e->>'period')!~'^[0-9]+$' or (e->>'period')::integer not between 1 and periods or jsonb_typeof(e->'target') is distinct from 'string' or (e->>'target')!~'^(00|0|[1-9][0-9]?|B|C)$' or jsonb_typeof(e->'code') is distinct from 'string' or length(e->>'code')>3 then raise sqlstate 'PT400' using message='invalid_sheet';end if;
  perform (e->>'id')::uuid;
 end loop;
 if exists(select 1 from jsonb_array_elements(d->'events') q group by (q->>'id')::uuid having count(*)>1) then raise sqlstate 'PT400' using message='invalid_sheet';end if;
 -- Same chronological, stable order and exclusion propagation as the supplied engine.
 for e in select value from jsonb_array_elements(d->'events') with ordinality order by (value->>'period')::integer,ordinality loop
  s:=e->>'side';target:=e->>'target';code:=e->>'code';key:=s||':'||target;p:=states->key;own:=teams->s;
  if target not in('B','C') and (p is null or not(p->>'played')::boolean or p->>'status'<>'eligible') then raise sqlstate 'PT400' using message='invalid_sheet';end if;
  if code in('1','2','3') and p is not null then continue;end if;
  if code!~'^([PUD][123C]?|T[1C]|B[12C]|C[1C])$' or (target='B' and left(code,1)<>'B') or (target='C' and left(code,1) not in('C','D')) or (p is not null and left(code,1) in('B','C')) then raise sqlstate 'PT400' using message='invalid_sheet';end if;
  kind:=left(code,1);
  if p is not null then
   fouls:=(p->>'f')::int+1;t:=(p->>'t')::int+case when kind='T' then 1 else 0 end;u:=(p->>'u')::int+case when kind='U' then 1 else 0 end;
   status:=case when kind='D' then 'D' when t+u>=2 then 'GD' when fouls>=5 then 'excluded' else 'eligible' end;
   p:=p||jsonb_build_object('f',fouls,'t',t,'u',u,'status',status);states:=jsonb_set(states,array[key],p);
  else
   if kind='C' then own:=jsonb_set(own,'{c}',to_jsonb((own->>'c')::int+1));end if;
   if kind='B' and code<>'B2' then own:=jsonb_set(own,'{b}',to_jsonb((own->>'b')::int+1));end if;
   if kind='D' then own:=jsonb_set(own,'{status}','"D"');end if;
  end if;
  captain:=null;coach:=null;
  if d->'staff'->s->>'coachStaffEntryId' is null then
   select p2->>'jersey' into captain from jsonb_array_elements(d->'participants') p2 where p2->>'side'=s and p2->>'rosterEntryId'=d->'staff'->s->>'captainRosterEntryId';
   if captain is not null then coachkey:=s||':'||captain;coach:=states->coachkey;end if;
  end if;
  if coach->>'status'='D' then own:=jsonb_set(own,'{status}','"D"');end if;
  if own->>'status'<>'D' and ((own->>'c')::int>=2 or (own->>'c')::int+(own->>'b')::int>=3 or coach->>'status' in('GD','D') or ((coach->>'t')::int+(coach->>'u')::int>0 and ((own->>'c')::int>0 or (own->>'b')::int>=2))) then own:=jsonb_set(own,'{status}','"GD"');end if;
  if coach is not null and own->>'status'<>'eligible' then states:=jsonb_set(states,array[coachkey,'status'],own->'status');end if;
  teams:=jsonb_set(teams,array[s],own);
 end loop;
end
$$;

create function public.get_game_sheet(p_game_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('gameId',s.game_id,'gameVersion',g.version,'version',s.version,'savedAt',s.saved_at,'confirmed',s.confirmed,'document',s.document,'staff',s.staff_snapshot,
 'participants',coalesce((select jsonb_agg(jsonb_build_object('rosterEntryId',e.roster_entry_id,'registrationId',e.registration_id,'side',e.side,'person',e.person_snapshot) order by e.ordinal) from public.game_sheet_entries e where e.game_id=s.game_id),'[]'::jsonb))
 from public.game_sheets s join public.games g on g.id=s.game_id where s.game_id=p_game_id
$$;
create function private.save_game_sheet(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
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
 result:=jsonb_build_object('requestId',cmd,'version',coalesce(old.version,0)+1,'confirmed',false);
 insert into private.game_sheet_commands(request_id,actor_id,payload,result) values(cmd,actor,p_command,result);return result;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_sheet';
end
$$;
create function public.save_game_sheet(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_game_sheet(p_command)$$;
create function private.guard_game_sheet_context() returns trigger language plpgsql volatile security invoker set search_path='' as $$begin
 if (new.dispute_id<>old.dispute_id or new.home_registration_id<>old.home_registration_id or new.away_registration_id<>old.away_registration_id) and exists(select 1 from public.game_sheets where game_id=old.id) then raise sqlstate 'PT409' using message='game_sheet_context_locked';end if;return new;
end$$;
create trigger game_sheet_context before update of dispute_id,home_registration_id,away_registration_id on public.games for each row execute function private.guard_game_sheet_context();
revoke all on function private.validate_sheet_document(jsonb),public.get_game_sheet(uuid),private.save_game_sheet(jsonb),public.save_game_sheet(jsonb),private.guard_game_sheet_context() from public,anon,authenticated,service_role;
grant execute on function public.get_game_sheet(uuid),private.save_game_sheet(jsonb),public.save_game_sheet(jsonb) to authenticated;

create function private.guard_sheet_dispute_gender() returns trigger language plpgsql volatile security invoker set search_path='' as $$begin
 if new.gender is distinct from old.gender and exists(select 1 from public.games g join public.game_sheets s on s.game_id=g.id where g.dispute_id=old.id) then raise sqlstate 'PT409' using message='game_sheet_context_locked';end if;return new;
end$$;
create trigger sheet_dispute_gender before update of gender on public.disputes for each row execute function private.guard_sheet_dispute_gender();
revoke all on function private.guard_sheet_dispute_gender() from public,anon,authenticated,service_role;
