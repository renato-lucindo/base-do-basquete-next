-- ADR 013: explicit public scope, independent of private heads. Not applied to hosted databases by CI.
create table private.public_standings_versions (
 dispute_id uuid not null references public.disputes(id) on delete restrict,
 version integer not null check(version>0), snapshot jsonb not null,
 actor_id uuid not null references auth.users(id) on delete restrict,
 primary key(dispute_id,version),
 check(octet_length(snapshot::text)<=16777216)
);
create table private.public_standings_heads (
 dispute_id uuid primary key, version integer not null,
 foreign key(dispute_id,version) references private.public_standings_versions(dispute_id,version) on delete restrict
);
create table private.public_standings_commands (
 command_id uuid primary key, actor_id uuid not null references auth.users(id) on delete restrict,
 payload jsonb not null, result jsonb not null
);
create index public_standings_versions_actor on private.public_standings_versions(actor_id);
create index public_standings_commands_actor on private.public_standings_commands(actor_id);
alter table private.public_standings_versions enable row level security;
alter table private.public_standings_heads enable row level security;
alter table private.public_standings_commands enable row level security;
revoke all on private.public_standings_versions,private.public_standings_heads,private.public_standings_commands from public,anon,authenticated,service_role;
create policy never_direct_public_standings_versions on private.public_standings_versions as restrictive for all to public using(false) with check(false);
create policy never_direct_public_standings_heads on private.public_standings_heads as restrictive for all to public using(false) with check(false);
create policy never_direct_public_standings_commands on private.public_standings_commands as restrictive for all to public using(false) with check(false);
create trigger public_standings_versions_immutable before update or delete on private.public_standings_versions for each row execute function private.regulation_history_immutable();

-- Caller holds the championship lock. Never grant this helper to API roles.
create function private.public_standings_candidate(did uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare d jsonb;rv integer;ctx jsonb;context_public jsonb;regs jsonb;games_public jsonb;gids uuid[];rids uuid[];effects jsonb;withdrawals_public jsonb;
begin
 select v.definition,v.version into d,rv from private.regulation_heads h join private.regulation_versions v on v.dispute_id=h.dispute_id and v.version=h.version where h.dispute_id=did;
 if d is null then raise sqlstate 'PT409' using message='regulation_required';end if;
 select jsonb_build_object('championshipId',c.id,'name',c.name,'seasonId',s.id,'year',s.year,'gender',di.gender,'category',di.category,'division',di.division) into context_public
 from public.disputes di join public.seasons s on s.id=di.season_id join public.championships c on c.id=s.championship_id where di.id=did;
 select coalesce(array_agg(value::uuid),'{}') into rids from jsonb_array_elements_text(d->'registrationIds');
 select coalesce(array_agg(id::uuid),'{}') into gids from (
  select a.value#>>'{}' id from jsonb_array_elements(d->'groupPhases') p cross join lateral jsonb_array_elements(p.value->'groups') g cross join lateral jsonb_array_elements(g.value->'gameIds') a
  union all select a.value->>'gameId' from jsonb_array_elements(d->'series') n cross join lateral jsonb_array_elements(n.value->'games') a
 ) q;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'team',jsonb_build_object('id',t.id,'name',t.name,'abbreviation',t.abbreviation)) order by r.id),'[]') into regs from public.registrations r join public.teams t on t.id=r.team_id where r.id=any(rids) and r.dispute_id=did;
 select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'disputeId',g.dispute_id,'version',g.version,'homeRegistrationId',g.home_registration_id,'awayRegistrationId',g.away_registration_id,'date',g.scheduled_date,'time',to_char(g.scheduled_time,'HH24:MI'),'venue',g.venue,'number',g.game_number,'timeZone','America/Sao_Paulo') order by g.id),'[]') into games_public from public.games g where g.id=any(gids) and g.dispute_id=did and g.home_registration_id=any(rids) and g.away_registration_id=any(rids);
 if jsonb_array_length(regs)<>cardinality(rids) or jsonb_array_length(games_public)<>cardinality(gids) then raise sqlstate 'PT409' using message='public_scope_conflict';end if;
 ctx:=private.regulation_context(did);
 select coalesce(jsonb_agg(x.value-'reason' order by x.value->>'id'),'[]') into effects from jsonb_array_elements(ctx->'occurrences') x where (x.value->>'gameId')::uuid=any(gids);
 select coalesce(jsonb_agg(jsonb_set(x.value-'reason','{previousGameIds}',coalesce((select jsonb_agg(a.value order by a.value) from jsonb_array_elements(x.value->'previousGameIds') a where (a.value#>>'{}')::uuid=any(gids)),'[]')) order by x.value->>'id'),'[]') into withdrawals_public from jsonb_array_elements(ctx->'withdrawals') x where (x.value->>'registrationId')::uuid=any(rids);
 return jsonb_build_object('schemaVersion','public-standings-source-v1','disputeId',did,'publicationVersion',coalesce((select version from private.public_standings_heads where dispute_id=did),0)+1,'regulationVersion',rv,'publishedAt','2000-01-01T00:00:00Z','context',context_public,'definition',d,'registrations',regs,'games',games_public,'publishedGames',coalesce((select jsonb_agg(x.value order by x.value->>'gameId') from jsonb_array_elements(ctx->'publishedGames') x where (x.value->>'gameId')::uuid=any(gids)),'[]'),'occurrences',effects,'withdrawals',withdrawals_public);
end$$;

create function private.preview_public_standings(did uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare root uuid;s jsonb;begin
 perform 1 from public.admin_access where user_id=auth.uid() and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 select se.championship_id into root from public.disputes di join public.seasons se on se.id=di.season_id where di.id=did;
 if root is null then raise sqlstate 'PT404' using message='context_not_found';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('competition:'||root::text,0));
 s:=private.public_standings_candidate(did);
 return jsonb_build_object('fingerprint',encode(sha256(convert_to(s::text,'UTF8')),'hex'),'source',s);
end$$;
create function private.confirm_public_standings(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;did uuid;root uuid;s jsonb;receipt private.public_standings_commands%rowtype;result jsonb;begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','disputeId','expectedPublicationVersion','fingerprint']) or not private.regulation_uuid(p_command->'commandId') or not private.regulation_uuid(p_command->'disputeId') or not private.regulation_integer(p_command->'expectedPublicationVersion',0,2147483646) or jsonb_typeof(p_command->'fingerprint') is distinct from 'string' or (p_command->>'fingerprint')!~'^[a-f0-9]{64}$' then raise sqlstate 'PT400' using message='invalid_input';end if;
 cmd:=(p_command->>'commandId')::uuid;did:=(p_command->>'disputeId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('public-standings-command:'||cmd::text,0));
 select * into receipt from private.public_standings_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;
  return receipt.result;
 end if;
 select se.championship_id into root from public.disputes di join public.seasons se on se.id=di.season_id where di.id=did;
 if root is null then raise sqlstate 'PT404' using message='context_not_found';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 s:=private.public_standings_candidate(did);
 if (s->>'publicationVersion')::integer<>(p_command->>'expectedPublicationVersion')::integer+1 or encode(sha256(convert_to(s::text,'UTF8')),'hex')<>p_command->>'fingerprint' then raise sqlstate 'PT409' using message='public_scope_conflict';end if;
 s:=jsonb_set(s,'{publishedAt}',to_jsonb(clock_timestamp()));
 insert into private.public_standings_versions values(did,(s->>'publicationVersion')::integer,s,actor);
 insert into private.public_standings_heads values(did,(s->>'publicationVersion')::integer) on conflict(dispute_id) do update set version=excluded.version;
 result:=jsonb_build_object('commandId',cmd,'disputeId',did,'publicationVersion',s->'publicationVersion','publishedAt',s->'publishedAt');
 insert into private.public_standings_commands values(cmd,actor,p_command,result);
 return result;
end$$;

-- Reads only the frozen scope and current PUBLIC results. No current private game, rule or identity is used.
create function private.get_public_standings(did uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare root uuid;s jsonb;facts jsonb;games_current jsonb;begin
 select se.championship_id into root from public.disputes di join public.seasons se on se.id=di.season_id where di.id=did;
 if root is null then return null;end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('competition:'||root::text,0));
 select v.snapshot into s from private.public_standings_heads h join private.public_standings_versions v using(dispute_id,version) where h.dispute_id=did;
 if s is null then return null;end if;
 if exists(select 1 from jsonb_array_elements(s->'games') g join public.published_games p on p.game_id=(g.value->>'id')::uuid where p.dispute_id<>did or p.snapshot#>>'{game,home,registrationId}'<>g.value->>'homeRegistrationId' or p.snapshot#>>'{game,away,registrationId}'<>g.value->>'awayRegistrationId') then raise sqlstate 'PT409' using message='public_scope_conflict';end if;
 select coalesce(jsonb_agg(jsonb_build_object('gameId',p.game_id,'publicationVersion',p.version,'disputeId',did,'homeRegistrationId',g.value->'homeRegistrationId','awayRegistrationId',g.value->'awayRegistrationId','homePoints',p.snapshot#>'{facts,teams,home,points}','awayPoints',p.snapshot#>'{facts,teams,away,points}','status','played','pointsSource',coalesce(p.snapshot#>'{facts,origins,scorePoints}',jsonb_build_object('kind',p.snapshot#>'{source,kind}','version',p.snapshot#>'{source,version}'))) order by p.game_id),'[]') into facts from jsonb_array_elements(s->'games') g join public.published_games p on p.game_id=(g.value->>'id')::uuid;
 select coalesce(jsonb_agg(jsonb_set(g.value,'{version}',to_jsonb(greatest((g.value->>'version')::integer,coalesce((p.snapshot->>'gameVersion')::integer,0)))) order by g.value->>'id'),'[]') into games_current from jsonb_array_elements(s->'games') g left join public.published_games p on p.game_id=(g.value->>'id')::uuid;
 return s||jsonb_build_object('publishedGames',facts,'games',games_current);
end$$;
create function private.list_public_disputes(did uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if (select count(*)>1000 from private.public_standings_heads where did is null or dispute_id=did) then raise sqlstate 'PT413' using message='public_catalog_too_large';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('disputeId',h.dispute_id,'context',v.snapshot->'context','registrations',v.snapshot->'registrations') order by h.dispute_id) from private.public_standings_heads h join private.public_standings_versions v using(dispute_id,version) where did is null or h.dispute_id=did),'[]');
end$$;
create function public.preview_public_standings(p_dispute_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select private.preview_public_standings(p_dispute_id)$$;
create function public.confirm_public_standings(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.confirm_public_standings(p_command)$$;
create function public.get_public_standings(p_dispute_id uuid) returns jsonb language sql volatile security definer set search_path='' as $$select private.get_public_standings(p_dispute_id)$$;
create function public.list_public_disputes(p_dispute_id uuid default null) returns jsonb language sql stable security definer set search_path='' as $$select private.list_public_disputes(p_dispute_id)$$;
revoke all on function private.public_standings_candidate(uuid),private.preview_public_standings(uuid),private.confirm_public_standings(jsonb),private.get_public_standings(uuid),private.list_public_disputes(uuid),public.preview_public_standings(uuid),public.confirm_public_standings(jsonb),public.get_public_standings(uuid),public.list_public_disputes(uuid) from public,anon,authenticated,service_role;
grant execute on function private.preview_public_standings(uuid),private.confirm_public_standings(jsonb),public.preview_public_standings(uuid),public.confirm_public_standings(jsonb) to authenticated;
grant execute on function public.get_public_standings(uuid),public.list_public_disputes(uuid) to anon,authenticated;
