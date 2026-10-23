-- C1: relational context; no client table writes and no generic privileged API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;

create table public.championships (
  id uuid primary key,
  name text not null check (length(name) between 1 and 120 and name=btrim(name) and name !~ '[[:cntrl:]]'),
  version integer not null default 1 check (version > 0),
  saved_at timestamptz not null default clock_timestamp()
);
create table public.seasons (
  id uuid primary key,
  championship_id uuid not null references public.championships(id) on delete restrict,
  year integer not null check (year between 1 and 9999),
  unique(championship_id,year)
);
create table public.disputes (
  id uuid primary key,
  season_id uuid not null references public.seasons(id) on delete restrict,
  gender text not null check (gender in ('masculino','feminino')),
  category text not null check (length(category) between 1 and 80 and category=btrim(category) and category !~ '[[:cntrl:]]'),
  division text check (length(division) between 1 and 80 and division=btrim(division) and division !~ '[[:cntrl:]]')
);
create unique index dispute_context_unique on public.disputes(season_id,gender,lower(category),coalesce(lower(division),''));
create index championships_saved_order on public.championships(saved_at desc,id);
create table private.competition_commands (
  command_id uuid primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  payload jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);
alter table private.competition_commands enable row level security;
revoke all on private.competition_commands from public,anon,authenticated,service_role;
alter table public.championships enable row level security;
alter table public.seasons enable row level security;
alter table public.disputes enable row level security;
revoke all on public.championships,public.seasons,public.disputes from public,anon,authenticated,service_role;
grant select on public.championships,public.seasons,public.disputes to authenticated;
create policy admin_reads_championships on public.championships for select to authenticated
  using (exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy admin_reads_seasons on public.seasons for select to authenticated
  using (exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy admin_reads_disputes on public.disputes for select to authenticated
  using (exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));

create function public.get_competition(p_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('id',c.id,'name',c.name,'version',c.version,'savedAt',c.saved_at,
    'seasons',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'year',s.year,
      'disputes',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'gender',d.gender,
        'category',d.category,'division',d.division) order by d.gender,d.category,d.division nulls first,d.id)
        from public.disputes d where d.season_id=s.id),'[]'::jsonb)) order by s.year desc,s.id)
      from public.seasons s where s.championship_id=c.id),'[]'::jsonb))
  from public.championships c where c.id=p_id
$$;
create function public.list_competitions(p_query text default '',p_offset integer default 0) returns jsonb
language sql stable security invoker set search_path='' as $$
  with summaries as (
    select c.id,c.saved_at,c.name,
      jsonb_build_object('id',c.id,'name',c.name,'version',c.version,'savedAt',c.saved_at,
        'contexts',coalesce(x.contexts,'[]'::jsonb)) as item,
      c.name || ' ' || coalesce(x.words,'') as words
    from public.championships c left join lateral (
      select jsonb_agg(jsonb_build_object('year',s.year,'gender',d.gender,'category',d.category,'division',d.division)
        order by s.year desc,d.gender,d.category,d.division nulls first,d.id) as contexts,
        string_agg(s.year::text || ' ' || d.gender || ' ' || d.category || ' ' || coalesce(d.division,''),' ') as words
      from public.seasons s join public.disputes d on d.season_id=s.id where s.championship_id=c.id
    ) x on true
  ), filtered as (
    select * from summaries where position(lower(left(coalesce(p_query,''),120)) in lower(words)) > 0
    order by name,id limit 21 offset greatest(0,least(coalesce(p_offset,0),100000))
  )
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(item order by name,id) from (select * from filtered order by name,id limit 20) p),'[]'::jsonb),
    'hasMore',(select count(*)>20 from filtered),
    'recents',coalesce((select jsonb_agg(item order by saved_at desc,id) from (select * from summaries order by saved_at desc,id limit 10) r),'[]'::jsonb))
$$;

create function private.context_keys(value jsonb,keys text[]) returns boolean
language sql immutable security invoker set search_path='' as $$
  select case when jsonb_typeof(value)='object' then
    (select array_agg(k order by k) from jsonb_object_keys(value) k) = (select array_agg(k order by k) from unnest(keys) k)
  else false end
$$;

-- The only privileged write: explicit actor check before receipts/resources, no
-- dynamic SQL, fixed objects, no inherited API table writes. Not an exposed schema.
create function private.save_competition(p_command jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare
  actor uuid := auth.uid(); cmd uuid; root uuid; expected integer; current_version integer;
  c jsonb; s jsonb; d jsonb; receipt private.competition_commands%rowtype;
  season_ids uuid[] := '{}'; dispute_ids uuid[] := '{}'; all_ids uuid[] := '{}';
  sid uuid; did uuid; title text; cat text; div text; result jsonb;
begin
  perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
  if not found then raise sqlstate 'PT403' using message='forbidden'; end if;
  if not private.context_keys(p_command,array['commandId','expectedVersion','competition'])
    or octet_length(p_command::text)>262144 then raise sqlstate 'PT400' using message='invalid_context'; end if;
  c:=p_command->'competition';
  if not private.context_keys(c,array['id','name','seasons']) or jsonb_typeof(c->'name') is distinct from 'string'
    or jsonb_typeof(c->'seasons') is distinct from 'array' then raise sqlstate 'PT400' using message='invalid_context'; end if;
  cmd:=(p_command->>'commandId')::uuid; root:=(c->>'id')::uuid;
  if jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' or (p_command->>'expectedVersion') !~ '^[0-9]+$'
    then raise sqlstate 'PT400' using message='invalid_context'; end if;
  expected:=(p_command->>'expectedVersion')::integer;
  if cmd is null or root is null or expected<0 or expected>2147483646 or jsonb_array_length(c->'seasons') not between 1 and 32
    then raise sqlstate 'PT400' using message='invalid_context'; end if;
  perform pg_advisory_xact_lock(hashtextextended(cmd::text,0));
  select * into receipt from private.competition_commands where command_id=cmd;
  if found then
    if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden'; end if;
    if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict'; end if;
    return receipt.result;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('competition:' || root::text,0));
  select version into current_version from public.championships where id=root for update;
  if (found and current_version<>expected) or (not found and expected<>0)
    then raise sqlstate 'PT409' using message='version_conflict'; end if;
  title:=regexp_replace(btrim(c->>'name'),'[[:space:]]+',' ','g');
  all_ids:=array[root];
  -- Validate every child and its immutable parent before writing anything.
  for s in select value from jsonb_array_elements(c->'seasons') loop
    if not private.context_keys(s,array['id','year','disputes']) or jsonb_typeof(s->'disputes') is distinct from 'array'
      or jsonb_typeof(s->'year') is distinct from 'number' or (s->>'year') !~ '^[0-9]+$'
      then raise sqlstate 'PT400' using message='invalid_context'; end if;
    sid:=(s->>'id')::uuid;
    if sid is null or sid=any(all_ids) or (s->>'year')::integer not between 1 and 9999 or jsonb_array_length(s->'disputes') not between 1 and 64
      or exists(select 1 from public.seasons where id=sid and championship_id<>root)
      then raise sqlstate 'PT400' using message='invalid_context'; end if;
    all_ids:=array_append(all_ids,sid); season_ids:=array_append(season_ids,sid);
    for d in select value from jsonb_array_elements(s->'disputes') loop
      if not private.context_keys(d,array['id','gender','category','division'])
        or jsonb_typeof(d->'category') is distinct from 'string' or jsonb_typeof(d->'gender') is distinct from 'string'
        or jsonb_typeof(d->'division') not in ('string','null')
        then raise sqlstate 'PT400' using message='invalid_context'; end if;
      did:=(d->>'id')::uuid;
      if did is null or did=any(all_ids) or exists(select 1 from public.disputes where id=did and season_id<>sid)
        then raise sqlstate 'PT400' using message='invalid_context'; end if;
      all_ids:=array_append(all_ids,did); dispute_ids:=array_append(dispute_ids,did);
    end loop;
  end loop;
  if exists(select 1 from public.seasons where championship_id=root and not(id=any(season_ids)))
    or exists(select 1 from public.disputes d join public.seasons s on s.id=d.season_id where s.championship_id=root and not(d.id=any(dispute_ids)))
    then raise sqlstate 'PT400' using message='saved_context_omitted'; end if;
  if current_version is null then
    insert into public.championships(id,name) values(root,title);
    current_version:=1;
  else
    current_version:=current_version+1;
    update public.championships set name=title,version=current_version,saved_at=clock_timestamp() where id=root;
  end if;
  for s in select value from jsonb_array_elements(c->'seasons') loop
    sid:=(s->>'id')::uuid;
    insert into public.seasons(id,championship_id,year) values(sid,root,(s->>'year')::integer)
      on conflict(id) do update set year=excluded.year where public.seasons.championship_id=excluded.championship_id;
    if not found then raise sqlstate 'PT400' using message='invalid_context'; end if;
    for d in select value from jsonb_array_elements(s->'disputes') loop
      cat:=regexp_replace(btrim(d->>'category'),'[[:space:]]+',' ','g');
      div:=nullif(regexp_replace(btrim(d->>'division'),'[[:space:]]+',' ','g'),'');
      insert into public.disputes(id,season_id,gender,category,division)
        values((d->>'id')::uuid,sid,d->>'gender',cat,div)
        on conflict(id) do update set gender=excluded.gender,category=excluded.category,division=excluded.division
          where public.disputes.season_id=excluded.season_id;
      if not found then raise sqlstate 'PT400' using message='invalid_context'; end if;
    end loop;
  end loop;
  result:=jsonb_build_object('id',root,'version',current_version);
  insert into private.competition_commands(command_id,actor_id,payload,result) values(cmd,actor,p_command,result);
  return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then
  raise sqlstate 'PT400' using message='invalid_context';
end;
$$;
create function public.save_competition(p_command jsonb) returns jsonb
language sql volatile security invoker set search_path='' as $$
  select private.save_competition(p_command)
$$;
revoke all on function private.context_keys(jsonb,text[]),private.save_competition(jsonb),
  public.save_competition(jsonb),public.get_competition(uuid),public.list_competitions(text,integer)
  from public,anon,authenticated,service_role;
grant execute on function private.save_competition(jsonb),public.save_competition(jsonb),
  public.get_competition(uuid),public.list_competitions(text,integer) to authenticated;
