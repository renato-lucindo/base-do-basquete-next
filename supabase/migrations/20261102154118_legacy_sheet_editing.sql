-- Compatibility only; no existing document, receipt or publication is rewritten.
-- Stable player authorship is optional on reads for old v1/v2 documents.
create or replace function private.compute_sheet_facts(d jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare normalized jsonb; e jsonb; p jsonb; facts jsonb; times jsonb;
begin
 if jsonb_typeof(d->'events') is distinct from 'array' or jsonb_array_length(d->'events')>2000 then
  raise sqlstate 'PT400' using message='invalid_sheet';end if;
 if jsonb_array_length(d->'events')>0 and (not exists(select 1 from jsonb_array_elements(d->'participants') q where q.value->>'side'='home')
   or not exists(select 1 from jsonb_array_elements(d->'participants') q where q.value->>'side'='away')) then
  raise sqlstate 'PT400' using message='invalid_sheet';end if;
 for e in select value from jsonb_array_elements(d->'events') loop
  if e ? 'playerRosterEntryId' then
   if not private.regulation_uuid(e->'playerRosterEntryId') then raise sqlstate 'PT400' using message='invalid_sheet_player';end if;
   select value into p from jsonb_array_elements(d->'participants')
    where value->>'rosterEntryId'=e->>'playerRosterEntryId' and value->>'side'=e->>'side' and value->>'jersey'=e->>'target';
   if p is null then raise sqlstate 'PT400' using message='invalid_sheet_player';end if;
  end if;
 end loop;
 normalized:=jsonb_set(d,'{events}',coalesce((select jsonb_agg(value-'playerRosterEntryId' order by ordinal)
  from jsonb_array_elements(d->'events') with ordinality q(value,ordinal)),'[]'::jsonb));
 if normalized ? 'formatVersion' then return private.compute_sheet_facts_v2(normalized);end if;
 -- v1 staff semantics (including B2) remain untouched. Validate TO occurrences through
 -- the same v2 timeout validator, separately from historical points and staff fouls.
 select coalesce(jsonb_agg(value order by ordinal),'[]'::jsonb) into times
  from jsonb_array_elements(normalized->'events') with ordinality q(value,ordinal) where value->>'target'='TO';
 facts:=private.compute_sheet_facts_v1(jsonb_set(normalized,'{events}',coalesce((
  select jsonb_agg(value order by ordinal) from jsonb_array_elements(normalized->'events') with ordinality q(value,ordinal)
   where value->>'target' is distinct from 'TO'),'[]'::jsonb)));
 if jsonb_array_length(times)>0 then
  perform private.compute_sheet_facts_v2(jsonb_set(normalized||'{"formatVersion":2}'::jsonb,'{events}',times));
 end if;
 if exists(select 1 from jsonb_array_elements(normalized->'events') q group by (q->>'id')::uuid having count(*)>1) then
  raise sqlstate 'PT400' using message='invalid_sheet';end if;
 return facts;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or null_value_not_allowed then
 raise sqlstate 'PT400' using message='invalid_sheet';
end$$;
revoke all on function private.compute_sheet_facts(jsonb) from public,anon,authenticated,service_role;

-- Even an older client must not transfer an existing action when changing shirts.
-- This runs under the writer's existing game lock, on save and on publication.
create function private.guard_sheet_jersey_authorship() returns trigger
language plpgsql security invoker set search_path='' as $$
declare e jsonb; previous_event jsonb; previous_player jsonb; current_player jsonb;
 previous_events jsonb; previous_players jsonb; current_players jsonb;
begin
 select coalesce(jsonb_object_agg((value->>'id')::uuid::text,value),'{}'::jsonb) into previous_events
  from jsonb_array_elements(old.document->'events');
 select coalesce(jsonb_object_agg(value->>'side'||':'||(value->>'jersey'),value),'{}'::jsonb) into previous_players
  from jsonb_array_elements(old.document->'participants');
 select coalesce(jsonb_object_agg((value->>'rosterEntryId')::uuid::text,value),'{}'::jsonb) into current_players
  from jsonb_array_elements(new.document->'participants');
 for e in select value from jsonb_array_elements(new.document->'events') loop
  previous_event:=previous_events->((e->>'id')::uuid::text);
  if previous_event is null or previous_event->>'target' !~ '^(00|0|[1-9][0-9]?)$' then continue;end if;
  previous_player:=previous_players->(previous_event->>'side'||':'||(previous_event->>'target'));
  current_player:=current_players->((previous_player->>'rosterEntryId')::uuid::text);
  if current_player is not null and current_player->>'jersey' is distinct from previous_player->>'jersey' and
   (e->>'side' is distinct from current_player->>'side' or e->>'target' is distinct from current_player->>'jersey'
    or (e ? 'playerRosterEntryId' and (e->>'playerRosterEntryId')::uuid<>(current_player->>'rosterEntryId')::uuid)) then
   raise sqlstate 'PT400' using message='invalid_sheet_player';
  end if;
 end loop;
 return new;
end$$;
revoke all on function private.guard_sheet_jersey_authorship() from public,anon,authenticated,service_role;
create trigger sheet_jersey_authorship before update of document on public.game_sheets
 for each row execute function private.guard_sheet_jersey_authorship();

-- A reasoned manual correction may change a shirt, never the participant identity/side.
-- PDF association guards retain their existing shirt lock (their input is facts, not a sheet).
create or replace function private.confirmed_sheet_guard(gid uuid,d jsonb,reason text) returns void
language plpgsql stable security invoker set search_path='' as $$
declare old public.game_sheets%rowtype;before_ids jsonb;after_ids jsonb;manual boolean;
begin
 select * into old from public.game_sheets where game_id=gid;
 if old.confirmed then
  if reason is null or length(regexp_replace(reason,'^[[:space:]]+|[[:space:]]+$','','g')) not between 10 and 500 then raise sqlstate 'PT400' using message='review_reason_required';end if;
  manual:=coalesce(d->>'rulesVersion'='FIBA_2024' and d ? 'events',false);
  select jsonb_agg(jsonb_build_object('id',q->'rosterEntryId','side',q->'side') || case when manual then '{}'::jsonb else jsonb_build_object('jersey',q->'jersey') end order by q->>'rosterEntryId') into before_ids from jsonb_array_elements(old.document->'participants') q;
  select jsonb_agg(jsonb_build_object('id',q->'rosterEntryId','side',q->'side') || case when manual then '{}'::jsonb else jsonb_build_object('jersey',q->'jersey') end order by q->>'rosterEntryId') into after_ids from jsonb_array_elements(d->'participants') q;
  if before_ids is distinct from after_ids then raise sqlstate 'PT409' using message='confirmed_roster_locked';end if;
 end if;
end$$;

-- Existing authorization, lock order, versions and receipts are retained.
create or replace function private.save_game(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;gid uuid;did uuid;hid uuid;aid uuid;root uuid;expected integer;r jsonb;receipt private.game_commands%rowtype;old public.games%rowtype;next_version integer;day date;hour time;started timestamp;ended timestamp;place text;num text;result jsonb;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','expectedVersion','game']) or octet_length(p_command::text)>8192 or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' or (p_command->>'expectedVersion')!~'^[0-9]+$' then raise sqlstate 'PT400' using message='invalid_game';end if;
 r:=p_command->'game';
 if not (private.context_keys(r,array['id','disputeId','homeRegistrationId','awayRegistrationId','date','time','venue','number']) or private.context_keys(r,array['id','disputeId','homeRegistrationId','awayRegistrationId','date','time','startAt','endAt','venue','number'])) or
 (r ? 'startAt' and jsonb_typeof(r->'startAt') not in('string','null')) or (r ? 'endAt' and jsonb_typeof(r->'endAt') not in('string','null')) or
 jsonb_typeof(r->'date') not in('string','null') or jsonb_typeof(r->'time') not in('string','null') or jsonb_typeof(r->'venue') not in('string','null') or jsonb_typeof(r->'number') not in('string','null') then raise sqlstate 'PT400' using message='invalid_game';end if;
 cmd:=(p_command->>'commandId')::uuid;gid:=(r->>'id')::uuid;did:=(r->>'disputeId')::uuid;hid:=(r->>'homeRegistrationId')::uuid;aid:=(r->>'awayRegistrationId')::uuid;expected:=(p_command->>'expectedVersion')::integer;
 if cmd is null or gid is null or did is null or hid is null or aid is null or hid=aid or expected not between 0 and 2147483646 then raise sqlstate 'PT400' using message='invalid_game';end if;
 if r->>'date' is not null then
 if (r->>'date')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise sqlstate 'PT400' using message='invalid_game';end if;day:=(r->>'date')::date;
 end if;
 if r->>'time' is not null then
 if day is null or (r->>'time')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise sqlstate 'PT400' using message='invalid_game';end if;hour:=(r->>'time')::time;
 end if;
 if r ? 'startAt' and r->>'startAt' is not null then
  if (r->>'startAt')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]$'
    then raise sqlstate 'PT400' using message='invalid_game';end if;
  started:=(r->>'startAt')::timestamp;
 end if;
 if r ? 'endAt' and r->>'endAt' is not null then
  if (r->>'endAt')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]$'
    then raise sqlstate 'PT400' using message='invalid_game';end if;
  ended:=(r->>'endAt')::timestamp;
 end if;
 place:=nullif(regexp_replace(btrim(r->>'venue'),'[[:space:]]+',' ','g'),'');num:=nullif(regexp_replace(btrim(r->>'number'),'[[:space:]]+',' ','g'),'');
 if length(place)>160 or length(num)>40 or coalesce(r->>'venue','')~'[[:cntrl:]]' or coalesce(r->>'number','')~'[[:cntrl:]]' then raise sqlstate 'PT400' using message='invalid_game';end if;
 perform pg_advisory_xact_lock(hashtextextended('game-command:'||cmd::text,0));
 select * into receipt from private.game_commands where command_id=cmd;
 if found then
 if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
 if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;
 end if;
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if root is null then raise sqlstate 'PT400' using message='invalid_game';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 perform pg_advisory_xact_lock(hashtextextended('game:'||gid::text,0));
 select * into old from public.games where id=gid for update;
 if (found and old.version<>expected) or (not found and expected<>0) then raise sqlstate 'PT409' using message='version_conflict';end if;
 if old.id is not null and old.dispute_id<>did then raise sqlstate 'PT400' using message='immutable_parent';end if;
 if not exists(select 1 from public.registrations where id=hid and dispute_id=did) or not exists(select 1 from public.registrations where id=aid and dispute_id=did) then raise sqlstate 'PT400' using message='invalid_game';end if;
 if not (r ? 'startAt') and old.id is not null then started:=old.started_at;end if;
 if not (r ? 'endAt') and old.id is not null then ended:=old.ended_at;end if;
 if ended is not null and (started is null or ended<=started or ended>started+interval '24 hours')
   then raise sqlstate 'PT400' using message='invalid_game_time';end if;
 -- Finished games accept private officiating and actual start/end corrections.
 -- Keep published context and agenda fixed; never reopen the game or its snapshots.
 if old.id is not null and old.state<>'scheduled' and
  row(hid,aid,day,hour,place,num) is distinct from
  row(old.home_registration_id,old.away_registration_id,old.scheduled_date,old.scheduled_time,old.venue,old.game_number)
  then raise sqlstate 'PT409' using message='game_locked';end if;
 next_version:=coalesce(old.version,0)+1;
 if old.id is null then insert into public.games(id,dispute_id,home_registration_id,away_registration_id,scheduled_date,scheduled_time,started_at,ended_at,venue,game_number) values(gid,did,hid,aid,day,hour,started,ended,place,num);
 else update public.games set home_registration_id=hid,away_registration_id=aid,scheduled_date=day,scheduled_time=hour,started_at=started,ended_at=ended,venue=place,game_number=num,version=next_version,saved_at=clock_timestamp() where id=gid;end if;
 update public.championships set saved_at=clock_timestamp() where id=root;
 result:=jsonb_build_object('id',gid,'version',next_version);
 insert into private.game_commands(command_id,actor_id,payload,result) values(cmd,actor,p_command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_game';
end
$$;
