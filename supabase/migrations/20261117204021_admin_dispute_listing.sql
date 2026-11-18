-- One administrative dispute per row, with filtering and ordering before pagination.
create function public.list_admin_disputes(p_query jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  q jsonb:=p_query;
  result jsonb;
begin
  if not exists(select from public.admin_access where user_id=auth.uid() and enabled)
    then raise sqlstate 'PT403' using message='forbidden'; end if;
  if not private.context_keys(q,array['q','year','championshipId','gender','status','visibility','recent','sort','direction','offset'])
    or jsonb_typeof(q->'q') is distinct from 'string' or length(q->>'q')>120
    or (q->'year'<>'null'::jsonb and not private.regulation_integer(q->'year',1,9999))
    or (q->'championshipId'<>'null'::jsonb and not private.regulation_uuid(q->'championshipId'))
    or (q->'gender'<>'null'::jsonb and coalesce(q->>'gender','') not in ('masculino','feminino'))
    or (q->'status'<>'null'::jsonb and coalesce(q->>'status','') not in ('planned','in_progress','completed','cancelled'))
    or (q->'visibility'<>'null'::jsonb and coalesce(q->>'visibility','') not in ('public','private','test'))
    or jsonb_typeof(q->'recent') is distinct from 'boolean'
    or coalesce(q->>'sort','') not in ('championship','year','category','gender','division','status','visibility')
    or coalesce(q->>'direction','') not in ('asc','desc')
    or not private.regulation_integer(q->'offset',0,100000)
    then raise sqlstate 'PT400' using message='invalid_dispute_query'; end if;
  with matches as materialized (
    select d.id,s.id season_id,c.id championship_id,c.name,s.year,d.gender,d.category,d.division,
      c.saved_at,private.dispute_administration_json(a) administration,
      case q->>'sort'
        when 'championship' then lower(c.name)
        when 'year' then lpad(s.year::text,4,'0')
        when 'category' then lower(d.category)
        when 'gender' then d.gender
        when 'division' then lower(coalesce(d.division,''))
        when 'status' then case a.status when 'planned' then 'Planejada' when 'in_progress' then 'Em andamento' when 'completed' then 'Concluída' else 'Cancelada' end
        when 'visibility' then case when a.is_test then 'Teste' when a.visibility in ('public','legacy') then 'Pública' else 'Privada' end
      end sort_key
    from public.disputes d join public.seasons s on s.id=d.season_id
    join public.championships c on c.id=s.championship_id
    join private.dispute_administration a on a.dispute_id=d.id
    where position(lower(q->>'q') in lower(concat_ws(' ',c.name,s.year,d.gender,d.category,d.division)))>0
      and (q->>'year' is null or s.year=(q->>'year')::int)
      and (q->>'championshipId' is null or c.id=(q->>'championshipId')::uuid)
      and (q->>'gender' is null or d.gender=q->>'gender')
      and (q->>'status' is null or a.status=q->>'status')
      and (q->>'visibility' is null or case q->>'visibility'
        when 'test' then a.is_test
        when 'public' then not a.is_test and a.visibility in ('public','legacy')
        else not a.is_test and a.visibility='private' end)
  ), ordered as (
    select *,row_number() over(order by
      case when (q->>'recent')::boolean then saved_at end desc,
      case when q->>'direction'='asc' then sort_key end asc,
      case when q->>'direction'='desc' then sort_key end desc,
      lower(name),year desc,gender,lower(category),lower(coalesce(division,'')),id) ordinal
    from matches
  ), page as (
    select * from ordered order by ordinal limit 25 offset (q->>'offset')::int
  )
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object(
    'competitionId',championship_id,'seasonId',season_id,'name',name,'year',year,
    'gender',gender,'category',category,'division',division,'administration',administration)
    order by ordinal) from page),'[]'),
    'total',(select count(*) from matches),
    'hasMore',(select count(*)>(q->>'offset')::int+25 from matches),
    'years',coalesce((select jsonb_agg(year order by year desc) from(select distinct year from public.seasons) years),'[]'))
    into result;
  return result;
end
$$;
revoke all on function public.list_admin_disputes(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.list_admin_disputes(jsonb) to authenticated;
