-- No data backfill. Every historical correction requires an explicit reviewed command.
alter function private.enrich_sheet_team_statistics(jsonb,jsonb,jsonb) rename to enrich_sheet_team_statistics_review_v1;
create function private.enrich_sheet_team_statistics(d jsonb,facts jsonb,review jsonb default null) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare s text; received integer;
begin
 facts:=private.enrich_sheet_team_statistics_review_v1(d,facts,review);
 foreach s in array array['home','away'] loop
  select coalesce(sum((p->>'fouls')::integer),0) into received
   from jsonb_array_elements(facts->'players') p where p->>'side'<>s;
  if review is not null and review->s->'foulsReceived'<>'null'::jsonb and
    (review->s->>'foulsReceived')::integer<>received then
   raise sqlstate 'PT400' using message='fouls_received_mismatch';
  end if;
  facts:=jsonb_set(facts,array['teams',s,'teamStatistics','foulsReceived'],to_jsonb(received));
 end loop;
 return facts;
end$$;
revoke all on function private.enrich_sheet_team_statistics_review_v1(jsonb,jsonb,jsonb),private.enrich_sheet_team_statistics(jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;

-- Keep receipt replay and all existing publication locks/authorization in the original writer.
alter function private.publish_sheet_game(jsonb) rename to publish_sheet_game_before_collective_guard;
create function private.publish_sheet_game(p_command jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
begin
 perform 1 from public.admin_access where user_id=auth.uid() and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not exists(select 1 from private.game_publication_commands where request_id=(p_command->>'requestId')::uuid) and
   (jsonb_typeof(p_command#>'{source,teamReview,home,disqualifications}') is distinct from 'number' or
    jsonb_typeof(p_command#>'{source,teamReview,away,disqualifications}') is distinct from 'number') then
  raise sqlstate 'PT400' using message='team_disqualifications_review_required';
 end if;
 return private.publish_sheet_game_before_collective_guard(p_command);
exception when invalid_text_representation or numeric_value_out_of_range then
 raise sqlstate 'PT400' using message='invalid_publication';
end$$;
revoke all on function private.publish_sheet_game_before_collective_guard(jsonb),private.publish_sheet_game(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.publish_sheet_game(jsonb) to authenticated;

-- Revisit only the frozen, currently published sheet. Never save or replace a live sheet.
create function private.revise_sheet_team_statistics(p_command jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;gid uuid;pv integer;root uuid;reason text;review jsonb;
 current_pub public.published_games%rowtype;frozen private.game_publication_versions%rowtype;
 receipt private.game_publication_commands%rowtype;facts jsonb;payload jsonb;result jsonb;s text;now_at timestamptz;
begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['requestId','gameId','basePublicationVersion','disqualifications','reason']) or
    octet_length(p_command::text)>8192 or
    not private.pdf_number(p_command->'basePublicationVersion') or
    not private.context_keys(p_command->'disqualifications',array['home','away']) or
    jsonb_typeof(p_command->'reason') is distinct from 'string' then
  raise sqlstate 'PT400' using message='invalid_team_statistics';end if;
 cmd:=(p_command->>'requestId')::uuid;gid:=(p_command->>'gameId')::uuid;pv:=(p_command->>'basePublicationVersion')::integer;
 reason:=regexp_replace(p_command->>'reason','^[[:space:]]+|[[:space:]]+$','','g');
 if cmd is null or gid is null or pv not between 1 and 2147483646 or length(reason) not between 10 and 500 then
  raise sqlstate 'PT400' using message='invalid_team_statistics';end if;
 foreach s in array array['home','away'] loop
  if not private.pdf_number(p_command->'disqualifications'->s) or
     (p_command->'disqualifications'->>s)::numeric>2147483647 then
   raise sqlstate 'PT400' using message='invalid_team_statistics';end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended('publication-command:'||cmd::text,0));
 select * into receipt from private.game_publication_commands where request_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;
  return receipt.result;
 end if;
 select se.championship_id into root from public.games ga join public.disputes di on di.id=ga.dispute_id join public.seasons se on se.id=di.season_id where ga.id=gid;
 if root is null then raise sqlstate 'PT404' using message='publication_not_found';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 perform pg_advisory_xact_lock(hashtextextended('game:'||gid::text,0));
 select * into current_pub from public.published_games where game_id=gid for update;
 if not found or current_pub.version<>pv then raise sqlstate 'PT409' using message='version_conflict';end if;
 select * into frozen from private.game_publication_versions where game_id=gid and version=pv;
 if not found or frozen.source_kind<>'sheet' or frozen.snapshot<>current_pub.snapshot then
  raise sqlstate 'PT400' using message='invalid_team_statistics';end if;
 review:=jsonb_build_object('home',jsonb_build_object('disqualifications',p_command#>'{disqualifications,home}','foulsReceived',null),
                           'away',jsonb_build_object('disqualifications',p_command#>'{disqualifications,away}','foulsReceived',null));
 facts:=private.enrich_sheet_team_statistics(frozen.document,private.final_sheet_facts_base(frozen.document),review);
 now_at:=clock_timestamp();
 payload:=jsonb_set(jsonb_set(current_pub.snapshot,'{version}',to_jsonb(pv+1)),'{publishedAt}',to_jsonb(now_at));
 foreach s in array array['home','away'] loop
  payload:=jsonb_set(payload,array['facts','teams',s,'teamStatistics'],facts#>array['teams',s,'teamStatistics']);
 end loop;
 insert into private.game_publication_versions(game_id,version,source_kind,source_id,source_version,snapshot,document,reason,published_by,published_at)
  values(gid,pv+1,'sheet',frozen.source_id,frozen.source_version,payload,frozen.document,reason,actor,now_at);
 insert into private.game_publication_entries(game_id,version,person_id,roster_entry_id,registration_id,side,jersey)
  select game_id,pv+1,person_id,roster_entry_id,registration_id,side,jersey from private.game_publication_entries where game_id=gid and version=pv;
 -- Existing triggers refresh the public statistics/player projections in this transaction.
 update public.published_games set version=pv+1,snapshot=payload,published_at=now_at where game_id=gid;
 result:=jsonb_build_object('requestId',cmd,'gameId',gid,'version',pv+1,'sourceVersion',frozen.source_version,'publishedAt',now_at);
 insert into private.game_publication_commands(request_id,actor_id,payload,result) values(cmd,actor,p_command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or not_null_violation or check_violation or foreign_key_violation then
 raise sqlstate 'PT400' using message='invalid_team_statistics';
end$$;
create function public.revise_sheet_team_statistics(p_command jsonb) returns jsonb
language sql volatile security invoker set search_path='' as $$select private.revise_sheet_team_statistics(p_command)$$;
revoke all on function private.revise_sheet_team_statistics(jsonb),public.revise_sheet_team_statistics(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.revise_sheet_team_statistics(jsonb),public.revise_sheet_team_statistics(jsonb) to authenticated;
