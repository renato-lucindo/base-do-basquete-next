-- G4c3 PDF publication reads authoritative immutable source/review state and commits one game.
-- Secondary manual input is retained independently when PDF provides advanced domains.
create table private.game_publication_secondary_sources (
 game_id uuid not null,version integer not null,source_kind text not null check(source_kind='sheet'),source_id uuid not null check(source_id=game_id),source_version integer not null check(source_version>0),
 primary key(game_id,version,source_kind),
 foreign key(game_id,version) references private.game_publication_versions(game_id,version) on delete restrict,
 foreign key(source_kind,source_id,game_id) references private.publication_sources(kind,id,bound_game_id) on delete restrict
);
create index game_publication_secondary_source on private.game_publication_secondary_sources(source_kind,source_id,game_id);
alter table private.game_publication_secondary_sources enable row level security;
revoke all on private.game_publication_secondary_sources from public,anon,authenticated,service_role;
create policy never_direct_publication_secondary_sources on private.game_publication_secondary_sources as restrictive for all to public using(false) with check(false);
create trigger publication_secondary_sources_immutable before update or delete on private.game_publication_secondary_sources for each row execute function private.publication_history_immutable();

create function private.publish_pdf_game(command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;gid uuid;sid uuid;gv integer;pv integer;rv integer;sv integer;manual_version integer;reason text;accepted boolean;manual_needed boolean;a jsonb;supp jsonb;s public.pdf_sources%rowtype;r public.pdf_reviews%rowtype;g public.games%rowtype;sh public.game_sheets%rowtype;current_pub public.published_games%rowtype;previous private.game_publication_versions%rowtype;receipt private.game_publication_commands%rowtype;root uuid;roots uuid[];facts jsonb;review jsonb;manual jsonb;players jsonb:='[]';entries jsonb:='[]';staff jsonb:='{}';public_origins jsonb;payload jsonb;document jsonb;line jsonb;person jsonb;own_person jsonb;captain jsonb;coach jsonb;assistant jsonb;old_staff jsonb;staff_source jsonb;staff_role text;side text;entry uuid;rid uuid;pid uuid;reg uuid;gender text;sex text;persons uuid[]:=array[]::uuid[];result jsonb;now_at timestamptz;
begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(command,array['requestId','gameId','gameVersion','basePublicationVersion','source','supplement','authority','sheetVersion','reason','acceptDivergence']) or octet_length(command::text)>65536 or not private.context_keys(command->'source',array['kind','sourceId','sourceVersion','reviewVersion']) or command->'source'->>'kind' is distinct from 'pdf' or command->'source'->'sourceVersion' is distinct from '2'::jsonb or not private.pdf_number(command->'gameVersion') or not private.pdf_number(command->'basePublicationVersion') or not private.pdf_number(command->'source'->'reviewVersion') or jsonb_typeof(command->'reason') is distinct from 'string' or jsonb_typeof(command->'acceptDivergence') is distinct from 'boolean' then raise sqlstate 'PT400' using message='invalid_pdf_publication';end if;
 cmd:=(command->>'requestId')::uuid;gid:=(command->>'gameId')::uuid;sid:=(command->'source'->>'sourceId')::uuid;gv:=(command->>'gameVersion')::integer;pv:=(command->>'basePublicationVersion')::integer;rv:=(command->'source'->>'reviewVersion')::integer;reason:=regexp_replace(command->>'reason','^[[:space:]]+|[[:space:]]+$','','g');accepted:=(command->>'acceptDivergence')::boolean;a:=command->'authority';supp:=command->'supplement';manual_needed:=a->>'scorePoints'='sheet' or a->>'periodScores'='sheet';
 if cmd is null or gid is null or sid is null or gv not between 1 and 2147483646 or pv not between 0 and 2147483646 or rv not between 1 and 2147483646 or length(reason)>500 or ((pv>0 or accepted or manual_needed) and length(reason)<10) then raise sqlstate 'PT400' using message='review_reason_required';end if;
 if manual_needed then if not private.pdf_number(command->'sheetVersion') or (command->>'sheetVersion')::integer not between 1 and 2147483646 then raise sqlstate 'PT400' using message='invalid_pdf_publication';end if;manual_version:=(command->>'sheetVersion')::integer;
 elsif command->'sheetVersion' is distinct from 'null'::jsonb then raise sqlstate 'PT400' using message='invalid_pdf_publication';end if;
 perform pg_advisory_xact_lock(hashtextextended('publication-command:'||cmd::text,0));
 select * into receipt from private.game_publication_commands where request_id=cmd;
 if found then if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;if receipt.payload<>command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;end if;
 -- Review resource precedes sorted roots, matching save_pdf_review; no command lock is taken after roots.
 perform pg_advisory_xact_lock(hashtextextended('pdf-review:'||sid::text,0));
 select * into s from public.pdf_sources where id=sid;if not found or not s.ready or s.version<>2 then raise sqlstate 'PT409' using message='source_upload_incomplete';end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='boxscore-sources' and o.name=s.storage_path and o.metadata->>'mimetype'='application/pdf' and (o.metadata->>'size')::bigint=s.byte_size) then raise sqlstate 'PT409' using message='source_upload_incomplete';end if;
 select * into r from public.pdf_reviews where source_id=sid;if not found or r.game_id is distinct from gid then raise sqlstate 'PT400' using message='invalid_pdf_context';end if;
 if r.version<>rv then raise sqlstate 'PT409' using message='version_conflict';end if;
 if exists(select 1 from private.publication_sources where kind='pdf' and id=sid and bound_game_id<>gid) then raise sqlstate 'PT409' using message='publication_source_game_locked';end if;
 select array_agg(distinct se.championship_id order by se.championship_id) into roots from public.disputes di join public.seasons se on se.id=di.season_id where di.id in(s.dispute_id,r.dispute_id);
 foreach root in array roots loop perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));end loop;
 perform pg_advisory_xact_lock(hashtextextended('game:'||gid::text,0));
 select * into g from public.games where id=gid for update;select * into current_pub from public.published_games where game_id=gid for update;select * into sh from public.game_sheets where game_id=gid for update;
 if g.id is null or g.dispute_id<>r.dispute_id then raise sqlstate 'PT400' using message='invalid_pdf_context';end if;
 if g.version<>gv or coalesce(current_pub.version,0)<>pv or (manual_needed and coalesce(sh.version,0)<>manual_version) then raise sqlstate 'PT409' using message='version_conflict';end if;
 if s.parsed->>'gameNumber' is not null and g.game_number is not null and s.parsed->>'gameNumber'<>g.game_number and (not accepted or length(reason)<10) then raise sqlstate 'PT400' using message='pdf_divergence_decision_required';end if;
 select * into previous from private.game_publication_versions where game_id=gid and version=pv;
 review:=jsonb_build_object('source',public.get_pdf_source(sid),'document',r.document,'version',r.version,'savedAt',r.saved_at);
 if manual_needed then manual:=jsonb_build_object('version',sh.version,'document',sh.document);end if;
 facts:=private.pdf_publication_facts(review,supp,a,manual,reason,accepted);
 -- A confirmed manual sheet retains its related identities and occasion jerseys even when source changes.
 perform private.confirmed_sheet_guard(gid,jsonb_build_object('participants',facts->'players'),reason);
 select case when di.gender='feminino' then 'female' else 'male' end into gender from public.disputes di where di.id=g.dispute_id;
 for line in select value from jsonb_array_elements(facts->'players') loop
  rid:=(line->>'rosterEntryId')::uuid;side:=line->>'side';reg:=case when side='home' then g.home_registration_id else g.away_registration_id end;
  select re.person_id,at.sex,jsonb_build_object('id',pe.id,'name',pe.name,'nickname',pe.nickname) into pid,sex,own_person from public.roster_entries re join private.athletes at on at.person_id=re.person_id join public.persons pe on pe.id=re.person_id where re.id=rid and re.registration_id=reg and re.dispute_id=g.dispute_id;
  if pid is null or pid=any(persons) or sex<>gender then raise sqlstate 'PT400' using message='invalid_pdf_context';end if;persons:=array_append(persons,pid);
  select value->'person' into person from jsonb_array_elements(coalesce(current_pub.snapshot->'facts'->'players','[]'::jsonb)) where value->'person'->>'id'=pid::text;
  person:=private.publication_person(coalesce(person,own_person));
  players:=players||jsonb_build_array(jsonb_build_object('person',person,'registrationId',reg,'side',side,'jersey',line->'jersey','played',line->'played','starter',line->'starter','captain',line->'captain','points',line->'points','two',line->'two','three',line->'three','free',line->'free','advanced',line->'advanced','foulsReceived',line->'foulsReceived'));
  entries:=entries||jsonb_build_array(jsonb_build_object('personId',pid,'rosterEntryId',rid,'registrationId',reg,'side',side,'jersey',line->'jersey'));
 end loop;
 foreach side in array array['home','away'] loop
  select value->'person' into captain from jsonb_array_elements(players) where value->>'side'=side and value->'captain'='true'::jsonb;
  coach:=null;assistant:=null;
  staff_source:=facts->'staff'->side;
  old_staff:=case when previous.source_kind='pdf' then previous.document->'supplement'->'staff'->side else previous.document->'staff'->side end;
  for staff_role,entry in select * from(values('coach',(staff_source->>'coachStaffEntryId')::uuid),('assistant',(staff_source->>'assistantStaffEntryId')::uuid)) x(role,entry) loop
   if entry is null then continue;end if;reg:=case when side='home' then g.home_registration_id else g.away_registration_id end;
   select jsonb_build_object('id',p.id,'name',p.name,'nickname',p.nickname) into person from public.staff_entries st join public.coaches co on co.person_id=st.person_id join public.persons p on p.id=st.person_id where st.id=entry and st.registration_id=reg and st.dispute_id=g.dispute_id and st.role=case when staff_role='coach' then 'head' else 'assistant' end and (st.ended_at is null or old_staff->>(case when staff_role='coach' then 'coachStaffEntryId' else 'assistantStaffEntryId' end)=entry::text);
   if person is null then raise sqlstate 'PT400' using message='invalid_pdf_staff';end if;
   if old_staff->>(case when staff_role='coach' then 'coachStaffEntryId' else 'assistantStaffEntryId' end)=entry::text then person:=coalesce(current_pub.snapshot->'staff'->side->staff_role,person);end if;
   if staff_role='coach' then coach:=private.publication_person(person);else assistant:=private.publication_person(person);end if;
  end loop;
  if staff_source->>'coachStaffEntryId' is null then coach:=captain;end if;
  staff:=jsonb_set(staff,array[side],jsonb_build_object('captain',captain,'coach',coach,'assistant',assistant,'captainIsCoach',staff_source->>'coachStaffEntryId' is null));
 end loop;
 select jsonb_object_agg(key,case when value='null'::jsonb then 'null'::jsonb else jsonb_build_object('kind',value->'kind','version',case when value->>'kind'='pdf' then value->'reviewVersion' else value->'version' end) end) into public_origins from jsonb_each(facts->'origins');
 facts:=jsonb_build_object('teams',facts->'teams','players',players,'gameAdvanced',facts->'gameAdvanced','origins',public_origins);now_at:=clock_timestamp();
 select jsonb_build_object('id',gid,'disputeId',g.dispute_id,'version',pv+1,'publishedAt',now_at,'gameVersion',gv+1,
 'context',jsonb_build_object('championshipId',c.id,'name',c.name,'seasonId',se.id,'year',se.year,'gender',di.gender,'category',di.category,'division',di.division),
 'game',jsonb_build_object('date',g.scheduled_date,'time',case when g.scheduled_time is null then null else to_char(g.scheduled_time,'HH24:MI') end,'timeZone','America/Sao_Paulo','venue',g.venue,'number',g.game_number,
 'home',jsonb_build_object('registrationId',rh.id,'name',rh.name,'team',jsonb_build_object('id',th.id,'name',th.name,'abbreviation',th.abbreviation)),
 'away',jsonb_build_object('registrationId',ra.id,'name',ra.name,'team',jsonb_build_object('id',ta.id,'name',ta.name,'abbreviation',ta.abbreviation))),
 'source',jsonb_build_object('kind','pdf','version',r.version,'format',s.parsed->'format','parserVersion',s.parsed->'parserVersion'),'staff',staff,'facts',facts) into payload
 from public.disputes di join public.seasons se on se.id=di.season_id join public.championships c on c.id=se.championship_id join public.registrations rh on rh.id=g.home_registration_id join public.teams th on th.id=rh.team_id join public.registrations ra on ra.id=g.away_registration_id join public.teams ta on ta.id=ra.team_id where di.id=g.dispute_id;
 if payload is null then raise sqlstate 'PT400' using message='invalid_pdf_context';end if;
 document:=jsonb_build_object('source',command->'source','review',r.document,'supplement',supp,'authority',a,'sheetVersion',command->'sheetVersion','manual',manual,'acceptDivergence',accepted);
 insert into private.game_publication_versions(game_id,version,source_kind,source_id,source_version,snapshot,document,reason,published_by,published_at) values(gid,pv+1,'pdf',sid,r.version,payload,document,reason,actor,now_at);
 insert into private.game_publication_entries(game_id,version,person_id,roster_entry_id,registration_id,side,jersey) select gid,pv+1,(e->>'personId')::uuid,(e->>'rosterEntryId')::uuid,(e->>'registrationId')::uuid,e->>'side',e->>'jersey' from jsonb_array_elements(entries) e;
 if manual_needed then
  insert into private.publication_sources(kind,id,bound_game_id,sheet_game_id) values('sheet',gid,gid,gid) on conflict(kind,id) do nothing;
  insert into private.game_publication_secondary_sources(game_id,version,source_kind,source_id,source_version) values(gid,pv+1,'sheet',gid,sh.version);
 end if;
 insert into public.published_games(game_id,dispute_id,version,snapshot,published_at) values(gid,g.dispute_id,pv+1,payload,now_at) on conflict(game_id) do update set version=excluded.version,snapshot=excluded.snapshot,published_at=excluded.published_at;
 if manual_needed then update public.game_sheets set confirmed=true where game_id=gid;end if;
 update public.games set state='finished',version=gv+1,saved_at=now_at where id=gid;
 update public.championships set saved_at=now_at where id=any(roots);
 result:=jsonb_build_object('requestId',cmd,'gameId',gid,'version',pv+1,'sourceVersion',2,'reviewVersion',r.version,'gameVersion',gv+1,'publishedAt',now_at);
 insert into private.game_publication_commands(request_id,actor_id,payload,result) values(cmd,actor,command,result);return result;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_pdf_publication';
end$$;
create function public.publish_pdf_game(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.publish_pdf_game(p_command)$$;
revoke all on function private.publish_pdf_game(jsonb),public.publish_pdf_game(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.publish_pdf_game(jsonb),public.publish_pdf_game(jsonb) to authenticated;

-- Confirmed source review changes require an explicit reason; no unguarded writer remains.
create or replace function private.save_pdf_review(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;sid uuid;did uuid;gid uuid;expected integer;d jsonb;m jsonb;s public.pdf_sources%rowtype;old public.pdf_reviews%rowtype;receipt private.pdf_review_commands%rowtype;g public.games%rowtype;root uuid;roots uuid[];n integer;side_index integer;row_index integer;rid uuid;reg uuid;pid uuid;ended timestamptz;sex text;gender text;persons uuid[]:=array[]::uuid[];result jsonb;review_reason text;bound uuid;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not (private.context_keys(p_command,array['commandId','sourceId','expectedVersion','document']) or private.context_keys(p_command,array['commandId','sourceId','expectedVersion','document','reason'])) or octet_length(p_command::text)>32768 or not private.pdf_number(p_command->'expectedVersion') then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
 if p_command ? 'reason' and (jsonb_typeof(p_command->'reason') is distinct from 'string' or length(p_command->>'reason')>500) then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
 review_reason:=regexp_replace(coalesce(p_command->>'reason',''),'^[[:space:]]+|[[:space:]]+$','','g');
 d:=p_command->'document';
 if not private.context_keys(d,array['disputeId','gameId','invertSides','mappings','notes']) or jsonb_typeof(d->'invertSides') is distinct from 'boolean' or jsonb_typeof(d->'gameId') not in('string','null') or jsonb_typeof(d->'mappings') is distinct from 'array' or jsonb_array_length(d->'mappings')>24 or jsonb_typeof(d->'notes') is distinct from 'string' or length(d->>'notes')>500 then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
 cmd:=(p_command->>'commandId')::uuid;sid:=(p_command->>'sourceId')::uuid;did:=(d->>'disputeId')::uuid;gid:=(d->>'gameId')::uuid;expected:=(p_command->>'expectedVersion')::integer;
 if cmd is null or sid is null or did is null or expected not between 0 and 2147483646 then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
 perform pg_advisory_xact_lock(hashtextextended('pdf-review-command:'||cmd::text,0));
 select * into receipt from private.pdf_review_commands where command_id=cmd;
 if found then if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;end if;
 -- All review writers take this resource lock before roots; roots are sorted.
 perform pg_advisory_xact_lock(hashtextextended('pdf-review:'||sid::text,0));
 select * into s from public.pdf_sources where id=sid;if not found or not s.ready then raise sqlstate 'PT409' using message='source_upload_incomplete';end if;
 select * into old from public.pdf_reviews where source_id=sid;
 select bound_game_id into bound from private.publication_sources where kind='pdf' and id=sid;
 if bound is not null then
  if bound is distinct from gid then raise sqlstate 'PT409' using message='publication_source_game_locked';end if;
  if length(review_reason)<10 then raise sqlstate 'PT400' using message='review_reason_required';end if;
 end if;
 if (old.source_id is null and expected<>0) or (old.source_id is not null and old.version<>expected) then raise sqlstate 'PT409' using message='version_conflict';end if;
 select array_agg(distinct se.championship_id order by se.championship_id) into roots from public.disputes di join public.seasons se on se.id=di.season_id where di.id in(s.dispute_id,old.dispute_id,did);
 foreach root in array roots loop perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));end loop;
 select case when di.gender='feminino' then 'female' else 'male' end into gender from public.disputes di where di.id=did;if gender is null then raise sqlstate 'PT400' using message='invalid_pdf_context';end if;

 if gid is not null then
  perform pg_advisory_xact_lock(hashtextextended('game:'||gid::text,0));
  select * into g from public.games where id=gid and dispute_id=did;if not found then raise sqlstate 'PT400' using message='invalid_pdf_context';end if;
 end if;
 n:=jsonb_array_length(s.parsed->'teams'->0->'players')+jsonb_array_length(s.parsed->'teams'->1->'players');
 if n<>jsonb_array_length(d->'mappings') then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
 for m in select value from jsonb_array_elements(d->'mappings') loop
  if not private.context_keys(m,array['sourceSide','sourceIndex','rosterEntryId','jersey']) or not private.pdf_number(m->'sourceSide') or not private.pdf_number(m->'sourceIndex') or (m->>'sourceSide')::integer not between 0 and 1 or (m->>'sourceIndex')::integer not between 0 and 11 or jsonb_typeof(m->'rosterEntryId') not in('string','null') or not private.pdf_text(m->'jersey',2,1) or (m->>'jersey')!~'^(00|0|[1-9][0-9]?)$' then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
  side_index:=(m->>'sourceSide')::integer;row_index:=(m->>'sourceIndex')::integer;rid:=(m->>'rosterEntryId')::uuid;
  if row_index>=jsonb_array_length(s.parsed->'teams'->side_index->'players') then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
  if rid is null then continue;end if;
  if gid is null then raise sqlstate 'PT400' using message='invalid_pdf_context';end if;
  reg:=case when (side_index=0)<>(d->>'invertSides')::boolean then g.home_registration_id else g.away_registration_id end;
  select re.person_id,re.ended_at,a.sex into pid,ended,sex from public.roster_entries re join private.athletes a on a.person_id=re.person_id where re.id=rid and re.registration_id=reg and re.dispute_id=did;
  if pid is null or pid=any(persons) or sex<>gender or (ended is not null and (old.game_id is distinct from gid or not exists(select 1 from jsonb_array_elements(old.document->'mappings') prev where (prev->>'sourceSide')::integer=side_index and (prev->>'sourceIndex')::integer=row_index and (prev->>'rosterEntryId')::uuid=rid))) then raise sqlstate 'PT400' using message='invalid_pdf_context';end if;
  persons:=array_append(persons,pid);
 end loop;
 if exists(select 1 from jsonb_array_elements(d->'mappings') x group by (x->>'sourceSide')::integer,(x->>'sourceIndex')::integer having count(*)>1) or exists(select 1 from jsonb_array_elements(d->'mappings') x group by (x->>'sourceSide')::integer,x->>'jersey' having count(*)>1) then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
 if old.source_id is null then insert into public.pdf_reviews(source_id,dispute_id,game_id,document,saved_by) values(sid,did,gid,d,actor);
 else update public.pdf_reviews set dispute_id=did,game_id=gid,document=d,version=old.version+1,saved_at=clock_timestamp(),saved_by=actor where source_id=sid;end if;
 update public.championships set saved_at=clock_timestamp() where id=any(roots);
 result:=jsonb_build_object('id',sid,'version',coalesce(old.version,0)+1);insert into private.pdf_review_commands(command_id,actor_id,payload,result) values(cmd,actor,p_command,result);return result;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_pdf_review';
end$$;
