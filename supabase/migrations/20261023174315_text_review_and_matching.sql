-- C4.3a: private resumable review and bounded administrative matching.
create table private.text_reviews (
 id uuid primary key,actor_id uuid not null references auth.users(id),dispute_id uuid not null references public.disputes(id),
 registration_id uuid references public.registrations(id),document jsonb not null,results jsonb not null default '[]'::jsonb,
 version integer not null default 1 check(version>0),saved_at timestamptz not null default clock_timestamp(),
 check(jsonb_typeof(document)='object' and jsonb_typeof(results)='array')
);
create index text_reviews_actor_context on private.text_reviews(actor_id,dispute_id,saved_at desc,id);
create index text_reviews_dispute on private.text_reviews(dispute_id);
create index text_reviews_registration on private.text_reviews(registration_id);
create table private.text_review_commands(command_id uuid primary key,actor_id uuid not null references auth.users(id),operation text not null check(operation in('save','target','row')),payload jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp());
create index text_review_commands_actor on private.text_review_commands(actor_id);
alter table private.text_reviews enable row level security;
alter table private.text_review_commands enable row level security;
revoke all on private.text_reviews,private.text_review_commands from public,anon,authenticated,service_role;
grant select on private.text_reviews to authenticated;
create policy admin_reads_own_text_review on private.text_reviews for select to authenticated using(actor_id=(select auth.uid()) and exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy deny_text_review_receipts on private.text_review_commands as restrictive for all to public using(false) with check(false);

create function private.valid_import_data(p jsonb,p_ready boolean default false) returns boolean language plpgsql immutable set search_path='' as $$
declare k text;v jsonb;dt date;num numeric;
begin
 if not private.context_keys(p,array['name','jersey','nickname','birthDate','birthYear','positions','heightCm','weightKg','dominantHand','federationRegistration']) or jsonb_typeof(p->'name') is distinct from 'string' or length(p->>'name')>20000 or jsonb_typeof(p->'dominantHand') is distinct from 'string' or p->>'dominantHand' not in('left','right','both') or jsonb_typeof(p->'positions') is distinct from 'array' or jsonb_array_length(p->'positions')>20 then return false;end if;
 foreach k in array array['jersey','nickname','birthDate','federationRegistration'] loop
  if jsonb_typeof(p->k) not in('string','null') then return false;end if;
  if length(p->>k)>(case when k='nickname' then 20000 when k='federationRegistration' then 120 else 32 end) then return false;end if;
 end loop;
 foreach k in array array['birthYear','heightCm','weightKg'] loop
  if jsonb_typeof(p->k) not in('number','null') then return false;end if;
 end loop;
 if p->'birthYear'<>'null'::jsonb and (p->>'birthYear') !~ '^-?[0-9]+$' then return false;end if;
 for v in select value from jsonb_array_elements(p->'positions') loop
  if jsonb_typeof(v)<>'string' or length(v#>>'{}')>80 then return false;end if;
 end loop;
 if not p_ready then return true;end if;
 if length(btrim(p->>'name')) not between 1 and 120 or length(p->>'nickname')>120 or (p->'jersey'<>'null'::jsonb and (p->>'jersey')!~'^(00|0|[1-9][0-9]?)$') or (p->'federationRegistration'<>'null'::jsonb and (p->>'federationRegistration')!~'^[0-9]{6}$') or jsonb_array_length(p->'positions')>2 then return false;end if;
 if exists(select 1 from jsonb_array_elements_text(p->'positions') x where x not in('Armador','Ala Armador','Ala','Ala Pivô','Pivô')) then return false;end if;
 foreach k in array array['heightCm','weightKg'] loop if p->k<>'null'::jsonb then num:=(p->>k)::numeric;if num<=0 or num>1000 then return false;end if;end if;end loop;
 if p->'birthYear'<>'null'::jsonb and (p->>'birthYear')::integer not between 1 and 9999 then return false;end if;
 if p->'birthDate'<>'null'::jsonb then
  if (p->>'birthDate')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false;end if;
  dt:=(p->>'birthDate')::date;
  if p->'birthYear'<>'null'::jsonb and extract(year from dt)<>(p->>'birthYear')::integer then return false;end if;
 end if;
 return true;
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format then return false;
end$$;

create function private.valid_text_document(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare row jsonb;t jsonb;v jsonb;f jsonb;lines text[];seen integer[]:='{}';ids uuid[]:='{}';line integer;pid uuid;did uuid;fields text[]:=array['name','jersey','nickname','birthDate','birthYear','positions','heightCm','weightKg','dominantHand','federationRegistration'];
begin
 if not private.context_keys(p,array['id','disputeId','text','target','teamName','rows','ignoredLines','issues']) or octet_length(p::text)>262144 or jsonb_typeof(p->'text') is distinct from 'string' or length(p->>'text')>20000 or jsonb_typeof(p->'teamName') not in('string','null') or length(p->>'teamName')>20000 then return false;end if;
 pid:=(p->>'id')::uuid;did:=(p->>'disputeId')::uuid;if pid is null or did is null then return false;end if;
 foreach t in array array[p->'rows',p->'ignoredLines',p->'issues'] loop if jsonb_typeof(t) is distinct from 'array' then return false;end if;end loop;
 if jsonb_array_length(p->'rows')>200 or jsonb_array_length(p->'ignoredLines')>500 or jsonb_array_length(p->'issues')>500 then return false;end if;
 for v in select value from jsonb_array_elements(p->'issues') loop if jsonb_typeof(v)<>'string' or length(v#>>'{}')>300 then return false;end if;end loop;
 lines:=string_to_array(replace(replace(p->>'text',E'\r\n',E'\n'),E'\r',E'\n'),E'\n');
 if cardinality(lines)>500 then return false;end if;
 t:=p->'target';
 if t->>'kind'='registration' then
  if not private.context_keys(t,array['kind','registrationId','version']) or jsonb_typeof(t->'version') is distinct from 'number' or (t->>'version')!~'^[0-9]+$' or (t->>'version')::integer not between 1 and 2147483646 then return false;end if;
 elsif t->>'kind'='newTeam' then
  if not private.context_keys(t,array['kind','registrationId','teamId','teamName','registrationName']) or jsonb_typeof(t->'teamName') is distinct from 'string' or length(t->>'teamName')>120 or jsonb_typeof(t->'registrationName') is distinct from 'string' or length(t->>'registrationName')>120 then return false;end if;
  pid:=(t->>'teamId')::uuid;if pid is null then return false;end if;
 elsif t->>'kind'='existingTeam' then
  if not private.context_keys(t,array['kind','registrationId','teamId','teamVersion','registrationName']) or jsonb_typeof(t->'teamVersion') is distinct from 'number' or (t->>'teamVersion')!~'^[0-9]+$' or (t->>'teamVersion')::integer not between 1 and 2147483646 or jsonb_typeof(t->'registrationName') is distinct from 'string' or length(t->>'registrationName')>120 then return false;end if;
  pid:=(t->>'teamId')::uuid;if pid is null then return false;end if;
 else return false;end if;
 pid:=(t->>'registrationId')::uuid;if pid is null then return false;end if;
 for row in select value from jsonb_array_elements(p->'rows') loop
  if not private.context_keys(row,array['id','line','source','data','provided','issues','selected','decision','rosterId','rosterVersion']) or not private.valid_import_data(row->'data') or jsonb_typeof(row->'selected') is distinct from 'boolean' or jsonb_typeof(row->'source') is distinct from 'string' or jsonb_typeof(row->'line') is distinct from 'number' or (row->>'line')!~'^[0-9]+$' or jsonb_typeof(row->'rosterVersion') is distinct from 'number' or (row->>'rosterVersion')!~'^[0-9]+$' or (row->>'rosterVersion')::integer not between 0 and 2147483646 then return false;end if;
  pid:=(row->>'id')::uuid;if pid is null or pid=any(ids) then return false;end if;ids:=array_append(ids,pid);
  pid:=(row->>'rosterId')::uuid;if pid is null then return false;end if;
  line:=(row->>'line')::integer;if line not between 1 and cardinality(lines) or line=any(seen) or lines[line] is distinct from row->>'source' or length(btrim(lines[line],E' \t\r\n\f'||chr(160)||chr(65279)))=0 then return false;end if;seen:=array_append(seen,line);
  if jsonb_typeof(row->'provided') is distinct from 'array' or jsonb_array_length(row->'provided')>10 or exists(select 1 from jsonb_array_elements(row->'provided') x where jsonb_typeof(x)<>'string' or (x#>>'{}')<>all(fields)) or (select count(*)<>count(distinct x) from jsonb_array_elements_text(row->'provided') x) then return false;end if;
  if jsonb_typeof(row->'issues') is distinct from 'array' or jsonb_array_length(row->'issues')>200 then return false;end if;
  for v in select value from jsonb_array_elements(row->'issues') loop
   if not private.context_keys(v,array['field','token','message']) or (v->'field'<>'null'::jsonb and (jsonb_typeof(v->'field') is distinct from 'string' or (v->>'field')<>all(fields))) or jsonb_typeof(v->'token') is distinct from 'string' or length(v->>'token')>20000 or jsonb_typeof(v->'message') is distinct from 'string' or length(v->>'message')>300 then return false;end if;
  end loop;
  t:=row->'decision';
  if t<>'null'::jsonb then
   if t->>'kind'='new' then if not private.context_keys(t,array['kind','personId','confirmHomonym']) or jsonb_typeof(t->'confirmHomonym') is distinct from 'boolean' then return false;end if;
   elsif t->>'kind'='existing' then if not private.context_keys(t,array['kind','personId','version','approveChanges']) or jsonb_typeof(t->'approveChanges') is distinct from 'boolean' or jsonb_typeof(t->'version') is distinct from 'number' or (t->>'version')!~'^[0-9]+$' or (t->>'version')::integer not between 1 and 2147483646 then return false;end if;
   else return false;end if;
   pid:=(t->>'personId')::uuid;if pid is null then return false;end if;
  end if;
 end loop;
 for row in select value from jsonb_array_elements(p->'ignoredLines') loop
  if not private.context_keys(row,array['line','source','kind']) or jsonb_typeof(row->'line') is distinct from 'number' or (row->>'line')!~'^[0-9]+$' or jsonb_typeof(row->'source') is distinct from 'string' or row->>'kind' not in('team','columns') then return false;end if;
  line:=(row->>'line')::integer;if line not between 1 and cardinality(lines) or line=any(seen) or lines[line] is distinct from row->>'source' or length(btrim(lines[line],E' \t\r\n\f'||chr(160)||chr(65279)))=0 then return false;end if;seen:=array_append(seen,line);
 end loop;
 return cardinality(seen)=(select count(*) from unnest(lines) x where length(btrim(x,E' \t\r\n\f'||chr(160)||chr(65279)))>0);
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end$$;

create function public.get_text_review(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select r.document||jsonb_build_object('version',r.version,'savedAt',r.saved_at,'results',r.results) from private.text_reviews r where r.id=p_id$$;
create function public.list_text_reviews(p_dispute_id uuid,p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with matches as(select * from private.text_reviews where dispute_id=p_dispute_id and p_offset between 0 and 100000),page as(select * from matches order by saved_at desc,id limit 20 offset greatest(0,least(p_offset,100000)))
 select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'disputeId',dispute_id,'registrationId',registration_id,'teamName',document->'teamName','version',version,'savedAt',saved_at,'totalRows',jsonb_array_length(document->'rows'),'confirmedRows',jsonb_array_length(results)) order by saved_at desc,id) from page),'[]'::jsonb),'hasMore',(select p_offset<100000 and count(*)>p_offset+20 from matches))
$$;
create function private.save_text_review(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;rid uuid;did uuid;reg uuid;root uuid;expected integer;doc jsonb;old private.text_reviews%rowtype;receipt private.text_review_commands%rowtype;v jsonb;next_version integer;result jsonb;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','expectedVersion','review']) or not private.valid_text_document(p_command->'review') or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' or (p_command->>'expectedVersion')!~'^[0-9]+$' then raise sqlstate 'PT400' using message='invalid_review';end if;
 cmd:=(p_command->>'commandId')::uuid;expected:=(p_command->>'expectedVersion')::integer;doc:=p_command->'review';rid:=(doc->>'id')::uuid;did:=(doc->>'disputeId')::uuid;
 if cmd is null or expected not between 0 and 2147483646 then raise sqlstate 'PT400' using message='invalid_review';end if;
 perform pg_advisory_xact_lock(hashtextextended('text-command:'||cmd::text,0));
 select * into receipt from private.text_review_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.operation<>'save' or receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;
  return receipt.result;
 end if;
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;if root is null then raise sqlstate 'PT400' using message='invalid_review_context';end if;
 if doc#>>'{target,kind}'='registration' then
  select id into reg from public.registrations where id=(doc#>>'{target,registrationId}')::uuid and dispute_id=did;
  if reg is null then raise sqlstate 'PT400' using message='invalid_review_context';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('text-review:'||rid::text,0));
 select * into old from private.text_reviews where id=rid for update;
 if old.id is not null and old.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
 if (old.id is not null and old.version<>expected) or (old.id is null and expected<>0) then raise sqlstate 'PT409' using message='version_conflict';end if;
 if old.id is not null then
  if old.dispute_id<>did or old.document->>'text'<>doc->>'text' then raise sqlstate 'PT400' using message='immutable_review_source';end if;
  if jsonb_array_length(old.results)>0 and old.document->'target'<>doc->'target' then raise sqlstate 'PT400' using message='immutable_review_target';end if;
  for v in select value from jsonb_array_elements(old.results) loop
   if (select value from jsonb_array_elements(old.document->'rows') where value->>'id'=v->>'rowId') is distinct from (select value from jsonb_array_elements(doc->'rows') where value->>'id'=v->>'rowId') then raise sqlstate 'PT400' using message='immutable_applied_row';end if;
  end loop;
  next_version:=old.version+1;update private.text_reviews set document=doc,registration_id=reg,version=next_version,saved_at=clock_timestamp() where id=rid;
 else next_version:=1;insert into private.text_reviews(id,actor_id,dispute_id,registration_id,document) values(rid,actor,did,reg,doc);end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));update public.championships set saved_at=clock_timestamp() where id=root;
 result:=jsonb_build_object('id',rid,'version',next_version);insert into private.text_review_commands(command_id,actor_id,operation,payload,result) values(cmd,actor,'save',p_command,result);return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_review';
end$$;
create function public.save_text_review(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_text_review(p_command)$$;

create function public.get_import_person(p_id uuid,p_dispute_id uuid,p_registration_id uuid default null) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',p.id,'version',p.version,'data',jsonb_build_object('name',p.name,'jersey',r.jersey,'nickname',p.nickname,'birthDate',a.birth_date,'birthYear',a.birth_year,'positions',case when p.position is null then '[]'::jsonb else to_jsonb(string_to_array(p.position,' / ')) end,'heightCm',p.height_cm,'weightKg',p.weight_kg,'dominantHand',p.dominant_hand,'federationRegistration',a.federation_registration),'sex',a.sex,'hasAthlete',a.person_id is not null,'contexts',private.person_contexts(p.id),'roster',case when r.id is null then null else jsonb_build_object('id',r.id,'version',r.version,'jersey',r.jersey) end,'activeRegistrationId',(select registration_id from public.roster_entries where person_id=p.id and dispute_id=p_dispute_id and ended_at is null))
 from public.persons p left join private.athletes a on a.person_id=p.id left join public.roster_entries r on r.person_id=p.id and r.registration_id=p_registration_id and r.dispute_id=p_dispute_id and r.ended_at is null
 where p.id=p_id and exists(select 1 from public.disputes where id=p_dispute_id) and (p_registration_id is null or exists(select 1 from public.registrations where id=p_registration_id and dispute_id=p_dispute_id))
$$;
create function public.match_import_players(p_dispute_id uuid,p_registration_id uuid,p_players jsonb) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare probe jsonb;candidate record;items jsonb:='[]';candidates jsonb;key text;nick text;score integer;exact_names integer;found_reg boolean;more boolean;status text;counted integer;
begin
 if not exists(select 1 from public.admin_access a where a.user_id=auth.uid() and a.enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 if not exists(select 1 from public.disputes where id=p_dispute_id) or (p_registration_id is not null and not exists(select 1 from public.registrations where id=p_registration_id and dispute_id=p_dispute_id)) or jsonb_typeof(p_players) is distinct from 'array' or jsonb_array_length(p_players) not between 1 and 50 or octet_length(p_players::text)>65536 then raise sqlstate 'PT400' using message='invalid_match';end if;
 for probe in select value from jsonb_array_elements(p_players) loop
  if not private.context_keys(probe,array['rowId','name','nickname','birthDate','birthYear','federationRegistration']) or (probe->>'rowId')::uuid is null or jsonb_typeof(probe->'name') is distinct from 'string' or length(btrim(probe->>'name')) not between 1 and 120 or jsonb_typeof(probe->'nickname') not in('string','null') or length(probe->>'nickname')>120 or jsonb_typeof(probe->'federationRegistration') not in('string','null') or (probe->'federationRegistration'<>'null'::jsonb and (probe->>'federationRegistration')!~'^[0-9]{6}$') or jsonb_typeof(probe->'birthDate') not in('string','null') or jsonb_typeof(probe->'birthYear') not in('number','null') then raise sqlstate 'PT400' using message='invalid_match';end if;
  if probe->'birthDate'<>'null'::jsonb then if (probe->>'birthDate')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise sqlstate 'PT400' using message='invalid_match';end if;perform (probe->>'birthDate')::date;end if;
  if probe->'birthYear'<>'null'::jsonb and ((probe->>'birthYear')!~'^[0-9]+$' or (probe->>'birthYear')::integer not between 1 and 9999) then raise sqlstate 'PT400' using message='invalid_match';end if;
  key:=private.person_name_key(probe->>'name');nick:=private.person_name_key(probe->>'nickname');candidates:='[]';exact_names:=0;found_reg:=false;counted:=0;more:=false;
  for candidate in
   select p.id,case when a.federation_registration=probe->>'federationRegistration' then 0 when p.name_key=key then 1 else 2 end as rank
   from public.persons p left join private.athletes a on a.person_id=p.id
   where a.federation_registration=probe->>'federationRegistration' or p.name_key=key or
    (length(key)>=3 and (left(p.name_key,3)=left(key,3) or (length(split_part(reverse(key),' ',1))>=3 and split_part(reverse(p.name_key),' ',1)=split_part(reverse(key),' ',1)) or strpos(p.name_key,key)>0 or strpos(key,p.name_key)>0)) or
    (length(nick)>=2 and private.person_name_key(p.nickname)=nick) or (probe->'birthDate'<>'null'::jsonb and a.birth_date=(probe->>'birthDate')::date and left(p.name_key,1)=left(key,1))
   order by rank,p.id limit 6
  loop
   counted:=counted+1;if counted>5 then more:=true;exit;end if;
   if candidate.rank=0 then found_reg:=true;end if;if candidate.rank=1 then exact_names:=exact_names+1;end if;
   candidates:=candidates||jsonb_build_array(public.get_import_person(candidate.id,p_dispute_id,p_registration_id));
  end loop;
  status:=case when found_reg then 'registration' when exact_names>1 then 'ambiguous' when exact_names=1 then 'name' when counted>0 then 'suggestion' else 'new' end;
  items:=items||jsonb_build_array(jsonb_build_object('rowId',probe->'rowId','status',status,'candidates',candidates,'hasMore',more));
 end loop;
 return jsonb_build_object('items',items);
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format then raise sqlstate 'PT400' using message='invalid_match';
end$$;
revoke all on function private.valid_import_data(jsonb,boolean),private.valid_text_document(jsonb),private.save_text_review(jsonb),public.save_text_review(jsonb),public.get_text_review(uuid),public.list_text_reviews(uuid,integer),public.get_import_person(uuid,uuid,uuid),public.match_import_players(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.valid_import_data(jsonb,boolean),private.valid_text_document(jsonb),private.save_text_review(jsonb),public.save_text_review(jsonb),public.get_text_review(uuid),public.list_text_reviews(uuid,integer),public.get_import_person(uuid,uuid,uuid),public.match_import_players(uuid,uuid,jsonb) to authenticated;

-- Pure JSON shape helper; no data access or privileged execution.
grant execute on function private.context_keys(jsonb,text[]) to authenticated;
