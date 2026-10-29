-- Keep the v1 rules and historical facts fixed; new drafts opt in to version 2.
alter function private.compute_sheet_facts(jsonb) rename to compute_sheet_facts_v1;

create function private.compute_sheet_facts_v2(d jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare
  base jsonb; facts jsonb; players jsonb; teams jsonb; e jsonb; p jsonb; ps jsonb; st jsonb;
  people jsonb:='{"home":{},"away":{}}'; player_state jsonb:='{}'; current_coach jsonb:='{}';
  assignments jsonb:='{}'; team jsonb; person jsonb; actor text; captain text; assistant text;
  active text; chosen text; automatic text; successor text; side text; target text; code text;
  kind text; person_key text; roster_id text; free integer; t integer; u integer; f integer;
  player_status text; idx integer;
begin
  if not private.context_keys(d,array['formatVersion','rulesVersion','periods','participants','staff','events'])
    or d->>'formatVersion' <> '2' or jsonb_typeof(d->'formatVersion') <> 'number'
    then raise sqlstate 'PT400' using message='invalid_sheet'; end if;
  -- Run all structural and roster checks through the unmodified v1 validator.
  base:=d-'formatVersion';
  base:=jsonb_set(base,'{events}',coalesce((
    select jsonb_agg(value-'actorId'-'successorId' order by ordinal)
      from jsonb_array_elements(d->'events') with ordinality q(value,ordinal)
      where value->>'target' not in ('C','AT')
  ),'[]'::jsonb));
  -- Validate v2-only fields before discarding them in the legacy projection.
  for e in select value from jsonb_array_elements(d->'events') loop
    if not private.context_keys(e-'actorId'-'successorId',array['id','side','period','target','code'])
      or jsonb_typeof(e->'id') is distinct from 'string'
      or coalesce(e->>'side','') not in ('home','away')
      or jsonb_typeof(e->'period') is distinct from 'number'
      or coalesce(e->>'period','') !~ '^[0-9]+$'
      or (e->>'period')::integer not between 1 and (d->>'periods')::integer
      or jsonb_typeof(e->'target') is distinct from 'string'
      or jsonb_typeof(e->'code') is distinct from 'string'
      or length(e->>'code')>3
      or (e ? 'actorId' and (jsonb_typeof(e->'actorId') <> 'string' or e->>'actorId' is null))
      or (e ? 'successorId' and (jsonb_typeof(e->'successorId') <> 'string' or e->>'successorId' is null))
      or (e ? 'actorId' and e->>'target' not in ('C','AT'))
      or coalesce(e->>'target','') !~ '^(00|0|[1-9][0-9]?|C|AT)$'
      then raise sqlstate 'PT400' using message='invalid_sheet'; end if;
    perform (e->>'id')::uuid;
    if e ? 'actorId' then perform (e->>'actorId')::uuid; end if;
    if e ? 'successorId' then perform (e->>'successorId')::uuid; end if;
    if e->>'target' in ('C','AT') and
      ((e->>'target'='C' and coalesce(e->>'code','') !~ '^(B[1C]|C[1C]|D[123C]?)$')
       or (e->>'target'='AT' and coalesce(e->>'code','') !~ '^D[123C]?$'))
      then raise sqlstate 'PT400' using message='invalid_sheet'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(d->'events') q
    group by (q->>'id')::uuid having count(*)>1) then
    raise sqlstate 'PT400' using message='invalid_sheet';end if;
  -- Player actions are computed by the historical engine; staff adds one penalty per occurrence.
  facts:=private.compute_sheet_facts_v1(base);
  teams:=facts->'teams';
  for p in select value from jsonb_array_elements(d->'participants') loop
    player_state:=jsonb_set(player_state,array[p->>'rosterEntryId'],
      jsonb_build_object('f',0,'t',0,'u',0,'status','eligible','played',(p->>'played')::boolean));
  end loop;
  foreach side in array array['home','away'] loop
    st:=d->'staff'->side;
    captain:=st->>'captainRosterEntryId';
    active:=coalesce(st->>'coachStaffEntryId',captain,'');
    assistant:=coalesce(st->>'assistantStaffEntryId','');
    assignments:=jsonb_set(assignments,array[side],jsonb_build_object('captain',coalesce(captain,''),'assistant',assistant));
    current_coach:=jsonb_set(current_coach,array[side],to_jsonb(active));
    foreach actor in array array[active,assistant,coalesce(captain,'')] loop
      if actor<>'' and people->side->actor is null then
        people:=jsonb_set(people,array[side,actor],'{"b":0,"c":0,"status":"eligible"}'::jsonb);
      end if;
    end loop;
  end loop;
  -- Match the stable period/order sort of the TS engine.
  for e in select value from jsonb_array_elements(d->'events') with ordinality q(value,ordinal)
     order by (value->>'period')::integer, ordinal loop
    side:=e->>'side'; target:=e->>'target';code:=e->>'code';kind:=left(code,1);
    active:=current_coach->>side; st:=d->'staff'->side;
    assistant:=coalesce(st->>'assistantStaffEntryId','');
    captain:=coalesce(st->>'captainRosterEntryId','');
    if active is null or active='' then raise sqlstate 'PT400' using message='invalid_sheet_coach';end if;
    person:=people->side->active;
    if person is null or person->>'status'<>'eligible' then raise sqlstate 'PT400' using message='invalid_sheet_coach';end if;
    if target in ('C','AT') then
      actor:=e->>'actorId';
      if actor is null or (target='AT' and actor<>assistant) or (target='C' and actor<>active)
        or (target='AT' and (assistant=active or people->side->assistant->>'status'<>'eligible'))
        then raise sqlstate 'PT400' using message='invalid_sheet_actor';end if;
      if target='AT' then
        people:=jsonb_set(people,array[side,assistant,'status'],'"D"'::jsonb);
      else
        person:=people->side->active;
        if kind='C' then person:=jsonb_set(person,'{c}',to_jsonb((person->>'c')::int+1));end if;
        if kind='B' then person:=jsonb_set(person,'{b}',to_jsonb((person->>'b')::int+1));end if;
        if kind='D' then person:=jsonb_set(person,'{status}','"D"'::jsonb);end if;
        people:=jsonb_set(people,array[side,active],person);
      end if;
      free:=case when right(code,1)~'^[123]$' then right(code,1)::integer else 0 end;
      team:=teams->side;
      teams:=jsonb_set(teams,array[side,'freeConceded'],to_jsonb((team->>'freeConceded')::int+free));
      chosen:=case when side='home' then 'away' else 'home' end;
      teams:=jsonb_set(teams,array[chosen,'freeTaken'],to_jsonb((teams->chosen->>'freeTaken')::int+free));
    else
      select value into p from jsonb_array_elements(d->'participants')
        where value->>'side'=side and value->>'jersey'=target;
      roster_id:=p->>'rosterEntryId';ps:=player_state->roster_id;
      if ps is null or not (ps->>'played')::boolean or ps->>'status'<>'eligible'
        then raise sqlstate 'PT400' using message='invalid_sheet_player';end if;
      if code not in ('1','2','3') then
        f:=(ps->>'f')::int+1;t:=(ps->>'t')::int+case when kind='T' then 1 else 0 end;
        u:=(ps->>'u')::int+case when kind='U' then 1 else 0 end;
        player_status:=case when kind='D' then 'D' when t+u>=2 then 'GD'
          when f>=5 then 'excluded' else 'eligible' end;
        ps:=ps||jsonb_build_object('f',f,'t',t,'u',u,'status',player_status);
        player_state:=jsonb_set(player_state,array[roster_id],ps);
      end if;
    end if;
    -- The current coach may also be a rostered player, including the captain.
    ps:=player_state->active;person:=people->side->active;
    if ps is not null and ps->>'status' in ('D','GD','excluded') then
      person:=jsonb_set(person,'{status}',to_jsonb(case when ps->>'status'='D' then 'D' else 'GD' end));
    end if;
    if person->>'status'<>'D' and ((person->>'c')::int>=2
      or (person->>'c')::int+(person->>'b')::int>=3
      or (ps is not null and (ps->>'t')::int+(ps->>'u')::int>0
        and ((person->>'c')::int>0 or (person->>'b')::int>=2))) then
      person:=jsonb_set(person,'{status}','"GD"'::jsonb);
    end if;
    people:=jsonb_set(people,array[side,active],person);
    if ps is not null and person->>'status'<>'eligible' then
      player_state:=jsonb_set(player_state,array[active,'status'],person->'status');
    end if;
    if person->>'status'<>'eligible' then
      automatic:='';
      foreach actor in array array[assistant,captain] loop
        if actor<>'' and actor<>active and coalesce(people->side->actor->>'status','eligible')='eligible'
          and coalesce(player_state->actor->>'status','eligible')='eligible'
          and (player_state->actor is null or (player_state->actor->>'played')::boolean)
          then automatic:=actor;exit;end if;
      end loop;
      successor:=coalesce(e->>'successorId','');
      if automatic<>'' then
        if successor<>'' then raise sqlstate 'PT400' using message='invalid_sheet_successor';end if;
        chosen:=automatic;
      else
        chosen:=successor;
        if chosen='' or chosen=active or not exists(
          select 1 from jsonb_array_elements(d->'participants') q
           where q->>'rosterEntryId'=chosen and q->>'side'=side and (q->>'played')::boolean)
          or coalesce(player_state->chosen->>'status','')<>'eligible'
          or coalesce(people->side->chosen->>'status','eligible')<>'eligible'
          then raise sqlstate 'PT400' using message='invalid_sheet_successor';end if;
      end if;
      if people->side->chosen is null then
        people:=jsonb_set(people,array[side,chosen],'{"b":0,"c":0,"status":"eligible"}'::jsonb);
      end if;
      current_coach:=jsonb_set(current_coach,array[side],to_jsonb(chosen));
    elsif e ? 'successorId' then raise sqlstate 'PT400' using message='invalid_sheet_successor';end if;
  end loop;
  foreach side in array array['home','away'] loop
    active:=current_coach->>side;person:=people->side->active;
    team:=teams->side;
    teams:=jsonb_set(teams,array[side],team||jsonb_build_object(
      'coachB',coalesce((person->>'b')::int,0),'coachC',coalesce((person->>'c')::int,0),
      'coachStatus',coalesce(person->>'status','eligible')));
  end loop;
  select coalesce(jsonb_agg(jsonb_set(value,'{status}',
      coalesce(player_state->(value->>'rosterEntryId')->'status',value->'status')) order by ordinal),'[]'::jsonb)
    into players from jsonb_array_elements(facts->'players') with ordinality q(value,ordinal);
  return facts||jsonb_build_object('teams',teams,'players',players);
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or null_value_not_allowed then
  raise sqlstate 'PT400' using message='invalid_sheet';
end$$;

create function private.compute_sheet_facts(d jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
begin
  if d ? 'formatVersion' then return private.compute_sheet_facts_v2(d);end if;
  return private.compute_sheet_facts_v1(d);
end$$;

revoke all on function private.compute_sheet_facts(jsonb),private.compute_sheet_facts_v1(jsonb),private.compute_sheet_facts_v2(jsonb) from public,anon,authenticated,service_role;

-- Preserve the existing save transaction, idempotency, guards and snapshots; allow game-specific roles in v2.
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
   select jsonb_build_object('id',p2.id,'name',p2.name,'nickname',p2.nickname) into person from public.staff_entries se join public.persons p2 on p2.id=se.person_id join public.coaches co on co.person_id=se.person_id where se.id=entry and se.registration_id=reg and se.dispute_id=g.dispute_id and (d->>'formatVersion'='2' or se.role=case when staff_role='coach' then 'head' else 'assistant' end) and (se.ended_at is null or old.document->'staff'->s->>(case when staff_role='coach' then 'coachStaffEntryId' else 'assistantStaffEntryId' end)=entry::text);
   if person is null then raise sqlstate 'PT400' using message='invalid_sheet_staff';end if;
   if old.document->'staff'->s->>(case when staff_role='coach' then 'coachStaffEntryId' else 'assistantStaffEntryId' end)=entry::text then person:=old.staff_snapshot->s->staff_role;end if;
   one:=jsonb_set(one,array[staff_role],person);
  end loop;
  if st->>'captainRosterEntryId' is not null then
   rid:=(st->>'captainRosterEntryId')::uuid;
   select coalesce(old_entries->rid::text->'person_snapshot',jsonb_build_object('id',p2.id,'name',p2.name,'nickname',p2.nickname)) into person from public.roster_entries r join public.persons p2 on p2.id=r.person_id where r.id=rid;
   one:=jsonb_set(one,'{captain}',person);
  end if;
  if d->>'formatVersion'='2' and one->'coach'->>'id' is not null and one->'coach'->>'id'=one->'assistant'->>'id' then raise sqlstate 'PT400' using message='duplicate_sheet_staff_person';end if;
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
