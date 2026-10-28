-- A2a private source/search only; no draft, confirmation or public projection.
create function private.achievement_root(did uuid) returns uuid language plpgsql volatile security invoker set search_path='' as $$
declare root uuid;current_root uuid;begin
 perform 1 from public.admin_access a where a.user_id=auth.uid() and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if did is null then raise sqlstate 'PT400' using message='invalid_achievement_context';end if;
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if root is null then raise sqlstate 'PT404' using message='achievement_context_not_found';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('competition:'||root::text,0));
 select s.championship_id into current_root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if current_root is distinct from root then raise sqlstate 'PT409' using message='achievement_context_changed';end if;
 if (select count(*)>1000 from public.registrations where dispute_id=did) or
    (select count(*)>10000 from(select distinct person_id from public.roster_entries where dispute_id=did limit 10001) q)
 then raise sqlstate 'PT413' using message='achievement_context_too_large';end if;
 return root;
end$$;

create function private.get_achievement_context(did uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare reg jsonb;ctx jsonb;value jsonb;scope jsonb;begin
 perform private.achievement_root(did);
 reg:=private.get_regulation_state(did,0)||jsonb_build_object('history','[]'::jsonb,'hasMore',false);
 ctx:=reg->'context';
 ctx:=ctx||jsonb_build_object(
  'occurrences',coalesce((select jsonb_agg(v||jsonb_build_object('reason','Decisão contextual') order by v->>'gameId') from jsonb_array_elements(ctx->'occurrences') v),'[]'::jsonb),
  'withdrawals',coalesce((select jsonb_agg(v||jsonb_build_object('reason','Decisão contextual') order by v->>'registrationId') from jsonb_array_elements(ctx->'withdrawals') v),'[]'::jsonb));
 reg:=jsonb_set(reg,'{context}',ctx);
 select jsonb_build_object('championshipId',c.id,'name',c.name,'seasonId',s.id,'year',s.year,'gender',d.gender,'category',d.category,'division',d.division)
 into scope from public.disputes d join public.seasons s on s.id=d.season_id join public.championships c on c.id=s.championship_id where d.id=did;
 select jsonb_build_object('disputeId',did,'scope',scope,'regulation',reg,
  'registrations',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'disputeId',r.dispute_id,'teamId',r.team_id,'name',r.name,'version',r.version) order by r.id) from public.registrations r where r.dispute_id=did),'[]'::jsonb),
  'eligibleAthletes',coalesce((select jsonb_agg(jsonb_build_object('personId',p.id,'version',p.version) order by p.id)
   from public.persons p join private.athletes a on a.person_id=p.id where exists(select 1 from public.roster_entries r where r.person_id=p.id and r.dispute_id=did)),'[]'::jsonb)) into value;
 -- No current-membership or sex restriction: historical participants remain eligible.
 -- Published participant anchors already require an immutable roster FK.
 return value||jsonb_build_object('contextFingerprint',encode(sha256(convert_to(value::text,'UTF8')),'hex'));
end$$;

create function private.list_achievement_athletes(did uuid,q text,off integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare term text;items jsonb;more boolean;begin
 perform private.achievement_root(did);
 if q is null or length(q)>120 or off is null or off<0 or off>100000 then raise sqlstate 'PT400' using message='invalid_achievement_search';end if;
 term:=private.person_name_key(q);
 with matches as(
  select p.* from public.persons p join private.athletes a on a.person_id=p.id
   where exists(select 1 from public.roster_entries r where r.person_id=p.id and r.dispute_id=did)
    and (term='' or p.name_key like '%'||term||'%' or private.person_name_key(p.nickname) like '%'||term||'%')
   order by p.name_key,p.id limit 21 offset off
 ), page as(select * from matches order by name_key,id limit 20)
 select coalesce((select jsonb_agg(jsonb_build_object('personId',p.id,'version',p.version,'name',p.name,'nickname',p.nickname,'publicBirthYear',p.public_birth_year,
   'registrationIds',(select jsonb_agg(id order by id) from(select distinct r.registration_id as id from public.roster_entries r where r.person_id=p.id and r.dispute_id=did) c)) order by p.name_key,p.id) from page p),'[]'::jsonb),
   (select count(*)>20 from matches) into items,more;
 return jsonb_build_object('disputeId',did,'items',items,'hasMore',more);
end$$;
create function public.get_achievement_context(p_dispute_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_achievement_context(p_dispute_id)$$;
create function public.list_achievement_athletes(p_dispute_id uuid,p_query text default '',p_offset integer default 0) returns jsonb language sql volatile security invoker set search_path='' as $$select private.list_achievement_athletes(p_dispute_id,p_query,p_offset)$$;
revoke all on function private.achievement_root(uuid),private.get_achievement_context(uuid),private.list_achievement_athletes(uuid,text,integer),public.get_achievement_context(uuid),public.list_achievement_athletes(uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function private.get_achievement_context(uuid),private.list_achievement_athletes(uuid,text,integer),public.get_achievement_context(uuid),public.list_achievement_athletes(uuid,text,integer) to authenticated;
