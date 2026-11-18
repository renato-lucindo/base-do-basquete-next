-- Private registry and a single organizer shared by all seasons of a championship.
create table private.competition_organizers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120 and name !~ '[[:cntrl:]]'),
  abbreviation text check (length(abbreviation) between 1 and 24 and abbreviation !~ '[[:cntrl:]]'),
  kind text not null check (kind in (
    'federation','confederation','international','independent','public_authority','student','system'
  )),
  check ((kind='system') = (lower(name)='admin'))
);
create unique index competition_organizer_name
  on private.competition_organizers(lower(regexp_replace(btrim(name),'[[:space:]]+',' ','g')));
alter table private.competition_organizers enable row level security;
revoke all on private.competition_organizers from public,anon,authenticated,service_role;

insert into private.competition_organizers(name,abbreviation,kind)
values ('Admin',null,'system'),('Federação Capixaba de Basquetebol','FECABA','federation');

alter table public.championships add column organizer_id uuid
  references private.competition_organizers(id) on delete restrict;
create index championships_organizer_idx on public.championships(organizer_id);

create function private.organizer_json(o private.competition_organizers) returns jsonb
language sql immutable strict security invoker set search_path='' as $$
  select jsonb_build_object('id',o.id,'name',o.name,'abbreviation',o.abbreviation,'kind',o.kind)
$$;

create function private.guard_championship_organizer() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    if exists (select from public.championships where id=new.id and organizer_id is null)
      then raise sqlstate 'PT409' using message='championship_organizer_required'; end if;
  elsif new.organizer_id is distinct from old.organizer_id and old.organizer_id is not null then
    if new.organizer_id is null or exists (
      select from private.competition_organizers where id=old.organizer_id and kind='system'
    ) or exists (
      select from public.seasons s join public.disputes d on d.season_id=s.id
      join private.dispute_administration a on a.dispute_id=d.id
      where s.championship_id=old.id and a.was_public
    ) then raise sqlstate 'PT409' using message='championship_organizer_locked'; end if;
  end if;
  return null;
end
$$;

-- The existing aggregate writer inserts the root before the administrative fields.
create constraint trigger require_championship_organizer
  after insert on public.championships deferrable initially deferred
  for each row execute function private.guard_championship_organizer();
create trigger guard_championship_organizer
  after update of organizer_id on public.championships
  for each row execute function private.guard_championship_organizer();

create function private.guard_test_championship() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists (
    select from public.seasons s join public.championships c on c.id=s.championship_id
    join private.competition_organizers o on o.id=c.organizer_id and o.kind='system'
    where s.id=new.season_id and not exists (
      select from private.dispute_administration a where a.dispute_id=new.id and a.is_test
    )
  ) then raise sqlstate 'PT409' using message='championship_test_only'; end if;
  return null;
end
$$;
create constraint trigger guard_test_championship after insert on public.disputes
  deferrable initially deferred for each row execute function private.guard_test_championship();

create function private.resolve_competition_organizer(selection jsonb) returns uuid
language plpgsql volatile security invoker set search_path='' as $$
declare
  organizer_id uuid;
  name_value text;
  abbreviation_value text;
  kind_value text;
begin
  case selection->>'mode'
    when 'existing' then
      if not private.context_keys(selection,array['mode','id'])
        or not private.regulation_uuid(selection->'id')
        then raise sqlstate 'PT409' using message='championship_organizer_invalid'; end if;
      select id into organizer_id from private.competition_organizers
        where id=(selection->>'id')::uuid and kind<>'system';
    when 'test' then
      if not private.context_keys(selection,array['mode'])
        then raise sqlstate 'PT409' using message='championship_organizer_invalid'; end if;
      select id into organizer_id from private.competition_organizers where kind='system';
    when 'create' then
      if not private.context_keys(selection,array['mode','name','abbreviation','kind'])
        or jsonb_typeof(selection->'name') is distinct from 'string'
        or jsonb_typeof(selection->'abbreviation') not in ('null','string')
        or coalesce(selection->>'kind','') not in (
          'federation','confederation','international','independent','public_authority','student'
        ) then raise sqlstate 'PT409' using message='championship_organizer_invalid'; end if;
      name_value:=btrim(regexp_replace(selection->>'name','[[:space:]]+',' ','g'));
      abbreviation_value:=nullif(btrim(regexp_replace(selection->>'abbreviation','[[:space:]]+',' ','g')),'');
      kind_value:=selection->>'kind';
      if length(name_value) not between 1 and 120 or lower(name_value)='admin'
        or name_value~'[[:cntrl:]]' or length(abbreviation_value)>24 or abbreviation_value~'[[:cntrl:]]'
        then raise sqlstate 'PT409' using message='championship_organizer_invalid'; end if;
      insert into private.competition_organizers(name,abbreviation,kind)
        values(name_value,abbreviation_value,kind_value)
        on conflict do nothing returning id into organizer_id;
      if organizer_id is null then raise sqlstate 'PT409' using message='championship_organizer_duplicate'; end if;
    else raise sqlstate 'PT409' using message='championship_organizer_invalid';
  end case;
  if organizer_id is null then raise sqlstate 'PT409' using message='championship_organizer_invalid'; end if;
  return organizer_id;
end
$$;

create function private.set_championship_organizer(
  root uuid, actor uuid, selection jsonb, creating boolean
) returns void language plpgsql volatile security invoker set search_path='' as $$
declare
  previous_id uuid;
  next_id uuid;
begin
  select organizer_id into previous_id from public.championships where id=root;
  if selection is not null then
    if selection->>'mode'='test' and not creating
      then raise sqlstate 'PT409' using message='championship_organizer_invalid'; end if;
    next_id:=private.resolve_competition_organizer(selection);
    if next_id is distinct from previous_id then
      update public.championships set organizer_id=next_id where id=root;
      insert into private.competition_administration_audit(
        championship_id,actor_id,action,before_value,after_value
      ) values(root,actor,'set_organizer',coalesce(to_jsonb(previous_id),'null'),to_jsonb(next_id));
    end if;
  elsif creating then
    raise sqlstate 'PT409' using message='championship_organizer_required';
  end if;

  if exists (
    select from public.championships c
    join private.competition_organizers o on o.id=c.organizer_id and o.kind='system'
    join public.seasons s on s.championship_id=c.id
    join public.disputes d on d.season_id=s.id
    join private.dispute_administration a on a.dispute_id=d.id
    where c.id=root and not a.is_test
  ) then raise sqlstate 'PT409' using message='championship_test_only'; end if;
end
$$;

create function private.list_competition_organizers(p_query text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  result jsonb;
begin
  if not exists(select from public.admin_access where user_id=auth.uid() and enabled)
    then raise sqlstate 'PT403' using message='forbidden'; end if;
  if p_query is null or length(p_query)>120
    then raise sqlstate 'PT400' using message='invalid_input'; end if;
  select coalesce(jsonb_agg(private.organizer_json(candidate) order by lower(candidate.name),candidate.id),'[]')
  into result
  from (
    select o.* from private.competition_organizers o
    where o.kind<>'system'
      and (position(lower(btrim(p_query)) in lower(o.name))>0
        or position(lower(btrim(p_query)) in lower(coalesce(o.abbreviation,'')))>0)
    order by lower(o.name),o.id limit 25
  ) candidate;
  return result;
end
$$;
create function public.list_competition_organizers(p_query text) returns jsonb
language sql stable security invoker set search_path='' as $$
  select private.list_competition_organizers(p_query)
$$;

create function private.get_competition_with_organizer(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  result jsonb;
begin
  if not exists(select from public.admin_access where user_id=auth.uid() and enabled)
    then raise sqlstate 'PT403' using message='forbidden'; end if;
  select public.get_competition(p_id) || jsonb_build_object(
    'organizer',case when o.id is not null then private.organizer_json(o) end,
    'organizerLocked',coalesce(o.kind='system' or exists(
      select from public.seasons s join public.disputes d on d.season_id=s.id
      join private.dispute_administration a on a.dispute_id=d.id
      where s.championship_id=c.id and a.was_public
    ),false) and o.id is not null
  ) into result
  from public.championships c left join private.competition_organizers o on o.id=c.organizer_id
  where c.id=p_id;
  if result is null then raise sqlstate 'PT404' using message='context_not_found'; end if;
  return result;
end
$$;
create function public.get_competition_with_organizer(p_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  select private.get_competition_with_organizer(p_id)
$$;

revoke all on function private.organizer_json(private.competition_organizers),
  private.guard_championship_organizer(),private.guard_test_championship(),
  private.resolve_competition_organizer(jsonb),private.set_championship_organizer(uuid,uuid,jsonb,boolean),
  private.list_competition_organizers(text),public.list_competition_organizers(text),
  private.get_competition_with_organizer(uuid),public.get_competition_with_organizer(uuid)
from public,anon,authenticated,service_role;
grant execute on function private.list_competition_organizers(text),public.list_competition_organizers(text),
  private.get_competition_with_organizer(uuid),public.get_competition_with_organizer(uuid) to authenticated;

-- Confirm the source records in the target before applying. Exact names must
-- identify one championship each. Empty databases and ambiguous names are skipped.
with confirmed as (
  select (array_agg(id))[1] id from public.championships
  where name in ('Copa ES','Circuito Capixaba de Basquete')
  group by name having count(*)=1
), assigned as (
  update public.championships c set organizer_id=o.id
  from confirmed src cross join private.competition_organizers o
  where c.id=src.id and c.organizer_id is null and o.abbreviation='FECABA'
  returning c.id,c.organizer_id
)
insert into private.competition_administration_audit(
  championship_id,action,reason,before_value,after_value
)
select id,'set_organizer','Vínculo inicial confirmado','null',to_jsonb(organizer_id) from assigned;

create trigger record_championship_organizer_activity after update of organizer_id on public.championships
for each row when(old.organizer_id is distinct from new.organizer_id)
execute function private.record_dispute_activity('championship','id');


create or replace function public.save_competition_administration(p_command jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare
  actor uuid:=private.require_competition_admin();
  c jsonb:=p_command;
  cmd uuid; root uuid; creating boolean; did uuid; ids uuid[]; result jsonb;
  reason text:=nullif(btrim(c->>'renameReason'),'');
  old_reason text:=current_setting('bdb.competition_rename_reason',true);
begin
  if not private.context_keys(c-'organizer',array['commandId','competition','expectedVersion','testDisputeIds','renameReason'])
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
  creating:=not exists(select from public.championships where id=root);
  select coalesce(array_agg(distinct value::uuid),'{}') into ids
  from jsonb_array_elements_text(c->'testDisputeIds');
  if exists(select from public.disputes where id=any(ids))
    then raise sqlstate 'PT409' using message='test_dispute_creation_only'; end if;
  perform set_config('bdb.competition_rename_reason',coalesce(reason,''),true);
  result:=private.save_competition(c-array['testDisputeIds','renameReason','organizer']);
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
  perform private.set_championship_organizer(root,actor,c->'organizer',creating);
  insert into private.competition_administration_commands values(cmd,actor,c,result);
  return result;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise sqlstate 'PT400' using message='invalid_administration';
end
$$;


create function private.list_admin_dispute_catalog_with_organizer(p_query jsonb, include_organizer boolean) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  q jsonb:=p_query;
  result jsonb;
  championship_ids uuid[];
begin
  if not exists(select from public.admin_access where user_id=auth.uid() and enabled)
    then raise sqlstate 'PT403' using message='forbidden'; end if;
  if not private.context_keys(q,array['q','year','championshipIds','gender','status','visibility','sort','direction','offset'])
    or jsonb_typeof(q->'q') is distinct from 'string' or length(q->>'q')>120
    or (q->'year'<>'null'::jsonb and not private.regulation_integer(q->'year',1,9999))
    or jsonb_typeof(q->'championshipIds') is distinct from 'array'
    or (q->'gender'<>'null'::jsonb and coalesce(q->>'gender','') not in ('masculino','feminino'))
    or (q->'status'<>'null'::jsonb and coalesce(q->>'status','') not in ('planned','in_progress','completed','cancelled'))
    or (q->'visibility'<>'null'::jsonb and coalesce(q->>'visibility','') not in ('public','private','test'))
    or coalesce(q->>'sort','') <> all(array['activity','championship','year','category','gender','division','status','visibility']
      || case when include_organizer then array['organizer'] else array[]::text[] end)
    or coalesce(q->>'direction','') not in ('asc','desc')
    or not private.regulation_integer(q->'offset',0,100000)
    then raise sqlstate 'PT400' using message='invalid_dispute_query'; end if;
  if exists (select from jsonb_array_elements(q->'championshipIds') item
    where not private.regulation_uuid(item))
    then raise sqlstate 'PT400' using message='invalid_dispute_query'; end if;
  select array(select value::uuid from jsonb_array_elements_text(q->'championshipIds')) into championship_ids;
  with matches as materialized (
    select d.id,s.id season_id,c.id championship_id,c.name,s.year,d.gender,d.category,d.division,
      activity.touched_at,case when o.id is not null then private.organizer_json(o) end organizer,private.dispute_administration_json(a) administration,
      case q->>'sort'
        when 'championship' then lower(c.name)
        when 'organizer' then lower(coalesce(o.abbreviation,o.name,'Não definido'))
        when 'year' then lpad(s.year::text,4,'0')
        when 'category' then case d.category_kind
          when 'base' then '0'||lpad(d.category_age::text,2,'0')
          when 'adult' then '1'
          when 'master' then '2'||lpad(d.category_age::text,2,'0')
          else '3'||lower(d.category) end
        when 'gender' then d.gender
        when 'division' then lower(coalesce(d.division,''))
        when 'status' then case a.status when 'planned' then 'Planejada' when 'in_progress' then 'Em andamento' when 'completed' then 'Concluída' else 'Cancelada' end
        when 'visibility' then case when a.is_test then 'Teste' when a.visibility in ('public','legacy') then 'Pública' else 'Privada' end
      end sort_key
    from public.disputes d join public.seasons s on s.id=d.season_id
    join public.championships c on c.id=s.championship_id
    left join private.competition_organizers o on o.id=c.organizer_id
    join private.dispute_administration a on a.dispute_id=d.id
    left join private.dispute_activity activity on activity.dispute_id=d.id
    where position(lower(q->>'q') in lower(concat_ws(' ',c.name,s.year,d.gender,d.category,d.division)))>0
      and (q->>'year' is null or s.year=(q->>'year')::int)
      and (cardinality(championship_ids)=0 or c.id=any(championship_ids))
      and (q->>'gender' is null or d.gender=q->>'gender')
      and (q->>'status' is null or a.status=q->>'status')
      and (q->>'visibility' is null or case q->>'visibility'
        when 'test' then a.is_test
        when 'public' then not a.is_test and a.visibility in ('public','legacy')
        else not a.is_test and a.visibility='private' end)
  ), ordered as (
    select *,row_number() over(order by
      case when q->>'sort'='activity' and q->>'direction'='asc' then touched_at end asc nulls last,
      case when q->>'sort'='activity' and q->>'direction'='desc' then touched_at end desc nulls last,
      case when q->>'direction'='asc' then sort_key end asc,
      case when q->>'direction'='desc' then sort_key end desc,
      lower(name),year desc,gender,lower(category),lower(coalesce(division,'')),id) ordinal
    from matches
  ), page as (
    select * from ordered order by ordinal limit 25 offset (q->>'offset')::int
  )
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object(
    'competitionId',championship_id,'seasonId',season_id,'name',name,'year',year,
    'gender',gender,'category',category,'division',division,'lastActivityAt',touched_at,'administration',administration)
    || case when include_organizer then jsonb_build_object('organizer',organizer) else '{}'::jsonb end
    order by ordinal) from page),'[]'),
    'total',(select count(*) from matches),
    'hasMore',(select count(*)>(q->>'offset')::int+25 from matches),
    'championships',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name)
      order by lower(c.name),c.id) from public.championships c),'[]'),
    'years',coalesce((select jsonb_agg(year order by year desc) from(select distinct year from public.seasons) years),'[]'))
    into result;
  return result;
end
$$;
create or replace function public.list_admin_dispute_activity_catalog(p_query jsonb) returns jsonb
language sql stable security invoker set search_path='' as $$
  select private.list_admin_dispute_catalog_with_organizer(p_query,false)
$$;
create function public.list_admin_disputes_with_organizers(p_query jsonb) returns jsonb
language sql stable security invoker set search_path='' as $$
  select private.list_admin_dispute_catalog_with_organizer(p_query,true)
$$;
revoke all on function private.list_admin_dispute_catalog_with_organizer(jsonb,boolean),
  public.list_admin_disputes_with_organizers(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.list_admin_dispute_catalog_with_organizer(jsonb,boolean),
  public.list_admin_disputes_with_organizers(jsonb) to authenticated;
