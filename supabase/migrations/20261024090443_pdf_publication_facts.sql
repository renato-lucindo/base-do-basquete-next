-- G4c1: private deterministic derivation; no publication writer or new public grants.
create function private.pdf_publication_facts(r jsonb,supp jsonb,a jsonb,manual jsonb,reason text,accept_divergence boolean) returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare p jsonb:=r->'source'->'parsed';d jsonb:=r->'document';rows jsonb:='[]';staff jsonb:='{}';teams jsonb:='{}';players jsonb:='[]';origins jsonb:='{}';o jsonb;manual_facts jsonb;tm jsonb;q jsonb;c jsonb;m jsonb;line jsonb;st jsonb;captain jsonb;markers jsonb;advanced jsonb;basic jsonb;side text;k text;ss integer;ix integer;n integer;found_count integer;has_facts boolean;fiba boolean;manual_needed boolean;divergent boolean:=false;is_played boolean;periods jsonb;score integer;home_periods jsonb;away_periods jsonb;total_home numeric;total_away numeric;
begin
 if octet_length(r::text)>1048576 or r->'source'->'ready' is distinct from 'true'::jsonb or r->'source'->'version' is distinct from '2'::jsonb or not private.pdf_number(r->'version') or (r->>'version')::integer<1 or d->>'gameId' is null then raise sqlstate 'PT400' using message='invalid_pdf_publication';end if;
 perform (r->'source'->>'id')::uuid;perform (d->>'gameId')::uuid;perform (d->>'disputeId')::uuid;
 perform private.validate_pdf_parsed(p);fiba:=p->>'format'='FIBA_GENIUS_SPORTS';
 if not private.context_keys(supp,array['rows','staff']) or jsonb_typeof(supp->'rows') is distinct from 'array' or jsonb_array_length(supp->'rows') not between 10 and 24 or not private.context_keys(supp->'staff',array['home','away']) or not private.context_keys(a,array['scorePoints','periodScores','playerAdvanced','foulsReceived','teamAdvanced','gameAdvanced']) or coalesce(a->>'scorePoints','') not in('pdf','sheet') or coalesce(a->>'periodScores','') not in('pdf','sheet','none') then raise sqlstate 'PT400' using message='invalid_pdf_authority';end if;
 foreach k in array array['playerAdvanced','foulsReceived','teamAdvanced','gameAdvanced'] loop if coalesce(a->>k,'') not in('pdf','none') then raise sqlstate 'PT400' using message='invalid_pdf_authority';end if;end loop;
 manual_needed:=a->>'scorePoints'='sheet' or a->>'periodScores'='sheet';
 if manual_needed then
  if not private.context_keys(manual,array['document','version']) or not private.pdf_number(manual->'version') or (manual->>'version')::integer<1 or length(regexp_replace(coalesce(reason,''),'^[[:space:]]+|[[:space:]]+$','','g')) not between 10 and 500 then raise sqlstate 'PT400' using message='fallback_decision_required';end if;
  manual_facts:=private.final_sheet_facts(manual->'document');
 end if;
 if (a->>'periodScores'='pdf' or a->>'foulsReceived'='pdf' or a->>'teamAdvanced'='pdf' or a->>'gameAdvanced'='pdf') and not fiba then raise sqlstate 'PT400' using message='pdf_domain_unavailable';end if;
 if a->>'foulsReceived'='pdf' and exists(select 1 from jsonb_array_elements(p->'teams') t cross join lateral jsonb_array_elements(t->'players') v where v->'foulsReceived'='null'::jsonb) then raise sqlstate 'PT400' using message='pdf_domain_unavailable';end if;
 if jsonb_typeof(d->'invertSides') is distinct from 'boolean' or jsonb_typeof(d->'mappings') is distinct from 'array' then raise sqlstate 'PT400' using message='invalid_pdf_publication';end if;
 n:=jsonb_array_length(p->'teams'->0->'players')+jsonb_array_length(p->'teams'->1->'players');
 if n<>jsonb_array_length(d->'mappings') or n<>jsonb_array_length(supp->'rows') then raise sqlstate 'PT400' using message='invalid_pdf_selection';end if;
 for ss in 0..1 loop
  tm:=p->'teams'->ss;side:=case when (ss=0)<>(d->>'invertSides')::boolean then 'home' else 'away' end;
  for ix in 0..jsonb_array_length(tm->'players')-1 loop
   q:=tm->'players'->ix;
   select count(*),jsonb_agg(value)->0 into found_count,c from jsonb_array_elements(supp->'rows') where value->'sourceSide'=to_jsonb(ss) and value->'sourceIndex'=to_jsonb(ix);
   if found_count<>1 or not private.context_keys(c,array['sourceSide','sourceIndex','played','starter','captain']) or jsonb_typeof(c->'played') is distinct from 'boolean' or jsonb_typeof(c->'starter') is distinct from 'boolean' or jsonb_typeof(c->'captain') is distinct from 'boolean' then raise sqlstate 'PT400' using message='invalid_pdf_selection';end if;
   select count(*),jsonb_agg(value)->0 into found_count,m from jsonb_array_elements(d->'mappings') where value->'sourceSide'=to_jsonb(ss) and value->'sourceIndex'=to_jsonb(ix);
   if found_count<>1 or not private.context_keys(m,array['sourceSide','sourceIndex','rosterEntryId','jersey']) or m->>'rosterEntryId' is null or coalesce(m->>'jersey','')!~'^(00|0|[1-9][0-9]?)$' then raise sqlstate 'PT400' using message='invalid_pdf_selection';end if;perform (m->>'rosterEntryId')::uuid;
   has_facts:=(q->>'secondsPlayed')::integer>0 or (q->'fieldGoals'->>'attempted')::integer>0 or (q->'freeThrows'->>'attempted')::integer>0 or (q->>'rebounds')::integer>0 or (q->>'assists')::integer>0 or (q->>'turnovers')::integer>0 or (q->>'steals')::integer>0 or (q->>'blocks')::integer>0 or (q->>'foulsCommitted')::integer>0 or coalesce((q->>'foulsReceived')::integer,0)>0;
   is_played:=(c->>'played')::boolean;
   if (c->'starter'='true'::jsonb and not is_played) or (not is_played and (has_facts or (fiba and q->'starter'='true'::jsonb))) then raise sqlstate 'PT400' using message='invalid_pdf_participation';end if;
   markers:=jsonb_build_object('starter',case when fiba then q->'starter' else 'null'::jsonb end,'captain',case when fiba then q->'captain' else 'null'::jsonb end,'participation',case when fiba and q->'didNotPlay'='true'::jsonb then 'did_not_play' when has_facts or (fiba and q->'starter'='true'::jsonb) then 'played' else 'unknown' end);
   line:=jsonb_build_object('rosterEntryId',m->'rosterEntryId','side',side,'jersey',m->'jersey','played',c->'played','starter',c->'starter','captain',c->'captain','sourceSide',ss,'sourceIndex',ix,'sourceMarkers',markers);
   rows:=rows||jsonb_build_array(line);
   if manual_needed then
    select value into basic from jsonb_array_elements(manual_facts->'players') where value->'rosterEntryId'=m->'rosterEntryId' and value->>'side'=side;
    if basic is null or basic->'played'<>c->'played' then raise sqlstate 'PT400' using message='pdf_participation_mismatch';end if;
    if is_played and ((basic->>'points')::integer<>(q->>'points')::integer or (basic->>'two')::integer<>(q->'twoPoints'->>'made')::integer or (basic->>'three')::integer<>(q->'threePoints'->>'made')::integer or (basic->>'free')::integer<>(q->'freeThrows'->>'made')::integer) then divergent:=true;end if;
   end if;
   if a->>'scorePoints'='pdf' then basic:=jsonb_build_object('points',q->'points','two',q->'twoPoints'->'made','three',q->'threePoints'->'made','free',q->'freeThrows'->'made');else basic:=jsonb_build_object('points',basic->'points','two',basic->'two','three',basic->'three','free',basic->'free');end if;
   advanced:='null';if a->>'playerAdvanced'='pdf' then select jsonb_object_agg(key,value) into advanced from jsonb_each(q) where key=any(array['points','secondsPlayed','fieldGoals','twoPoints','threePoints','freeThrows','offensiveRebounds','defensiveRebounds','rebounds','assists','turnovers','steals','blocks','foulsCommitted','plusMinus','efficiency']);end if;
   players:=players||jsonb_build_array(line||basic||jsonb_build_object('advanced',advanced,'foulsReceived',case when a->>'foulsReceived'='pdf' then q->'foulsReceived' else 'null'::jsonb end));
  end loop;
 end loop;
 if manual_needed and jsonb_array_length(rows)<>jsonb_array_length(manual_facts->'players') then raise sqlstate 'PT400' using message='pdf_participation_mismatch';end if;
 foreach side in array array['home','away'] loop
  if (select count(*) from jsonb_array_elements(rows) x where x->>'side'=side and x->'starter'='true'::jsonb)<>5 or (select count(*) from jsonb_array_elements(rows) x where x->>'side'=side and x->'captain'='true'::jsonb)<>1 then raise sqlstate 'PT400' using message='pdf_starters_captain_required';end if;
  select value->'rosterEntryId' into captain from jsonb_array_elements(rows) where value->>'side'=side and value->'captain'='true'::jsonb;
  st:=supp->'staff'->side;
  if not private.context_keys(st,array['coachStaffEntryId','assistantStaffEntryId']) or jsonb_typeof(st->'coachStaffEntryId') not in('string','null') or jsonb_typeof(st->'assistantStaffEntryId') not in('string','null') then raise sqlstate 'PT400' using message='invalid_pdf_staff';end if;
  perform (st->>'coachStaffEntryId')::uuid;perform (st->>'assistantStaffEntryId')::uuid;
  staff:=jsonb_set(staff,array[side],st||jsonb_build_object('captainRosterEntryId',captain));
  ss:=case when (side='home')<>(d->>'invertSides')::boolean then 0 else 1 end;tm:=p->'teams'->ss;
  if manual_needed and ((tm->>'score')::integer<>(manual_facts->'teams'->side->>'points')::integer or (tm->'periodScores'<>'null'::jsonb and tm->'periodScores'<>manual_facts->'teams'->side->'periods')) then divergent:=true;end if;
  score:=case when a->>'scorePoints'='pdf' then (tm->>'score')::integer else (manual_facts->'teams'->side->>'points')::integer end;
  periods:=case when a->>'periodScores'='pdf' then tm->'periodScores' when a->>'periodScores'='sheet' then manual_facts->'teams'->side->'periods' else 'null'::jsonb end;
  if periods<>'null'::jsonb and (select sum(value::text::numeric) from jsonb_array_elements(periods))<>score then raise sqlstate 'PT400' using message='pdf_period_score_mismatch';end if;
  teams:=jsonb_set(teams,array[side],jsonb_build_object('points',score,'periods',periods,'advanced',case when a->>'teamAdvanced'='pdf' then tm->'teamStatistics' else 'null'::jsonb end));
 end loop;
 perform private.validate_sheet_document(jsonb_build_object('rulesVersion','FIBA_2024','periods',4,'events','[]'::jsonb,'participants',(select jsonb_agg(value-'captain'-'sourceSide'-'sourceIndex'-'sourceMarkers') from jsonb_array_elements(rows)),'staff',staff));
 if divergent and accept_divergence is distinct from true then raise sqlstate 'PT400' using message='pdf_divergence_decision_required';end if;
 if teams->'home'->'points'=teams->'away'->'points' then raise sqlstate 'PT400' using message='pdf_final_tie';end if;
 home_periods:=teams->'home'->'periods';away_periods:=teams->'away'->'periods';
 if home_periods<>'null'::jsonb and away_periods<>'null'::jsonb then
  for n in 4..jsonb_array_length(home_periods)-1 loop
   select sum(value::text::numeric) into total_home from jsonb_array_elements(home_periods) with ordinality x(value,position) where position<=n;
   select sum(value::text::numeric) into total_away from jsonb_array_elements(away_periods) with ordinality x(value,position) where position<=n;
   if total_home<>total_away then raise sqlstate 'PT400' using message='pdf_overtime_without_tie';end if;
  end loop;
 end if;
 o:=jsonb_build_object('kind','pdf','sourceId',r->'source'->'id','sourceVersion',r->'source'->'version','reviewVersion',r->'version');
 for k,line in select key,value from jsonb_each(a) loop origins:=jsonb_set(origins,array[k],case when line='"none"'::jsonb then 'null'::jsonb when line='"pdf"'::jsonb then o else jsonb_build_object('kind','sheet','version',manual->'version') end);end loop;
 return jsonb_build_object('teams',teams,'players',players,'staff',staff,'gameAdvanced',case when a->>'gameAdvanced'='pdf' then p->'gameStatistics' else 'null'::jsonb end,'origins',origins,'divergent',divergent);
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or not_null_violation or check_violation then raise sqlstate 'PT400' using message='invalid_pdf_publication';
end$$;
revoke all on function private.pdf_publication_facts(jsonb,jsonb,jsonb,jsonb,text,boolean) from public,anon,authenticated,service_role;
