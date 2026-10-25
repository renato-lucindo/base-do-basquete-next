-- O2: private immutable competitive decisions, separate from source game facts.
create function private.valid_game_occurrence_effect(e jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare d jsonb;s jsonb;begin
 if e is null or e='null'::jsonb then return true;end if;
 case e->>'kind'
 when 'postponed','interrupted','cancelled' then return private.context_keys(e,array['kind']);
 when 'wo' then return private.context_keys(e,array['kind','winnerRegistrationId']) and private.regulation_uuid(e->'winnerRegistrationId');
 when 'administrative' then
  if not private.context_keys(e,array['kind','decision']) then return false;end if;d:=e->'decision';
  if d->>'kind'='exclude' then return private.context_keys(d,array['kind']);end if;
  if d->>'kind' is distinct from 'award' or not private.context_keys(d,array['kind','winnerRegistrationId','homeLeaguePoints','awayLeaguePoints','score']) or not private.regulation_uuid(d->'winnerRegistrationId') or not private.regulation_integer(d->'homeLeaguePoints',-1000000,1000000) or not private.regulation_integer(d->'awayLeaguePoints',-1000000,1000000) then return false;end if;
  s:=d->'score';if s='null'::jsonb then return true;end if;
  return private.context_keys(s,array['homePoints','awayPoints']) and private.regulation_integer(s->'homePoints',0,2147483647) and private.regulation_integer(s->'awayPoints',0,2147483647) and s->'homePoints'<>s->'awayPoints';
 else return false;end case;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end$$;
create function private.occurrence_reason(v jsonb) returns text language plpgsql immutable security invoker set search_path='' as $$
declare t text;units integer;begin
 if jsonb_typeof(v) is distinct from 'string' then return null;end if;
 t:=btrim(v#>>'{}',E' \t\n\r\f'||chr(11)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279));
 units:=length(t);
 if units not between 3 and 2000 then return null;end if;return t;
end$$;
create table private.game_occurrence_records (
 id uuid primary key,game_id uuid not null unique,dispute_id uuid not null,
 unique(id,game_id,dispute_id),foreign key(game_id,dispute_id) references public.games(id,dispute_id) on delete restrict
);
create index game_occurrence_records_dispute on private.game_occurrence_records(dispute_id);
create table private.game_occurrence_versions (
 id uuid not null,version integer not null check(version>0),game_id uuid not null,dispute_id uuid not null,
 game_version integer not null check(game_version>0),publication_version integer check(publication_version>0),regulation_version integer check(regulation_version>0),
 home_registration_id uuid not null,away_registration_id uuid not null,
 effect jsonb check(effect is null or (effect<>'null'::jsonb and private.valid_game_occurrence_effect(effect))),reason text not null check(coalesce(private.occurrence_reason(to_jsonb(reason))=reason,false)),
 context_fingerprint text not null check(context_fingerprint~'^[a-f0-9]{64}$'),saved_by uuid not null references auth.users(id) on delete restrict,saved_at timestamptz not null,
 primary key(id,version),unique(game_id,version),check(home_registration_id<>away_registration_id),
 foreign key(id,game_id,dispute_id) references private.game_occurrence_records(id,game_id,dispute_id) on delete restrict,
 foreign key(home_registration_id,dispute_id) references public.registrations(id,dispute_id) on delete restrict,
 foreign key(away_registration_id,dispute_id) references public.registrations(id,dispute_id) on delete restrict,
 foreign key(game_id,publication_version) references private.game_publication_versions(game_id,version) on delete restrict,
 foreign key(dispute_id,regulation_version) references private.regulation_versions(dispute_id,version) on delete restrict
);
create index game_occurrence_versions_record on private.game_occurrence_versions(id,game_id,dispute_id);
create index game_occurrence_versions_home on private.game_occurrence_versions(home_registration_id,dispute_id);
create index game_occurrence_versions_away on private.game_occurrence_versions(away_registration_id,dispute_id);
create index game_occurrence_versions_publication on private.game_occurrence_versions(game_id,publication_version);
create index game_occurrence_versions_regulation on private.game_occurrence_versions(dispute_id,regulation_version);
create index game_occurrence_versions_actor on private.game_occurrence_versions(saved_by);
create table private.game_occurrence_heads (
 id uuid primary key,version integer not null,
 foreign key(id,version) references private.game_occurrence_versions(id,version) on delete restrict
);
create table private.game_occurrence_commands (
 command_id uuid primary key,actor_id uuid not null references auth.users(id) on delete restrict,payload jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp()
);
create index game_occurrence_commands_actor on private.game_occurrence_commands(actor_id);
alter table private.game_occurrence_records enable row level security;
alter table private.game_occurrence_versions enable row level security;
alter table private.game_occurrence_heads enable row level security;
alter table private.game_occurrence_commands enable row level security;
revoke all on private.game_occurrence_records,private.game_occurrence_versions,private.game_occurrence_heads,private.game_occurrence_commands from public,anon,authenticated,service_role;
create policy never_direct_occurrence_records on private.game_occurrence_records as restrictive for all to public using(false) with check(false);
create policy never_direct_occurrence_versions on private.game_occurrence_versions as restrictive for all to public using(false) with check(false);
create policy never_direct_occurrence_heads on private.game_occurrence_heads as restrictive for all to public using(false) with check(false);
create policy never_direct_occurrence_commands on private.game_occurrence_commands as restrictive for all to public using(false) with check(false);
create trigger game_occurrence_records_immutable before update or delete on private.game_occurrence_records for each row execute function private.regulation_history_immutable();
create trigger game_occurrence_versions_immutable before update or delete on private.game_occurrence_versions for each row execute function private.regulation_history_immutable();
create trigger game_occurrence_commands_immutable before update or delete on private.game_occurrence_commands for each row execute function private.regulation_history_immutable();
create function private.guard_occurrence_head() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if tg_op='DELETE' then raise sqlstate 'PT409' using message='occurrence_history_immutable';end if;
 if new.id<>old.id or new.version<>old.version+1 then raise sqlstate 'PT409' using message='occurrence_history_immutable';end if;return new;
end$$;
create trigger game_occurrence_head_monotonic before update or delete on private.game_occurrence_heads for each row execute function private.guard_occurrence_head();
create function private.game_occurrence_json(v private.game_occurrence_versions) returns jsonb language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('id',(v).id,'disputeId',(v).dispute_id,'gameId',(v).game_id,'version',(v).version,'gameVersion',(v).game_version,'publicationVersion',coalesce((v).publication_version,0),'regulationVersion',coalesce((v).regulation_version,0),'contextFingerprint',(v).context_fingerprint,'effect',(v).effect,'reason',(v).reason,'actorId',(v).saved_by,'savedAt',(v).saved_at)
$$;
create or replace function private.regulation_context(did uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare r jsonb;begin
 if (select count(*)>1000 from public.registrations where dispute_id=did) or (select count(*)>10000 from public.games where dispute_id=did) then raise sqlstate 'PT413' using message='regulation_context_too_large';end if;
 select jsonb_build_object('registrationIds',coalesce((select jsonb_agg(id order by id) from public.registrations where dispute_id=did),'[]'::jsonb),
  'games',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'version',g.version,'disputeId',g.dispute_id,'homeRegistrationId',g.home_registration_id,'awayRegistrationId',g.away_registration_id) order by g.id) from public.games g where g.dispute_id=did),'[]'::jsonb),
  'publishedGames',coalesce((select jsonb_agg(jsonb_build_object('gameId',p.game_id,'publicationVersion',p.version,'disputeId',p.dispute_id,'homeRegistrationId',g.home_registration_id,'awayRegistrationId',g.away_registration_id,'homePoints',p.snapshot#>'{facts,teams,home,points}','awayPoints',p.snapshot#>'{facts,teams,away,points}','status','played','pointsSource',case when p.snapshot#>'{facts,origins,scorePoints}' is not null then p.snapshot#>'{facts,origins,scorePoints}' else jsonb_build_object('kind',p.snapshot#>'{source,kind}','version',p.snapshot#>'{source,version}') end) order by p.game_id) from public.published_games p join public.games g on g.id=p.game_id where p.dispute_id=did),'[]'::jsonb),
  'occurrences','[]'::jsonb,'withdrawals','[]'::jsonb) into r;
 r:=r||jsonb_build_object('occurrences',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'version',v.version,'gameId',v.game_id,'gameVersion',v.game_version,'publicationVersion',coalesce(v.publication_version,0),'reason',v.reason,'effect',v.effect) order by v.game_id) from private.game_occurrence_records o join private.game_occurrence_heads h on h.id=o.id join private.game_occurrence_versions v on v.id=h.id and v.version=h.version where o.dispute_id=did and v.effect is not null),'[]'::jsonb),'decisionVersion',coalesce((select sum(h.version) from private.game_occurrence_records o join private.game_occurrence_heads h on h.id=o.id where o.dispute_id=did),0));
 return r;
end$$;
create function private.get_game_occurrence_state(gid uuid,off integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare root uuid;g public.games%rowtype;ctx jsonb;head jsonb;history jsonb;rv integer;pv integer;begin
 perform 1 from public.admin_access a where a.user_id=auth.uid() and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 select s.championship_id into root from public.games game join public.disputes d on d.id=game.dispute_id join public.seasons s on s.id=d.season_id where game.id=gid;
 if root is null then raise sqlstate 'PT404' using message='game_not_found';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('competition:'||root::text,0));
 select * into g from public.games where id=gid;if not found then raise sqlstate 'PT404' using message='game_not_found';end if;
 ctx:=private.regulation_context(g.dispute_id);
 select version into rv from private.regulation_heads where dispute_id=g.dispute_id;
 select version into pv from public.published_games where game_id=gid;
 select private.game_occurrence_json(v) into head from private.game_occurrence_records o join private.game_occurrence_heads h on h.id=o.id join private.game_occurrence_versions v on v.id=h.id and v.version=h.version where o.game_id=gid;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'version',version,'reason',reason,'actorId',saved_by,'savedAt',saved_at,'active',effect is not null) order by version desc),'[]'::jsonb) into history from(select * from private.game_occurrence_versions where game_id=gid order by version desc limit 20 offset greatest(0,least(coalesce(off,0),100000))) q;
 return jsonb_build_object('disputeId',g.dispute_id,'gameId',gid,'gameVersion',g.version,'publicationVersion',coalesce(pv,0),'regulationVersion',coalesce(rv,0),'contextFingerprint',encode(sha256(convert_to(ctx::text,'UTF8')),'hex'),'head',head,'history',history,'hasMore',exists(select 1 from private.game_occurrence_versions where game_id=gid order by version desc limit 1 offset greatest(0,least(coalesce(off,0),100000))+20));
end$$;
create function private.get_game_occurrence_version(gid uuid,wanted integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform 1 from public.admin_access a where a.user_id=auth.uid() and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 return(select private.game_occurrence_json(v) from private.game_occurrence_versions v where game_id=gid and version=wanted);
end$$;
create function private.save_game_occurrence(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;did uuid;gid uuid;oid uuid;root uuid;g public.games%rowtype;prior private.game_occurrence_commands%rowtype;old_id uuid;old_version integer;rv integer;pv integer;ctx jsonb;fp text;e jsonb;d jsonb;wo jsonb;winner uuid;msg text;now_at timestamptz;result jsonb;next_version integer;begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if octet_length(p_command::text)>65536 or not private.context_keys(p_command,array['commandId','disputeId','gameId','occurrenceId','expectedVersion','expectedGameVersion','expectedPublicationVersion','expectedRegulationVersion','expectedContextFingerprint','effect','reason','acknowledgeImpact']) or not private.regulation_uuid(p_command->'commandId') or not private.regulation_uuid(p_command->'disputeId') or not private.regulation_uuid(p_command->'gameId') or not private.regulation_uuid(p_command->'occurrenceId') or not private.regulation_integer(p_command->'expectedVersion',0,2147483646) or not private.regulation_integer(p_command->'expectedGameVersion',1,2147483647) or not private.regulation_integer(p_command->'expectedPublicationVersion',0,2147483647) or not private.regulation_integer(p_command->'expectedRegulationVersion',0,2147483647) or jsonb_typeof(p_command->'expectedContextFingerprint') is distinct from 'string' or p_command->>'expectedContextFingerprint'!~'^[a-f0-9]{64}$' or jsonb_typeof(p_command->'acknowledgeImpact') is distinct from 'boolean' or not private.valid_game_occurrence_effect(p_command->'effect') then raise sqlstate 'PT400' using message='invalid_occurrence';end if;
 msg:=private.occurrence_reason(p_command->'reason');if msg is null then raise sqlstate 'PT400' using message='invalid_occurrence';end if;
 cmd:=(p_command->>'commandId')::uuid;did:=(p_command->>'disputeId')::uuid;gid:=(p_command->>'gameId')::uuid;oid:=(p_command->>'occurrenceId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('occurrence-command:'||cmd::text,0));
 select * into prior from private.game_occurrence_commands where command_id=cmd;
 if found then
  if prior.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if prior.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return prior.result;
 end if;
 select s.championship_id into root from public.games game join public.disputes dispute on dispute.id=game.dispute_id join public.seasons s on s.id=dispute.season_id where game.id=gid;
 if root is null then raise sqlstate 'PT404' using message='game_not_found';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 select * into g from public.games where id=gid;
 if not found then raise sqlstate 'PT404' using message='game_not_found';end if;
 if g.dispute_id<>did then raise sqlstate 'PT400' using message='invalid_occurrence_context';end if;
 select version into pv from public.published_games where game_id=gid;
 select version into rv from private.regulation_heads where dispute_id=did;
 select o.id,h.version into old_id,old_version from private.game_occurrence_records o join private.game_occurrence_heads h on h.id=o.id where o.game_id=gid;
 if coalesce(old_version,0)<>(p_command->>'expectedVersion')::integer or (old_id is not null and old_id<>oid) then raise sqlstate 'PT409' using message='version_conflict';end if;
 if g.version<>(p_command->>'expectedGameVersion')::integer or coalesce(pv,0)<>(p_command->>'expectedPublicationVersion')::integer or coalesce(rv,0)<>(p_command->>'expectedRegulationVersion')::integer then raise sqlstate 'PT409' using message='context_conflict';end if;
 ctx:=private.regulation_context(did);fp:=encode(sha256(convert_to(ctx::text,'UTF8')),'hex');
 if fp<>p_command->>'expectedContextFingerprint' then raise sqlstate 'PT409' using message='context_conflict';end if;
 if coalesce(pv,0)>0 and p_command->'acknowledgeImpact'<>'true'::jsonb then raise sqlstate 'PT400' using message='occurrence_impact_required';end if;
 e:=nullif(p_command->'effect','null'::jsonb);
 if e is null and old_id is null then raise sqlstate 'PT400' using message='occurrence_not_active';end if;
 if e->>'kind'='wo' then
  select definition#>'{occurrenceRules,wo}' into wo from private.regulation_versions where dispute_id=did and version=rv;
  if wo is null or wo='null'::jsonb then raise sqlstate 'PT400' using message='wo_rule_required';end if;
  winner:=(e->>'winnerRegistrationId')::uuid;
 elsif e->>'kind'='administrative' and e#>>'{decision,kind}'='award' then
  d:=e->'decision';winner:=(d->>'winnerRegistrationId')::uuid;
  if d->'score'<>'null'::jsonb and ((winner=g.home_registration_id) is distinct from ((d#>>'{score,homePoints}')::integer>(d#>>'{score,awayPoints}')::integer)) then raise sqlstate 'PT400' using message='invalid_administrative_score';end if;
 end if;
 if winner is not null and winner not in(g.home_registration_id,g.away_registration_id) then raise sqlstate 'PT400' using message='invalid_occurrence_winner';end if;
 if old_id is null then insert into private.game_occurrence_records(id,game_id,dispute_id) values(oid,gid,did);end if;
 next_version:=coalesce(old_version,0)+1;now_at:=clock_timestamp();
 insert into private.game_occurrence_versions(id,version,game_id,dispute_id,game_version,publication_version,regulation_version,home_registration_id,away_registration_id,effect,reason,context_fingerprint,saved_by,saved_at) values(oid,next_version,gid,did,g.version,pv,rv,g.home_registration_id,g.away_registration_id,e,msg,fp,actor,now_at);
 insert into private.game_occurrence_heads(id,version) values(oid,next_version) on conflict(id) do update set version=excluded.version;
 update public.championships set saved_at=now_at where id=root;
 result:=jsonb_build_object('commandId',cmd,'disputeId',did,'gameId',gid,'occurrenceId',oid,'version',next_version,'savedAt',now_at,'contextFingerprint',fp);
 insert into private.game_occurrence_commands(command_id,actor_id,payload,result) values(cmd,actor,p_command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_occurrence';
end$$;
create function public.get_game_occurrence_state(p_game_id uuid,p_offset integer default 0) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_game_occurrence_state(p_game_id,p_offset)$$;
create function public.get_game_occurrence_version(p_game_id uuid,p_version integer) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_game_occurrence_version(p_game_id,p_version)$$;
create function public.save_game_occurrence(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_game_occurrence(p_command)$$;
revoke all on function private.valid_game_occurrence_effect(jsonb),private.occurrence_reason(jsonb),private.guard_occurrence_head(),private.game_occurrence_json(private.game_occurrence_versions),private.get_game_occurrence_state(uuid,integer),private.get_game_occurrence_version(uuid,integer),private.save_game_occurrence(jsonb),public.get_game_occurrence_state(uuid,integer),public.get_game_occurrence_version(uuid,integer),public.save_game_occurrence(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.get_game_occurrence_state(uuid,integer),private.get_game_occurrence_version(uuid,integer),private.save_game_occurrence(jsonb),public.get_game_occurrence_state(uuid,integer),public.get_game_occurrence_version(uuid,integer),public.save_game_occurrence(jsonb) to authenticated;


