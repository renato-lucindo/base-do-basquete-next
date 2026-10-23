-- C3.1: one identity shared by athlete/coach; private athlete data never in profile columns.
create function private.person_name_key(p_name text) returns text language sql immutable strict set search_path='' as $$
 select btrim(regexp_replace(lower(regexp_replace(normalize(p_name,NFD),'['||chr(768)||'-'||chr(879)||']','','g')),'[^a-z0-9]+',' ','g'))
$$;
create table public.persons (
 id uuid primary key, name text not null check(length(name) between 1 and 120 and length(btrim(name))>0),
 name_key text generated always as(private.person_name_key(name)) stored,
 nickname text check(length(nickname) between 1 and 120),public_birth_year integer check(public_birth_year between 1 and 9999),
 height_cm numeric check(height_cm>0 and height_cm<=1000),weight_kg numeric check(weight_kg>0 and weight_kg<=1000),
 position text check(length(position) between 1 and 80),dominant_hand text check(dominant_hand in ('left','right','both')),
 origin_city text check(length(origin_city) between 1 and 120),origin_state text check(length(origin_state) between 1 and 80),
 biography text check(length(biography) between 1 and 4000),
 version integer not null default 1 check(version>0),saved_at timestamptz not null default clock_timestamp()
);
create index persons_name_key on public.persons(name_key,id);
create table private.athletes (
 person_id uuid primary key references public.persons(id),sex text not null check(sex in ('male','female')),
 birth_date date,federation_registration text check(length(federation_registration) between 1 and 120)
);
create table public.coaches (person_id uuid primary key references public.persons(id));
create table private.person_commands (
 command_id uuid primary key,actor_id uuid not null references auth.users(id),payload jsonb not null,result jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
alter table public.persons enable row level security;
alter table public.coaches enable row level security;
alter table private.athletes enable row level security;
alter table private.person_commands enable row level security;
revoke all on public.persons,public.coaches,private.athletes,private.person_commands from public,anon,authenticated,service_role;
grant select on public.persons,public.coaches,private.athletes to authenticated;
create policy admin_reads_persons on public.persons for select to authenticated using(exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy admin_reads_coaches on public.coaches for select to authenticated using(exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy admin_reads_athletes on private.athletes for select to authenticated using(exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy deny_person_receipts on private.person_commands as restrictive for all to public using(false) with check(false);

-- This is an ADMINISTRATIVE projection. Do not reuse it as a public profile endpoint.
create function public.get_person(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',p.id,'name',p.name,'nickname',p.nickname,'publicBirthYear',p.public_birth_year,
 'heightCm',p.height_cm,'weightKg',p.weight_kg,'position',p.position,'dominantHand',p.dominant_hand,
 'originCity',p.origin_city,'originState',p.origin_state,'biography',p.biography,'version',p.version,'savedAt',p.saved_at,
 'coach',exists(select 1 from public.coaches c where c.person_id=p.id),
 'athlete',(select jsonb_build_object('sex',a.sex,'birthDate',a.birth_date,'federationRegistration',a.federation_registration) from private.athletes a where a.person_id=p.id))
 from public.persons p where p.id=p_id
$$;
create function public.list_persons(p_query text default '',p_kind text default 'all',p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with matches as(select p.id,p.name_key from public.persons p where length(p_query)<=120 and p_offset between 0 and 100000
 and strpos(p.name_key,private.person_name_key(p_query))>0
 and (p_kind='all' or (p_kind='athlete' and exists(select 1 from private.athletes a where a.person_id=p.id)) or (p_kind='coach' and exists(select 1 from public.coaches c where c.person_id=p.id)))),
 page as(select * from matches order by name_key,id limit 20 offset greatest(0,least(p_offset,100000)))
 select jsonb_build_object('items',coalesce((select jsonb_agg(public.get_person(id) order by name_key,id) from page),'[]'::jsonb),
 'hasMore',(select p_offset<100000 and count(*)>p_offset+20 from matches))
$$;
create function private.save_person(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;pid uuid;did uuid;expected integer;previous integer;person jsonb;athlete jsonb;
 receipt private.person_commands%rowtype; title text;key text;field text;existing_sex text;gender_sex text;coach boolean;result jsonb;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden'; end if;
 if not private.context_keys(p_command,array['commandId','expectedVersion','disputeId','confirmHomonym','person']) or octet_length(p_command::text)>16384
 then raise sqlstate 'PT400' using message='invalid_person'; end if;
 person:=p_command->'person';athlete:=person->'athlete';
 if not private.context_keys(person,array['id','name','nickname','publicBirthYear','heightCm','weightKg','position','dominantHand','originCity','originState','biography','athlete','coach'])
 or jsonb_typeof(person->'name') is distinct from 'string' or jsonb_typeof(person->'coach') is distinct from 'boolean'
 or jsonb_typeof(p_command->'confirmHomonym') is distinct from 'boolean'
 or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' or (p_command->>'expectedVersion') !~ '^[0-9]+$'
 then raise sqlstate 'PT400' using message='invalid_person'; end if;
 foreach field in array array['nickname','position','dominantHand','originCity','originState','biography'] loop
  if jsonb_typeof(person->field) not in ('string','null') then raise sqlstate 'PT400' using message='invalid_person'; end if;
 end loop;
 foreach field in array array['publicBirthYear','heightCm','weightKg'] loop
  if jsonb_typeof(person->field) not in ('number','null') then raise sqlstate 'PT400' using message='invalid_person'; end if;
 end loop;
 if person->>'publicBirthYear' is not null and (person->>'publicBirthYear') !~ '^[0-9]+$' then raise sqlstate 'PT400' using message='invalid_person'; end if;
 if athlete<>'null'::jsonb then
  if not private.context_keys(athlete,array['sex','birthDate','federationRegistration']) or jsonb_typeof(athlete->'sex') is distinct from 'string'
  or jsonb_typeof(athlete->'birthDate') not in ('string','null') or jsonb_typeof(athlete->'federationRegistration') not in ('string','null')
  then raise sqlstate 'PT400' using message='invalid_person'; end if;
  if athlete->>'birthDate' is not null and (athlete->>'birthDate') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise sqlstate 'PT400' using message='invalid_person'; end if;
 end if;
 coach:=(person->>'coach')::boolean;
 if athlete='null'::jsonb and not coach then raise sqlstate 'PT400' using message='person_role_required'; end if;
 cmd:=(p_command->>'commandId')::uuid;pid:=(person->>'id')::uuid;did:=(p_command->>'disputeId')::uuid;expected:=(p_command->>'expectedVersion')::integer;
 if cmd is null or pid is null or expected not between 0 and 2147483646 then raise sqlstate 'PT400' using message='invalid_person'; end if;
 perform pg_advisory_xact_lock(hashtextextended('person-command:'||cmd::text,0));
 select * into receipt from private.person_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden'; end if;
  if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict'; end if;
  return receipt.result;
 end if;
 -- All name changes acquire names before identity rows. Never merge on this key.
 title:=regexp_replace(btrim(person->>'name'),'[[:space:]]+',' ','g');key:=private.person_name_key(title);
 perform pg_advisory_xact_lock(hashtextextended('person-name:'||key,0));
 perform pg_advisory_xact_lock(hashtextextended('person:'||pid::text,0));
 select version into previous from public.persons where id=pid for update;
 if (found and previous<>expected) or (not found and expected<>0) then raise sqlstate 'PT409' using message='version_conflict'; end if;
 if previous is null and not (p_command->>'confirmHomonym')::boolean and exists(select 1 from public.persons where name_key=key and id<>pid)
 then raise sqlstate 'PT409' using message='identity_confirmation_required'; end if;
 select sex into existing_sex from private.athletes where person_id=pid;
 if (existing_sex is not null and athlete='null'::jsonb) or (not coach and exists(select 1 from public.coaches where person_id=pid))
 then raise sqlstate 'PT400' using message='role_removal_not_supported'; end if;
 if did is not null then
  select case when d.gender='feminino' then 'female' else 'male' end into gender_sex from public.disputes d where d.id=did;
  if gender_sex is null then raise sqlstate 'PT400' using message='invalid_context'; end if;
  if athlete<>'null'::jsonb and ((existing_sex is null and athlete->>'sex'<>gender_sex) or (existing_sex is not null and athlete->>'sex'<>existing_sex))
  then raise sqlstate 'PT400' using message='sex_context_conflict'; end if;
 end if;
 if previous is null then insert into public.persons(id,name) values(pid,title);previous:=1;
 else previous:=previous+1;end if;
 update public.persons set name=title,nickname=nullif(regexp_replace(btrim(person->>'nickname'),'[[:space:]]+',' ','g'),''),
 public_birth_year=(person->>'publicBirthYear')::integer,height_cm=(person->>'heightCm')::numeric,weight_kg=(person->>'weightKg')::numeric,
 position=nullif(regexp_replace(btrim(person->>'position'),'[[:space:]]+',' ','g'),''),dominant_hand=person->>'dominantHand',
 origin_city=nullif(regexp_replace(btrim(person->>'originCity'),'[[:space:]]+',' ','g'),''),origin_state=nullif(regexp_replace(btrim(person->>'originState'),'[[:space:]]+',' ','g'),''),
 biography=nullif(btrim(person->>'biography'),''),version=previous,saved_at=clock_timestamp() where id=pid;
 if athlete<>'null'::jsonb then
  insert into private.athletes(person_id,sex,birth_date,federation_registration) values(pid,athlete->>'sex',(athlete->>'birthDate')::date,nullif(regexp_replace(btrim(athlete->>'federationRegistration'),'[[:space:]]+',' ','g'),''))
  on conflict(person_id) do update set sex=excluded.sex,birth_date=excluded.birth_date,federation_registration=excluded.federation_registration;
 end if;
 if coach then insert into public.coaches(person_id) values(pid) on conflict do nothing;end if;
 result:=jsonb_build_object('id',pid,'version',previous);
 insert into private.person_commands(command_id,actor_id,payload,result) values(cmd,actor,p_command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation or datetime_field_overflow or invalid_datetime_format then
 raise sqlstate 'PT400' using message='invalid_person';
end
$$;
create function public.save_person(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_person(p_command)$$;
revoke all on function private.person_name_key(text),private.save_person(jsonb),public.save_person(jsonb),public.get_person(uuid),public.list_persons(text,text,integer) from public,anon,authenticated,service_role;
grant execute on function private.person_name_key(text),private.save_person(jsonb),public.save_person(jsonb),public.get_person(uuid),public.list_persons(text,text,integer) to authenticated;
