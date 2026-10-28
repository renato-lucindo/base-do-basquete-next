-- C3.2a: distinct membership identity; inactive memberships remain historical rows.
alter table public.registrations add constraint registrations_id_dispute unique(id,dispute_id);
create table public.roster_entries (
 id uuid primary key,registration_id uuid not null,dispute_id uuid not null,
 person_id uuid not null references private.athletes(person_id),
 jersey text not null check(jersey ~ '^(00|0|[1-9][0-9]?)$'),
 started_at timestamptz not null default clock_timestamp(),ended_at timestamptz,
 version integer not null default 1 check(version>0),saved_at timestamptz not null default clock_timestamp(),
 foreign key(registration_id,dispute_id) references public.registrations(id,dispute_id),
 check(ended_at is null or ended_at>=started_at)
);
create unique index one_active_registration_per_dispute on public.roster_entries(person_id,dispute_id) where ended_at is null;
create unique index one_active_jersey_per_registration on public.roster_entries(registration_id,jersey) where ended_at is null;
create index roster_registration_history on public.roster_entries(registration_id,started_at,id);
create index roster_dispute on public.roster_entries(dispute_id);
create table private.roster_commands (
 command_id uuid primary key,actor_id uuid not null references auth.users(id),payload jsonb not null,result jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
alter table public.roster_entries enable row level security;
alter table private.roster_commands enable row level security;
revoke all on public.roster_entries,private.roster_commands from public,anon,authenticated,service_role;
grant select on public.roster_entries to authenticated;
create policy admin_reads_roster on public.roster_entries for select to authenticated using(exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy deny_roster_receipts on private.roster_commands as restrictive for all to public using(false) with check(false);
create function public.get_roster_entry(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',r.id,'registrationId',r.registration_id,'disputeId',r.dispute_id,'personId',r.person_id,
 'jersey',r.jersey,'active',r.ended_at is null,'version',r.version,'savedAt',r.saved_at,'startedAt',r.started_at,'endedAt',r.ended_at,
 'person',jsonb_build_object('id',p.id,'name',p.name,'nickname',p.nickname,'publicBirthYear',p.public_birth_year))
 from public.roster_entries r join public.persons p on p.id=r.person_id where r.id=p_id
$$;
create function public.list_roster(p_registration_id uuid,p_active_only boolean default true,p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with matches as(select r.id,r.jersey from public.roster_entries r where r.registration_id=p_registration_id and (not p_active_only or r.ended_at is null) and p_offset between 0 and 100000),
 page as(select * from matches order by jersey::integer,length(jersey),id limit 20 offset greatest(0,least(p_offset,100000)))
 select jsonb_build_object('items',coalesce((select jsonb_agg(public.get_roster_entry(id) order by jersey::integer,length(jersey),id) from page),'[]'::jsonb),
 'hasMore',(select p_offset<100000 and count(*)>p_offset+20 from matches))
$$;
create function private.save_roster_entry(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;eid uuid;rid uuid;pid uuid;did uuid;root uuid;expected integer;old public.roster_entries%rowtype;
 receipt private.roster_commands%rowtype;e jsonb;active boolean;result jsonb;athlete_sex text;gender_sex text;next_version integer;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','expectedVersion','entry']) or octet_length(p_command::text)>4096 then raise sqlstate 'PT400' using message='invalid_roster';end if;
 e:=p_command->'entry';
 if not private.context_keys(e,array['id','registrationId','personId','jersey','active']) or jsonb_typeof(e->'jersey') is distinct from 'string'
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
create function public.save_roster_entry(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_roster_entry(p_command)$$;
revoke all on function private.save_roster_entry(jsonb),public.save_roster_entry(jsonb),public.get_roster_entry(uuid),public.list_roster(uuid,boolean,integer) from public,anon,authenticated,service_role;
grant execute on function private.save_roster_entry(jsonb),public.save_roster_entry(jsonb),public.get_roster_entry(uuid),public.list_roster(uuid,boolean,integer) to authenticated;
