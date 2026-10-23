-- C2: stable global identity, independent contextual registration and narrow writers.
create table public.teams (
 id uuid primary key, name text not null check(length(name) between 1 and 120 and name=btrim(name)),
 abbreviation text check(abbreviation is null or length(abbreviation) between 1 and 12),
 version integer not null default 1 check(version>0), saved_at timestamptz not null default clock_timestamp()
);
create table public.registrations (
 id uuid primary key, dispute_id uuid not null references public.disputes(id),
 team_id uuid not null references public.teams(id),
 name text not null check(length(name) between 1 and 120 and name=btrim(name)),
 version integer not null default 1 check(version>0), saved_at timestamptz not null default clock_timestamp()
);
create index registrations_dispute_id on public.registrations(dispute_id,lower(name),id);
create index registrations_team_id on public.registrations(team_id);
create index teams_name on public.teams(lower(name),id);
create table private.team_commands (
 command_id uuid primary key, actor_id uuid not null references auth.users(id), operation text not null,
 payload jsonb not null, result jsonb not null, created_at timestamptz not null default clock_timestamp()
);
alter table private.team_commands enable row level security;
revoke all on private.team_commands from public,anon,authenticated,service_role;
create policy deny_team_receipts on private.team_commands as restrictive for all to public using(false) with check(false);
alter table public.teams enable row level security;
alter table public.registrations enable row level security;
revoke all on public.teams,public.registrations from public,anon,authenticated,service_role;
grant select on public.teams,public.registrations to authenticated;
create policy admin_reads_teams on public.teams for select to authenticated
 using(exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy admin_reads_registrations on public.registrations for select to authenticated
 using(exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));

create function public.get_team(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',t.id,'name',t.name,'abbreviation',t.abbreviation,'version',t.version,'savedAt',t.saved_at)
 from public.teams t where t.id=p_id
$$;
create function public.get_registration(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',r.id,'disputeId',r.dispute_id,'teamId',r.team_id,'name',r.name,
 'version',r.version,'savedAt',r.saved_at,'team',public.get_team(r.team_id)) from public.registrations r where r.id=p_id
$$;
create function public.list_teams(p_query text default '',p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with matches as (select t.id,lower(t.name) as sort from public.teams t
 where length(p_query)<=120 and p_offset between 0 and 100000
 and strpos(lower(t.name || ' ' || coalesce(t.abbreviation,'')),lower(p_query))>0),
 page as (select * from matches order by sort,id limit 20 offset greatest(0,least(p_offset,100000)))
 select jsonb_build_object('items',coalesce((select jsonb_agg(public.get_team(id) order by sort,id) from page),'[]'::jsonb),
 'hasMore',(select count(*)>p_offset+20 from matches))
$$;
create function public.list_registrations(p_dispute_id uuid,p_query text default '',p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with matches as (select r.id,lower(r.name) as sort from public.registrations r join public.teams t on t.id=r.team_id
 where r.dispute_id=p_dispute_id and length(p_query)<=120 and p_offset between 0 and 100000
 and strpos(lower(r.name || ' ' || t.name || ' ' || coalesce(t.abbreviation,'')),lower(p_query))>0),
 page as (select * from matches order by sort,id limit 20 offset greatest(0,least(p_offset,100000)))
 select jsonb_build_object('items',coalesce((select jsonb_agg(public.get_registration(id) order by sort,id) from page),'[]'::jsonb),
 'hasMore',(select count(*)>p_offset+20 from matches))
$$;

create function private.save_team(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); cmd uuid; tid uuid; expected integer; previous integer; t jsonb;
 receipt private.team_commands%rowtype; title text; abbr text; result jsonb; root uuid;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden'; end if;
 if not private.context_keys(p_command,array['commandId','expectedVersion','team']) or octet_length(p_command::text)>8192
 then raise sqlstate 'PT400' using message='invalid_team'; end if;
 t:=p_command->'team';
 if not private.context_keys(t,array['id','name','abbreviation']) or jsonb_typeof(t->'name') is distinct from 'string'
 or jsonb_typeof(t->'abbreviation') not in ('string','null')
 or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' or (p_command->>'expectedVersion') !~ '^[0-9]+$'
 then raise sqlstate 'PT400' using message='invalid_team'; end if;
 cmd:=(p_command->>'commandId')::uuid; tid:=(t->>'id')::uuid; expected:=(p_command->>'expectedVersion')::integer;
 if cmd is null or tid is null or expected not between 0 and 2147483646 then raise sqlstate 'PT400' using message='invalid_team'; end if;
 perform pg_advisory_xact_lock(hashtextextended('teams-command:'||cmd::text,0));
 select * into receipt from private.team_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden'; end if;
  if receipt.operation<>'team' or receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict'; end if;
  return receipt.result;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('team:'||tid::text,0));
 select version into previous from public.teams where id=tid for update;
 if (found and previous<>expected) or (not found and expected<>0) then raise sqlstate 'PT409' using message='version_conflict'; end if;
 title:=regexp_replace(btrim(t->>'name'),'[[:space:]]+',' ','g');
 abbr:=nullif(regexp_replace(btrim(t->>'abbreviation'),'[[:space:]]+',' ','g'),'');
 if previous is null then insert into public.teams(id,name,abbreviation) values(tid,title,abbr); previous:=1;
 else previous:=previous+1; update public.teams set name=title,abbreviation=abbr,version=previous,saved_at=clock_timestamp() where id=tid; end if;
 -- Stable order plus the C1 lock namespace avoid contradictory Recentes writes.
 for root in select distinct s.championship_id from public.registrations r join public.disputes d on d.id=r.dispute_id
 join public.seasons s on s.id=d.season_id where r.team_id=tid order by s.championship_id loop
  perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
  update public.championships set saved_at=clock_timestamp() where id=root;
 end loop;
 result:=jsonb_build_object('id',tid,'version',previous);
 insert into private.team_commands(command_id,actor_id,operation,payload,result) values(cmd,actor,'team',p_command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then
 raise sqlstate 'PT400' using message='invalid_team';
end
$$;
create function private.save_registration(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); cmd uuid; rid uuid; tid uuid; did uuid; root uuid; expected integer; previous integer;
 r jsonb; receipt private.team_commands%rowtype; title text; result jsonb; old_team uuid; old_dispute uuid;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden'; end if;
 if not private.context_keys(p_command,array['commandId','expectedVersion','registration']) or octet_length(p_command::text)>8192
 then raise sqlstate 'PT400' using message='invalid_registration'; end if;
 r:=p_command->'registration';
 if not private.context_keys(r,array['id','disputeId','teamId','name']) or jsonb_typeof(r->'name') is distinct from 'string'
 or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' or (p_command->>'expectedVersion') !~ '^[0-9]+$'
 then raise sqlstate 'PT400' using message='invalid_registration'; end if;
 cmd:=(p_command->>'commandId')::uuid; rid:=(r->>'id')::uuid; tid:=(r->>'teamId')::uuid; did:=(r->>'disputeId')::uuid;
 expected:=(p_command->>'expectedVersion')::integer;
 if cmd is null or rid is null or tid is null or did is null or expected not between 0 and 2147483646 then raise sqlstate 'PT400' using message='invalid_registration'; end if;
 perform pg_advisory_xact_lock(hashtextextended('teams-command:'||cmd::text,0));
 select * into receipt from private.team_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden'; end if;
  if receipt.operation<>'registration' or receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict'; end if;
  return receipt.result;
 end if;
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if root is null or not exists(select 1 from public.teams where id=tid) then raise sqlstate 'PT400' using message='invalid_registration'; end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 perform pg_advisory_xact_lock(hashtextextended('registration:'||rid::text,0));
 select version,team_id,dispute_id into previous,old_team,old_dispute from public.registrations where id=rid for update;
 if (found and previous<>expected) or (not found and expected<>0) then raise sqlstate 'PT409' using message='version_conflict'; end if;
 if previous is not null and (old_team<>tid or old_dispute<>did) then raise sqlstate 'PT400' using message='immutable_parent'; end if;
 title:=regexp_replace(btrim(r->>'name'),'[[:space:]]+',' ','g');
 if previous is null then insert into public.registrations(id,dispute_id,team_id,name) values(rid,did,tid,title); previous:=1;
 else previous:=previous+1; update public.registrations set name=title,version=previous,saved_at=clock_timestamp() where id=rid; end if;
 update public.championships set saved_at=clock_timestamp() where id=root;
 result:=jsonb_build_object('id',rid,'version',previous);
 insert into private.team_commands(command_id,actor_id,operation,payload,result) values(cmd,actor,'registration',p_command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then
 raise sqlstate 'PT400' using message='invalid_registration';
end
$$;
create function public.save_team(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_team(p_command)$$;
create function public.save_registration(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_registration(p_command)$$;
revoke all on function private.save_team(jsonb),private.save_registration(jsonb),public.save_team(jsonb),public.save_registration(jsonb),
 public.get_team(uuid),public.get_registration(uuid),public.list_teams(text,integer),public.list_registrations(uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function private.save_team(jsonb),private.save_registration(jsonb),public.save_team(jsonb),public.save_registration(jsonb),
 public.get_team(uuid),public.get_registration(uuid),public.list_teams(text,integer),public.list_registrations(uuid,text,integer) to authenticated;
