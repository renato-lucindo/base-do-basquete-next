-- G4a: shared draft/final facts; no publication or public grants yet.
create function private.compute_sheet_facts(d jsonb) returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare p jsonb;e jsonb;s text;st jsonb;pid uuid;periods integer;states jsonb:='{}';teams jsonb:='{}';
 key text;target text;code text;kind text;fouls integer;t integer;u integer;status text;own jsonb;captain text;coachkey text;coach jsonb;opponent text;free integer;idx integer;players jsonb;
begin
 if not private.context_keys(d,array['rulesVersion','periods','participants','staff','events']) or d->>'rulesVersion' is distinct from 'FIBA_2024' or jsonb_typeof(d->'periods') is distinct from 'number' or (d->>'periods')!~'^[0-9]+$' or jsonb_typeof(d->'participants') is distinct from 'array' or jsonb_typeof(d->'events') is distinct from 'array' or not private.context_keys(d->'staff',array['home','away']) then raise sqlstate 'PT400' using message='invalid_sheet';end if;
 periods:=(d->>'periods')::integer;
 if periods not between 4 and 12 or jsonb_array_length(d->'participants')>24 or jsonb_array_length(d->'events')>2000 then raise sqlstate 'PT400' using message='invalid_sheet';end if;
 foreach s in array array['home','away'] loop
  teams:=jsonb_set(teams,array[s],jsonb_build_object('b',0,'c',0,'status','eligible','points',0,'periods',to_jsonb(array_fill(0,array[periods])),'freeMade',0,'freeTaken',0,'freeConceded',0,'foulsByPeriod',to_jsonb(array_fill(0,array[periods]))));
 end loop;
 for p in select value from jsonb_array_elements(d->'participants') loop
  if not private.context_keys(p,array['rosterEntryId','side','jersey','played','starter']) or jsonb_typeof(p->'rosterEntryId') is distinct from 'string' or jsonb_typeof(p->'jersey') is distinct from 'string' or jsonb_typeof(p->'played') is distinct from 'boolean' or jsonb_typeof(p->'starter') is distinct from 'boolean' or coalesce(p->>'side','') not in('home','away') or (p->>'jersey')!~'^(00|0|[1-9][0-9]?)$' then raise sqlstate 'PT400' using message='invalid_sheet';end if;
  pid:=(p->>'rosterEntryId')::uuid;
  if pid is null or ((p->>'starter')::boolean and not(p->>'played')::boolean) then raise sqlstate 'PT400' using message='invalid_sheet';end if;
  states:=jsonb_set(states,array[(p->>'side')||':'||(p->>'jersey')],jsonb_build_object('f',0,'t',0,'u',0,'status','eligible','played',(p->>'played')::boolean,'two',0,'three',0,'free',0,'points',0));
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
  idx:=(e->>'period')::integer-1;
  if code in('1','2','3') and p is not null then
   p:=p||jsonb_build_object('points',(p->>'points')::integer+code::integer,'two',(p->>'two')::integer+case when code='2' then 1 else 0 end,'three',(p->>'three')::integer+case when code='3' then 1 else 0 end,'free',(p->>'free')::integer+case when code='1' then 1 else 0 end);
   states:=jsonb_set(states,array[key],p);
   own:=own||jsonb_build_object('points',(own->>'points')::integer+code::integer,'freeMade',(own->>'freeMade')::integer+case when code='1' then 1 else 0 end);
   own:=jsonb_set(own,array['periods',idx::text],to_jsonb((own->'periods'->>idx)::integer+code::integer));
   teams:=jsonb_set(teams,array[s],own);continue;
  end if;
  if code!~'^([PUD][123C]?|T[1C]|B[12C]|C[1C])$' or (target='B' and left(code,1)<>'B') or (target='C' and left(code,1) not in('C','D')) or (p is not null and left(code,1) in('B','C')) then raise sqlstate 'PT400' using message='invalid_sheet';end if;
  kind:=left(code,1);opponent:=case when s='home' then 'away' else 'home' end;
  free:=case when right(code,1)~'^[123]$' then right(code,1)::integer else 0 end;
  own:=jsonb_set(own,'{freeConceded}',to_jsonb((own->>'freeConceded')::integer+free));
  teams:=jsonb_set(teams,array[opponent,'freeTaken'],to_jsonb((teams->opponent->>'freeTaken')::integer+free));
  if p is not null then
   own:=jsonb_set(own,array['foulsByPeriod',idx::text],to_jsonb((own->'foulsByPeriod'->>idx)::integer+1));
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
 foreach s in array array['home','away'] loop
  own:=teams->s;teams:=jsonb_set(teams,array[s],(own-array['b','c','status'])||jsonb_build_object('coachB',own->'b','coachC',own->'c','coachStatus',own->'status'));
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('rosterEntryId',q->'rosterEntryId','side',q->'side','jersey',q->'jersey','played',q->'played','starter',q->'starter','captain',(d->'staff'->(q->>'side')->>'captainRosterEntryId')=q->>'rosterEntryId','two',states->((q->>'side')||':'||(q->>'jersey'))->'two','three',states->((q->>'side')||':'||(q->>'jersey'))->'three','free',states->((q->>'side')||':'||(q->>'jersey'))->'free','points',states->((q->>'side')||':'||(q->>'jersey'))->'points','fouls',states->((q->>'side')||':'||(q->>'jersey'))->'f','technical',states->((q->>'side')||':'||(q->>'jersey'))->'t','unsportsmanlike',states->((q->>'side')||':'||(q->>'jersey'))->'u','status',states->((q->>'side')||':'||(q->>'jersey'))->'status') order by ordinal),'[]'::jsonb) into players from jsonb_array_elements(d->'participants') with ordinality x(q,ordinal);
 return jsonb_build_object('rulesVersion','FIBA_2024','periods',periods,'teams',teams,'players',players);
end
$$;
create or replace function private.validate_sheet_document(d jsonb) returns void language plpgsql immutable security invoker set search_path='' as $$begin perform private.compute_sheet_facts(d);end$$;
create function private.final_sheet_facts(d jsonb) returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare facts jsonb;s text;periods integer;idx integer;home integer;away integer;
begin
 facts:=private.compute_sheet_facts(d);periods:=(d->>'periods')::integer;
 foreach s in array array['home','away'] loop
  if (select count(*) from jsonb_array_elements(d->'participants') p where p->>'side'=s and (p->>'starter')::boolean)<>5 or d->'staff'->s->>'captainRosterEntryId' is null then raise sqlstate 'PT400' using message='incomplete_sheet';end if;
  if (facts->'teams'->s->>'freeMade')::integer>(facts->'teams'->s->>'freeTaken')::integer then raise sqlstate 'PT400' using message='free_throws_exceed_penalties';end if;
 end loop;
 if facts->'teams'->'home'->'points'=facts->'teams'->'away'->'points' then raise sqlstate 'PT400' using message='tied_final_score';end if;
 if periods>4 then for idx in 4..periods-1 loop
  select coalesce(sum(value::integer),0) into home from jsonb_array_elements_text(facts->'teams'->'home'->'periods') with ordinality x(value,n) where n<=idx;
  select coalesce(sum(value::integer),0) into away from jsonb_array_elements_text(facts->'teams'->'away'->'periods') with ordinality x(value,n) where n<=idx;
  if home<>away then raise sqlstate 'PT400' using message='overtime_without_prior_tie';end if;
 end loop;end if;
 return facts;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then raise sqlstate 'PT400' using message='invalid_sheet';
end$$;
revoke all on function private.compute_sheet_facts(jsonb),private.final_sheet_facts(jsonb) from public,anon,authenticated,service_role;
