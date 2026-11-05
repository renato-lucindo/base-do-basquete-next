-- Stage metadata becomes public only on a confirmed game publication or an
-- explicit authenticated statistics-phase confirmation. No legacy data is
-- altered by installing this migration; run the reviewed backfill separately.
create table private.statistics_phase_commands (
 request_id uuid primary key,
 actor_id uuid not null,
 dispute_id uuid not null references public.disputes(id) on delete restrict,
 payload jsonb not null,
 result jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
alter table private.statistics_phase_commands enable row level security;
revoke all on private.statistics_phase_commands from public,anon,authenticated,service_role;
create policy never_direct_statistics_phase_commands on private.statistics_phase_commands
 as restrictive for all to public using(false) with check(false);
create trigger statistics_phase_commands_immutable before update or delete
 on private.statistics_phase_commands for each row execute function private.publication_history_immutable();

-- The result publication writer already holds competition -> game locks.
-- Capture the authoritative current game stage as part of THAT publication,
-- never in response to an administrative edit of public.games alone.
create or replace function private.refresh_confirmed_statistics(did uuid,changed_game uuid default null)
 returns void language plpgsql volatile security definer set search_path='' as $$
declare root uuid;v integer;minimum integer;now_at timestamptz;n integer;g public.published_games%rowtype;
begin
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if root is null then raise sqlstate 'PT404' using message='statistics_context_not_found';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 select p.version,h.minimum_seconds into v,minimum
 from public.published_statistics p join private.statistics_publication_versions h
 on h.dispute_id=p.dispute_id and h.version=p.version where p.dispute_id=did for update of p;
 if coalesce(v,0)=2147483647 then raise sqlstate 'PT409' using message='statistics_version_exhausted';end if;
 v:=coalesce(v,0)+1;minimum:=coalesce(minimum,600);now_at:=clock_timestamp();
 select count(*) into n from public.published_games where dispute_id=did;
 if n>10000 then raise sqlstate 'PT413' using message='statistics_source_too_large';end if;
 if changed_game is null then
  if exists(select 1 from public.published_games where dispute_id=did and octet_length(snapshot::text)>1048576)
  then raise sqlstate 'PT413' using message='statistics_game_too_large';end if;
  delete from public.published_statistics_games m where m.dispute_id=did and not exists(
   select 1 from public.published_games p where p.game_id=m.game_id and p.dispute_id=did);
  -- A whole-context refresh preserves phases ALREADY published. Only previously
  -- absent mapping rows acquire an initial stage; no implicit reclassification.
  insert into public.published_statistics_games(game_id,dispute_id,publication_version,phase)
   select p.game_id,p.dispute_id,p.version,coalesce(m.phase,x.stage_kind)
   from public.published_games p join public.games x on x.id=p.game_id
   left join public.published_statistics_games m on m.game_id=p.game_id and m.dispute_id=p.dispute_id
   where p.dispute_id=did
   on conflict(game_id,dispute_id) do update
   set publication_version=excluded.publication_version;
 else
  select * into g from public.published_games where game_id=changed_game and dispute_id=did;
  if found then
   if octet_length(g.snapshot::text)>1048576 then raise sqlstate 'PT413' using message='statistics_game_too_large';end if;
   insert into public.published_statistics_games(game_id,dispute_id,publication_version,phase)
    select g.game_id,did,g.version,x.stage_kind from public.games x where x.id=changed_game
    on conflict(game_id,dispute_id) do update
    set publication_version=excluded.publication_version,phase=excluded.phase;
  else
   delete from public.published_statistics_games where game_id=changed_game and dispute_id=did;
  end if;
 end if;
 insert into private.statistics_publication_versions(dispute_id,version,confirmed_at,minimum_seconds)
 values(did,v,now_at,minimum);
 if changed_game is null then
  insert into private.statistics_publication_changes(dispute_id,version,game_id,publication_version,phase)
   select did,v,game_id,publication_version,phase
   from public.published_statistics_games where dispute_id=did;
 else
  insert into private.statistics_publication_changes(dispute_id,version,game_id,publication_version,phase)
   values(did,v,changed_game,
    (select publication_version from public.published_statistics_games where game_id=changed_game and dispute_id=did),
    (select phase from public.published_statistics_games where game_id=changed_game and dispute_id=did));
 end if;
 insert into public.published_statistics(dispute_id,version,snapshot)
 values(did,v,jsonb_build_object('kind','confirmed-statistics-head-v1','disputeId',did,
   'version',v,'confirmedAt',now_at,'minimumSeconds',minimum,'gameCount',n))
 on conflict(dispute_id) do update set version=excluded.version,snapshot=excluded.snapshot;
end$$;

-- One command can confirm multiple games of ONE dispute in a single new
-- statistics version. Each game has a checked private version, public result
-- version and previously published phase (including explicit null).
-- Replaying the same request returns its receipt; repeated no-op confirmation
-- does not consume a statistics version.
create function private.confirm_game_stages(c jsonb) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;did uuid;root uuid;v integer;next_v integer;
 minimum integer;now_at timestamptz;reason text;item jsonb;gid uuid;gv integer;pv integer;
 current_gv integer;current_pv integer;old_phase text;stage text;seen uuid[]:='{}';
 changed uuid[]:='{}';rec record;receipt private.statistics_phase_commands%rowtype;
 result jsonb;
begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if c is null or octet_length(c::text)>32768 or not private.context_keys(c,
    array['requestId','disputeId','baseStatisticsVersion','reason','games'])
   or not private.regulation_uuid(c->'requestId') or not private.regulation_uuid(c->'disputeId')
   or not private.regulation_integer(c->'baseStatisticsVersion',1,2147483646)
   or jsonb_typeof(c->'reason') is distinct from 'string'
   or jsonb_typeof(c->'games') is distinct from 'array'
 then raise sqlstate 'PT400' using message='invalid_statistics_phase_confirmation';end if;
 if jsonb_array_length(c->'games') not between 1 and 100
 then raise sqlstate 'PT400' using message='invalid_statistics_phase_confirmation';end if;
 reason:=btrim(c->>'reason');
 if length(reason) not between 10 and 500 or reason~'[[:cntrl:]]'
 then raise sqlstate 'PT400' using message='review_reason_required';end if;
 cmd:=(c->>'requestId')::uuid;did:=(c->>'disputeId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('statistics-phase-command:'||cmd::text,0));
 select * into receipt from private.statistics_phase_commands where request_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>c then raise sqlstate 'PT409' using message='idempotency_conflict';end if;
  return receipt.result;
 end if;
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if root is null then raise sqlstate 'PT404' using message='statistics_context_not_found';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 select p.version,h.minimum_seconds into v,minimum
 from public.published_statistics p join private.statistics_publication_versions h
 on h.dispute_id=p.dispute_id and h.version=p.version
 where p.dispute_id=did for update of p;
 if v is null or v<>(c->>'baseStatisticsVersion')::integer
 then raise sqlstate 'PT409' using message='statistics_version_conflict';end if;
 -- The root lock serializes all normal game writers before their per-game locks.
 -- Stable UUID ordering also preserves the lock hierarchy for batch commands.
 for item in select value from jsonb_array_elements(c->'games') order by value->>'gameId' loop
  if not private.context_keys(item,array['gameId','gameVersion','publicationVersion','previousPhase'])
    or not private.regulation_uuid(item->'gameId')
    or not private.regulation_integer(item->'gameVersion',1,2147483647)
    or not private.regulation_integer(item->'publicationVersion',1,2147483647)
    or (jsonb_typeof(item->'previousPhase') is distinct from 'null' and
        (jsonb_typeof(item->'previousPhase') is distinct from 'string'
         or item->>'previousPhase' not in ('round_robin','knockout')))
  then raise sqlstate 'PT400' using message='invalid_statistics_phase_confirmation';end if;
  gid:=(item->>'gameId')::uuid;gv:=(item->>'gameVersion')::integer;
  pv:=(item->>'publicationVersion')::integer;
  if gid=any(seen) then raise sqlstate 'PT400' using message='duplicate_statistics_phase_game';end if;
  seen:=array_append(seen,gid);
  perform pg_advisory_xact_lock(hashtextextended('game:'||gid::text,0));
  select g.version,p.version,m.phase,g.stage_kind into current_gv,current_pv,old_phase,stage
  from public.games g join public.published_games p on p.game_id=g.id and p.dispute_id=g.dispute_id
  join public.published_statistics_games m on m.game_id=g.id and m.dispute_id=g.dispute_id
  and m.publication_version=p.version
  where g.id=gid and g.dispute_id=did for update of g,p,m;
  if not found or current_gv<>gv or current_pv<>pv
    or old_phase is distinct from (item->>'previousPhase')
  then raise sqlstate 'PT409' using message='statistics_phase_source_conflict';end if;
  if old_phase is distinct from stage then changed:=array_append(changed,gid);end if;
 end loop;
 next_v:=v;
 if cardinality(changed)>0 then
  if v=2147483647 then raise sqlstate 'PT409' using message='statistics_version_exhausted';end if;
  next_v:=v+1;now_at:=clock_timestamp();
  insert into private.statistics_publication_versions(dispute_id,version,confirmed_at,minimum_seconds)
   values(did,next_v,now_at,minimum);
  for rec in select g.id,g.stage_kind from public.games g
   where g.id=any(changed) order by g.id loop
   update public.published_statistics_games set phase=rec.stage_kind
    where game_id=rec.id and dispute_id=did;
   insert into private.statistics_publication_changes(dispute_id,version,game_id,publication_version,phase)
    select did,next_v,m.game_id,m.publication_version,m.phase
    from public.published_statistics_games m where m.game_id=rec.id and m.dispute_id=did;
  end loop;
  update public.published_statistics
   set version=next_v,snapshot=jsonb_set(
    jsonb_set(snapshot,'{version}',to_jsonb(next_v)),
    '{confirmedAt}',to_jsonb(now_at))
   where dispute_id=did and version=v;
  if not found then raise sqlstate 'PT409' using message='statistics_version_conflict';end if;
  -- Rebuild only impacted players AFTER the head and phase mapping agree.
  -- If any normalization/constraint fails, the whole command rolls back.
  foreach gid in array changed loop perform private.refresh_player_game(gid);end loop;
 end if;
 result:=jsonb_build_object('requestId',cmd,'disputeId',did,'version',next_v,
  'changedGameCount',cardinality(changed),'changedGameIds',to_jsonb(changed));
 insert into private.statistics_phase_commands(request_id,actor_id,dispute_id,payload,result)
 values(cmd,actor,did,c,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or
 not_null_violation or check_violation or unique_violation or foreign_key_violation
 then raise sqlstate 'PT400' using message='invalid_statistics_phase_confirmation';
end$$;

-- Only an authenticated administrator can invoke the public RPC, whose private
-- implementation checks current admin_access. Neither data nor receipts are
-- directly accessible to anon/authenticated/service_role.
create function public.confirm_game_stages(p_command jsonb) returns jsonb
 language sql volatile security invoker set search_path='' as $$
 select private.confirm_game_stages(p_command)
$$;
revoke all on function private.confirm_game_stages(jsonb),public.confirm_game_stages(jsonb)
 from public,anon,authenticated,service_role;
grant execute on function private.confirm_game_stages(jsonb),public.confirm_game_stages(jsonb) to authenticated;
