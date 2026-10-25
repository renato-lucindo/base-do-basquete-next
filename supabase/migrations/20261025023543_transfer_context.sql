-- T2b1: complete private source, bounded before aggregation; no transfer writer yet.
create index roster_person_dispute_history on public.roster_entries(person_id,dispute_id,started_at,id);

create function private.transfer_context(did uuid,pid uuid,destination uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare ctx jsonb;members jsonb;registrations jsonb;rule_version integer;permission jsonb;
begin
 if did is null or pid is null or destination is null then raise sqlstate 'PT400' using message='invalid_transfer_context';end if;
 if (select count(*)>2000 from public.roster_entries r where r.dispute_id=did and (r.person_id=pid or (r.registration_id=destination and r.ended_at is null))) then
  raise sqlstate 'PT413' using message='transfer_context_too_large';
 end if;
 if (select count(*)>1000 from public.registrations r where r.dispute_id=did and (r.id=destination or exists(select 1 from public.roster_entries m where m.person_id=pid and m.dispute_id=did and m.registration_id=r.id))) then
  raise sqlstate 'PT413' using message='transfer_context_too_large';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'disputeId',r.dispute_id,'personId',r.person_id,'registrationId',r.registration_id,'jersey',r.jersey,'version',r.version,'startedAt',r.started_at,'endedAt',r.ended_at) order by r.id),'[]'::jsonb)
 into members from public.roster_entries r where r.dispute_id=did and (r.person_id=pid or (r.registration_id=destination and r.ended_at is null));
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'disputeId',r.dispute_id,'teamId',r.team_id,'name',r.name,'version',r.version) order by r.id),'[]'::jsonb)
 into registrations from public.registrations r where r.dispute_id=did and (r.id=destination or exists(select 1 from public.roster_entries m where m.person_id=pid and m.dispute_id=did and m.registration_id=r.id));
 select h.version,v.definition->'transfers' into rule_version,permission from private.regulation_heads h join private.regulation_versions v on v.dispute_id=h.dispute_id and v.version=h.version where h.dispute_id=did;
 ctx:=jsonb_build_object('disputeId',did,'personId',pid,'regulation',jsonb_build_object('version',coalesce(rule_version,0),'transfers',coalesce(permission,'null'::jsonb)),'registrations',registrations,'memberships',members);
 return ctx||jsonb_build_object('contextFingerprint',encode(sha256(convert_to(ctx::text,'UTF8')),'hex'),'effectiveAt',clock_timestamp());
end$$;

create function private.get_transfer_context(source_id uuid,destination uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare did uuid;pid uuid;root uuid;target_dispute uuid;athlete_sex text;gender_sex text;
begin
 perform 1 from public.admin_access a where a.user_id=auth.uid() and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if source_id is null or destination is null then raise sqlstate 'PT400' using message='invalid_transfer_context';end if;
 select r.dispute_id,r.person_id,s.championship_id into did,pid,root from public.roster_entries r join public.disputes d on d.id=r.dispute_id join public.seasons s on s.id=d.season_id where r.id=source_id;
 if root is null then raise sqlstate 'PT404' using message='transfer_source_not_found';end if;
 -- Match existing writer/global identity order: athlete before championship root.
 select a.sex into athlete_sex from private.athletes a where a.person_id=pid for share;
 if athlete_sex is null then raise sqlstate 'PT400' using message='invalid_transfer_context';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('competition:'||root::text,0));
 select r.dispute_id into target_dispute from public.registrations r where r.id=destination;
 if target_dispute is null then raise sqlstate 'PT404' using message='transfer_destination_not_found';end if;
 if target_dispute<>did then raise sqlstate 'PT400' using message='invalid_transfer_context';end if;
 select case when d.gender='feminino' then 'female' else 'male' end into gender_sex from public.disputes d where d.id=did;
 if athlete_sex<>gender_sex then raise sqlstate 'PT400' using message='invalid_transfer_context';end if;
 return private.transfer_context(did,pid,destination);
end$$;

create function public.get_transfer_context(p_source_entry_id uuid,p_destination_registration_id uuid) returns jsonb
language sql volatile security invoker set search_path='' as $$select private.get_transfer_context(p_source_entry_id,p_destination_registration_id)$$;
revoke all on function private.transfer_context(uuid,uuid,uuid),private.get_transfer_context(uuid,uuid),public.get_transfer_context(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function private.get_transfer_context(uuid,uuid),public.get_transfer_context(uuid,uuid) to authenticated;
