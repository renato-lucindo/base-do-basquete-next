-- Game publication visibility is independent of the saved result and sporting status.
-- This migration is intentionally not applied without specific authorization.
-- Backwards compatible: no row means published; existing result and sheet snapshots are never deleted.
create table private.game_visibility_heads (
 game_id uuid primary key references public.games(id) on delete restrict,
 version integer not null check(version>=1),
 visibility text not null check(visibility in ('draft','published')),
 reason text not null check(length(btrim(reason)) between 3 and 2000),
 actor_id uuid not null,
 saved_at timestamptz not null
);
create table private.game_visibility_versions (
 game_id uuid not null references public.games(id) on delete restrict,
 version integer not null check(version>=1),
 visibility text not null check(visibility in ('draft','published')),
 reason text not null check(length(btrim(reason)) between 3 and 2000),
 actor_id uuid not null,
 saved_at timestamptz not null,
 primary key(game_id,version)
);
create table private.game_visibility_commands (
 command_id uuid primary key,
 actor_id uuid not null,
 payload jsonb not null,
 result jsonb not null
);
alter table private.game_visibility_heads enable row level security;
alter table private.game_visibility_versions enable row level security;
alter table private.game_visibility_commands enable row level security;
revoke all on private.game_visibility_heads,private.game_visibility_versions,private.game_visibility_commands from public,anon,authenticated,service_role;
create policy never_direct_game_visibility on private.game_visibility_heads as restrictive for all to public using(false) with check(false);
create policy never_direct_game_visibility_versions on private.game_visibility_versions as restrictive for all to public using(false) with check(false);
create policy never_direct_game_visibility_commands on private.game_visibility_commands as restrictive for all to public using(false) with check(false);

-- Minimal anonymous predicate, no access to the private audit or control table.
create function private.game_is_public(gid uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from private.game_visibility_heads h where h.game_id=gid and h.visibility='draft')
$$;
create function private.dispute_has_game_drafts(did uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.game_visibility_heads h join public.games g on g.id=h.game_id
  where g.dispute_id=did and h.visibility='draft')
$$;

-- Prevent direct REST access to already-published source facts while a game is private.
alter policy read_only_published_games on public.published_games using (private.game_is_public(game_id));
alter policy read_confirmed_player_games on public.published_player_games using (private.game_is_public(game_id));
alter policy read_confirmed_statistics_games on public.published_statistics_games using (private.game_is_public(game_id));
-- Achievements are aggregate historical snapshots. Fail closed for disputes with drafts
-- rather than expose potentially stale game-derived achievements.
alter policy read_confirmed_achievements on public.published_achievements
 using (not private.dispute_has_game_drafts(dispute_id));

create function private.get_game_visibility(gid uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare g public.games%rowtype;h private.game_visibility_heads%rowtype;pv integer;
begin
 if not exists(select 1 from public.admin_access where user_id=auth.uid() and enabled)
 then raise sqlstate 'PT403' using message='forbidden';end if;
 select * into g from public.games where id=gid;
 if not found then raise sqlstate 'PT404' using message='game_not_found';end if;
 select * into h from private.game_visibility_heads where game_id=gid;
 select coalesce(p.version,0) into pv from public.published_games p where p.game_id=gid;
 return jsonb_build_object('gameId',gid,'disputeId',g.dispute_id,
  'version',coalesce(h.version,0),'visibility',coalesce(h.visibility,'published'),
  'reason',h.reason,'savedAt',h.saved_at,'gameVersion',g.version,
  'publicationVersion',coalesce(pv,0));
end$$;

create function private.save_game_visibility(c jsonb) returns jsonb
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

create function public.get_game_visibility(p_game_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select private.get_game_visibility(p_game_id)
$$;
create function public.save_game_visibility(p_command jsonb) returns jsonb
language sql volatile security invoker set search_path='' as $$
 select private.save_game_visibility(p_command)
$$;

-- The flexible public source is reconstructed without draft games or their
-- competitive facts. This also avoids assigning an early knockout result to a group.
create or replace function private.get_live_competition_source(did uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d jsonb;legacy jsonb;legacy_saved timestamptz;legacy_reg integer;ctx jsonb;rids uuid[];gids uuid[];saved timestamptz;rev integer;regs jsonb;games jsonb;context_public jsonb;begin
 select document,saved_at,version into d,saved,rev from private.competition_setups where dispute_id=did;
 select v.snapshot->'definition',(v.snapshot->>'publishedAt')::timestamptz,(v.snapshot->>'regulationVersion')::int into legacy,legacy_saved,legacy_reg from private.public_standings_heads h join private.public_standings_versions v on v.dispute_id=h.dispute_id and v.version=h.version where h.dispute_id=did;
 if d is null and legacy is null and not exists(select 1 from public.published_games where dispute_id=did) then return null;end if;
 if d is not null then d:=d-'tieNotes';if d->'customDefinition'<>'null'::jsonb then d:=jsonb_set(d,'{customDefinition}',(d->'customDefinition')-array['tieNotes','customReason']);end if;end if;
 legacy:=legacy-array['tieNotes','customReason'];
 if d->>'mode'='custom' then legacy:=d->'customDefinition';end if;
 if d is not null then select coalesce(array_agg(id),'{}') into rids from public.registrations where dispute_id=did;
 else select coalesce(array_agg(distinct rid),'{}') into rids from(
  select value::uuid rid from jsonb_array_elements_text(coalesce(legacy->'registrationIds','[]'))
  union select g.home_registration_id from public.games g join public.published_games p on p.game_id=g.id where g.dispute_id=did and private.game_is_public(g.id)
  union select g.away_registration_id from public.games g join public.published_games p on p.game_id=g.id where g.dispute_id=did and private.game_is_public(g.id)
 ) q;end if;
 select coalesce(array_agg(g.id),'{}') into gids from public.games g where g.dispute_id=did and private.game_is_public(g.id) and g.home_registration_id=any(rids) and g.away_registration_id=any(rids) and (d is not null or exists(select 1 from public.published_games p where p.game_id=g.id) or exists(select 1 from private.public_standings_heads h join private.public_standings_versions v on v.dispute_id=h.dispute_id and v.version=h.version cross join lateral jsonb_array_elements(v.snapshot->'games') game where h.dispute_id=did and game.value->>'id'=g.id::text));
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'team',jsonb_build_object('id',t.id,'name',t.name,'abbreviation',t.abbreviation)) order by r.id),'[]') into regs from public.registrations r join public.teams t on t.id=r.team_id where r.id=any(rids) and r.dispute_id=did;
 select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'disputeId',did,'version',g.version,'homeRegistrationId',g.home_registration_id,'awayRegistrationId',g.away_registration_id,'date',g.scheduled_date,'time',to_char(g.scheduled_time,'HH24:MI'),'venue',g.venue,'number',g.game_number,'stageKind',g.stage_kind,'round',g.round_number,'knockoutStage',g.knockout_stage,'timeZone','America/Sao_Paulo') order by g.id),'[]') into games from public.games g where g.id=any(gids);
 select jsonb_build_object('championshipId',c.id,'name',c.name,'seasonId',s.id,'year',s.year,'gender',di.gender,'category',di.category,'division',di.division) into context_public from public.disputes di join public.seasons s on s.id=di.season_id join public.championships c on c.id=s.championship_id where di.id=did;
 if context_public is null then return null;end if;
 ctx:=private.regulation_context(did);
 return jsonb_build_object('disputeId',did,'configuration',d,'legacyDefinition',legacy,'publicationVersion',least(2147483647,greatest(1,coalesce(rev,0)+(select coalesce(sum(version::bigint),0) from public.published_games where game_id=any(gids)))),'regulationVersion',greatest(1,coalesce(rev,legacy_reg,0)),'publishedAt',greatest(saved,legacy_saved,(select max(published_at) from public.published_games where game_id=any(gids))),'context',context_public,'registrations',regs,'games',games,
 'publishedGames',coalesce((select jsonb_agg(x.value order by x.value->>'gameId') from jsonb_array_elements(ctx->'publishedGames') x where (x.value->>'gameId')::uuid=any(gids)),'[]'),
 'occurrences',coalesce((select jsonb_agg(x.value-'reason') from jsonb_array_elements(ctx->'occurrences') x where (x.value->>'gameId')::uuid=any(gids)),'[]'),
 'withdrawals',coalesce((select jsonb_agg(jsonb_set(x.value-'reason','{previousGameIds}',coalesce((select jsonb_agg(a.value) from jsonb_array_elements(x.value->'previousGameIds') a where (a.value#>>'{}')::uuid=any(gids)),'[]'))) from jsonb_array_elements(ctx->'withdrawals') x where (x.value->>'registrationId')::uuid=any(rids)),'[]'));
end$$;

-- The legacy confirmed bracket cannot safely be recomputed from a modified
-- snapshot. Hide it for the affected dispute rather than leak a draft result.
create or replace function public.get_public_standings(p_dispute_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select case when private.dispute_has_game_drafts(p_dispute_id) then null
  else private.get_public_standings(p_dispute_id) end
$$;

-- Statistics pages and individual games are filtered by RLS. Recompute the
-- public game count instead of retaining a stale confirmed snapshot count.
create or replace function public.get_public_statistics_head(p_dispute_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select (h.snapshot-'gameCount') || jsonb_build_object('gameCount',
  (select count(*) from public.published_statistics_games m
   join public.published_games g on g.game_id=m.game_id and g.version=m.publication_version
   where m.dispute_id=p_dispute_id))
 from public.published_statistics h where h.dispute_id=p_dispute_id
$$;

create or replace function public.get_public_statistics_source(p_dispute_id uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare h public.published_statistics%rowtype;body jsonb;games jsonb;bytes bigint;n integer;begin
 select * into h from public.published_statistics where dispute_id=p_dispute_id;
 if not found then return null;end if;
 body:=(h.snapshot-'gameCount')||jsonb_build_object('kind','confirmed-statistics-v1','games','[]'::jsonb);
 select count(*),coalesce(sum(octet_length(jsonb_build_object('phase',m.phase,'snapshot',p.snapshot)::text)),0) into n,bytes
 from public.published_statistics_games m join public.published_games p on p.game_id=m.game_id and p.dispute_id=m.dispute_id and p.version=m.publication_version where m.dispute_id=p_dispute_id;
 if bytes+2*greatest(n-1,0)+octet_length(body::text)>4194304 then raise sqlstate 'PT413' using message='statistics_source_too_large';end if;
 select coalesce(jsonb_agg(jsonb_build_object('phase',m.phase,'snapshot',p.snapshot) order by m.game_id),'[]'::jsonb) into games
 from public.published_statistics_games m join public.published_games p on p.game_id=m.game_id and p.dispute_id=m.dispute_id and p.version=m.publication_version where m.dispute_id=p_dispute_id;
 return jsonb_set(body,'{games}',games);
end$$;

revoke all on function private.game_is_public(uuid),private.dispute_has_game_drafts(uuid),
private.get_game_visibility(uuid),private.save_game_visibility(jsonb),
public.get_game_visibility(uuid),public.save_game_visibility(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.game_is_public(uuid),private.dispute_has_game_drafts(uuid) to anon,authenticated;
grant execute on function private.get_game_visibility(uuid),private.save_game_visibility(jsonb),
 public.get_game_visibility(uuid),public.save_game_visibility(jsonb) to authenticated;
