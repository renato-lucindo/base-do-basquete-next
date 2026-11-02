-- R2b: one confirmed batch, existing identities only, private immutable lineage.
create function private.valid_roster_reuse_command(c jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare item jsonb;source_ids uuid[]:='{}';new_ids uuid[]:='{}';sid uuid;nid uuid;
begin
 if not private.context_keys(c,array['commandId','sourceRegistrationId','targetRegistrationId','expectedContextFingerprint','items','confirmed'])
  or octet_length(c::text)>65536 or not private.regulation_uuid(c->'commandId')
  or not private.regulation_uuid(c->'sourceRegistrationId') or not private.regulation_uuid(c->'targetRegistrationId')
  or c->'confirmed' is distinct from 'true'::jsonb or jsonb_typeof(c->'expectedContextFingerprint') is distinct from 'string'
  or (c->>'expectedContextFingerprint')!~'^[a-f0-9]{64}$' or jsonb_typeof(c->'items') is distinct from 'array'
 then return false;end if;
 if (c->>'sourceRegistrationId')::uuid=(c->>'targetRegistrationId')::uuid or jsonb_array_length(c->'items') not between 1 and 200 then return false;end if;
 for item in select value from jsonb_array_elements(c->'items') loop
  if not private.context_keys(item,array['sourceEntryId','sourceVersion','newEntryId','jersey'])
   or not private.regulation_uuid(item->'sourceEntryId') or not private.regulation_uuid(item->'newEntryId')
   or not private.regulation_integer(item->'sourceVersion',1,2147483647)
   or jsonb_typeof(item->'jersey') not in('string','null')
   or (item->'jersey'<>'null'::jsonb and (item->>'jersey')!~'^(00|0|[1-9][0-9]?)$') then return false;end if;
  sid:=(item->>'sourceEntryId')::uuid;nid:=(item->>'newEntryId')::uuid;
  if sid=any(source_ids) or nid=any(new_ids) then return false;end if;
  source_ids:=array_append(source_ids,sid);new_ids:=array_append(new_ids,nid);
 end loop;
 return not source_ids&&new_ids;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end$$;

create table private.roster_reuse_commands (
 command_id uuid primary key,actor_id uuid not null references auth.users(id) on delete restrict,
 source_registration_id uuid not null references public.registrations(id) on delete restrict,
 target_registration_id uuid not null references public.registrations(id) on delete restrict,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=65536),
 result jsonb not null check(jsonb_typeof(result)='object'),created_at timestamptz not null default clock_timestamp(),
 check(source_registration_id<>target_registration_id)
);
create index roster_reuse_actor on private.roster_reuse_commands(actor_id);
create index roster_reuse_source on private.roster_reuse_commands(source_registration_id);
create index roster_reuse_target on private.roster_reuse_commands(target_registration_id);
create table private.roster_reuse_items (
 command_id uuid not null references private.roster_reuse_commands(command_id) on delete restrict,
 source_entry_id uuid not null references public.roster_entries(id) on delete restrict,
 new_entry_id uuid not null unique references public.roster_entries(id) on delete restrict,
 person_id uuid not null references private.athletes(person_id) on delete restrict,
 primary key(command_id,source_entry_id),check(source_entry_id<>new_entry_id)
);
create index roster_reuse_item_source on private.roster_reuse_items(source_entry_id);
create index roster_reuse_item_person on private.roster_reuse_items(person_id);
alter table private.roster_reuse_commands enable row level security;
alter table private.roster_reuse_items enable row level security;
revoke all on private.roster_reuse_commands,private.roster_reuse_items from public,anon,authenticated,service_role;
create policy deny_roster_reuse_commands on private.roster_reuse_commands as restrictive for all to public using(false) with check(false);
create policy deny_roster_reuse_items on private.roster_reuse_items as restrictive for all to public using(false) with check(false);
create function private.roster_reuse_immutable() returns trigger language plpgsql security invoker set search_path='' as $$begin raise sqlstate 'PT409' using message='reuse_history_immutable';end$$;
create trigger roster_reuse_commands_immutable before update or delete on private.roster_reuse_commands for each row execute function private.roster_reuse_immutable();
create trigger roster_reuse_items_immutable before update or delete on private.roster_reuse_items for each row execute function private.roster_reuse_immutable();

create function private.apply_roster_reuse(c jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;source_id uuid;target_id uuid;root uuid;ctx jsonb;item jsonb;candidate jsonb;
 receipt private.roster_reuse_commands%rowtype;items jsonb:='[]';result jsonb;target_dispute uuid;pid uuid;sid uuid;nid uuid;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.valid_roster_reuse_command(c) then raise sqlstate 'PT400' using message='invalid_roster_reuse';end if;
 cmd:=(c->>'commandId')::uuid;source_id:=(c->>'sourceRegistrationId')::uuid;target_id:=(c->>'targetRegistrationId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('roster-reuse-command:'||cmd::text,0));
 select * into receipt from private.roster_reuse_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>c then raise sqlstate 'PT409' using message='idempotency_conflict';end if;
  return receipt.result;
 end if;
 select s.championship_id,r.dispute_id into root,target_dispute from public.registrations r join public.disputes d on d.id=r.dispute_id join public.seasons s on s.id=d.season_id where r.id=target_id;
 if root is null then raise sqlstate 'PT404' using message='reuse_registration_not_found';end if;
 -- Same order as current identity/membership writers: all athletes, then root.
 perform a.person_id from private.athletes a join public.roster_entries r on r.person_id=a.person_id
  where r.registration_id=source_id and r.id in(select (value->>'sourceEntryId')::uuid from jsonb_array_elements(c->'items'))
  order by a.person_id for share of a;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 ctx:=private.roster_reuse_context(source_id,target_id);
 if ctx->>'contextFingerprint'<>c->>'expectedContextFingerprint' then raise sqlstate 'PT409' using message='reuse_context_conflict';end if;
 if jsonb_array_length(ctx->'targetRoster')+jsonb_array_length(c->'items')>2000 then raise sqlstate 'PT413' using message='reuse_context_too_large';end if;
 for item in select value from jsonb_array_elements(c->'items') loop
  sid:=(item->>'sourceEntryId')::uuid;nid:=(item->>'newEntryId')::uuid;
  select value into candidate from jsonb_array_elements(ctx->'candidates') where value->>'sourceEntryId'=sid::text;
  if candidate is null or candidate->>'eligibility'<>'eligible'
   or exists(select 1 from jsonb_array_elements(ctx->'targetRoster') t where t->>'personId'=candidate#>>'{person,id}')
  then raise sqlstate 'PT400' using message='invalid_reuse_selection';end if;
  if (candidate->>'sourceVersion')::integer<>(item->>'sourceVersion')::integer then raise sqlstate 'PT409' using message='reuse_context_conflict';end if;
  pid:=(candidate#>>'{person,id}')::uuid;
  -- The general transfer guard remains enabled; there is no bypass flag.
  insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) values(nid,target_id,target_dispute,pid,item->>'jersey');
  items:=items||jsonb_build_array(jsonb_build_object('sourceEntryId',sid,'personId',pid,'newEntryId',nid,'version',1));
 end loop;
 update public.championships set saved_at=clock_timestamp() where id=root;
 result:=jsonb_build_object('commandId',cmd,'sourceRegistrationId',source_id,'targetRegistrationId',target_id,'items',items);
 insert into private.roster_reuse_commands(command_id,actor_id,source_registration_id,target_registration_id,payload,result) values(cmd,actor,source_id,target_id,c,result);
 insert into private.roster_reuse_items(command_id,source_entry_id,new_entry_id,person_id)
  select cmd,(value->>'sourceEntryId')::uuid,(value->>'newEntryId')::uuid,(value->>'personId')::uuid from jsonb_array_elements(items);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then
 raise sqlstate 'PT400' using message='invalid_roster_reuse';
end$$;
create function public.apply_roster_reuse(p_command jsonb) returns jsonb
language sql volatile security invoker set search_path='' as $$select private.apply_roster_reuse(p_command)$$;
revoke all on function private.valid_roster_reuse_command(jsonb),private.roster_reuse_immutable(),private.apply_roster_reuse(jsonb),public.apply_roster_reuse(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.apply_roster_reuse(jsonb),public.apply_roster_reuse(jsonb) to authenticated;
