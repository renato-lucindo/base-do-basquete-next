-- Private explanations stay outside the public definition; closed, bounded metadata.
create function private.valid_regulation_extras(d jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare v jsonb;n jsonb;p jsonb;g jsonb;decisions jsonb:=coalesce(d->'tieDecisions','[]');notes jsonb:=coalesce(d->'tieNotes','[]');ids uuid[]:='{}';note_ids uuid[]:='{}';
begin
 if d ? 'customized' and jsonb_typeof(d->'customized') is distinct from 'boolean' then return false;end if;
 if d ? 'customReason' and (jsonb_typeof(d->'customReason') is distinct from 'string' or length(d->>'customReason')>2000) then return false;end if;
 if jsonb_typeof(decisions) is distinct from 'array' or jsonb_array_length(decisions)>1000 or jsonb_typeof(notes) is distinct from 'array' or jsonb_array_length(notes)>1000 then return false;end if;
 for v in select value from jsonb_array_elements(decisions) loop
  if not private.context_keys(v,array['id','phaseId','groupId','order','basis']) or not private.regulation_uuid(v->'id') or not private.regulation_uuid(v->'phaseId') or not private.regulation_uuid(v->'groupId') or not private.regulation_ids(v->'order',1000) or jsonb_array_length(v->'order')<2 or jsonb_typeof(v->'basis') is distinct from 'string' or length(v->>'basis') not between 1 and 1048576 or (v->>'id')::uuid=any(ids) then return false;end if;
  ids:=array_append(ids,(v->>'id')::uuid);
  select pp.value,gg.value into p,g from jsonb_array_elements(d->'groupPhases') pp cross join lateral jsonb_array_elements(pp.value->'groups') gg where pp.value->>'phaseId'=v->>'phaseId' and gg.value->>'id'=v->>'groupId';
  if g is null or exists(select 1 from jsonb_array_elements_text(v->'order') r where not (g->'registrationIds') ? r.value) then return false;end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(decisions) a cross join jsonb_array_elements(decisions) b
  where a.value->>'id'<b.value->>'id' and a.value->>'phaseId'=b.value->>'phaseId' and a.value->>'groupId'=b.value->>'groupId'
   and exists(select 1 from jsonb_array_elements_text(a.value->'order') r where (b.value->'order') ? r.value)) then return false;end if;
 for n in select value from jsonb_array_elements(notes) loop
  if not private.context_keys(n-array['actorId','decidedAt'],array['id','comment']) or not private.regulation_uuid(n->'id') or not (n->>'id')::uuid=any(ids) or (n->>'id')::uuid=any(note_ids) or jsonb_typeof(n->'comment') is distinct from 'string' or length(btrim(n->>'comment')) not between 1 and 2000 then return false;end if;
  if n ? 'actorId' and not private.regulation_uuid(n->'actorId') then return false;end if;
  if n ? 'decidedAt' and (jsonb_typeof(n->'decidedAt') is distinct from 'string' or length(n->>'decidedAt')>64) then return false;end if;
  note_ids:=array_append(note_ids,(n->>'id')::uuid);
 end loop;
 return true;
exception when others then return false;
end$$;
revoke all on function private.valid_regulation_extras(jsonb) from public,anon,authenticated,service_role;

-- Versioned FIBA tie calculation and group turns. Missing policy preserves historical semantics.
-- Replace in place to preserve the validator OID, existing CHECK binding and ACL.
create or replace function private.valid_regulation_definition(d jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare p jsonb;g jsonb;n jsonb;r jsonb;x jsonb;target jsonb;wo jsonb;points jsonb;refs uuid[];phases uuid[]:='{}';knockouts uuid[]:='{}';series_ids uuid[]:='{}';group_ids uuid[];members uuid[];group_members uuid[];assigned uuid[]:='{}';ids uuid[];slots integer[];slot integer;maximum integer;group_count integer:=0;
begin
 if not private.valid_regulation_extras(d) then return false;end if;
 if d ? 'transfers' and d->'transfers'<>'null'::jsonb and (jsonb_typeof(d->'transfers') is distinct from 'string' or d->>'transfers' not in('allowed','forbidden')) then return false;end if;
 if octet_length(d::text)>1048576 or not private.context_keys(d-array['transfers','customized','customReason','tieDecisions','tieNotes'],array['registrationIds','occurrenceRules','groupPhases','knockoutPhases','series']) or not private.regulation_ids(d->'registrationIds',1000) then return false;end if;
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
  if r ? 'calculationPolicy' and (jsonb_typeof(r->'calculationPolicy') is distinct from 'string' or r->>'calculationPolicy'<>'fiba-2026') then return false;end if;
  if r ? 'turns' and (not private.regulation_integer(r->'turns',1,2)) then return false;end if;
  if not private.context_keys(r-array['calculationPolicy','turns'],array['format','points','tieBreakers']) or r->>'format' is distinct from 'round_robin' or not private.context_keys(points,array['win','loss']) or not private.regulation_integer(points->'win',-1000000,1000000) or not private.regulation_integer(points->'loss',-1000000,1000000) or jsonb_typeof(r->'tieBreakers') is distinct from 'array' or jsonb_array_length(r->'tieBreakers')>6 then return false;end if;
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

create or replace function private.save_regulation(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;did uuid;expected integer;root uuid;old integer;ctx jsonb;fp text;d jsonb;receipt private.regulation_commands%rowtype;next_version integer;now_at timestamptz;msg text;result jsonb;link record;g jsonb;p jsonb;rid uuid;note jsonb;old_definition jsonb;audit jsonb;prior jsonb;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','disputeId','expectedVersion','expectedContextFingerprint','definition','reason','acknowledgeImpact']) or octet_length(p_command::text)>1048576 or not private.regulation_uuid(p_command->'commandId') or not private.regulation_uuid(p_command->'disputeId') or not private.regulation_integer(p_command->'expectedVersion',0,2147483646) or jsonb_typeof(p_command->'expectedContextFingerprint') is distinct from 'string' or (p_command->>'expectedContextFingerprint')!~'^[a-f0-9]{64}$' or jsonb_typeof(p_command->'reason') is distinct from 'string' or length(btrim(p_command->>'reason'))>2000 or jsonb_typeof(p_command->'acknowledgeImpact') is distinct from 'boolean' or not private.valid_regulation_definition(p_command->'definition') then raise sqlstate 'PT400' using message='invalid_regulation';end if;
 cmd:=(p_command->>'commandId')::uuid;did:=(p_command->>'disputeId')::uuid;expected:=(p_command->>'expectedVersion')::numeric::integer;d:=p_command->'definition';msg:=btrim(p_command->>'reason');
 perform pg_advisory_xact_lock(hashtextextended('regulation-command:'||cmd::text,0));
 select * into receipt from private.regulation_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;
 end if;
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if root is null then raise sqlstate 'PT400' using message='invalid_regulation';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 select version into old from private.regulation_heads where dispute_id=did for update;
 if coalesce(old,0)<>expected then raise sqlstate 'PT409' using message='version_conflict';end if;
 ctx:=private.regulation_context(did);fp:=encode(sha256(convert_to(ctx::text,'UTF8')),'hex');
 if fp<>p_command->>'expectedContextFingerprint' then raise sqlstate 'PT409' using message='context_conflict';end if;
 if jsonb_array_length(ctx->'publishedGames')>0 and (length(msg)<3 or p_command->'acknowledgeImpact'<>'true'::jsonb) then raise sqlstate 'PT400' using message='regulation_impact_required';end if;
 for rid in select (value#>>'{}')::uuid from jsonb_array_elements(d->'registrationIds') loop
  if not exists(select 1 from public.registrations where id=rid and dispute_id=did) then raise sqlstate 'PT400' using message='invalid_regulation_registration';end if;
 end loop;
 -- A group assignment must match the current opponents; series qualifiers are previewed, never written here.
 for p in select value from jsonb_array_elements(d->'groupPhases') loop for g in select value from jsonb_array_elements(p->'groups') loop
  if exists(select 1 from jsonb_array_elements_text(g->'gameIds') a(id) left join public.games game on game.id=a.id::uuid and game.dispute_id=did where game.id is null or not exists(select 1 from jsonb_array_elements_text(g->'registrationIds') r(id) where r.id::uuid=game.home_registration_id) or not exists(select 1 from jsonb_array_elements_text(g->'registrationIds') r(id) where r.id::uuid=game.away_registration_id)) then raise sqlstate 'PT400' using message='invalid_regulation_assignment';end if;
 end loop;end loop;

 if (d ? 'customized' or exists(select 1 from jsonb_array_elements(d->'groupPhases') p where p.value#>>'{rules,calculationPolicy}'='fiba-2026')) and
  ((d#>'{occurrenceRules,wo}') is distinct from '{"winnerLeaguePoints":2,"loserLeaguePoints":0,"score":{"winner":20,"loser":0}}'::jsonb or
   exists(select 1 from jsonb_array_elements(d->'groupPhases') p where p.value#>>'{rules,calculationPolicy}' is distinct from 'fiba-2026' or p.value#>'{rules,points}'<>'{"win":2,"loss":1}'::jsonb or p.value#>'{rules,tieBreakers}'<>'["head_to_head_points","head_to_head_difference","head_to_head_for","point_difference","points_for"]'::jsonb)) and
  (d->'customized' is distinct from 'true'::jsonb or length(btrim(coalesce(d->>'customReason','')))=0)
 then raise sqlstate 'PT400' using message='custom_reason_required';end if;
 if d->'customized'='true'::jsonb and length(btrim(coalesce(d->>'customReason','')))=0 then raise sqlstate 'PT400' using message='custom_reason_required';end if;
 if exists(select 1 from jsonb_array_elements(coalesce(d->'tieDecisions','[]')) v where not exists(select 1 from jsonb_array_elements(coalesce(d->'tieNotes','[]')) n where n->>'id'=v->>'id' and length(btrim(n->>'comment'))>0)) then raise sqlstate 'PT400' using message='tie_comment_required';end if;
 next_version:=coalesce(old,0)+1;now_at:=clock_timestamp();
 if d ? 'tieNotes' then
  select definition into old_definition from private.regulation_versions where dispute_id=did and version=old;
  audit:='[]'::jsonb;
  for note in select value from jsonb_array_elements(d->'tieNotes') loop
   select n.value into prior from jsonb_array_elements(coalesce(old_definition->'tieNotes','[]')) n
   where n.value->>'id'=note->>'id' and n.value->>'comment'=note->>'comment'
    and (select v.value from jsonb_array_elements(coalesce(old_definition->'tieDecisions','[]')) v where v.value->>'id'=note->>'id')
     is not distinct from (select v.value from jsonb_array_elements(coalesce(d->'tieDecisions','[]')) v where v.value->>'id'=note->>'id');
   if prior is null then prior:=(note-array['actorId','decidedAt'])||jsonb_build_object('actorId',actor,'decidedAt',now_at);end if;
   audit:=audit||jsonb_build_array(prior);
  end loop;
  d:=jsonb_set(d,'{tieNotes}',audit);
 end if;
 insert into private.regulation_versions(dispute_id,version,definition,context,context_fingerprint,algorithm_version,reason,saved_by,saved_at) values(did,next_version,d,ctx,fp,'organized-v1',msg,actor,now_at);
 insert into private.regulation_registration_links(dispute_id,version,registration_id) select did,next_version,(value#>>'{}')::uuid from jsonb_array_elements(d->'registrationIds');
 for link in select q.id from (
   select a.value#>>'{}' as id from jsonb_array_elements(d->'groupPhases') p cross join lateral jsonb_array_elements(p.value->'groups') g cross join lateral jsonb_array_elements(g.value->'gameIds') a
   union all select a.value->>'gameId' from jsonb_array_elements(d->'series') n cross join lateral jsonb_array_elements(n.value->'games') a
 ) q loop
  insert into private.regulation_game_links(dispute_id,version,game_id,game_version,publication_version)
   select did,next_version,game.id,game.version,pub.version from public.games game left join public.published_games pub on pub.game_id=game.id where game.id=link.id::uuid and game.dispute_id=did;
  if not found then raise sqlstate 'PT400' using message='invalid_regulation_assignment';end if;
 end loop;
 insert into private.regulation_heads(dispute_id,version) values(did,next_version) on conflict(dispute_id) do update set version=excluded.version;
 update public.championships set saved_at=now_at where id=root;
 result:=jsonb_build_object('commandId',cmd,'disputeId',did,'version',next_version,'savedAt',now_at,'contextFingerprint',fp);
 insert into private.regulation_commands(command_id,actor_id,payload,result) values(cmd,actor,p_command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_regulation';
end$$;

create or replace function private.public_standings_candidate(did uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare d jsonb;rv integer;ctx jsonb;context_public jsonb;regs jsonb;games_public jsonb;gids uuid[];rids uuid[];effects jsonb;withdrawals_public jsonb;
begin
 select v.definition,v.version into d,rv from private.regulation_heads h join private.regulation_versions v on v.dispute_id=h.dispute_id and v.version=h.version where h.dispute_id=did;
 if d is null then raise sqlstate 'PT409' using message='regulation_required';end if;
 d:=d-array['tieNotes','customReason'];
 select jsonb_build_object('championshipId',c.id,'name',c.name,'seasonId',s.id,'year',s.year,'gender',di.gender,'category',di.category,'division',di.division) into context_public
 from public.disputes di join public.seasons s on s.id=di.season_id join public.championships c on c.id=s.championship_id where di.id=did;
 select coalesce(array_agg(value::uuid),'{}') into rids from jsonb_array_elements_text(d->'registrationIds');
 select coalesce(array_agg(id::uuid),'{}') into gids from (
  select a.value#>>'{}' id from jsonb_array_elements(d->'groupPhases') p cross join lateral jsonb_array_elements(p.value->'groups') g cross join lateral jsonb_array_elements(g.value->'gameIds') a
  union all select a.value->>'gameId' from jsonb_array_elements(d->'series') n cross join lateral jsonb_array_elements(n.value->'games') a
 ) q;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'team',jsonb_build_object('id',t.id,'name',t.name,'abbreviation',t.abbreviation)) order by r.id),'[]') into regs from public.registrations r join public.teams t on t.id=r.team_id where r.id=any(rids) and r.dispute_id=did;
 select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'disputeId',g.dispute_id,'version',g.version,'homeRegistrationId',g.home_registration_id,'awayRegistrationId',g.away_registration_id,'date',g.scheduled_date,'time',to_char(g.scheduled_time,'HH24:MI'),'venue',g.venue,'number',g.game_number,'timeZone','America/Sao_Paulo') order by g.id),'[]') into games_public from public.games g where g.id=any(gids) and g.dispute_id=did and g.home_registration_id=any(rids) and g.away_registration_id=any(rids);
 if jsonb_array_length(regs)<>cardinality(rids) or jsonb_array_length(games_public)<>cardinality(gids) then raise sqlstate 'PT409' using message='public_scope_conflict';end if;
 ctx:=private.regulation_context(did);
 select coalesce(jsonb_agg(x.value-'reason' order by x.value->>'id'),'[]') into effects from jsonb_array_elements(ctx->'occurrences') x where (x.value->>'gameId')::uuid=any(gids);
 select coalesce(jsonb_agg(jsonb_set(x.value-'reason','{previousGameIds}',coalesce((select jsonb_agg(a.value order by a.value) from jsonb_array_elements(x.value->'previousGameIds') a where (a.value#>>'{}')::uuid=any(gids)),'[]')) order by x.value->>'id'),'[]') into withdrawals_public from jsonb_array_elements(ctx->'withdrawals') x where (x.value->>'registrationId')::uuid=any(rids);
 return jsonb_build_object('schemaVersion','public-standings-source-v1','disputeId',did,'publicationVersion',coalesce((select version from private.public_standings_heads where dispute_id=did),0)+1,'regulationVersion',rv,'publishedAt','2000-01-01T00:00:00Z','context',context_public,'definition',d,'registrations',regs,'games',games_public,'publishedGames',coalesce((select jsonb_agg(x.value order by x.value->>'gameId') from jsonb_array_elements(ctx->'publishedGames') x where (x.value->>'gameId')::uuid=any(gids)),'[]'),'occurrences',effects,'withdrawals',withdrawals_public);
end$$;



-- Incomplete values are allowed, arbitrary/unrenderable structures are not.
create function private.valid_regulation_draft(doc jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare d jsonb:=doc->'definition';p jsonb;g jsonb;r jsonb;wo jsonb;x jsonb;n jsonb;v jsonb;ref jsonb;k text;begin
 if not private.context_keys(doc,array['definition']) or octet_length(doc::text)>1048576 or not private.context_keys(d-array['transfers','customized','customReason','tieDecisions','tieNotes'],array['registrationIds','occurrenceRules','groupPhases','knockoutPhases','series']) or not private.regulation_ids(d->'registrationIds',1000) then return false;end if;
 if d ? 'transfers' and d->'transfers'<>'null'::jsonb and coalesce(d->>'transfers','') not in('allowed','forbidden') then return false;end if;
 if not private.context_keys(d->'occurrenceRules',array['wo']) then return false;end if;
 wo:=d#>'{occurrenceRules,wo}';
 if wo<>'null'::jsonb then
  if not private.context_keys(wo,array['winnerLeaguePoints','loserLeaguePoints','score']) then return false;end if;
  for v in select value from jsonb_each(wo-'score') loop if v<>'null'::jsonb and not private.regulation_integer(v,-1000000,2147483647) then return false;end if;end loop;
  if wo->'score'<>'null'::jsonb then
   if not private.context_keys(wo->'score',array['winner','loser']) then return false;end if;
   for v in select value from jsonb_each(wo->'score') loop if v<>'null'::jsonb and not private.regulation_integer(v,-1000000,2147483647) then return false;end if;end loop;
  end if;
 end if;
 if jsonb_typeof(d->'groupPhases') is distinct from 'array' or jsonb_array_length(d->'groupPhases')>64 or jsonb_typeof(d->'knockoutPhases') is distinct from 'array' or jsonb_array_length(d->'knockoutPhases')>64 or jsonb_typeof(d->'series') is distinct from 'array' or jsonb_array_length(d->'series')>256 then return false;end if;
 for p in select value from jsonb_array_elements(d->'groupPhases') loop
  if not private.context_keys(p,array['phaseId','name','rules','groups']) or not private.regulation_uuid(p->'phaseId') or jsonb_typeof(p->'name') is distinct from 'string' or length(p->>'name')>100 then return false;end if;
  r:=p->'rules';
  if not private.context_keys(r-array['calculationPolicy','turns'],array['format','points','tieBreakers']) or r->>'format' is distinct from 'round_robin' or not private.context_keys(r->'points',array['win','loss']) then return false;end if;
  for v in select value from jsonb_each(r->'points') loop if v<>'null'::jsonb and not private.regulation_integer(v,-1000000,2147483647) then return false;end if;end loop;
  if r ? 'calculationPolicy' and r->>'calculationPolicy' is distinct from 'fiba-2026' then return false;end if;
  if r ? 'turns' and not private.regulation_integer(r->'turns',1,2) then return false;end if;
  if jsonb_typeof(r->'tieBreakers') is distinct from 'array' or jsonb_array_length(r->'tieBreakers')>6 or exists(select 1 from jsonb_array_elements(r->'tieBreakers') x where jsonb_typeof(x.value) is distinct from 'string' or x.value#>>'{}' not in('wins','point_difference','points_for','head_to_head_points','head_to_head_difference','head_to_head_for')) then return false;end if;
  if jsonb_typeof(p->'groups') is distinct from 'array' or jsonb_array_length(p->'groups')>1000 then return false;end if;
  for g in select value from jsonb_array_elements(p->'groups') loop
   if not private.context_keys(g,array['id','name','registrationIds','gameIds']) or not private.regulation_uuid(g->'id') or jsonb_typeof(g->'name') is distinct from 'string' or length(g->>'name')>100 or not private.regulation_ids(g->'registrationIds',1000) or not private.regulation_ids(g->'gameIds',10000) then return false;end if;
  end loop;
 end loop;
 for p in select value from jsonb_array_elements(d->'knockoutPhases') loop
  if not private.context_keys(p,array['id','name']) or not private.regulation_uuid(p->'id') or jsonb_typeof(p->'name') is distinct from 'string' or length(p->>'name')>100 then return false;end if;
 end loop;
 for n in select value from jsonb_array_elements(d->'series') loop
  if not private.context_keys(n,array['id','phaseId','name','format','home','away','games']) or not private.regulation_uuid(n->'id') or not private.regulation_uuid(n->'phaseId') or jsonb_typeof(n->'name') is distinct from 'string' or length(n->>'name')>100 or coalesce(n->>'format','') not in('single','two_leg','best_of_3','best_of_5','best_of_7') then return false;end if;
  for x in select v from(values(n->'home'),(n->'away')) q(v) loop
   ref:=x;
   foreach k in array array['registrationId','phaseId','groupId','seriesId'] loop if ref->>k='' then ref:=jsonb_set(ref,array[k],to_jsonb('00000000-0000-4000-8000-000000000001'::text));end if;end loop;
   if not private.regulation_reference(ref) then return false;end if;
  end loop;
  if jsonb_typeof(n->'games') is distinct from 'array' or jsonb_array_length(n->'games')>7 then return false;end if;
  for g in select value from jsonb_array_elements(n->'games') loop
   if not private.context_keys(g,array['slot','gameId']) or not private.regulation_integer(g->'slot',1,7) or not private.regulation_uuid(g->'gameId') then return false;end if;
  end loop;
 end loop;
 return private.valid_regulation_extras(d);
exception when others then return false;
end$$;
revoke all on function private.valid_regulation_draft(jsonb) from public,anon,authenticated,service_role;

-- Unpublished working copies and durable receipts, never read by public sources.
create table private.regulation_drafts (
 dispute_id uuid primary key references public.disputes(id) on delete restrict,
 version integer not null check(version>0),base_regulation_version integer not null check(base_regulation_version>=0),
 document jsonb not null check(jsonb_typeof(document)='object' and octet_length(document::text)<=1048576),
 saved_at timestamptz not null,saved_by uuid not null references auth.users(id) on delete restrict
);
create index regulation_drafts_actor on private.regulation_drafts(saved_by);
create table private.regulation_draft_commands (
 command_id uuid primary key,actor_id uuid not null references auth.users(id) on delete restrict,
 payload jsonb not null,result jsonb not null
);
create index regulation_draft_commands_actor on private.regulation_draft_commands(actor_id);
alter table private.regulation_drafts enable row level security;
alter table private.regulation_draft_commands enable row level security;
revoke all on private.regulation_drafts,private.regulation_draft_commands from public,anon,authenticated,service_role;
create policy never_direct_regulation_drafts on private.regulation_drafts as restrictive for all to public using(false) with check(false);
create policy never_direct_regulation_draft_commands on private.regulation_draft_commands as restrictive for all to public using(false) with check(false);
create trigger regulation_draft_commands_immutable before update or delete on private.regulation_draft_commands for each row execute function private.regulation_history_immutable();
create function private.get_regulation_draft(did uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare root uuid;begin
 perform 1 from public.admin_access where user_id=auth.uid() and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if root is null then raise sqlstate 'PT404' using message='context_not_found';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('competition:'||root::text,0));
 return (select jsonb_build_object('disputeId',dispute_id,'version',version,'baseRegulationVersion',base_regulation_version,'document',document,'savedAt',saved_at,'actorId',saved_by) from private.regulation_drafts where dispute_id=did);
end$$;
create function private.save_regulation_draft(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;did uuid;root uuid;old integer;rv integer;expected integer;base integer;doc jsonb;receipt private.regulation_draft_commands%rowtype;result jsonb;now_at timestamptz:=clock_timestamp();begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','disputeId','expectedVersion','baseRegulationVersion','document']) or octet_length(p_command::text)>1048576 or not private.regulation_uuid(p_command->'commandId') or not private.regulation_uuid(p_command->'disputeId') or not private.regulation_integer(p_command->'expectedVersion',0,2147483646) or not private.regulation_integer(p_command->'baseRegulationVersion',0,2147483646) or not private.context_keys(p_command->'document',array['definition']) or not private.valid_regulation_draft(p_command->'document') then raise sqlstate 'PT400' using message='invalid_draft';end if;
 cmd:=(p_command->>'commandId')::uuid;did:=(p_command->>'disputeId')::uuid;expected:=(p_command->>'expectedVersion')::integer;base:=(p_command->>'baseRegulationVersion')::integer;doc:=p_command->'document';
 perform pg_advisory_xact_lock(hashtextextended('regulation-draft-command:'||cmd::text,0));
 select * into receipt from private.regulation_draft_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;
  return receipt.result;
 end if;
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if root is null then raise sqlstate 'PT404' using message='context_not_found';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 select version into rv from private.regulation_heads where dispute_id=did;
 if coalesce(rv,0)<>base then raise sqlstate 'PT409' using message='version_conflict';end if;
 select version into old from private.regulation_drafts where dispute_id=did for update;
 if coalesce(old,0)<>expected then raise sqlstate 'PT409' using message='draft_version_conflict';end if;
 insert into private.regulation_drafts values(did,coalesce(old,0)+1,base,doc,now_at,actor)
 on conflict(dispute_id) do update set version=excluded.version,base_regulation_version=excluded.base_regulation_version,document=excluded.document,saved_at=excluded.saved_at,saved_by=excluded.saved_by;
 result:=jsonb_build_object('commandId',cmd,'disputeId',did,'version',coalesce(old,0)+1,'baseRegulationVersion',base,'savedAt',now_at);
 insert into private.regulation_draft_commands values(cmd,actor,p_command,result);
 return result;
end$$;
create function public.get_regulation_draft(p_dispute_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_regulation_draft(p_dispute_id)$$;
create function public.save_regulation_draft(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_regulation_draft(p_command)$$;
revoke all on function private.get_regulation_draft(uuid),private.save_regulation_draft(jsonb),public.get_regulation_draft(uuid),public.save_regulation_draft(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.get_regulation_draft(uuid),private.save_regulation_draft(jsonb),public.get_regulation_draft(uuid),public.save_regulation_draft(jsonb) to authenticated;
