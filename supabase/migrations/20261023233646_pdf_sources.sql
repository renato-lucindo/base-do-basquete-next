-- G3b: immutable private PDF source; prepared intent recovers a non-atomic blob upload.
create table public.pdf_sources (
 id uuid primary key,dispute_id uuid not null references public.disputes(id) on delete restrict,
 filename text not null check(length(filename) between 5 and 160 and filename!~'[[:cntrl:]/\\]' and lower(filename)~'\.pdf$'),
 sha256 text not null unique check(sha256~'^[a-f0-9]{64}$'),byte_size integer not null check(byte_size between 5 and 10485760),
 page_count integer not null check(page_count between 1 and 4),parsed jsonb not null,
 storage_path text generated always as ('sources/'||id::text||'.pdf') stored unique,
 ready boolean not null default false,version integer not null default 1 check(version=case when ready then 2 else 1 end),
 created_by uuid not null references auth.users(id) on delete restrict,saved_at timestamptz not null default clock_timestamp()
);
create index pdf_sources_context on public.pdf_sources(dispute_id,saved_at desc,id);
create index pdf_sources_actor on public.pdf_sources(created_by);
create table private.pdf_source_commands (
 command_id uuid not null,operation text not null check(operation in('prepare','finish')),actor_id uuid not null references auth.users(id) on delete restrict,
 payload jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp(),primary key(command_id,operation)
);
create index pdf_source_commands_actor on private.pdf_source_commands(actor_id);
alter table public.pdf_sources enable row level security;
alter table private.pdf_source_commands enable row level security;
revoke all on public.pdf_sources,private.pdf_source_commands from public,anon,authenticated,service_role;
grant select on public.pdf_sources to authenticated;
create policy admin_reads_pdf_sources on public.pdf_sources for select to authenticated using(exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy never_access_pdf_source_commands on private.pdf_source_commands as restrictive for all to public using(false) with check(false);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('boxscore-sources','boxscore-sources',false,10485760,array['application/pdf']);
-- Scope every policy to this new bucket; do not alter platform grants or other buckets.
create policy bdb_pdf_read on storage.objects for select to authenticated using(bucket_id='boxscore-sources' and exists(select 1 from public.pdf_sources s where s.storage_path=name) and exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy bdb_pdf_insert on storage.objects for insert to authenticated with check(bucket_id='boxscore-sources' and exists(select 1 from public.pdf_sources s where s.storage_path=name and not s.ready) and exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy bdb_pdf_guard on storage.objects as restrictive for all to authenticated using(bucket_id<>'boxscore-sources' or exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled)) with check(bucket_id<>'boxscore-sources' or exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));

create policy bdb_pdf_anon_guard on storage.objects as restrictive for all to anon using(bucket_id<>'boxscore-sources') with check(bucket_id<>'boxscore-sources');
create policy bdb_pdf_no_update on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'boxscore-sources') with check(bucket_id<>'boxscore-sources');
create policy bdb_pdf_no_delete on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'boxscore-sources');

create function private.pdf_number(v jsonb,nullable boolean default false,signed boolean default false,integral boolean default true) returns boolean language sql immutable security invoker set search_path='' as $$
 select case when jsonb_typeof(v)='number' then (v::text)::numeric between case when signed then -2147483648 else 0 end and 2147483647 and (not integral or trunc((v::text)::numeric)=(v::text)::numeric) when v='null'::jsonb then nullable else false end
$$;
create function private.pdf_text(v jsonb,maximum integer,minimum integer default 0,nullable boolean default false) returns boolean language sql immutable security invoker set search_path='' as $$
 select case when jsonb_typeof(v)='string' then length(v#>>'{}') between minimum and maximum and (v#>>'{}')!~'[[:cntrl:]]' when v='null'::jsonb then nullable else false end
$$;
create function private.validate_pdf_parsed(doc jsonb) returns void language plpgsql immutable security invoker set search_path='' as $$
declare tm jsonb;pl jsonb;st jsonb;k text;line jsonb;site boolean;total numeric;period_total numeric;clock_seconds integer;leading_seconds numeric:=0;
begin
 if not private.context_keys(doc-'gameStatistics',array['format','parserVersion','competitionName','gameNumber','scheduledLocal','durationSeconds','venue','teams','warnings']) or coalesce(doc->>'format','') not in('FIBA_GENIUS_SPORTS','BASKETBALL_SITE') or not private.pdf_text(doc->'competitionName',240,0,true) or not private.pdf_text(doc->'gameNumber',80,0,true) or not private.pdf_text(doc->'venue',240) or not private.pdf_number(doc->'durationSeconds',true) or jsonb_typeof(doc->'teams') is distinct from 'array' or jsonb_array_length(doc->'teams')<>2 or jsonb_typeof(doc->'warnings') is distinct from 'array' or jsonb_array_length(doc->'warnings')>20 or not private.pdf_text(doc->'scheduledLocal',16,16) or (doc->>'scheduledLocal')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]$' then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
 perform left(doc->>'scheduledLocal',10)::date;
 for line in select value from jsonb_array_elements(doc->'warnings') loop if not private.pdf_text(line,500) then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;end loop;
 site:=doc->>'format'='BASKETBALL_SITE';
 if doc->>'parserVersion' is distinct from (case when site then 'basketball-site-v1' else 'fiba-genius-v2' end) or doc->'teams'->0->>'name'=doc->'teams'->1->>'name' then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
 clock_seconds:=2400;
 for tm in select value from jsonb_array_elements(doc->'teams') loop
  if not private.context_keys(tm-'teamStatistics',array['name','abbreviation','score','periodScores','players']) or not private.pdf_text(tm->'name',240,1) or not private.pdf_text(tm->'abbreviation',20) or not private.pdf_number(tm->'score') or jsonb_typeof(tm->'players') is distinct from 'array' or jsonb_array_length(tm->'players') not between 1 and 12 then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
  if site then
   if tm->'periodScores' is distinct from 'null'::jsonb or tm ? 'teamStatistics' then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
  else
   if jsonb_typeof(tm->'periodScores') is distinct from 'array' or jsonb_array_length(tm->'periodScores') not between 4 and 12 or jsonb_array_length(tm->'periodScores')<>jsonb_array_length(doc->'teams'->0->'periodScores') then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
   period_total:=0;for line in select value from jsonb_array_elements(tm->'periodScores') loop
    if not private.pdf_number(line) then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;period_total:=period_total+(line::text)::numeric;
   end loop;
   if period_total<>(tm->>'score')::numeric then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
   clock_seconds:=2400+(jsonb_array_length(tm->'periodScores')-4)*300;
  end if;
  total:=0;
  for pl in select value from jsonb_array_elements(tm->'players') loop
   if not private.context_keys(pl,array['jerseyNumber','name','starter','captain','didNotPlay','secondsPlayed','fieldGoals','twoPoints','threePoints','freeThrows','offensiveRebounds','defensiveRebounds','rebounds','assists','turnovers','steals','blocks','foulsCommitted','foulsReceived','plusMinus','efficiency','points']) or not private.pdf_text(pl->'name',240,1) or not private.pdf_text(pl->'jerseyNumber',2,1) or (pl->>'jerseyNumber')!~'^(00|0|[1-9][0-9]?)$' or jsonb_typeof(pl->'starter') is distinct from 'boolean' or jsonb_typeof(pl->'captain') is distinct from 'boolean' or jsonb_typeof(pl->'didNotPlay') is distinct from 'boolean' then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
   foreach k in array array['secondsPlayed','offensiveRebounds','defensiveRebounds','rebounds','assists','turnovers','steals','blocks','foulsCommitted','points'] loop if not private.pdf_number(pl->k) then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;end loop;
   if not private.pdf_number(pl->'foulsReceived',true) or not private.pdf_number(pl->'plusMinus',true,true) or not private.pdf_number(pl->'efficiency',false,true,false) then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
   foreach k in array array['fieldGoals','twoPoints','threePoints','freeThrows'] loop
    line:=pl->k;if not private.context_keys(line,array['made','attempted']) or not private.pdf_number(line->'made') or not private.pdf_number(line->'attempted') or (line->>'made')::numeric>(line->>'attempted')::numeric then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
   end loop;
   if (pl->'fieldGoals'->>'made')::numeric<>(pl->'twoPoints'->>'made')::numeric+(pl->'threePoints'->>'made')::numeric or (pl->'fieldGoals'->>'attempted')::numeric<>(pl->'twoPoints'->>'attempted')::numeric+(pl->'threePoints'->>'attempted')::numeric or (pl->>'rebounds')::numeric<>(pl->>'offensiveRebounds')::numeric+(pl->>'defensiveRebounds')::numeric or (pl->>'points')::numeric<>2*(pl->'twoPoints'->>'made')::numeric+3*(pl->'threePoints'->>'made')::numeric+(pl->'freeThrows'->>'made')::numeric then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
   if site and (pl->'starter'<>'false'::jsonb or pl->'captain'<>'false'::jsonb or pl->'didNotPlay'<>'false'::jsonb or pl->'foulsReceived'<>'null'::jsonb or pl->'plusMinus'<>'null'::jsonb) then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
   total:=total+(pl->>'points')::numeric;
  end loop;
  if total<>(tm->>'score')::numeric or exists(select 1 from jsonb_array_elements(tm->'players') p group by p->>'jerseyNumber' having count(*)>1) then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
  if not site then
   st:=tm->'teamStatistics';
   if not private.context_keys(st,array['pointsFromTurnovers','pointsInPaint','pointsInPaintMade','pointsInPaintAttempted','secondChancePoints','fastBreakPoints','fastBreakPointsFromTurnovers','benchPoints','largestLead','largestScoringRun','pointsPerPossession','timeLeadingSeconds']) then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
   foreach k in array array['pointsFromTurnovers','pointsInPaint','pointsInPaintMade','pointsInPaintAttempted','secondChancePoints','fastBreakPoints','fastBreakPointsFromTurnovers','benchPoints','largestLead','largestScoringRun','timeLeadingSeconds'] loop if not private.pdf_number(st->k) then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;end loop;
   if not private.pdf_number(st->'pointsPerPossession',false,false,false) or (st->>'pointsInPaint')::numeric<>2*(st->>'pointsInPaintMade')::numeric or (st->>'pointsInPaintMade')::numeric>(st->>'pointsInPaintAttempted')::numeric or (st->>'fastBreakPointsFromTurnovers')::numeric>(st->>'fastBreakPoints')::numeric or (st->>'timeLeadingSeconds')::numeric>clock_seconds then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
   leading_seconds:=leading_seconds+(st->>'timeLeadingSeconds')::numeric;
  end if;
 end loop;
 if site then if doc ? 'gameStatistics' then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
 else
  st:=doc->'gameStatistics';if not private.context_keys(st,array['leadChanges','timesTied']) or not private.pdf_number(st->'leadChanges') or not private.pdf_number(st->'timesTied') or leading_seconds>clock_seconds then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
 end if;
end$$;

create function public.get_pdf_source(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',s.id,'disputeId',s.dispute_id,'filename',s.filename,'sha256',s.sha256,'byteSize',s.byte_size,'pageCount',s.page_count,'parsed',s.parsed,'ready',s.ready,'version',s.version,'savedAt',s.saved_at) from public.pdf_sources s where s.id=p_id
$$;
create function public.list_pdf_sources(p_dispute_id uuid,p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with found as(select id,saved_at from public.pdf_sources where dispute_id=p_dispute_id order by saved_at desc,id limit 21 offset greatest(0,least(coalesce(p_offset,0),100000))),page as(select * from found order by saved_at desc,id limit 20)
 select jsonb_build_object('items',coalesce((select jsonb_agg(public.get_pdf_source(id) order by saved_at desc,id) from page),'[]'::jsonb),'hasMore',(select count(*)>20 from found))
$$;
create function private.prepare_pdf_source(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;sid uuid;did uuid;root uuid;v jsonb;previous private.pdf_source_commands%rowtype;s public.pdf_sources%rowtype;duplicate boolean:=false;result jsonb;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','source']) or octet_length(p_command::text)>524288 then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
 v:=p_command->'source';
 if not private.context_keys(v,array['id','disputeId','filename','sha256','byteSize','pageCount','parsed']) or not private.pdf_text(v->'filename',160,5) or (v->>'filename')~'[/\\]' or lower(v->>'filename')!~'\.pdf$' or not private.pdf_text(v->'sha256',64,64) or (v->>'sha256')!~'^[a-f0-9]{64}$' or not private.pdf_number(v->'byteSize') or (v->>'byteSize')::integer not between 5 and 10485760 or not private.pdf_number(v->'pageCount') or (v->>'pageCount')::integer not between 1 and 4 then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
 cmd:=(p_command->>'commandId')::uuid;sid:=(v->>'id')::uuid;did:=(v->>'disputeId')::uuid;if cmd is null or sid is null or did is null then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
 perform private.validate_pdf_parsed(v->'parsed');
 perform pg_advisory_xact_lock(hashtextextended('pdf-command:'||cmd::text,0));
 select * into previous from private.pdf_source_commands where command_id=cmd and operation='prepare';
 if found then
  if previous.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;if previous.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return previous.result;
 end if;
 select se.championship_id into root from public.disputes d join public.seasons se on se.id=d.season_id where d.id=did;if root is null then raise sqlstate 'PT400' using message='invalid_context';end if;
 perform pg_advisory_xact_lock(hashtextextended('pdf-hash:'||(v->>'sha256'),0));
 select * into s from public.pdf_sources where sha256=v->>'sha256';
 if found then duplicate:=true;
 else
  perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
  insert into public.pdf_sources(id,dispute_id,filename,sha256,byte_size,page_count,parsed,created_by) values(sid,did,v->>'filename',v->>'sha256',(v->>'byteSize')::integer,(v->>'pageCount')::integer,v->'parsed',actor) returning * into s;
  update public.championships set saved_at=clock_timestamp() where id=root;
 end if;
 result:=jsonb_build_object('id',s.id,'storagePath',s.storage_path,'sha256',s.sha256,'byteSize',s.byte_size,'ready',s.ready,'duplicate',duplicate);
 insert into private.pdf_source_commands(command_id,operation,actor_id,payload,result) values(cmd,'prepare',actor,p_command,result);return result;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or not_null_violation or check_violation or unique_violation or foreign_key_violation or datetime_field_overflow or invalid_datetime_format then raise sqlstate 'PT400' using message='invalid_pdf_source';
end$$;
create function private.finish_pdf_source(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;sid uuid;previous private.pdf_source_commands%rowtype;prepared private.pdf_source_commands%rowtype;s public.pdf_sources%rowtype;result jsonb;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','sourceId']) or octet_length(p_command::text)>1024 then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
 cmd:=(p_command->>'commandId')::uuid;sid:=(p_command->>'sourceId')::uuid;if cmd is null or sid is null then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
 perform pg_advisory_xact_lock(hashtextextended('pdf-command:'||cmd::text,0));
 select * into previous from private.pdf_source_commands where command_id=cmd and operation='finish';
 if found then if previous.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;if previous.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return previous.result;end if;
 select * into prepared from private.pdf_source_commands where command_id=cmd and operation='prepare';
 if prepared.actor_id is distinct from actor or prepared.result->>'id' is distinct from sid::text then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
 select * into s from public.pdf_sources where id=sid for update;
 if s.id is null then raise sqlstate 'PT400' using message='invalid_pdf_source';end if;
 if not s.ready then
  if not exists(select 1 from storage.objects o where o.bucket_id='boxscore-sources' and o.name=s.storage_path and o.metadata->>'mimetype'='application/pdf' and (o.metadata->>'size')::bigint=s.byte_size) then raise sqlstate 'PT409' using message='source_upload_incomplete';end if;
  update public.pdf_sources set ready=true,version=2,saved_at=clock_timestamp() where id=sid;
 end if;
 result:=jsonb_build_object('id',sid,'version',2);insert into private.pdf_source_commands(command_id,operation,actor_id,payload,result) values(cmd,'finish',actor,p_command,result);return result;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_pdf_source';
end$$;
create function public.prepare_pdf_source(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.prepare_pdf_source(p_command)$$;
create function public.finish_pdf_source(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.finish_pdf_source(p_command)$$;
revoke all on function private.pdf_number(jsonb,boolean,boolean,boolean),private.pdf_text(jsonb,integer,integer,boolean),private.validate_pdf_parsed(jsonb),public.get_pdf_source(uuid),public.list_pdf_sources(uuid,integer),private.prepare_pdf_source(jsonb),private.finish_pdf_source(jsonb),public.prepare_pdf_source(jsonb),public.finish_pdf_source(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.get_pdf_source(uuid),public.list_pdf_sources(uuid,integer),private.prepare_pdf_source(jsonb),private.finish_pdf_source(jsonb),public.prepare_pdf_source(jsonb),public.finish_pdf_source(jsonb) to authenticated;
