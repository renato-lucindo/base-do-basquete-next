-- A26 first slice: remove a registration only when it has no domain dependencies.
-- No existing data is deleted by this migration. All prior migrations stay immutable.
create function private.valid_registration_removal_command(c jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare k text;n numeric;
begin
 if octet_length(c::text)>8192 or not private.context_keys(c,array['commandId','registrationId','disputeId','expectedVersion']) then return false;end if;
 foreach k in array array['commandId','registrationId','disputeId'] loop
  if jsonb_typeof(c->k) is distinct from 'string' or not private.regulation_uuid(c->k) then return false;end if;
 end loop;
 if jsonb_typeof(c->'expectedVersion') is distinct from 'number' then return false;end if;
 n:=(c->>'expectedVersion')::numeric;
 return n between 1 and 2147483647 and trunc(n)=n;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end$$;

create table private.registration_removals (
 registration_id uuid primary key,command_id uuid not null unique,
 actor_id uuid not null references auth.users(id) on delete restrict,
 dispute_id uuid not null,team_id uuid not null,deleted_version integer not null check(deleted_version>0),
 payload jsonb not null check(private.valid_registration_removal_command(payload)),
 registration_snapshot jsonb not null check(jsonb_typeof(registration_snapshot)='object' and octet_length(registration_snapshot::text)<=4096),
 result jsonb not null,saved_at timestamptz not null default clock_timestamp(),
 check((payload->>'registrationId')::uuid=registration_id and (payload->>'disputeId')::uuid=dispute_id and (payload->>'expectedVersion')::numeric=deleted_version),
 check(result=jsonb_build_object('state','removed','id',registration_id,'disputeId',dispute_id,'deletedVersion',deleted_version))
);
create index registration_removals_actor on private.registration_removals(actor_id);
alter table private.registration_removals enable row level security;
revoke all on private.registration_removals from public,anon,authenticated,service_role;
create policy deny_registration_removals on private.registration_removals as restrictive for all to public using(false) with check(false);

create function private.registration_removal_history_immutable() returns trigger
language plpgsql volatile security invoker set search_path='' as $$
begin raise sqlstate 'PT403' using message='immutable_registration_removal';end$$;
create trigger immutable_registration_removal before update or delete on private.registration_removals
for each row execute function private.registration_removal_history_immutable();

create function private.registration_id_never_reused() returns trigger
language plpgsql volatile security definer set search_path='' as $$
begin
 if exists(select 1 from private.registration_removals where registration_id=new.id) then raise sqlstate 'PT409' using message='registration_removed';end if;
 return new;
end$$;
create trigger registration_id_never_reused before insert on public.registrations
for each row execute function private.registration_id_never_reused();

create index text_reviews_target_registration on private.text_reviews(lower(document#>>'{target,registrationId}'))
where length(document#>>'{target,registrationId}')=36;

create function private.registration_removal_blockers(rid uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(b.code order by b.n) filter(where b.blocked),'[]'::jsonb)
 from(values
  (1,'roster',exists(select 1 from public.roster_entries where registration_id=rid)),
  (2,'staff',exists(select 1 from public.staff_entries where registration_id=rid)),
  (3,'games',exists(select 1 from public.games where home_registration_id=rid or away_registration_id=rid)),
  (4,'scoresheet',exists(select 1 from public.game_sheet_entries where registration_id=rid)),
  (5,'publication',exists(select 1 from private.game_publication_entries where registration_id=rid)),
  (6,'decisions',exists(select 1 from private.registration_withdrawal_records where registration_id=rid) or exists(select 1 from private.game_occurrence_versions where home_registration_id=rid or away_registration_id=rid)),
  (7,'regulation',exists(select 1 from private.regulation_registration_links where registration_id=rid)),
  (8,'text_review',exists(select 1 from private.text_reviews where registration_id=rid or (length(document#>>'{target,registrationId}')=36 and lower(document#>>'{target,registrationId}')=rid::text))),
  (9,'transfer',exists(select 1 from private.roster_transfers where destination_registration_id=rid)),
  (10,'awards',exists(select 1 from private.achievement_draft_registrations where registration_id=rid))
 ) b(n,code,blocked)
$$;

create function private.get_registration_removal_context(rid uuid,did uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r public.registrations%rowtype;blocks jsonb;reply jsonb;team_name text;
begin
 if not exists(select 1 from public.admin_access where user_id=auth.uid() and enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 if rid is null or did is null then raise sqlstate 'PT400' using message='invalid_registration_removal';end if;
 select * into r from public.registrations where id=rid and dispute_id=did;
 if not found then
  select result into reply from private.registration_removals where registration_id=rid and dispute_id=did;
  if found then return reply;end if;
  raise sqlstate 'PT404' using message='registration_not_found';
 end if;
 select name into team_name from public.teams where id=r.team_id;
 blocks:=private.registration_removal_blockers(rid);
 return jsonb_build_object('state',case when jsonb_array_length(blocks)=0 then 'available' else 'blocked' end,
  'registration',jsonb_build_object('id',r.id,'disputeId',r.dispute_id,'teamId',r.team_id,'name',r.name,'teamName',team_name,'version',r.version),'blockers',blocks);
end$$;

create function private.remove_registration(c jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;rid uuid;did uuid;root uuid;expected integer;
 old public.registrations%rowtype;receipt private.registration_removals%rowtype;reply jsonb;snapshot jsonb;
begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.valid_registration_removal_command(c) then raise sqlstate 'PT400' using message='invalid_registration_removal';end if;
 cmd:=(c->>'commandId')::uuid;rid:=(c->>'registrationId')::uuid;did:=(c->>'disputeId')::uuid;expected:=(c->>'expectedVersion')::numeric::integer;
 perform pg_advisory_xact_lock(hashtextextended('registration-removal-command:'||cmd::text,0));
 select * into receipt from private.registration_removals where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>c then raise sqlstate 'PT409' using message='idempotency_conflict';end if;
  return receipt.result;
 end if;
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if root is null then raise sqlstate 'PT404' using message='registration_not_found';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 perform pg_advisory_xact_lock(hashtextextended('registration:'||rid::text,0));
 select * into old from public.registrations where id=rid and dispute_id=did for update;
 if not found then
  if exists(select 1 from private.registration_removals where registration_id=rid and dispute_id=did) then raise sqlstate 'PT409' using message='registration_removed';end if;
  raise sqlstate 'PT404' using message='registration_not_found';
 end if;
 if old.version<>expected then raise sqlstate 'PT409' using message='version_conflict';end if;
 if private.registration_removal_blockers(rid)<>'[]'::jsonb then raise sqlstate 'PT409' using message='registration_in_use';end if;
 snapshot:=jsonb_build_object('id',old.id,'disputeId',old.dispute_id,'teamId',old.team_id,'name',old.name,'teamName',(select name from public.teams where id=old.team_id),'version',old.version);
 reply:=jsonb_build_object('state','removed','id',rid,'disputeId',did,'deletedVersion',old.version);
 delete from public.registrations where id=rid and dispute_id=did;
 insert into private.registration_removals(registration_id,command_id,actor_id,dispute_id,team_id,deleted_version,payload,registration_snapshot,result)
  values(rid,cmd,actor,did,old.team_id,old.version,c,snapshot,reply);
 update public.championships set saved_at=clock_timestamp() where id=root;
 return reply;
exception when foreign_key_violation then raise sqlstate 'PT409' using message='registration_in_use';
end$$;

create function public.get_registration_removal_context(p_registration_id uuid,p_dispute_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$select private.get_registration_removal_context(p_registration_id,p_dispute_id)$$;
create function public.remove_registration(p_command jsonb) returns jsonb
language sql volatile security invoker set search_path='' as $$select private.remove_registration(p_command)$$;

revoke all on function private.valid_registration_removal_command(jsonb),private.registration_removal_history_immutable(),private.registration_id_never_reused(),private.registration_removal_blockers(uuid),private.get_registration_removal_context(uuid,uuid),private.remove_registration(jsonb),public.get_registration_removal_context(uuid,uuid),public.remove_registration(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.get_registration_removal_context(uuid,uuid),private.remove_registration(jsonb),public.get_registration_removal_context(uuid,uuid),public.remove_registration(jsonb) to authenticated;
