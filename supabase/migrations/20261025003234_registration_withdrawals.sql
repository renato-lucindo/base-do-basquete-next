-- O3: explicit reviewed withdrawal policies, independent from source game facts.
create table private.registration_withdrawal_records (
 id uuid primary key,registration_id uuid not null unique,dispute_id uuid not null,
 unique(id,registration_id,dispute_id),foreign key(registration_id,dispute_id) references public.registrations(id,dispute_id) on delete restrict
);
create index registration_withdrawal_records_context on private.registration_withdrawal_records(registration_id,dispute_id);
create index registration_withdrawal_records_dispute on private.registration_withdrawal_records(dispute_id);
create table private.registration_withdrawal_versions (
 id uuid not null,version integer not null check(version>0),registration_id uuid not null,dispute_id uuid not null,
 regulation_version integer check(regulation_version>0),policy text check(policy in('keep_results','exclude_results')),
 reason text not null check(coalesce(private.occurrence_reason(to_jsonb(reason))=reason,false)),
 context_fingerprint text not null check(context_fingerprint~'^[a-f0-9]{64}$'),saved_by uuid not null references auth.users(id) on delete restrict,saved_at timestamptz not null,
 primary key(id,version),unique(registration_id,version),
 foreign key(id,registration_id,dispute_id) references private.registration_withdrawal_records(id,registration_id,dispute_id) on delete restrict,
 foreign key(dispute_id,regulation_version) references private.regulation_versions(dispute_id,version) on delete restrict
);
create index registration_withdrawal_versions_record on private.registration_withdrawal_versions(id,registration_id,dispute_id);
create index registration_withdrawal_versions_regulation on private.registration_withdrawal_versions(dispute_id,regulation_version);
create index registration_withdrawal_versions_actor on private.registration_withdrawal_versions(saved_by);
create table private.registration_withdrawal_game_links (
 id uuid not null,version integer not null,game_id uuid not null,dispute_id uuid not null,game_version integer not null check(game_version>0),
 publication_version integer check(publication_version>0),occurrence_id uuid,occurrence_version integer,
 primary key(id,version,game_id),check((occurrence_id is null)=(occurrence_version is null)),
 foreign key(id,version) references private.registration_withdrawal_versions(id,version) on delete restrict,
 foreign key(game_id,dispute_id) references public.games(id,dispute_id) on delete restrict,
 foreign key(game_id,publication_version) references private.game_publication_versions(game_id,version) on delete restrict,
 foreign key(occurrence_id,occurrence_version) references private.game_occurrence_versions(id,version) on delete restrict
);
create index registration_withdrawal_links_game on private.registration_withdrawal_game_links(game_id,dispute_id);
create index registration_withdrawal_links_publication on private.registration_withdrawal_game_links(game_id,publication_version);
create index registration_withdrawal_links_occurrence on private.registration_withdrawal_game_links(occurrence_id,occurrence_version);
create table private.registration_withdrawal_heads (
 id uuid primary key,version integer not null,
 foreign key(id,version) references private.registration_withdrawal_versions(id,version) on delete restrict
);
create index registration_withdrawal_heads_version on private.registration_withdrawal_heads(id,version);
create table private.registration_withdrawal_commands (
 command_id uuid primary key,actor_id uuid not null references auth.users(id) on delete restrict,payload jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp()
);
create index registration_withdrawal_commands_actor on private.registration_withdrawal_commands(actor_id);
alter table private.registration_withdrawal_records enable row level security;
alter table private.registration_withdrawal_versions enable row level security;
alter table private.registration_withdrawal_game_links enable row level security;
alter table private.registration_withdrawal_heads enable row level security;
alter table private.registration_withdrawal_commands enable row level security;
revoke all on private.registration_withdrawal_records,private.registration_withdrawal_versions,private.registration_withdrawal_game_links,private.registration_withdrawal_heads,private.registration_withdrawal_commands from public,anon,authenticated,service_role;
create policy never_direct_withdrawal_records on private.registration_withdrawal_records as restrictive for all to public using(false) with check(false);
create policy never_direct_withdrawal_versions on private.registration_withdrawal_versions as restrictive for all to public using(false) with check(false);
create policy never_direct_withdrawal_links on private.registration_withdrawal_game_links as restrictive for all to public using(false) with check(false);
create policy never_direct_withdrawal_heads on private.registration_withdrawal_heads as restrictive for all to public using(false) with check(false);
create policy never_direct_withdrawal_commands on private.registration_withdrawal_commands as restrictive for all to public using(false) with check(false);
create trigger registration_withdrawal_records_immutable before update or delete on private.registration_withdrawal_records for each row execute function private.regulation_history_immutable();
create trigger registration_withdrawal_versions_immutable before update or delete on private.registration_withdrawal_versions for each row execute function private.regulation_history_immutable();
create trigger registration_withdrawal_links_immutable before update or delete on private.registration_withdrawal_game_links for each row execute function private.regulation_history_immutable();
create trigger registration_withdrawal_commands_immutable before update or delete on private.registration_withdrawal_commands for each row execute function private.regulation_history_immutable();
create trigger registration_withdrawal_head_monotonic before update or delete on private.registration_withdrawal_heads for each row execute function private.guard_occurrence_head();
create function private.withdrawal_prior_games(rid uuid,did uuid) returns uuid[] language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(g.id order by g.id),'{}'::uuid[]) from public.games g
 left join public.published_games p on p.game_id=g.id
 left join private.game_occurrence_records o on o.game_id=g.id
 left join private.game_occurrence_heads h on h.id=o.id
 left join private.game_occurrence_versions v on v.id=h.id and v.version=h.version
 left join private.regulation_heads rh on rh.dispute_id=g.dispute_id
 left join private.regulation_versions rv on rv.dispute_id=rh.dispute_id and rv.version=rh.version
 where g.dispute_id=did and rid in(g.home_registration_id,g.away_registration_id) and
 (p.game_id is not null or (v.game_version=g.version and coalesce(v.publication_version,0)=coalesce(p.version,0) and
 ((v.effect->>'kind'='administrative' and v.effect#>>'{decision,kind}'='award') or (v.effect->>'kind'='wo' and rv.definition#>'{occurrenceRules,wo}'<>'null'::jsonb))))
$$;
create function private.registration_withdrawal_json(v private.registration_withdrawal_versions) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',(v).id,'disputeId',(v).dispute_id,'registrationId',(v).registration_id,'version',(v).version,'regulationVersion',coalesce((v).regulation_version,0),'contextFingerprint',(v).context_fingerprint,'policy',(v).policy,'previousGameIds',coalesce((select jsonb_agg(l.game_id order by l.game_id) from private.registration_withdrawal_game_links l where l.id=(v).id and l.version=(v).version),'[]'::jsonb),'reason',(v).reason,'actorId',(v).saved_by,'savedAt',(v).saved_at)
$$;
create or replace function private.regulation_context(did uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare r jsonb;begin
 if (select count(*)>1000 from public.registrations where dispute_id=did) or (select count(*)>10000 from public.games where dispute_id=did) then raise sqlstate 'PT413' using message='regulation_context_too_large';end if;
 select jsonb_build_object('registrationIds',coalesce((select jsonb_agg(id order by id) from public.registrations where dispute_id=did),'[]'::jsonb),
  'games',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'version',g.version,'disputeId',g.dispute_id,'homeRegistrationId',g.home_registration_id,'awayRegistrationId',g.away_registration_id) order by g.id) from public.games g where g.dispute_id=did),'[]'::jsonb),
  'publishedGames',coalesce((select jsonb_agg(jsonb_build_object('gameId',p.game_id,'publicationVersion',p.version,'disputeId',p.dispute_id,'homeRegistrationId',g.home_registration_id,'awayRegistrationId',g.away_registration_id,'homePoints',p.snapshot#>'{facts,teams,home,points}','awayPoints',p.snapshot#>'{facts,teams,away,points}','status','played','pointsSource',case when p.snapshot#>'{facts,origins,scorePoints}' is not null then p.snapshot#>'{facts,origins,scorePoints}' else jsonb_build_object('kind',p.snapshot#>'{source,kind}','version',p.snapshot#>'{source,version}') end) order by p.game_id) from public.published_games p join public.games g on g.id=p.game_id where p.dispute_id=did),'[]'::jsonb),
  'occurrences','[]'::jsonb,'withdrawals','[]'::jsonb) into r;
 r:=r||jsonb_build_object('occurrences',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'version',v.version,'gameId',v.game_id,'gameVersion',v.game_version,'publicationVersion',coalesce(v.publication_version,0),'reason',v.reason,'effect',v.effect) order by v.game_id) from private.game_occurrence_records o join private.game_occurrence_heads h on h.id=o.id join private.game_occurrence_versions v on v.id=h.id and v.version=h.version where o.dispute_id=did and v.effect is not null),'[]'::jsonb),'decisionVersion',coalesce((select sum(h.version) from private.game_occurrence_records o join private.game_occurrence_heads h on h.id=o.id where o.dispute_id=did),0));
 r:=r||jsonb_build_object('withdrawals',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'version',v.version,'registrationId',v.registration_id,'reason',v.reason,'policy',v.policy,'previousGameIds',coalesce((select jsonb_agg(l.game_id order by l.game_id) from private.registration_withdrawal_game_links l where l.id=v.id and l.version=v.version),'[]'::jsonb)) order by v.registration_id) from private.registration_withdrawal_records o join private.registration_withdrawal_heads h on h.id=o.id join private.registration_withdrawal_versions v on v.id=h.id and v.version=h.version where o.dispute_id=did and v.policy is not null),'[]'::jsonb),'decisionVersion',coalesce((r->>'decisionVersion')::bigint,0)+coalesce((select sum(h.version) from private.registration_withdrawal_records o join private.registration_withdrawal_heads h on h.id=o.id where o.dispute_id=did),0));
 return r;
end$$;
create function private.get_registration_withdrawal_state(rid uuid,off integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare root uuid;did uuid;ctx jsonb;head jsonb;history jsonb;rv integer;begin
 perform 1 from public.admin_access a where a.user_id=auth.uid() and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 select r.dispute_id,s.championship_id into did,root from public.registrations r join public.disputes d on d.id=r.dispute_id join public.seasons s on s.id=d.season_id where r.id=rid;
 if root is null then raise sqlstate 'PT404' using message='registration_not_found';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('competition:'||root::text,0));
 if not exists(select 1 from public.registrations where id=rid and dispute_id=did) then raise sqlstate 'PT404' using message='registration_not_found';end if;
 ctx:=private.regulation_context(did);select version into rv from private.regulation_heads where dispute_id=did;
 select private.registration_withdrawal_json(v) into head from private.registration_withdrawal_records o join private.registration_withdrawal_heads h on h.id=o.id join private.registration_withdrawal_versions v on v.id=h.id and v.version=h.version where o.registration_id=rid;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'version',version,'reason',reason,'actorId',saved_by,'savedAt',saved_at,'active',policy is not null) order by version desc),'[]'::jsonb) into history from(select * from private.registration_withdrawal_versions where registration_id=rid order by version desc limit 20 offset greatest(0,least(coalesce(off,0),100000))) q;
 return jsonb_build_object('disputeId',did,'registrationId',rid,'regulationVersion',coalesce(rv,0),'contextFingerprint',encode(sha256(convert_to(ctx::text,'UTF8')),'hex'),'previousGameIds',to_jsonb(private.withdrawal_prior_games(rid,did)),'head',head,'history',history,'hasMore',exists(select 1 from private.registration_withdrawal_versions where registration_id=rid order by version desc limit 1 offset greatest(0,least(coalesce(off,0),100000))+20));
end$$;
create function private.get_registration_withdrawal_version(rid uuid,wanted integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform 1 from public.admin_access a where a.user_id=auth.uid() and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 return(select private.registration_withdrawal_json(v) from private.registration_withdrawal_versions v where registration_id=rid and version=wanted);
end$$;
create function private.save_registration_withdrawal(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;did uuid;rid uuid;wid uuid;root uuid;actual_dispute uuid;prior private.registration_withdrawal_commands%rowtype;old_id uuid;old_version integer;rv integer;ctx jsonb;fp text;policy_value text;msg text;now_at timestamptz;result jsonb;next_version integer;prior_games uuid[];requested_games uuid[];begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if octet_length(p_command::text)>1048576 or not private.context_keys(p_command,array['commandId','disputeId','registrationId','withdrawalId','expectedVersion','expectedRegulationVersion','expectedContextFingerprint','policy','previousGameIds','reason','acknowledgeImpact']) or not private.regulation_uuid(p_command->'commandId') or not private.regulation_uuid(p_command->'disputeId') or not private.regulation_uuid(p_command->'registrationId') or not private.regulation_uuid(p_command->'withdrawalId') or not private.regulation_integer(p_command->'expectedVersion',0,2147483646) or not private.regulation_integer(p_command->'expectedRegulationVersion',0,2147483647) or jsonb_typeof(p_command->'expectedContextFingerprint') is distinct from 'string' or p_command->>'expectedContextFingerprint'!~'^[a-f0-9]{64}$' or jsonb_typeof(p_command->'acknowledgeImpact') is distinct from 'boolean' or not private.regulation_ids(p_command->'previousGameIds',10000) or not(p_command->'policy'='null'::jsonb or (jsonb_typeof(p_command->'policy')='string' and p_command->>'policy' in('keep_results','exclude_results'))) then raise sqlstate 'PT400' using message='invalid_withdrawal';end if;
 msg:=private.occurrence_reason(p_command->'reason');if msg is null then raise sqlstate 'PT400' using message='invalid_withdrawal';end if;
 cmd:=(p_command->>'commandId')::uuid;did:=(p_command->>'disputeId')::uuid;rid:=(p_command->>'registrationId')::uuid;wid:=(p_command->>'withdrawalId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('withdrawal-command:'||cmd::text,0));
 select * into prior from private.registration_withdrawal_commands where command_id=cmd;
 if found then
  if prior.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if prior.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return prior.result;
 end if;
 select r.dispute_id,s.championship_id into actual_dispute,root from public.registrations r join public.disputes d on d.id=r.dispute_id join public.seasons s on s.id=d.season_id where r.id=rid;
 if root is null then raise sqlstate 'PT404' using message='registration_not_found';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 if actual_dispute<>did then raise sqlstate 'PT400' using message='invalid_withdrawal_context';end if;
 if not exists(select 1 from public.registrations where id=rid and dispute_id=did) then raise sqlstate 'PT404' using message='registration_not_found';end if;
 select version into rv from private.regulation_heads where dispute_id=did;
 select o.id,h.version into old_id,old_version from private.registration_withdrawal_records o join private.registration_withdrawal_heads h on h.id=o.id where o.registration_id=rid;
 if coalesce(old_version,0)<>(p_command->>'expectedVersion')::integer or (old_id is not null and old_id<>wid) then raise sqlstate 'PT409' using message='version_conflict';end if;
 if coalesce(rv,0)<>(p_command->>'expectedRegulationVersion')::integer then raise sqlstate 'PT409' using message='context_conflict';end if;
 ctx:=private.regulation_context(did);fp:=encode(sha256(convert_to(ctx::text,'UTF8')),'hex');
 if fp<>p_command->>'expectedContextFingerprint' then raise sqlstate 'PT409' using message='context_conflict';end if;
 policy_value:=p_command->>'policy';
 select coalesce(array_agg(value::uuid order by value::uuid),'{}'::uuid[]) into requested_games from jsonb_array_elements_text(p_command->'previousGameIds');
 prior_games:=private.withdrawal_prior_games(rid,did);
 if policy_value is null then
  if old_id is null or cardinality(requested_games)>0 then raise sqlstate 'PT400' using message='invalid_withdrawal_removal';end if;
 elsif requested_games<>prior_games then raise sqlstate 'PT400' using message='invalid_withdrawal_games';end if;
 if (cardinality(prior_games)>0 or old_version is not null) and p_command->'acknowledgeImpact'<>'true'::jsonb then raise sqlstate 'PT400' using message='withdrawal_impact_required';end if;
 if old_id is null then insert into private.registration_withdrawal_records(id,registration_id,dispute_id) values(wid,rid,did);end if;
 next_version:=coalesce(old_version,0)+1;now_at:=clock_timestamp();
 insert into private.registration_withdrawal_versions(id,version,registration_id,dispute_id,regulation_version,policy,reason,context_fingerprint,saved_by,saved_at) values(wid,next_version,rid,did,rv,policy_value,msg,fp,actor,now_at);
 if policy_value is not null then
  insert into private.registration_withdrawal_game_links(id,version,game_id,dispute_id,game_version,publication_version,occurrence_id,occurrence_version)
   select wid,next_version,g.id,did,g.version,p.version,o.id,h.version from public.games g left join public.published_games p on p.game_id=g.id left join private.game_occurrence_records o on o.game_id=g.id left join private.game_occurrence_heads h on h.id=o.id where g.id=any(prior_games);
 end if;
 insert into private.registration_withdrawal_heads(id,version) values(wid,next_version) on conflict(id) do update set version=excluded.version;
 update public.championships set saved_at=now_at where id=root;
 result:=jsonb_build_object('commandId',cmd,'disputeId',did,'registrationId',rid,'withdrawalId',wid,'version',next_version,'savedAt',now_at,'contextFingerprint',fp);
 insert into private.registration_withdrawal_commands(command_id,actor_id,payload,result) values(cmd,actor,p_command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_withdrawal';
end$$;
create function public.get_registration_withdrawal_state(p_registration_id uuid,p_offset integer default 0) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_registration_withdrawal_state(p_registration_id,p_offset)$$;
create function public.get_registration_withdrawal_version(p_registration_id uuid,p_version integer) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_registration_withdrawal_version(p_registration_id,p_version)$$;
create function public.save_registration_withdrawal(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_registration_withdrawal(p_command)$$;
revoke all on function private.withdrawal_prior_games(uuid,uuid),private.registration_withdrawal_json(private.registration_withdrawal_versions),private.get_registration_withdrawal_state(uuid,integer),private.get_registration_withdrawal_version(uuid,integer),private.save_registration_withdrawal(jsonb),public.get_registration_withdrawal_state(uuid,integer),public.get_registration_withdrawal_version(uuid,integer),public.save_registration_withdrawal(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.get_registration_withdrawal_state(uuid,integer),private.get_registration_withdrawal_version(uuid,integer),private.save_registration_withdrawal(jsonb),public.get_registration_withdrawal_state(uuid,integer),public.get_registration_withdrawal_version(uuid,integer),public.save_registration_withdrawal(jsonb) to authenticated;
