-- Collective public coverage; existing locks, authorization, receipts and snapshot versions retained.
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
  return facts||jsonb_build_object('teams',teams,'players',players,
    '_staffDiscipline',(select jsonb_object_agg(s, (select count(*) from jsonb_each(people->s) x
      where x.value->>'status' in ('GD','D') and not exists(select 1 from jsonb_array_elements(d->'participants') q where q->>'rosterEntryId'=x.key)))
      from unnest(array['home','away']) s));
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or null_value_not_allowed then
  raise sqlstate 'PT400' using message='invalid_sheet';
end$$;


-- No backfill: historical snapshots stay immutable and retain unknown coverage.
create function private.enrich_sheet_team_statistics(d jsonb,facts jsonb,review jsonb default null) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare s text; r jsonb; v jsonb; k text; minimum integer; technical integer;
begin
 if review is not null and not private.context_keys(review,array['home','away']) then
  raise sqlstate 'PT400' using message='invalid_team_statistics';end if;
 foreach s in array array['home','away'] loop
  r:=case when review is null then '{"disqualifications":null,"foulsReceived":null}'::jsonb else review->s end;
  if not private.context_keys(r,array['disqualifications','foulsReceived']) then raise sqlstate 'PT400' using message='invalid_team_statistics';end if;
  foreach k in array array['disqualifications','foulsReceived'] loop
   v:=r->k;
   if v is distinct from 'null'::jsonb and (not private.pdf_number(v) or (v::text)::numeric>2147483647) then
    raise sqlstate 'PT400' using message='invalid_team_statistics';end if;
  end loop;
  select count(*) into minimum from jsonb_array_elements(facts->'players') q where q->>'side'=s and q->>'status' in ('GD','D');
  if d->>'formatVersion'='2' then
   minimum:=minimum+coalesce((facts->'_staffDiscipline'->>s)::integer,0);
  elsif d->'staff'->s->>'coachStaffEntryId' is not null and facts->'teams'->s->>'coachStatus' in ('GD','D') then minimum:=minimum+1;end if;
  if r->'disqualifications'<>'null'::jsonb and (r->>'disqualifications')::integer<minimum then
   raise sqlstate 'PT400' using message='team_disqualifications_below_known';end if;
  select count(*) into technical from jsonb_array_elements(d->'events') e where e->>'side'=s and
   ((e->>'code') ~ '^(T|C)(1|C)$' or ((e->>'code') ~ '^B(1|C)$'));
  facts:=jsonb_set(facts,array['teams',s,'teamStatistics'],jsonb_build_object('version',1,'technicalFouls',technical,
   'disqualifications',r->'disqualifications','foulsReceived',r->'foulsReceived'));
 end loop;
 return facts-'_staffDiscipline';
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then
 raise sqlstate 'PT400' using message='invalid_team_statistics';
end$$;
alter function private.final_sheet_facts(jsonb) rename to final_sheet_facts_base;
create function private.final_sheet_facts(d jsonb) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select private.enrich_sheet_team_statistics(d,private.final_sheet_facts_base(d))
$$;
revoke all on function private.enrich_sheet_team_statistics(jsonb,jsonb,jsonb),private.final_sheet_facts(jsonb),private.final_sheet_facts_base(jsonb) from public,anon,authenticated,service_role;

create or replace function private.publish_sheet_game(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;gid uuid;gv integer;pv integer;sv integer;root uuid;src jsonb;d jsonb;reason text;fallback boolean;g public.games%rowtype;current_pub public.published_games%rowtype;receipt private.game_publication_commands%rowtype;sh public.game_sheets%rowtype;facts jsonb;players jsonb;payload jsonb;staff jsonb:='{}';s text;st jsonb;now_at timestamptz;result jsonb;
begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['requestId','gameId','gameVersion','basePublicationVersion','source','reason','fallback']) or octet_length(p_command::text)>524288 then raise sqlstate 'PT400' using message='invalid_publication';end if;
 src:=p_command->'source';
 if not (private.context_keys(src,array['kind','baseSheetVersion','document']) or private.context_keys(src,array['kind','baseSheetVersion','document','teamReview'])) or src->>'kind' is distinct from 'sheet' or not private.pdf_number(p_command->'gameVersion') or not private.pdf_number(p_command->'basePublicationVersion') or not private.pdf_number(src->'baseSheetVersion') or jsonb_typeof(p_command->'reason') is distinct from 'string' or jsonb_typeof(p_command->'fallback') is distinct from 'boolean' then raise sqlstate 'PT400' using message='invalid_publication';end if;
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
 facts:=private.enrich_sheet_team_statistics(d,private.final_sheet_facts_base(d),src->'teamReview');
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

