-- C4.3b: atomic target and approved player+membership commands.
create function private.text_subcommand(p_id uuid,p_part text) returns uuid language sql immutable strict set search_path='' as $$select md5('text-import:'||p_id::text||':'||p_part)::uuid$$;
create function private.text_has_one_team(p_text text) returns boolean language sql immutable set search_path='' as $$
 with lines as(select unnest(string_to_array(replace(replace(p_text,E'\r\n',E'\n'),E'\r',E'\n'),E'\n')) v),names as(select (regexp_match(btrim(v,E' \t'||chr(65279)),'^equipe[[:space:]]*:[[:space:]]*(.*)$','i'))[1] name from lines)
 select count(distinct private.person_name_key(name)) filter(where name is not null)<=1 and coalesce(bool_and(name is null or length(btrim(name))>0),true) from names
$$;
create function private.prepare_text_target(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;rid uuid;expected integer;old private.text_reviews%rowtype;receipt private.text_review_commands%rowtype;t jsonb;reg uuid;tid uuid;current_version integer;reg_version integer;next_version integer;result jsonb;ignored jsonb;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','reviewId','expectedVersion']) or octet_length(p_command::text)>4096 or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' or (p_command->>'expectedVersion')!~'^[0-9]+$' then raise sqlstate 'PT400' using message='invalid_import_target';end if;
 cmd:=(p_command->>'commandId')::uuid;rid:=(p_command->>'reviewId')::uuid;expected:=(p_command->>'expectedVersion')::integer;
 if cmd is null or rid is null or expected not between 1 and 2147483646 then raise sqlstate 'PT400' using message='invalid_import_target';end if;
 perform pg_advisory_xact_lock(hashtextextended('text-command:'||cmd::text,0));select * into receipt from private.text_review_commands where command_id=cmd;
 if found then if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;if receipt.operation<>'target' or receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;end if;
 perform pg_advisory_xact_lock(hashtextextended('text-review:'||rid::text,0));select * into old from private.text_reviews where id=rid for update;
 if old.id is null then raise sqlstate 'PT400' using message='invalid_import_target';end if;if old.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;if old.version<>expected then raise sqlstate 'PT409' using message='version_conflict';end if;
 if jsonb_array_length(old.document->'issues')>0 or not private.text_has_one_team(old.document->>'text') then raise sqlstate 'PT400' using message='invalid_import_target';end if;
 t:=old.document->'target';reg:=(t->>'registrationId')::uuid;next_version:=old.version;
 if t->>'kind'='registration' then
  select version into reg_version from public.registrations where id=reg and dispute_id=old.dispute_id;
  if reg_version is null then raise sqlstate 'PT400' using message='invalid_import_target';end if;if reg_version<>(t->>'version')::integer then raise sqlstate 'PT409' using message='version_conflict';end if;
 else
  tid:=(t->>'teamId')::uuid;
  if t->>'kind'='newTeam' then
   ignored:=private.save_team(jsonb_build_object('commandId',private.text_subcommand(cmd,'team'),'expectedVersion',0,'team',jsonb_build_object('id',tid,'name',t->>'teamName','abbreviation',null)));
  else
   select version into current_version from public.teams where id=tid for share;
   if current_version is null then raise sqlstate 'PT400' using message='invalid_import_target';end if;if current_version<>(t->>'teamVersion')::integer then raise sqlstate 'PT409' using message='version_conflict';end if;
  end if;
  ignored:=private.save_registration(jsonb_build_object('commandId',private.text_subcommand(cmd,'registration'),'expectedVersion',0,'registration',jsonb_build_object('id',reg,'teamId',tid,'disputeId',old.dispute_id,'name',t->>'registrationName')));
  reg_version:=(ignored->>'version')::integer;next_version:=old.version+1;
  update private.text_reviews set registration_id=reg,document=jsonb_set(document,'{target}',jsonb_build_object('kind','registration','registrationId',reg,'version',reg_version)),version=next_version,saved_at=clock_timestamp() where id=rid;
 end if;
 result:=jsonb_build_object('id',rid,'version',next_version,'registrationId',reg,'registrationVersion',reg_version);
 insert into private.text_review_commands(command_id,actor_id,operation,payload,result) values(cmd,actor,'target',p_command,result);return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_import_target';
end$$;

create function private.confirm_text_row(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;rid uuid;row_id uuid;pid uuid;expected integer;old private.text_reviews%rowtype;receipt private.text_review_commands%rowtype;row jsonb;data jsonb;decision jsonb;person jsonb;athlete jsonb;snapshot jsonb;provided jsonb;membership public.roster_entries%rowtype;
 target_sex text;actual_sex text;current_reg_version integer;person_version integer;wanted_year integer;pos text;k text;personal_write boolean:=false;jersey text;member_result jsonb;row_result jsonb;result jsonb;ignored jsonb;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','reviewId','rowId','expectedVersion']) or octet_length(p_command::text)>4096 or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' or (p_command->>'expectedVersion')!~'^[0-9]+$' then raise sqlstate 'PT400' using message='invalid_import_item';end if;
 cmd:=(p_command->>'commandId')::uuid;rid:=(p_command->>'reviewId')::uuid;row_id:=(p_command->>'rowId')::uuid;expected:=(p_command->>'expectedVersion')::integer;
 if cmd is null or rid is null or row_id is null or expected not between 1 and 2147483646 then raise sqlstate 'PT400' using message='invalid_import_item';end if;
 perform pg_advisory_xact_lock(hashtextextended('text-command:'||cmd::text,0));select * into receipt from private.text_review_commands where command_id=cmd;
 if found then if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;if receipt.operation<>'row' or receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;end if;
 perform pg_advisory_xact_lock(hashtextextended('text-review:'||rid::text,0));select * into old from private.text_reviews where id=rid for update;
 if old.id is null then raise sqlstate 'PT400' using message='invalid_import_item';end if;if old.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;if old.version<>expected then raise sqlstate 'PT409' using message='version_conflict';end if;
 if old.registration_id is null or old.document#>>'{target,kind}'<>'registration' or jsonb_array_length(old.document->'issues')>0 or not private.text_has_one_team(old.document->>'text') then raise sqlstate 'PT400' using message='invalid_import_target';end if;
 if exists(select 1 from jsonb_array_elements(old.results) x where x->>'rowId'=row_id::text) then raise sqlstate 'PT409' using message='row_already_applied';end if;
 select value into row from jsonb_array_elements(old.document->'rows') where value->>'id'=row_id::text;
 if row is null or not (row->>'selected')::boolean or jsonb_array_length(row->'issues')>0 or not private.valid_import_data(row->'data',true) or row->'decision'='null'::jsonb then raise sqlstate 'PT400' using message='invalid_import_item';end if;
 data:=row->'data';decision:=row->'decision';provided:=row->'provided';pid:=(decision->>'personId')::uuid;
 select case when d.gender='feminino' then 'female' else 'male' end,r.version into target_sex,current_reg_version from public.registrations r join public.disputes d on d.id=r.dispute_id where r.id=old.registration_id and r.dispute_id=old.dispute_id;
 if target_sex is null then raise sqlstate 'PT400' using message='invalid_import_target';end if;
 select string_agg(value,' / ' order by ordinality) into pos from jsonb_array_elements_text(data->'positions') with ordinality;
 if decision->>'kind'='new' then
  person:=jsonb_build_object('id',pid,'name',data->'name','nickname',data->'nickname','publicBirthYear',null,'heightCm',data->'heightCm','weightKg',data->'weightKg','position',pos,'dominantHand',data->'dominantHand','originCity',null,'originState',null,'biography',null,'coach',false,'athlete',jsonb_build_object('sex',target_sex,'birthDate',data->'birthDate','federationRegistration',data->'federationRegistration'));
  ignored:=private.save_person(jsonb_build_object('commandId',private.text_subcommand(cmd,'person'),'expectedVersion',0,'disputeId',old.dispute_id,'confirmHomonym',decision->'confirmHomonym','person',person));
  wanted_year:=(data->>'birthYear')::integer;personal_write:=true;
 else
  snapshot:=public.get_person(pid);if snapshot is null then raise sqlstate 'PT400' using message='invalid_import_item';end if;
  if (snapshot->>'version')::integer<>(decision->>'version')::integer then raise sqlstate 'PT409' using message='version_conflict';end if;
  person:=snapshot-'version'-'savedAt';athlete:=person->'athlete';
  select birth_year into wanted_year from private.athletes where person_id=pid;
  if athlete='null'::jsonb then athlete:=jsonb_build_object('sex',target_sex,'birthDate',null,'federationRegistration',null);personal_write:=true;end if;
  if (decision->>'approveChanges')::boolean then
   foreach k in array array['name','nickname','heightCm','weightKg','dominantHand'] loop if provided ? k then person:=jsonb_set(person,array[k],data->k);end if;end loop;
   if provided ? 'positions' then person:=jsonb_set(person,'{position}',coalesce(to_jsonb(pos),'null'::jsonb));end if;
   foreach k in array array['birthDate','federationRegistration'] loop if provided ? k then athlete:=jsonb_set(athlete,array[k],data->k);end if;end loop;
   if provided ? 'birthYear' then wanted_year:=(data->>'birthYear')::integer;end if;
   personal_write:=true;
  end if;
  person:=jsonb_set(person,'{athlete}',athlete);
  if athlete->>'birthDate' is not null and wanted_year is not null and extract(year from (athlete->>'birthDate')::date)<>wanted_year and not ((provided ? 'birthDate') and not (provided ? 'birthYear')) then raise sqlstate 'PT400' using message='birth_conflict';end if;
  if personal_write then ignored:=private.save_person(jsonb_build_object('commandId',private.text_subcommand(cmd,'person'),'expectedVersion',(decision->>'version')::integer,'disputeId',old.dispute_id,'confirmHomonym',false,'person',person));end if;
 end if;
 if personal_write then update private.athletes set birth_year=case when birth_date is null then wanted_year else null end where person_id=pid;end if;
 select * into membership from public.roster_entries where id=(row->>'rosterId')::uuid;
 jersey:=case when provided ? 'jersey' or membership.id is null then data->>'jersey' else membership.jersey end;
 member_result:=private.save_roster_entry(jsonb_build_object('commandId',private.text_subcommand(cmd,'roster'),'expectedVersion',(row->>'rosterVersion')::integer,'entry',jsonb_build_object('id',(row->>'rosterId')::uuid,'registrationId',old.registration_id,'personId',pid,'jersey',jersey,'active',true)));
 -- The membership writer now holds athlete then competition locks; check the fresh context at this point.
 select case when d.gender='feminino' then 'female' else 'male' end,r.version into target_sex,current_reg_version from public.registrations r join public.disputes d on d.id=r.dispute_id where r.id=old.registration_id and r.dispute_id=old.dispute_id;
 select sex into actual_sex from private.athletes where person_id=pid;
 if target_sex is distinct from actual_sex then raise sqlstate 'PT400' using message='invalid_import_context';end if;
 if current_reg_version is distinct from (old.document#>>'{target,version}')::integer then raise sqlstate 'PT409' using message='version_conflict';end if;
 if decision->>'kind'='existing' and not personal_write then select version into person_version from public.persons where id=pid;if person_version<>(decision->>'version')::integer then raise sqlstate 'PT409' using message='version_conflict';end if;end if;
 row_result:=jsonb_build_object('rowId',row_id,'entityId',member_result->'id','entityVersion',member_result->'version');
 update private.text_reviews set results=results||jsonb_build_array(row_result),version=version+1,saved_at=clock_timestamp() where id=rid;
 result:=jsonb_build_object('id',rid,'version',old.version+1,'result',row_result);insert into private.text_review_commands(command_id,actor_id,operation,payload,result) values(cmd,actor,'row',p_command,result);return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation or datetime_field_overflow or invalid_datetime_format then raise sqlstate 'PT400' using message='invalid_import_item';
end$$;
create function public.prepare_text_target(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.prepare_text_target(p_command)$$;
create function public.confirm_text_row(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.confirm_text_row(p_command)$$;
revoke all on function private.text_subcommand(uuid,text),private.text_has_one_team(text),private.prepare_text_target(jsonb),private.confirm_text_row(jsonb),public.prepare_text_target(jsonb),public.confirm_text_row(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.prepare_text_target(jsonb),private.confirm_text_row(jsonb),public.prepare_text_target(jsonb),public.confirm_text_row(jsonb) to authenticated;

-- Reject a null metadata kind as well as an unknown one.
create or replace function private.valid_text_document(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
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
  if not private.context_keys(row,array['line','source','kind']) or jsonb_typeof(row->'line') is distinct from 'number' or (row->>'line')!~'^[0-9]+$' or jsonb_typeof(row->'source') is distinct from 'string' or jsonb_typeof(row->'kind') is distinct from 'string' or row->>'kind' not in('team','columns') then return false;end if;
  line:=(row->>'line')::integer;if line not between 1 and cardinality(lines) or line=any(seen) or lines[line] is distinct from row->>'source' or length(btrim(lines[line],E' \t\r\n\f'||chr(160)||chr(65279)))=0 then return false;end if;seen:=array_append(seen,line);
 end loop;
 return cardinality(seen)=(select count(*) from unnest(lines) x where length(btrim(x,E' \t\r\n\f'||chr(160)||chr(65279)))>0);
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end$$;


-- Extra supplied identity information ranks suggestions, never merges people.
create or replace function public.match_import_players(p_dispute_id uuid,p_registration_id uuid,p_players jsonb) returns jsonb language plpgsql stable security invoker set search_path='' as $$
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
   order by rank,
    case when probe->>'birthDate' is not null and a.birth_date=(probe->>'birthDate')::date then 0
     when probe->>'birthYear' is not null and coalesce(a.birth_year,extract(year from a.birth_date)::integer)=(probe->>'birthYear')::integer then 1
     when length(nick)>=2 and private.person_name_key(p.nickname)=nick then 2 else 3 end,p.id limit 6
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
