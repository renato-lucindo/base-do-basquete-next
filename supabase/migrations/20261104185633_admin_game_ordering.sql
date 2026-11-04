-- Administrative collection ordering happens before pagination. Legacy list_games is preserved.
create function public.list_games_ordered(
 p_dispute_id uuid,p_query text default '',p_offset integer default 0,
 p_sort text default 'date',p_direction text default 'asc'
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;begin
 if p_dispute_id is null or p_query is null or length(p_query)>120 or p_offset is null or p_offset not between 0 and 100000
  or p_sort is null or p_sort not in('number','matchup','date','time','venue','state')
  or p_direction is null or p_direction not in('asc','desc') then
  raise sqlstate 'PT400' using message='invalid_game_order';
 end if;
 with matching as materialized (
  select g.id,case p_sort
   when 'number' then case when nullif(btrim(g.game_number),'') is not null then
    array(select case when token[1]~'^[0-9]+$' then '0'||lpad(coalesce(nullif(ltrim(token[1],'0'),''),'0'),40,'0') else '1'||lower(token[1]) end
     from regexp_matches(g.game_number,'([0-9]+|[^0-9]+)','g') with ordinality as parts(token,n) order by n) end
   when 'matchup' then array[lower(h.name||' × '||a.name)]
   when 'date' then case when g.scheduled_date is not null then array[g.scheduled_date::text,coalesce(g.scheduled_time::text,'~')] end
   when 'time' then case when g.scheduled_time is not null then array[g.scheduled_time::text] end
   when 'venue' then case when nullif(btrim(g.venue),'') is not null then array[lower(g.venue)] end
   when 'state' then array[case g.state when 'finished' then 'Resultado publicado' else 'Sem resultado' end]
   end as sort_key
  from public.games g
  join public.registrations h on h.id=g.home_registration_id and h.dispute_id=g.dispute_id
  join public.registrations a on a.id=g.away_registration_id and a.dispute_id=g.dispute_id
  where g.dispute_id=p_dispute_id and position(lower(p_query) in lower(h.name||' '||a.name||' '||coalesce(g.venue,'')||' '||coalesce(g.game_number,'')))>0
 ), numbered as (
  select id,row_number() over(order by sort_key is null,
   case when p_direction='asc' then sort_key end collate "C" asc,
   case when p_direction='desc' then sort_key end collate "C" desc,id) n from matching
 ), page as (select id,n from numbered where n>p_offset and n<=p_offset+20)
 select jsonb_build_object('items',coalesce((select jsonb_agg(public.get_game(id) order by n) from page),'[]'::jsonb),
  'hasMore',exists(select 1 from numbered where n>p_offset+20)) into result;
 return result;
end$$;
revoke all on function public.list_games_ordered(uuid,text,integer,text,text) from public,anon,authenticated,service_role;
grant execute on function public.list_games_ordered(uuid,text,integer,text,text) to authenticated;
