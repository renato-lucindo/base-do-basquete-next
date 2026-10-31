-- R2a: private discovery of existing rosters. No copying, matching or writes.
create function private.reuse_registration(rid uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',r.id,'disputeId',r.dispute_id,'teamId',r.team_id,'seasonId',d.season_id,
  'championshipId',s.championship_id,'name',r.name,'category',d.category,'gender',d.gender,
  'year',s.year,'division',d.division,'version',r.version)
 from public.registrations r join public.disputes d on d.id=r.dispute_id join public.seasons s on s.id=d.season_id where r.id=rid
$$;

create function private.roster_reuse_context(source_id uuid,target_id uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare source jsonb;target jsonb;ctx jsonb;target_roster jsonb;candidates jsonb;target_dispute uuid;target_sex text;
begin
 source:=private.reuse_registration(source_id);target:=private.reuse_registration(target_id);
 if source is null or target is null then raise sqlstate 'PT404' using message='reuse_registration_not_found';end if;
 if source_id=target_id or source->>'disputeId'=target->>'disputeId' or source->>'teamId'<>target->>'teamId'
  or source->>'seasonId'<>target->>'seasonId' or source->>'championshipId'<>target->>'championshipId'
 then raise sqlstate 'PT400' using message='invalid_reuse_context';end if;
 if (select count(*)>2000 from public.roster_entries where registration_id=source_id and ended_at is null)
  or (select count(*)>2000 from public.roster_entries where registration_id=target_id and ended_at is null)
 then raise sqlstate 'PT413' using message='reuse_context_too_large';end if;
 target_dispute:=(target->>'disputeId')::uuid;
 target_sex:=case when target->>'gender'='feminino' then 'female' else 'male' end;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'personId',r.person_id,'jersey',r.jersey,'version',r.version)
  order by r.jersey::integer nulls last,length(r.jersey),r.id),'[]'::jsonb)
 into target_roster from public.roster_entries r where r.registration_id=target_id and r.ended_at is null;
 select coalesce(jsonb_agg(jsonb_build_object('sourceEntryId',r.id,'sourceVersion',r.version,
  'person',jsonb_build_object('id',p.id,'name',p.name,'nickname',p.nickname),'jersey',r.jersey,
  'eligibility',case when a.sex<>target_sex then 'gender_mismatch'
   when exists(select 1 from public.roster_entries m where m.person_id=r.person_id and m.dispute_id=target_dispute and m.ended_at is null and m.registration_id<>target_id) then 'registered_elsewhere'
   when exists(select 1 from public.roster_entries m where m.person_id=r.person_id and m.dispute_id=target_dispute and m.ended_at is null and m.registration_id=target_id) then 'eligible'
   when exists(select 1 from public.roster_entries m where m.person_id=r.person_id and m.dispute_id=target_dispute) then 'transfer_required'
   else 'eligible' end)
  order by r.jersey::integer nulls last,length(r.jersey),r.id),'[]'::jsonb)
 into candidates from public.roster_entries r join public.persons p on p.id=r.person_id join private.athletes a on a.person_id=r.person_id
 where r.registration_id=source_id and r.ended_at is null;
 ctx:=jsonb_build_object('target',target,'source',source,'targetRoster',target_roster,'candidates',candidates);
 if octet_length(ctx::text)>1048000 then raise sqlstate 'PT413' using message='reuse_context_too_large';end if;
 return ctx||jsonb_build_object('contextFingerprint',encode(sha256(convert_to(ctx::text,'UTF8')),'hex'));
end$$;

create function private.get_roster_reuse_context(source_id uuid,target_id uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare root uuid;
begin
 perform 1 from public.admin_access a where a.user_id=auth.uid() and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if source_id is null or target_id is null then raise sqlstate 'PT400' using message='invalid_reuse_context';end if;
 select s.championship_id into root from public.registrations r join public.disputes d on d.id=r.dispute_id join public.seasons s on s.id=d.season_id where r.id=target_id;
 if root is null then raise sqlstate 'PT404' using message='reuse_registration_not_found';end if;
 -- Shared root only: this reader never acquires athlete row locks after root.
 perform pg_advisory_xact_lock_shared(hashtextextended('competition:'||root::text,0));
 return private.roster_reuse_context(source_id,target_id);
end$$;

create function private.list_roster_reuse_sources(target_id uuid,off integer) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare target jsonb;root uuid;result jsonb;
begin
 perform 1 from public.admin_access a where a.user_id=auth.uid() and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if target_id is null or off is null or off not between 0 and 100000 then raise sqlstate 'PT400' using message='invalid_reuse_query';end if;
 target:=private.reuse_registration(target_id);
 if target is null then raise sqlstate 'PT404' using message='reuse_registration_not_found';end if;
 root:=(target->>'championshipId')::uuid;
 perform pg_advisory_xact_lock_shared(hashtextextended('competition:'||root::text,0));
 -- Re-read after the coordination lock; never combine A/B by team name.
 target:=private.reuse_registration(target_id);
 if target is null then raise sqlstate 'PT404' using message='reuse_registration_not_found';end if;
 with matches as (
  select r.id,greatest(r.saved_at,m.saved_at) saved_at,m.n
  from public.registrations r join public.disputes d on d.id=r.dispute_id
  join lateral(select count(*) n,max(e.saved_at) saved_at from public.roster_entries e where e.registration_id=r.id and e.ended_at is null) m on m.n>0
  where r.team_id=(target->>'teamId')::uuid and d.season_id=(target->>'seasonId')::uuid and r.dispute_id<>(target->>'disputeId')::uuid
 ), page as (select * from matches order by saved_at desc,id limit 20 offset off)
 select jsonb_build_object('items',coalesce((select jsonb_agg(private.reuse_registration(id)||jsonb_build_object('athleteCount',n,'savedAt',saved_at) order by saved_at desc,id) from page),'[]'::jsonb),
  'hasMore',(select off<100000 and count(*)>off+20 from matches)) into result;
 return result;
end$$;

create function public.get_roster_reuse_context(p_source_registration_id uuid,p_target_registration_id uuid) returns jsonb
language sql volatile security invoker set search_path='' as $$select private.get_roster_reuse_context(p_source_registration_id,p_target_registration_id)$$;
create function public.list_roster_reuse_sources(p_target_registration_id uuid,p_offset integer default 0) returns jsonb
language sql volatile security invoker set search_path='' as $$select private.list_roster_reuse_sources(p_target_registration_id,p_offset)$$;
revoke all on function private.reuse_registration(uuid),private.roster_reuse_context(uuid,uuid),private.get_roster_reuse_context(uuid,uuid),private.list_roster_reuse_sources(uuid,integer),public.get_roster_reuse_context(uuid,uuid),public.list_roster_reuse_sources(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function private.get_roster_reuse_context(uuid,uuid),private.list_roster_reuse_sources(uuid,integer),public.get_roster_reuse_context(uuid,uuid),public.list_roster_reuse_sources(uuid,integer) to authenticated;
