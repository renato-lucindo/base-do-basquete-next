-- Lifecycle, identity locks and administrative audit. The private state keeps
-- existing competition snapshots and narrow writer signatures compatible.
create table private.dispute_administration (
  dispute_id uuid primary key references public.disputes(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  status text not null default 'planned'
    check (status in ('planned','in_progress','completed','cancelled')),
  previous_status text check (previous_status in ('planned','in_progress')),
  visibility text not null default 'private' check (visibility in ('private','public','legacy')),
  was_public boolean not null default false,
  is_test boolean not null default false,
  lock_reason text,
  check (not is_test or (visibility='private' and not was_public)),
  check ((previous_status is not null) = (status in ('completed','cancelled')))
);
create table private.competition_administration_audit (
  id bigint generated always as identity primary key,
  championship_id uuid not null references public.championships(id),
  dispute_id uuid references public.disputes(id),
  actor_id uuid references auth.users(id),
  changed_at timestamptz not null default clock_timestamp(),
  action text not null,
  reason text,
  before_value jsonb not null,
  after_value jsonb not null
);
create index competition_administration_audit_context
  on private.competition_administration_audit(championship_id,dispute_id,id desc);
create table private.competition_administration_commands (
  command_id uuid primary key,
  actor_id uuid not null references auth.users(id),
  payload jsonb not null,
  result jsonb not null
);
alter table private.dispute_administration enable row level security;
alter table private.competition_administration_audit enable row level security;
alter table private.competition_administration_commands enable row level security;
revoke all on private.dispute_administration,private.competition_administration_audit,
  private.competition_administration_commands from public,anon,authenticated,service_role;
create trigger competition_administration_audit_immutable before update or delete
  on private.competition_administration_audit for each row
  execute function private.publication_history_immutable();

-- Some administrative decisions resolve a fixture without giving a result.
create function private.dispute_game_decision(gid uuid) returns text
language sql stable security invoker set search_path='' as $$
  select case when v.effect->>'kind'='administrative'
    then v.effect#>>'{decision,kind}' else v.effect->>'kind' end
  from private.game_occurrence_records r
  join private.game_occurrence_heads h on h.id=r.id
  join private.game_occurrence_versions v on v.id=h.id and v.version=h.version
  where r.game_id=gid
$$;

insert into private.dispute_administration(dispute_id,status,visibility,was_public,lock_reason)
select d.id,
  case when evidence.result then 'in_progress' else 'planned' end,
  case when evidence.public then 'legacy' else 'private' end,
  evidence.public,
  case
    when exists(select 1 from public.registrations r where r.dispute_id=d.id)
      or exists(select 1 from private.registration_removals r where r.dispute_id=d.id)
      then 'registration'
    when exists(select 1 from public.games g where g.dispute_id=d.id) then 'game'
    when exists(select 1 from private.text_reviews r where r.dispute_id=d.id)
      or exists(select 1 from public.pdf_sources p where p.dispute_id=d.id)
      or exists(select 1 from public.pdf_reviews p where p.dispute_id=d.id) then 'import'
    when exists(select 1 from private.regulation_heads r where r.dispute_id=d.id)
      or exists(select 1 from private.regulation_drafts r where r.dispute_id=d.id)
      or exists(select 1 from private.competition_setups s where s.dispute_id=d.id)
      or exists(select 1 from private.public_standings_heads h where h.dispute_id=d.id) then 'regulation'
    when exists(select 1 from private.achievement_draft_heads a where a.dispute_id=d.id)
      or exists(select 1 from public.published_achievements a where a.dispute_id=d.id) then 'achievement'
  end
from public.disputes d
cross join lateral (select
  (exists(select 1 from public.published_games p where p.dispute_id=d.id)
   or exists(select 1 from public.games g where g.dispute_id=d.id
     and private.dispute_game_decision(g.id) in ('wo','award'))) as result,
  (exists(select 1 from public.published_games p where p.dispute_id=d.id and private.game_is_public(p.game_id))
   or exists(select 1 from public.published_achievements p where p.dispute_id=d.id and not private.dispute_has_game_drafts(d.id))
   or exists(select 1 from private.public_standings_heads p where p.dispute_id=d.id)
   or exists(select 1 from private.competition_setups s where s.dispute_id=d.id)) as public
) evidence;

create function private.initialize_dispute_administration() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into private.dispute_administration(dispute_id) values(new.id);
  return new;
end
$$;
create trigger initialize_dispute_administration after insert on public.disputes
  for each row execute function private.initialize_dispute_administration();

create function private.guard_dispute_identity() returns trigger
language plpgsql security definer set search_path='' as $$
declare locked text;
begin
  if (new.gender,new.category,new.division) is not distinct from (old.gender,old.category,old.division)
    then return new; end if;
  select a.lock_reason into locked from private.dispute_administration a where a.dispute_id=old.id;
  if locked is not null then
    raise sqlstate 'PT409' using message='dispute_identity_locked',detail=locked;
  end if;
  return new;
end
$$;
-- Sort after category normalization and before the earlier gender-only checks.
create trigger protect_dispute_identity before update of gender,category,division on public.disputes
  for each row execute function private.guard_dispute_identity();
drop trigger dispute_roster_context on public.disputes;
drop trigger sheet_dispute_gender on public.disputes;
drop trigger pdf_review_gender on public.disputes;

create function private.guard_season_year() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.year is distinct from old.year and exists (
    select 1 from public.disputes d join private.dispute_administration a on a.dispute_id=d.id
    where d.season_id=old.id and a.lock_reason is not null
  ) then raise sqlstate 'PT409' using message='season_year_locked'; end if;
  return new;
end
$$;
create trigger protect_season_year before update of year on public.seasons
  for each row execute function private.guard_season_year();

create function private.lock_dispute_root(did uuid) returns uuid
language plpgsql volatile security invoker set search_path='' as $$
declare root uuid;
begin
  select s.championship_id into root
  from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
  if root is null then raise sqlstate 'PT404' using message='dispute_not_found'; end if;
  perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
  return root;
end
$$;

-- TG_ARGV identifies the contextual ID on each table; foreign keys and the
-- existing writers still validate the resource and any reassignment.
create function private.guard_dispute_operation() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  before_id uuid;
  after_id uuid;
  did uuid;
  record_id uuid;
  roots uuid[];
  root uuid;
begin
  if tg_op<>'INSERT' then before_id:=(to_jsonb(old)->>tg_argv[0])::uuid; end if;
  if tg_op<>'DELETE' then after_id:=(to_jsonb(new)->>tg_argv[0])::uuid; end if;
  if tg_argv[0]='game_id' then
    select dispute_id into before_id from public.games where id=before_id;
    select dispute_id into after_id from public.games where id=after_id;
  elsif tg_argv[0]='occurrence_id' then
    record_id:=coalesce(after_id,before_id);
    select dispute_id into after_id from private.game_occurrence_records where id=record_id;
    before_id:=null;
  elsif tg_argv[0]='withdrawal_id' then
    record_id:=coalesce(after_id,before_id);
    select dispute_id into after_id from private.registration_withdrawal_records where id=record_id;
    before_id:=null;
  end if;
  select array_agg(distinct s.championship_id order by s.championship_id) into roots
  from public.disputes d join public.seasons s on s.id=d.season_id
  where d.id in (before_id,after_id);
  foreach root in array coalesce(roots,'{}'::uuid[]) loop
    perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
  end loop;
  if exists(select from private.dispute_administration a
    where a.dispute_id in (before_id,after_id) and a.status in ('completed','cancelled'))
    then raise sqlstate 'PT409' using message='dispute_closed'; end if;
  if tg_nargs>1 and after_id is not null then
    update private.dispute_administration
    set lock_reason=tg_argv[1] where dispute_id=after_id and lock_reason is null;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end
$$;

create trigger dispute_operation before insert or update or delete on public.registrations
  for each row execute function private.guard_dispute_operation('dispute_id','registration');
create trigger dispute_operation before insert or update or delete on public.games
  for each row execute function private.guard_dispute_operation('dispute_id','game');
create trigger dispute_operation before insert or update or delete on private.text_reviews
  for each row execute function private.guard_dispute_operation('dispute_id','import');
create trigger dispute_operation before insert or update or delete on public.pdf_sources
  for each row execute function private.guard_dispute_operation('dispute_id','import');
create trigger dispute_operation before insert or update or delete on public.pdf_reviews
  for each row execute function private.guard_dispute_operation('dispute_id','import');
create trigger dispute_operation before insert or update or delete on private.regulation_heads
  for each row execute function private.guard_dispute_operation('dispute_id','regulation');
create trigger dispute_operation before insert or update or delete on private.regulation_drafts
  for each row execute function private.guard_dispute_operation('dispute_id','regulation');
create trigger dispute_operation before insert or update or delete on private.competition_setups
  for each row execute function private.guard_dispute_operation('dispute_id','regulation');
create trigger dispute_operation before insert or update or delete on private.public_standings_heads
  for each row execute function private.guard_dispute_operation('dispute_id','regulation');
create trigger dispute_operation before insert or update or delete on private.achievement_draft_heads
  for each row execute function private.guard_dispute_operation('dispute_id','achievement');
create trigger dispute_operation before insert or update or delete on public.published_achievements
  for each row execute function private.guard_dispute_operation('dispute_id','achievement');
create trigger dispute_operation before insert or update or delete on public.roster_entries
  for each row execute function private.guard_dispute_operation('dispute_id');
create trigger dispute_operation before insert or update or delete on public.staff_entries
  for each row execute function private.guard_dispute_operation('dispute_id');
create trigger dispute_operation before insert or update or delete on public.game_sheets
  for each row execute function private.guard_dispute_operation('game_id');
create trigger dispute_operation before insert or update or delete on private.pdf_publication_preparations
  for each row execute function private.guard_dispute_operation('game_id');
create trigger dispute_operation before insert or update or delete on public.published_games
  for each row execute function private.guard_dispute_operation('dispute_id');
create trigger dispute_operation before insert or update or delete on private.game_visibility_heads
  for each row execute function private.guard_dispute_operation('game_id');
create trigger dispute_operation before insert or update or delete on private.game_occurrence_versions
  for each row execute function private.guard_dispute_operation('dispute_id');
create trigger dispute_operation before insert or update or delete on private.registration_withdrawal_versions
  for each row execute function private.guard_dispute_operation('dispute_id');
create trigger dispute_operation before insert or update or delete on private.statistics_phase_commands
  for each row execute function private.guard_dispute_operation('dispute_id');

create function private.start_dispute_on_result() returns trigger
language plpgsql security definer set search_path='' as $$
declare did uuid;root uuid;
begin
  did:=new.dispute_id;
  if tg_table_name='game_occurrence_versions' then
    if not coalesce(new.effect->>'kind'='wo' or new.effect#>>'{decision,kind}'='award',false)
      then return new; end if;
  end if;
  root:=private.lock_dispute_root(did);
  update private.dispute_administration set status='in_progress',version=version+1
    where dispute_id=did and status='planned';
  if found then
    insert into private.competition_administration_audit(
      championship_id,dispute_id,actor_id,action,before_value,after_value
    ) values(root,did,auth.uid(),'first_result','"planned"','"in_progress"');
  end if;
  return new;
end
$$;
create trigger first_dispute_result after insert or update on public.published_games
  for each row execute function private.start_dispute_on_result();
create trigger first_dispute_award after insert on private.game_occurrence_versions
  for each row execute function private.start_dispute_on_result();

create function private.dispute_administration_json(a private.dispute_administration) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('disputeId',a.dispute_id,'version',a.version,
    'status',a.status,'visibility',case when a.visibility='legacy' then 'public' else a.visibility end,
    'isTest',a.is_test,'wasPublic',a.was_public,'lockReason',a.lock_reason)
$$;

create function private.require_competition_admin() returns uuid
language plpgsql volatile security invoker set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  perform 1 from public.admin_access where user_id=actor and enabled for share;
  if not found then raise sqlstate 'PT403' using message='forbidden'; end if;
  return actor;
end
$$;
create function public.get_dispute_administration(p_competition_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists (select from public.admin_access where user_id=auth.uid() and enabled)
    then raise sqlstate 'PT403' using message='forbidden'; end if;
  return coalesce((select jsonb_agg(private.dispute_administration_json(a) order by a.dispute_id)
    from private.dispute_administration a join public.disputes d on d.id=a.dispute_id
    join public.seasons s on s.id=d.season_id where s.championship_id=p_competition_id),'[]');
end
$$;

create function private.administration_replay(cmd uuid,actor uuid,c jsonb) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare receipt private.competition_administration_commands%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(cmd::text,0));
  select * into receipt from private.competition_administration_commands where command_id=cmd;
  if not found then return null; end if;
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden'; end if;
  if receipt.payload<>c then raise sqlstate 'PT409' using message='idempotency_conflict'; end if;
  return receipt.result;
end
$$;

create function private.dispute_pending_games(did uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'number',g.game_number,
    'home',h.name,'away',a.name) order by g.game_number nulls last,g.id),'[]')
  from public.games g
  join public.registrations h on h.id=g.home_registration_id
  join public.registrations a on a.id=g.away_registration_id
  where g.dispute_id=did
    and not exists (select from public.published_games p where p.game_id=g.id)
    and coalesce(private.dispute_game_decision(g.id),'') not in ('cancelled','wo','award','exclude')
$$;

create function public.save_dispute_administration(p_command jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare
  actor uuid:=private.require_competition_admin();
  c jsonb:=p_command;
  cmd uuid;did uuid;root uuid;result jsonb;before_value jsonb;
  target text; action text; reason text; pending jsonb;
  a private.dispute_administration%rowtype;
begin
  action:=c->>'action';
  target:=c->>'visibility';
  reason:=nullif(btrim(c->>'reason'),'');
  if not private.context_keys(c,array['commandId','disputeId','expectedVersion','action','visibility','reason'])
    or not private.regulation_uuid(c->'commandId') or not private.regulation_uuid(c->'disputeId')
    or not private.regulation_integer(c->'expectedVersion',1,2147483646)
    or action is null or action not in ('complete','cancel','reopen','set_visibility')
    or jsonb_typeof(c->'reason') not in ('null','string') or coalesce(length(reason),0)>2000
    or (action in ('cancel','reopen') and coalesce(length(reason),0)<3)
    or (action='set_visibility' and coalesce(target,'') not in ('public','private'))
    or (action<>'set_visibility' and target is not null)
    then raise sqlstate 'PT400' using message='invalid_administration'; end if;
  cmd:=(c->>'commandId')::uuid; did:=(c->>'disputeId')::uuid;
  result:=private.administration_replay(cmd,actor,c);
  if result is not null then return result; end if;
  root:=private.lock_dispute_root(did);
  select * into a from private.dispute_administration where dispute_id=did for update;
  if a.version<>(c->>'expectedVersion')::integer then
    raise sqlstate 'PT409' using message='version_conflict';
  end if;
  before_value:=private.dispute_administration_json(a);
  if action='set_visibility' then
    if a.is_test and target='public' then raise sqlstate 'PT409' using message='test_dispute_private'; end if;
    a.visibility:=target;
    a.was_public:=a.was_public or target='public';
  elsif action='reopen' and a.status in ('completed','cancelled') then
    a.status:=a.previous_status;
    a.previous_status:=null;
  elsif action='cancel' and a.status in ('planned','in_progress') then
    a.previous_status:=a.status;
    a.status:='cancelled';
  elsif action='complete' and a.status='in_progress' then
    pending:=private.dispute_pending_games(did);
    if pending<>'[]' then
      raise sqlstate 'PT409' using message='dispute_pending_games',detail=pending::text;
    end if;
    a.previous_status:=a.status;
    a.status:='completed';
  else
    raise sqlstate 'PT409' using message='invalid_dispute_transition';
  end if;
  update private.dispute_administration set
    version=version+1,status=a.status,previous_status=a.previous_status,
    visibility=a.visibility,was_public=a.was_public
  where dispute_id=did returning * into a;
  result:=private.dispute_administration_json(a);
  insert into private.competition_administration_audit(
    championship_id,dispute_id,actor_id,action,reason,before_value,after_value
  ) values(root,did,actor,action,reason,before_value,result);
  insert into private.competition_administration_commands values(cmd,actor,c,result);
  return result;
end
$$;

create function private.audit_championship_name() returns trigger
language plpgsql security definer set search_path='' as $$
declare reason text:=nullif(current_setting('bdb.competition_rename_reason',true),'');
begin
  if new.name is not distinct from old.name then return new; end if;
  if coalesce(length(reason),0)<3 and exists(
    select from public.seasons s join public.disputes d on d.season_id=s.id
    join private.dispute_administration a on a.dispute_id=d.id
    where s.championship_id=old.id and a.was_public
  ) then raise sqlstate 'PT409' using message='championship_rename_reason_required'; end if;
  insert into private.competition_administration_audit(
    championship_id,actor_id,action,reason,before_value,after_value
  ) values(old.id,auth.uid(),'rename',reason,to_jsonb(old.name),to_jsonb(new.name));
  return new;
end
$$;
create trigger audit_championship_name before update of name on public.championships
  for each row execute function private.audit_championship_name();

-- New command metadata wraps the unchanged, strictly validated legacy aggregate.
create function public.save_competition_administration(p_command jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare
  actor uuid:=private.require_competition_admin();
  c jsonb:=p_command;
  cmd uuid; root uuid; did uuid; ids uuid[]; result jsonb;
  reason text:=nullif(btrim(c->>'renameReason'),'');
  old_reason text:=current_setting('bdb.competition_rename_reason',true);
begin
  if not private.context_keys(c,array['commandId','competition','expectedVersion','testDisputeIds','renameReason'])
    or not private.regulation_uuid(c->'commandId')
    or jsonb_typeof(c->'renameReason') not in ('null','string')
    or coalesce(length(reason),0)>2000
    or jsonb_typeof(c->'testDisputeIds') is distinct from 'array'
    then raise sqlstate 'PT400' using message='invalid_administration'; end if;
  if jsonb_array_length(c->'testDisputeIds')>2048 or exists(
    select from jsonb_array_elements(c->'testDisputeIds') x where not private.regulation_uuid(x)
  ) then raise sqlstate 'PT400' using message='invalid_administration'; end if;
  cmd:=(c->>'commandId')::uuid;
  root:=(c#>>'{competition,id}')::uuid;
  result:=private.administration_replay(cmd,actor,c);
  if result is not null then return result; end if;
  if root is null then raise sqlstate 'PT400' using message='invalid_administration'; end if;
  if exists(select from private.competition_commands where command_id=cmd)
    then raise sqlstate 'PT409' using message='idempotency_conflict'; end if;
  perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
  select coalesce(array_agg(distinct value::uuid),'{}') into ids
  from jsonb_array_elements_text(c->'testDisputeIds');
  if exists(select from public.disputes where id=any(ids))
    then raise sqlstate 'PT409' using message='test_dispute_creation_only'; end if;
  perform set_config('bdb.competition_rename_reason',coalesce(reason,''),true);
  result:=private.save_competition(c-array['testDisputeIds','renameReason']);
  perform set_config('bdb.competition_rename_reason',coalesce(old_reason,''),true);
  if exists(select from unnest(ids) x(id) where not exists (
    select from public.disputes d join public.seasons s on s.id=d.season_id
    where d.id=x.id and s.championship_id=root
  )) then raise sqlstate 'PT400' using message='invalid_administration'; end if;
  update private.dispute_administration set is_test=true where dispute_id=any(ids);
  foreach did in array ids loop
    insert into private.competition_administration_audit(
      championship_id,dispute_id,actor_id,action,before_value,after_value
    ) values(root,did,actor,'create_test','null','true');
  end loop;
  insert into private.competition_administration_commands values(cmd,actor,c,result);
  return result;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise sqlstate 'PT400' using message='invalid_administration';
end
$$;

revoke all on function private.dispute_game_decision(uuid),
  private.initialize_dispute_administration(),private.guard_dispute_identity(),
  private.guard_season_year(),private.lock_dispute_root(uuid),private.guard_dispute_operation(),
  private.start_dispute_on_result(),private.dispute_administration_json(private.dispute_administration),
  private.require_competition_admin(),private.administration_replay(uuid,uuid,jsonb),
  private.dispute_pending_games(uuid),private.audit_championship_name(),
  public.get_dispute_administration(uuid),public.save_dispute_administration(jsonb),
  public.save_competition_administration(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.get_dispute_administration(uuid),public.save_dispute_administration(jsonb),
  public.save_competition_administration(jsonb) to authenticated;

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
 if exists(select from private.dispute_administration where dispute_id=did and is_test) then raise sqlstate 'PT409' using message='test_global_read_only';end if;
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
create or replace function private.prepare_text_target(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
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
   if exists(select from private.dispute_administration where dispute_id=old.dispute_id and is_test) then raise sqlstate 'PT409' using message='test_global_read_only';end if;
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
create or replace function private.save_game_visibility(c jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;gid uuid;g public.games%rowtype;
 h private.game_visibility_heads%rowtype;old private.game_visibility_commands%rowtype;
 pv integer;new_version integer;now_at timestamptz;result jsonb;target text;reason text;
begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(c,array['commandId','gameId','expectedVersion','expectedGameVersion','expectedPublicationVersion','visibility','reason'])
 or not private.regulation_uuid(c->'commandId') or not private.regulation_uuid(c->'gameId')
 or not private.regulation_integer(c->'expectedVersion',0,2147483646)
 or not private.regulation_integer(c->'expectedGameVersion',1,2147483647)
 or not private.regulation_integer(c->'expectedPublicationVersion',0,2147483647)
 or c->>'visibility' not in ('draft','published')
 or jsonb_typeof(c->'reason') is distinct from 'string'
 or length(btrim(c->>'reason')) not between 3 and 2000
 then raise sqlstate 'PT400' using message='invalid_visibility_command';end if;
 cmd:=(c->>'commandId')::uuid;gid:=(c->>'gameId')::uuid;
 target:=c->>'visibility';reason:=btrim(c->>'reason');
 perform pg_advisory_xact_lock(hashtextextended('game-visibility-command:'||cmd::text,0));
 select * into old from private.game_visibility_commands where command_id=cmd;
 if found then
  if old.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if old.payload<>c then raise sqlstate 'PT409' using message='idempotency_conflict';end if;
  return old.result;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('game-visibility:'||gid::text,0));
 -- Take the championship lock before locking the fixture row, as result writers do.
 perform private.lock_dispute_root((select dispute_id from public.games where id=gid));
 select * into g from public.games where id=gid for update;
 if not found then raise sqlstate 'PT404' using message='game_not_found';end if;
 select * into h from private.game_visibility_heads where game_id=gid for update;
 select coalesce(p.version,0) into pv from public.published_games p where p.game_id=gid;
 if coalesce(h.version,0)<>(c->>'expectedVersion')::integer or
    g.version<>(c->>'expectedGameVersion')::integer or
    coalesce(pv,0)<>(c->>'expectedPublicationVersion')::integer
 then raise sqlstate 'PT409' using message='version_conflict';end if;
 if coalesce(h.visibility,'published')=target then
  raise sqlstate 'PT409' using message='visibility_unchanged';end if;
 new_version:=coalesce(h.version,0)+1;now_at:=clock_timestamp();
 insert into private.game_visibility_heads(game_id,version,visibility,reason,actor_id,saved_at)
 values(gid,new_version,target,reason,actor,now_at)
 on conflict(game_id) do update set version=excluded.version,visibility=excluded.visibility,
  reason=excluded.reason,actor_id=excluded.actor_id,saved_at=excluded.saved_at;
 insert into private.game_visibility_versions(game_id,version,visibility,reason,actor_id,saved_at)
 values(gid,new_version,target,reason,actor,now_at);
 result:=jsonb_build_object('commandId',cmd,'gameId',gid,'version',new_version,
  'visibility',target,'savedAt',now_at);
 insert into private.game_visibility_commands(command_id,actor_id,payload,result) values(cmd,actor,c,result);
 return result;
end$$;
