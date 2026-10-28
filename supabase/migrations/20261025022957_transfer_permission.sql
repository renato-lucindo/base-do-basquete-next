-- T2a: optional finite transfer permission; missing/null never implies allowed.
-- Replace in place to preserve the validator OID, existing CHECK binding and ACL.
create or replace function private.valid_regulation_definition(d jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare p jsonb;g jsonb;n jsonb;r jsonb;x jsonb;target jsonb;wo jsonb;points jsonb;refs uuid[];phases uuid[]:='{}';knockouts uuid[]:='{}';series_ids uuid[]:='{}';group_ids uuid[];members uuid[];group_members uuid[];assigned uuid[]:='{}';ids uuid[];slots integer[];slot integer;maximum integer;group_count integer:=0;
begin
 if d ? 'transfers' and d->'transfers'<>'null'::jsonb and (jsonb_typeof(d->'transfers') is distinct from 'string' or d->>'transfers' not in('allowed','forbidden')) then return false;end if;
 if octet_length(d::text)>1048576 or not private.context_keys(d-'transfers',array['registrationIds','occurrenceRules','groupPhases','knockoutPhases','series']) or not private.regulation_ids(d->'registrationIds',1000) then return false;end if;
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
