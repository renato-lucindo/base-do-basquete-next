-- Freeze the birthday privately on each new confirmation. Historical versions remain intact.

alter table private.player_profile_versions add column birth_date date;

create or replace function private.profile_person(pid uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',p.id,'name',p.name,'nickname',p.nickname,'publicBirthYear',coalesce(extract(year from a.birth_date)::integer,p.public_birth_year,a.birth_year),'heightCm',p.height_cm,'weightKg',p.weight_kg,'position',p.position,'dominantHand',p.dominant_hand,'originCity',p.origin_city,'originState',p.origin_state,'biography',p.biography) from public.persons p join private.athletes a on a.person_id=p.id where p.id=pid
$$;

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
 public_birth_year=case when athlete->>'birthDate' is null then (person->>'publicBirthYear')::integer end,height_cm=(person->>'heightCm')::numeric,weight_kg=(person->>'weightKg')::numeric,
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

create or replace function private.confirm_player_profile(c jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;pid uuid;pv integer;old_version integer;nv integer;at_time timestamptz;birth_date date;metadata jsonb;snapshot jsonb;result jsonb;root uuid;
 receipt private.player_profile_commands%rowtype;begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not coalesce(private.valid_player_profile_confirmation(c),false) then raise sqlstate 'PT400' using message='invalid_player_profile_confirmation';end if;
 cmd:=(c->>'commandId')::uuid;pid:=(c->>'personId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('player-profile-command:'||cmd::text,0));
 select * into receipt from private.player_profile_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>c then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('person:'||pid::text,0));
 select p.version,a.birth_date into pv,birth_date from public.persons p join private.athletes a on a.person_id=p.id where p.id=pid for share of p,a;
 if not found then raise sqlstate 'PT404' using message='player_profile_not_found';end if;
 select version into old_version from public.published_player_profiles where person_id=pid for update;
 if pv<>(c->>'expectedPersonVersion')::numeric or coalesce(old_version,0)<>(c->>'expectedPublicationVersion')::numeric then raise sqlstate 'PT409' using message='version_conflict';end if;
 if pv>2147483646 or coalesce(old_version,0)>2147483646 then raise sqlstate 'PT409' using message='profile_version_limit';end if;
 metadata:=private.profile_person(pid);
 if not private.valid_profile_metadata(metadata) then raise sqlstate 'PT400' using message='invalid_profile_metadata';end if;
 nv:=coalesce(old_version,0)+1;at_time:=clock_timestamp();
 snapshot:=jsonb_build_object('kind','confirmed-player-profile-v1','personId',pid,'version',nv,'confirmedAt',at_time,'person',metadata);
 insert into private.player_profile_versions(person_id,version,person_version,confirmed_at,confirmed_by,reason,snapshot,birth_date) values(pid,nv,pv,at_time,actor,private.profile_confirmation_reason(c->'reason'),snapshot,birth_date);
 insert into public.published_player_profiles(person_id,version,snapshot) values(pid,nv,snapshot) on conflict(person_id) do update set version=excluded.version,snapshot=excluded.snapshot;
 result:=jsonb_build_object('commandId',cmd,'personId',pid,'version',nv,'personVersion',pv,'confirmedAt',at_time);
 insert into private.player_profile_commands(command_id,actor_id,person_id,version,payload,result) values(cmd,actor,pid,nv,c,result);
 -- Identity before competition locks, in deterministic order, matching existing writers.
 for root in select distinct s.championship_id from public.roster_entries r join public.disputes d on d.id=r.dispute_id join public.seasons s on s.id=d.season_id where r.person_id=pid order by s.championship_id loop
  perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
  update public.championships set saved_at=at_time where id=root;
 end loop;
 return result;
end$$;

-- Public projections retain the original shape for existing consumers.
-- Only the confirmed current version contributes a private date to the age calculation.
create function private.confirmed_player_age(birth_date date, birth_year integer, as_of date)
returns integer language sql immutable security invoker set search_path='' as $$
 select case when years between 0 and 120 then years end
 from (
  select case
   when birth_date > as_of then null
   when birth_date is not null then extract(year from age(as_of::timestamp,birth_date::timestamp))::integer
   else extract(year from as_of)::integer-birth_year
  end as years
 ) as age_at_date
$$;
revoke all on function private.confirmed_player_age(date,integer,date) from public,anon,authenticated,service_role;

-- The public career lookup supplies the eligible identity and confirmed version.
-- No input controls the reference date or selects a historical version.
create function public.get_player_career_with_age(p_person_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 career jsonb;
 published_version integer;
 birth_date date;
 current_age integer;
begin
 career:=public.get_player_career_source(p_person_id);
 if career is null then return null;end if;
 published_version:=(career#>>'{profile,version}')::integer;
 if published_version is not null then
  select v.birth_date into birth_date
  from private.player_profile_versions v
  where v.person_id=p_person_id and v.version=published_version;
  current_age:=private.confirmed_player_age(
   birth_date,
   (career#>>'{profile,person,publicBirthYear}')::integer,
   (statement_timestamp() at time zone 'America/Sao_Paulo')::date
  );
 end if;
 career:=career||jsonb_build_object('currentAge',current_age);
 if octet_length(career::text)>4194304 then raise sqlstate 'PT413' using message='player_career_source_too_large';end if;
 return career;
end$$;
revoke all on function public.get_player_career_with_age(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_player_career_with_age(uuid) to anon,authenticated;