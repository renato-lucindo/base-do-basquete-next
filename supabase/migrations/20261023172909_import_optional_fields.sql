-- C4: nullable contextual jerseys, global private federation identity and partial birth years.
-- Preflight refuses invalid/duplicate existing registrations; it never rewrites user data.
alter table public.roster_entries alter column jersey drop not null;
alter table private.athletes add column birth_year integer;
alter table private.athletes add constraint athlete_birth_year_range check(birth_year between 1 and 9999);
alter table private.athletes add constraint athlete_birth_year_matches_date check(birth_date is null or birth_year is null or birth_year=extract(year from birth_date));
alter table private.athletes add constraint federation_registration_six_digits check(federation_registration ~ '^[0-9]{6}$');
create unique index unique_federation_registration on private.athletes(federation_registration) where federation_registration is not null;
comment on column private.athletes.birth_year is 'Private partial birth year, never inferred into the separate public year.';
create or replace function public.list_roster(p_registration_id uuid,p_active_only boolean default true,p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with matches as(select r.id,r.jersey from public.roster_entries r where r.registration_id=p_registration_id and (not p_active_only or r.ended_at is null) and p_offset between 0 and 100000),
 page as(select * from matches order by jersey::integer,length(jersey),id limit 20 offset greatest(0,least(p_offset,100000)))
 select jsonb_build_object('items',coalesce((select jsonb_agg(public.get_roster_entry(id) order by jersey::integer,length(jersey),id) from page),'[]'::jsonb),
 'hasMore',(select p_offset<100000 and count(*)>p_offset+20 from matches))
$$;
create or replace function private.save_roster_entry(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;eid uuid;rid uuid;pid uuid;did uuid;root uuid;expected integer;old public.roster_entries%rowtype;
 receipt private.roster_commands%rowtype;e jsonb;active boolean;result jsonb;athlete_sex text;gender_sex text;next_version integer;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','expectedVersion','entry']) or octet_length(p_command::text)>4096 then raise sqlstate 'PT400' using message='invalid_roster';end if;
 e:=p_command->'entry';
 if not private.context_keys(e,array['id','registrationId','personId','jersey','active']) or jsonb_typeof(e->'jersey') not in ('string','null')
 or jsonb_typeof(e->'active') is distinct from 'boolean' or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number'
 or (p_command->>'expectedVersion') !~ '^[0-9]+$' then raise sqlstate 'PT400' using message='invalid_roster';end if;
 cmd:=(p_command->>'commandId')::uuid;eid:=(e->>'id')::uuid;rid:=(e->>'registrationId')::uuid;pid:=(e->>'personId')::uuid;
 expected:=(p_command->>'expectedVersion')::integer;active:=(e->>'active')::boolean;
 if cmd is null or eid is null or rid is null or pid is null or expected not between 0 and 2147483646 then raise sqlstate 'PT400' using message='invalid_roster';end if;
 perform pg_advisory_xact_lock(hashtextextended('roster-command:'||cmd::text,0));
 select * into receipt from private.roster_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;
  return receipt.result;
 end if;
 select r.dispute_id,s.championship_id,case when d.gender='feminino' then 'female' else 'male' end into did,root,gender_sex
 from public.registrations r join public.disputes d on d.id=r.dispute_id join public.seasons s on s.id=d.season_id where r.id=rid;
 select sex into athlete_sex from private.athletes where person_id=pid for share;
 if root is null or athlete_sex is null or athlete_sex<>gender_sex then raise sqlstate 'PT400' using message='invalid_roster_context';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 perform pg_advisory_xact_lock(hashtextextended('roster:'||eid::text,0));
 select * into old from public.roster_entries where id=eid for update;
 if (found and old.version<>expected) or (not found and expected<>0) then raise sqlstate 'PT409' using message='version_conflict';end if;
 if old.id is not null and (old.registration_id<>rid or old.person_id<>pid or old.dispute_id<>did or old.ended_at is not null)
 then raise sqlstate 'PT400' using message='immutable_membership';end if;
 if old.id is null then
  if not active then raise sqlstate 'PT400' using message='new_membership_must_be_active';end if;
  insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) values(eid,rid,did,pid,e->>'jersey');next_version:=1;
 else
  next_version:=old.version+1;
  update public.roster_entries set jersey=e->>'jersey',ended_at=case when active then null else clock_timestamp() end,
  version=next_version,saved_at=clock_timestamp() where id=eid;
 end if;
 update public.championships set saved_at=clock_timestamp() where id=root;
 result:=jsonb_build_object('id',eid,'version',next_version);
 insert into private.roster_commands(command_id,actor_id,payload,result) values(cmd,actor,p_command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then
 raise sqlstate 'PT400' using message='invalid_roster';
end
$$;
create or replace function public.save_roster_entry(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_roster_entry(p_command)$$;
revoke all on function private.save_roster_entry(jsonb),public.save_roster_entry(jsonb),public.get_roster_entry(uuid),public.list_roster(uuid,boolean,integer) from public,anon,authenticated,service_role;
grant execute on function private.save_roster_entry(jsonb),public.save_roster_entry(jsonb),public.get_roster_entry(uuid),public.list_roster(uuid,boolean,integer) to authenticated;

create or replace function private.save_person(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;pid uuid;did uuid;expected integer;previous integer;person jsonb;athlete jsonb;
 receipt private.person_commands%rowtype; title text;key text;field text;existing_sex text;gender_sex text;coach boolean;result jsonb;root uuid;
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
  on conflict(person_id) do update set sex=excluded.sex,birth_date=excluded.birth_date,federation_registration=excluded.federation_registration,
  birth_year=case when excluded.birth_date is not null then null else private.athletes.birth_year end;
 end if;
 if coach then insert into public.coaches(person_id) values(pid) on conflict do nothing;end if;
 -- Acquire competition locks only after the athlete/coach writes, matching membership lock order.
 for root in select distinct roots.championship_id from (
  select s.championship_id from public.registrations r join public.disputes d on d.id=r.dispute_id join public.seasons s on s.id=d.season_id
  where exists(select 1 from public.roster_entries x where x.registration_id=r.id and x.person_id=pid)
     or exists(select 1 from public.staff_entries x where x.registration_id=r.id and x.person_id=pid)
  union select s.championship_id from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did
 ) roots order by roots.championship_id loop
  perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
  update public.championships set saved_at=clock_timestamp() where id=root;
 end loop;
 result:=jsonb_build_object('id',pid,'version',previous);
 insert into private.person_commands(command_id,actor_id,payload,result) values(cmd,actor,p_command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation or datetime_field_overflow or invalid_datetime_format then
 raise sqlstate 'PT400' using message='invalid_person';
end
$$;
