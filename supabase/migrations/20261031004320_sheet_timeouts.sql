-- FUT-001: validate time-outs in sheet v2; preserve v1 and all existing receipts.
create or replace function private.compute_sheet_facts_v2(d jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare
  base jsonb; facts jsonb; players jsonb; teams jsonb; e jsonb; p jsonb; ps jsonb; st jsonb;
  people jsonb:='{"home":{},"away":{}}'; player_state jsonb:='{}'; current_coach jsonb:='{}';
  assignments jsonb:='{}'; team jsonb; person jsonb; actor text; captain text; assistant text;
  active text; chosen text; automatic text; successor text; side text; target text; code text;
  kind text; person_key text; roster_id text; free integer; t integer; u integer; f integer;
  to_first jsonb:='{"home":0,"away":0}'::jsonb; to_second jsonb:='{"home":0,"away":0}'::jsonb;
  to_late jsonb:='{"home":0,"away":0}'::jsonb; to_extra jsonb:='{}'::jsonb; to_minute integer; to_count integer;
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
      where value->>'target' not in ('C','AT','TO')
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
      or coalesce(e->>'target','') !~ '^(00|0|[1-9][0-9]?|C|AT|TO)$'
      then raise sqlstate 'PT400' using message='invalid_sheet'; end if;
    perform (e->>'id')::uuid;
    if e ? 'actorId' then perform (e->>'actorId')::uuid; end if;
    if e ? 'successorId' then perform (e->>'successorId')::uuid; end if;
    if e->>'target'='TO' and (e ? 'actorId' or e ? 'successorId' or coalesce(e->>'code','') !~ '^([1-9]|10)$' or (e->>'period')::integer>4 and (e->>'code')::integer>5) then
      raise sqlstate 'PT400' using message='invalid_sheet_timeout';end if;
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
    if target='TO' then
      to_minute:=code::integer;
      if (e->>'period')::integer<=2 then
        to_count:=(to_first->>side)::integer+1;
        if to_count>2 then raise sqlstate 'PT400' using message='invalid_sheet_timeout';end if;
        to_first:=jsonb_set(to_first,array[side],to_jsonb(to_count));
      elsif (e->>'period')::integer<=4 then
        to_count:=(to_second->>side)::integer+1;
        if to_count>3 then raise sqlstate 'PT400' using message='invalid_sheet_timeout';end if;
        to_second:=jsonb_set(to_second,array[side],to_jsonb(to_count));
        if (e->>'period')::integer=4 and to_minute>=9 then
          to_count:=(to_late->>side)::integer+1;
          if to_count>2 then raise sqlstate 'PT400' using message='invalid_sheet_timeout';end if;
          to_late:=jsonb_set(to_late,array[side],to_jsonb(to_count));
        end if;
      else
        to_count:=coalesce((to_extra->>(side||':'||(e->>'period')))::integer,0)+1;
        if to_count>1 then raise sqlstate 'PT400' using message='invalid_sheet_timeout';end if;
        to_extra:=jsonb_set(to_extra,array[side||':'||(e->>'period')],to_jsonb(to_count),true);
      end if;
      continue;
    end if;
    -- TS handles player baskets before staff attribution, including unfinished drafts.
    -- Keep v2 exclusions checked here: the legacy projection cannot see staff fouls.
    if code in ('1','2','3') then
      select value into p from jsonb_array_elements(d->'participants')
        where value->>'side'=side and value->>'jersey'=target;
      ps:=player_state->(p->>'rosterEntryId');
      if ps is null or not (ps->>'played')::boolean or ps->>'status'<>'eligible'
        then raise sqlstate 'PT400' using message='invalid_sheet_player';end if;
      continue;
    end if;
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
