-- Keep the public category label and the dispute identity stable during classification.
create function private.classify_dispute_category(label text) returns jsonb
language sql immutable strict set search_path='' as $$
  select case
    when lower(label) in ('adulto','asa','asda') then
      jsonb_build_object('label','Adulto','kind','adult')
    when lower(label) ~ '^sub[ -]*(1[2-9]|2[0-3])$' then
      jsonb_build_object('label','Sub-'||right(label,2),'kind','base','age',right(label,2)::smallint)
    when lower(label) ~ '^(([3-8][05]) *[+]|master[ -]*([3-8][05]) *[+]?)$' then
      jsonb_build_object('label',substring(label from '[0-9]{2}')||'+','kind','master',
        'age',substring(label from '[0-9]{2}')::smallint)
  end
$$;

do $$
begin
  if exists (
    select 1 from public.disputes
    group by season_id, gender, coalesce(lower(division),''),
      lower(coalesce(private.classify_dispute_category(category)->>'label',category))
    having count(*) > 1
  ) then
    raise exception 'Classificar as categorias existentes criaria disputas duplicadas';
  end if;
end
$$;

with renamed as (
  update public.disputes d
  set category=private.classify_dispute_category(d.category)->>'label'
  where private.classify_dispute_category(d.category)->>'label' <> d.category
  returning season_id
)
update public.championships c set version=c.version+1
where exists (select 1 from renamed r join public.seasons s on s.id=r.season_id where s.championship_id=c.id);

alter table public.disputes
  add column category_kind text generated always as (private.classify_dispute_category(category)->>'kind') stored,
  add column category_age smallint generated always as ((private.classify_dispute_category(category)->>'age')::smallint) stored;

create function private.normalize_dispute_category() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  new.category:=coalesce(private.classify_dispute_category(new.category)->>'label',new.category);
  return new;
end
$$;
create trigger normalize_dispute_category before insert or update of category on public.disputes
for each row execute function private.normalize_dispute_category();

-- Call under the existing championship lock, before inserting the new membership.
create function private.roster_age_warning(registration uuid, person uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare i record; athlete_age integer; reason text;
begin
  select d.category, d.category_kind, d.category_age, s.year into i
  from public.registrations r join public.disputes d on d.id=r.dispute_id
  join public.seasons s on s.id=d.season_id where r.id=registration;
  if i.category_kind is null or i.category_kind='adult' then return null; end if;

  select i.year-coalesce(extract(year from a.birth_date)::integer,p.public_birth_year,a.birth_year)
  into athlete_age from private.athletes a join public.persons p on p.id=a.person_id
  where a.person_id=person;
  if athlete_age is null then return null; end if;

  if i.category_kind='master' and athlete_age<i.category_age then
    reason:='below_minimum';
  elsif i.category_kind='base' and athlete_age>i.category_age then
    if i.category_age=22 and athlete_age between 23 and 25 then
      if (
        select count(*) from (
          select 1 from public.roster_entries e join private.athletes a on a.person_id=e.person_id
          join public.persons p on p.id=a.person_id
          where e.registration_id=registration and e.ended_at is null and e.person_id<>person
          and i.year-coalesce(extract(year from a.birth_date)::integer,p.public_birth_year,a.birth_year) between 23 and 25
          limit 2
        ) occupied
      )=2 then
        reason:='sub22_quota';
      end if;
    else
      reason:='above_maximum';
    end if;
  end if;
  if reason is null then return null; end if;
  return jsonb_build_object('code',reason,'category',i.category,'age',athlete_age);
end
$$;

revoke all on function private.classify_dispute_category(text),
  private.normalize_dispute_category(),private.roster_age_warning(uuid,uuid)
  from public,anon,authenticated,service_role;

create or replace function private.save_roster_entry(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;eid uuid;rid uuid;pid uuid;did uuid;root uuid;expected integer;old public.roster_entries%rowtype;
 receipt private.roster_commands%rowtype;e jsonb;active boolean;result jsonb;athlete_sex text;gender_sex text;next_version integer;warning jsonb;
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
  warning:=private.roster_age_warning(rid,pid);
  insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) values(eid,rid,did,pid,e->>'jersey');next_version:=1;
 else
  next_version:=old.version+1;
  update public.roster_entries set jersey=e->>'jersey',ended_at=case when active then null else clock_timestamp() end,
  version=next_version,saved_at=clock_timestamp() where id=eid;
 end if;
 update public.championships set saved_at=clock_timestamp() where id=root;
 result:=jsonb_build_object('id',eid,'version',next_version);
 if warning is not null then result:=result||jsonb_build_object('ageWarning',warning);end if;
 insert into private.roster_commands(command_id,actor_id,payload,result) values(cmd,actor,p_command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then
 raise sqlstate 'PT400' using message='invalid_roster';
end
$$;

create or replace function private.confirm_text_row(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
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
 if member_result ? 'ageWarning' then row_result:=row_result||jsonb_build_object('ageWarning',member_result->'ageWarning');end if;
 update private.text_reviews set results=results||jsonb_build_array(row_result),version=version+1,saved_at=clock_timestamp() where id=rid;
 result:=jsonb_build_object('id',rid,'version',old.version+1,'result',row_result);insert into private.text_review_commands(command_id,actor_id,operation,payload,result) values(cmd,actor,'row',p_command,result);return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation or datetime_field_overflow or invalid_datetime_format then raise sqlstate 'PT400' using message='invalid_import_item';
end$$;

create or replace function private.transfer_roster_entry(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;source_id uuid;destination uuid;new_id uuid;did uuid;pid uuid;root uuid;target_did uuid;
 old public.roster_entries%rowtype;active public.roster_entries%rowtype;receipt private.roster_transfers%rowtype;
 athlete_sex text;gender_sex text;ctx jsonb;at_time timestamptz;msg text;shirt text;next_source integer;result jsonb;kind text;warning jsonb;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.valid_roster_transfer_command(p_command) or p_command->'acknowledgeImpact' is distinct from 'true'::jsonb
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
 warning:=private.roster_age_warning(destination,pid);
 if warning is not null then result:=result||jsonb_build_object('ageWarning',warning);end if;
 insert into private.roster_transfers(command_id,actor_id,source_entry_id,new_entry_id,person_id,dispute_id,destination_registration_id,regulation_version,effective_at,jersey,source_snapshot,payload,result)
 values(cmd,actor,source_id,new_id,pid,did,destination,(ctx#>>'{regulation,version}')::integer,at_time,shirt,to_jsonb(old),p_command,result);
 if old.ended_at is null then update public.roster_entries set ended_at=at_time,saved_at=at_time,version=next_source where id=source_id;end if;
 insert into public.roster_entries(id,person_id,dispute_id,registration_id,jersey,started_at,saved_at) values(new_id,pid,did,destination,shirt,at_time,at_time);
 update public.championships set saved_at=at_time where id=root;
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_transfer';
end$$;

create or replace function private.apply_roster_reuse(c jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;source_id uuid;target_id uuid;root uuid;ctx jsonb;item jsonb;candidate jsonb;
 receipt private.roster_reuse_commands%rowtype;items jsonb:='[]';result jsonb;target_dispute uuid;pid uuid;sid uuid;nid uuid;warning jsonb;item_result jsonb;
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
  warning:=private.roster_age_warning(target_id,pid);
  insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) values(nid,target_id,target_dispute,pid,item->>'jersey');
  item_result:=jsonb_build_object('sourceEntryId',sid,'personId',pid,'newEntryId',nid,'version',1);
  if warning is not null then item_result:=item_result||jsonb_build_object('ageWarning',warning);end if;
  items:=items||jsonb_build_array(item_result);
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

-- Keep the one-argument RPC responses compatible with older Workers.
create function private.strip_roster_age_warnings(items jsonb) returns jsonb
language sql immutable strict set search_path='' as $$
  select coalesce(jsonb_agg(item-'ageWarning' order by ordinal),'[]')
  from jsonb_array_elements(items) with ordinality as entries(item,ordinal)
$$;
revoke all on function private.strip_roster_age_warnings(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.strip_roster_age_warnings(jsonb) to authenticated;

create function public.save_roster_entry(p_command jsonb, p_age_warnings boolean) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare receipt jsonb:=private.save_roster_entry(p_command);
begin
  if p_age_warnings then return receipt;end if;
  return receipt-'ageWarning';
end
$$;
create or replace function public.save_roster_entry(p_command jsonb) returns jsonb
language sql volatile security invoker set search_path='' as $$
  select public.save_roster_entry(p_command,false)
$$;
revoke all on function public.save_roster_entry(jsonb,boolean) from public,anon,authenticated,service_role;
grant execute on function public.save_roster_entry(jsonb,boolean) to authenticated;

create function public.transfer_roster_entry(p_command jsonb, p_age_warnings boolean) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare receipt jsonb:=private.transfer_roster_entry(p_command);
begin
  if p_age_warnings then return receipt;end if;
  return receipt-'ageWarning';
end
$$;
create or replace function public.transfer_roster_entry(p_command jsonb) returns jsonb
language sql volatile security invoker set search_path='' as $$
  select public.transfer_roster_entry(p_command,false)
$$;
revoke all on function public.transfer_roster_entry(jsonb,boolean) from public,anon,authenticated,service_role;
grant execute on function public.transfer_roster_entry(jsonb,boolean) to authenticated;

create function public.confirm_text_row(p_command jsonb, p_age_warnings boolean) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare receipt jsonb:=private.confirm_text_row(p_command);
begin
  if p_age_warnings then return receipt;end if;
  return receipt#-'{result,ageWarning}';
end
$$;
create or replace function public.confirm_text_row(p_command jsonb) returns jsonb
language sql volatile security invoker set search_path='' as $$
  select public.confirm_text_row(p_command,false)
$$;
revoke all on function public.confirm_text_row(jsonb,boolean) from public,anon,authenticated,service_role;
grant execute on function public.confirm_text_row(jsonb,boolean) to authenticated;

create function public.apply_roster_reuse(p_command jsonb, p_age_warnings boolean) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare receipt jsonb:=private.apply_roster_reuse(p_command);
begin
  if p_age_warnings then return receipt;end if;
  return jsonb_set(receipt,'{items}',private.strip_roster_age_warnings(receipt->'items'));
end
$$;
create or replace function public.apply_roster_reuse(p_command jsonb) returns jsonb
language sql volatile security invoker set search_path='' as $$
  select public.apply_roster_reuse(p_command,false)
$$;
revoke all on function public.apply_roster_reuse(jsonb,boolean) from public,anon,authenticated,service_role;
grant execute on function public.apply_roster_reuse(jsonb,boolean) to authenticated;

create function public.get_text_review(p_id uuid, p_age_warnings boolean) returns jsonb
language sql stable security invoker set search_path='' as $$
  select r.document||jsonb_build_object('version',r.version,'savedAt',r.saved_at,'results',
    case when p_age_warnings then r.results else private.strip_roster_age_warnings(r.results) end)
  from private.text_reviews r where r.id=p_id
$$;
create or replace function public.get_text_review(p_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$select public.get_text_review(p_id,false)$$;
revoke all on function public.get_text_review(uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.get_text_review(uuid,boolean) to authenticated;
