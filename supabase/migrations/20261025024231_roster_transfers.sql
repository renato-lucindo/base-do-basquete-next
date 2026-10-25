-- T2b2 WIP: atomic periods and an immutable intent/receipt; validate before remote use.
create function private.transfer_reason(v jsonb) returns text language plpgsql immutable security invoker set search_path='' as $$
declare t text;units integer;
begin
 if jsonb_typeof(v) is distinct from 'string' then return null;end if;
 t:=btrim(v#>>'{}',E' \t\n\r\f'||chr(11)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279));
 if length(t)>2000 then return null;end if;
 select coalesce(sum(case when ascii(ch)>65535 then 2 else 1 end),0) into units from regexp_split_to_table(t,'') ch;
 if units not between 3 and 2000 then return null;end if;return t;
end$$;

create table private.roster_transfers (
 command_id uuid primary key,actor_id uuid not null references auth.users(id) on delete restrict,
 source_entry_id uuid not null references public.roster_entries(id) on delete restrict,
 new_entry_id uuid not null unique references public.roster_entries(id) on delete restrict deferrable initially deferred,
 person_id uuid not null references private.athletes(person_id) on delete restrict,
 dispute_id uuid not null references public.disputes(id) on delete restrict,destination_registration_id uuid not null,
 regulation_version integer not null,effective_at timestamptz not null,jersey text,
 source_snapshot jsonb not null check(jsonb_typeof(source_snapshot)='object'),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=8192),
 result jsonb not null check(jsonb_typeof(result)='object'),
 foreign key(destination_registration_id,dispute_id) references public.registrations(id,dispute_id) on delete restrict,
 foreign key(dispute_id,regulation_version) references private.regulation_versions(dispute_id,version) on delete restrict,
 check(source_entry_id<>new_entry_id)
);
create index roster_transfers_actor on private.roster_transfers(actor_id);
create index roster_transfers_source on private.roster_transfers(source_entry_id);
create index roster_transfers_person_history on private.roster_transfers(person_id,dispute_id,effective_at,command_id);
create index roster_transfers_destination on private.roster_transfers(destination_registration_id,dispute_id);
create index roster_transfers_regulation on private.roster_transfers(dispute_id,regulation_version);
alter table private.roster_transfers enable row level security;
revoke all on private.roster_transfers from public,anon,authenticated,service_role;
create policy deny_roster_transfers on private.roster_transfers as restrictive for all to public using(false) with check(false);
create trigger roster_transfers_immutable before update or delete on private.roster_transfers for each row execute function private.regulation_history_immutable();

create function private.guard_roster_transfer_insert() returns trigger language plpgsql volatile security invoker set search_path='' as $$
begin
 if exists(select 1 from public.roster_entries r where r.person_id=new.person_id and r.dispute_id=new.dispute_id)
 and not exists(select 1 from private.roster_transfers t where t.new_entry_id=new.id and t.actor_id=auth.uid()
  and t.person_id=new.person_id and t.dispute_id=new.dispute_id and t.destination_registration_id=new.registration_id
  and t.effective_at=new.started_at and t.jersey is not distinct from new.jersey and new.ended_at is null and new.version=1)
 then raise sqlstate 'PT400' using message='transfer_required';end if;
 return new;
end$$;
create trigger roster_transfer_required before insert on public.roster_entries for each row execute function private.guard_roster_transfer_insert();

create function private.transfer_roster_entry(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;source_id uuid;destination uuid;new_id uuid;did uuid;pid uuid;root uuid;target_did uuid;
 old public.roster_entries%rowtype;active public.roster_entries%rowtype;receipt private.roster_transfers%rowtype;
 athlete_sex text;gender_sex text;ctx jsonb;at_time timestamptz;msg text;shirt text;next_source integer;result jsonb;kind text;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','disputeId','sourceEntryId','expectedSourceVersion','destinationRegistrationId','expectedDestinationVersion','expectedRegulationVersion','expectedContextFingerprint','newEntryId','jersey','reason','acknowledgeImpact'])
 or octet_length(p_command::text)>8192 or not private.regulation_uuid(p_command->'commandId') or not private.regulation_uuid(p_command->'disputeId')
 or not private.regulation_uuid(p_command->'sourceEntryId') or not private.regulation_uuid(p_command->'destinationRegistrationId') or not private.regulation_uuid(p_command->'newEntryId')
 or not private.regulation_integer(p_command->'expectedSourceVersion',1,2147483646) or not private.regulation_integer(p_command->'expectedDestinationVersion',1,2147483647)
 or not private.regulation_integer(p_command->'expectedRegulationVersion',0,2147483647) or jsonb_typeof(p_command->'expectedContextFingerprint') is distinct from 'string'
 or (p_command->>'expectedContextFingerprint')!~'^[a-f0-9]{64}$' or p_command->'acknowledgeImpact' is distinct from 'true'::jsonb
 or (p_command->'jersey'<>'null'::jsonb and (jsonb_typeof(p_command->'jersey') is distinct from 'string' or (p_command->>'jersey')!~'^(00|0|[1-9][0-9]?)$'))
 then raise sqlstate 'PT400' using message='invalid_transfer';end if;
 msg:=private.transfer_reason(p_command->'reason');if msg is null then raise sqlstate 'PT400' using message='transfer_reason_required';end if;
 cmd:=(p_command->>'commandId')::uuid;source_id:=(p_command->>'sourceEntryId')::uuid;destination:=(p_command->>'destinationRegistrationId')::uuid;
 new_id:=(p_command->>'newEntryId')::uuid;did:=(p_command->>'disputeId')::uuid;shirt:=p_command->>'jersey';
 if source_id=new_id then raise sqlstate 'PT400' using message='invalid_transfer';end if;
 perform pg_advisory_xact_lock(hashtextextended('roster-transfer-command:'||cmd::text,0));
 select * into receipt from private.roster_transfers where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;
  return receipt.result;
 end if;
 select r.person_id,s.championship_id into pid,root from public.roster_entries r join public.disputes d on d.id=r.dispute_id join public.seasons s on s.id=d.season_id where r.id=source_id and r.dispute_id=did;
 if root is null then raise sqlstate 'PT400' using message='invalid_transfer_context';end if;
 select sex into athlete_sex from private.athletes where person_id=pid for share;
 if athlete_sex is null then raise sqlstate 'PT400' using message='invalid_transfer_context';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 select * into old from public.roster_entries where id=source_id for update;
 select dispute_id into target_did from public.registrations where id=destination;
 select case when gender='feminino' then 'female' else 'male' end into gender_sex from public.disputes where id=did;
 if target_did is distinct from did or athlete_sex is distinct from gender_sex then raise sqlstate 'PT400' using message='invalid_transfer_context';end if;
 ctx:=private.transfer_context(did,pid,destination);
 if old.version<>(p_command->>'expectedSourceVersion')::integer or (ctx#>>'{regulation,version}')::integer<>(p_command->>'expectedRegulationVersion')::integer
 or not exists(select 1 from public.registrations r where r.id=destination and r.version=(p_command->>'expectedDestinationVersion')::integer)
 or ctx->>'contextFingerprint'<>p_command->>'expectedContextFingerprint' then raise sqlstate 'PT409' using message='transfer_context_conflict';end if;
 if ctx#>>'{regulation,transfers}' is distinct from 'allowed' then raise sqlstate 'PT400' using message='transfer_not_allowed';end if;
 if jsonb_array_length(ctx->'memberships')>=2000 then raise sqlstate 'PT413' using message='transfer_context_too_large';end if;
 select * into active from public.roster_entries r where r.person_id=pid and r.dispute_id=did and r.ended_at is null for update;
 if (active.id is not null and active.id<>source_id) or (old.ended_at is not null and exists(select 1 from public.roster_entries r where r.person_id=pid and r.dispute_id=did and r.ended_at>old.ended_at)) then raise sqlstate 'PT409' using message='transfer_source_changed';end if;
 if active.registration_id=destination then raise sqlstate 'PT400' using message='same_registration';end if;
 if exists(select 1 from public.roster_entries where id=new_id) then raise sqlstate 'PT400' using message='transfer_id_used';end if;
 if shirt is not null and exists(select 1 from public.roster_entries where registration_id=destination and ended_at is null and jersey=shirt) then raise sqlstate 'PT400' using message='transfer_jersey_conflict';end if;
 at_time:=(ctx->>'effectiveAt')::timestamptz;
 if exists(select 1 from public.roster_entries r where r.person_id=pid and r.dispute_id=did and (r.started_at>at_time or r.ended_at>at_time)) then raise sqlstate 'PT400' using message='invalid_transfer_time';end if;
 kind:=case when exists(select 1 from public.roster_entries r where r.person_id=pid and r.dispute_id=did and r.registration_id=destination) then 'return' else 'transfer' end;
 next_source:=old.version+case when old.ended_at is null then 1 else 0 end;
 result:=jsonb_build_object('commandId',cmd,'disputeId',did,'personId',pid,'sourceEntryId',source_id,'sourceVersion',next_source,'newEntryId',new_id,'newEntryVersion',1,'destinationRegistrationId',destination,'effectiveAt',at_time,'kind',kind);
 insert into private.roster_transfers(command_id,actor_id,source_entry_id,new_entry_id,person_id,dispute_id,destination_registration_id,regulation_version,effective_at,jersey,source_snapshot,payload,result)
 values(cmd,actor,source_id,new_id,pid,did,destination,(ctx#>>'{regulation,version}')::integer,at_time,shirt,to_jsonb(old),p_command,result);
 if old.ended_at is null then update public.roster_entries set ended_at=at_time,saved_at=at_time,version=next_source where id=source_id;end if;
 insert into public.roster_entries(id,person_id,dispute_id,registration_id,jersey,started_at,saved_at) values(new_id,pid,did,destination,shirt,at_time,at_time);
 update public.championships set saved_at=at_time where id=root;
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_transfer';
end$$;
create function public.transfer_roster_entry(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.transfer_roster_entry(p_command)$$;
revoke all on function private.transfer_reason(jsonb),private.guard_roster_transfer_insert(),private.transfer_roster_entry(jsonb),public.transfer_roster_entry(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.transfer_roster_entry(jsonb),public.transfer_roster_entry(jsonb) to authenticated;
