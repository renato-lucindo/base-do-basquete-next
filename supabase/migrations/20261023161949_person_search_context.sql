-- Search uses public context, not private athlete detail or an inferred current team.
create function private.person_contexts(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 with memberships as (
  select registration_id,ended_at is null as active from public.roster_entries where person_id=p_id
  union all select registration_id,ended_at is null from public.staff_entries where person_id=p_id
 ), contexts as (
  select r.id as registration_id,r.name as team_name,s.year,d.gender,d.category,d.division,bool_or(m.active) as active
  from memberships m join public.registrations r on r.id=m.registration_id join public.disputes d on d.id=r.dispute_id join public.seasons s on s.id=d.season_id
  group by r.id,r.name,s.year,d.gender,d.category,d.division
  order by s.year desc,r.id limit 10
 ) select coalesce(jsonb_agg(jsonb_build_object('registrationId',registration_id,'teamName',team_name,'year',year,'gender',gender,'category',category,'division',division,'active',active) order by year desc,registration_id),'[]'::jsonb) from contexts
$$;
revoke all on function private.person_contexts(uuid) from public,anon,authenticated,service_role;
grant execute on function private.person_contexts(uuid) to authenticated;
create or replace function public.list_persons(p_query text default '',p_kind text default 'all',p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with matches as(select p.id,p.name_key from public.persons p where length(p_query)<=120 and p_offset between 0 and 100000
 and strpos(p.name_key,private.person_name_key(p_query))>0
 and (p_kind='all' or (p_kind='athlete' and exists(select 1 from private.athletes a where a.person_id=p.id)) or (p_kind='coach' and exists(select 1 from public.coaches c where c.person_id=p.id)))),
 page as(select * from matches order by name_key,id limit 20 offset greatest(0,least(p_offset,100000)))
 select jsonb_build_object('items',coalesce((select jsonb_agg((select jsonb_build_object('id',p.id,'name',p.name,'nickname',p.nickname,'publicBirthYear',p.public_birth_year,'athlete',exists(select 1 from private.athletes a where a.person_id=p.id),'coach',exists(select 1 from public.coaches c where c.person_id=p.id),'contexts',private.person_contexts(p.id)) from public.persons p where p.id=page.id) order by name_key,id) from page),'[]'::jsonb),
 'hasMore',(select p_offset<100000 and count(*)>p_offset+20 from matches))
$$;
