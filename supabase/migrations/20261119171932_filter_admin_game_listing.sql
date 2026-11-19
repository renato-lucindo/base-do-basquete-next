-- Apply all filters before pagination and share the same ordering with the unfiltered list.
create function private.list_games_ordered_filtered(
  p_dispute_id uuid, p_query text, p_offset integer, p_sort text, p_direction text,
  p_team_id uuid, p_state text, p_date date
) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  result jsonb;
begin
  if p_dispute_id is null or p_query is null or length(p_query) > 120
    or p_offset is null or p_offset not between 0 and 100000
    or p_sort is null or p_sort not in ('number', 'matchup', 'date', 'time', 'venue', 'state')
    or p_direction is null or p_direction not in ('asc', 'desc')
    or (p_state is not null and p_state not in ('scheduled', 'finished')) then
    raise sqlstate 'PT400' using message = 'invalid_game_order';
  end if;

  with matching as materialized (
    select g.id,
      case p_sort
        when 'number' then case when nullif(btrim(g.game_number), '') is not null then
          array(
            select case when token[1] ~ '^[0-9]+$'
              then '0' || lpad(coalesce(nullif(ltrim(token[1], '0'), ''), '0'), 40, '0')
              else '1' || lower(token[1])
            end
            from regexp_matches(g.game_number, '([0-9]+|[^0-9]+)', 'g')
              with ordinality as parts(token, n)
            order by n
          )
        end
        when 'matchup' then array[lower(h.name || ' × ' || a.name)]
        when 'date' then case when g.scheduled_date is not null
          then array[g.scheduled_date::text, coalesce(g.scheduled_time::text, '~')] end
        when 'time' then case when g.scheduled_time is not null
          then array[g.scheduled_time::text] end
        when 'venue' then case when nullif(btrim(g.venue), '') is not null
          then array[lower(g.venue)] end
        when 'state' then array[case g.state
          when 'finished' then 'Resultado registrado' else 'Sem resultado' end]
      end as sort_key
    from public.games g
    join public.registrations h on h.id = g.home_registration_id and h.dispute_id = g.dispute_id
    join public.registrations a on a.id = g.away_registration_id and a.dispute_id = g.dispute_id
    where g.dispute_id = p_dispute_id
      and (p_team_id is null or p_team_id in (g.home_registration_id, g.away_registration_id))
      and (p_state is null or g.state = p_state)
      and (p_date is null or g.scheduled_date = p_date)
      and position(lower(p_query) in lower(
        h.name || ' ' || a.name || ' ' || coalesce(g.venue, '') || ' ' || coalesce(g.game_number, '')
      )) > 0
  ), numbered as (
    select id, row_number() over (
      order by sort_key is null,
        case when p_direction = 'asc' then sort_key end collate "C" asc,
        case when p_direction = 'desc' then sort_key end collate "C" desc,
        id
    ) as n
    from matching
  ), page as (
    select id, n from numbered where n > p_offset and n <= p_offset + 20
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(public.get_game(id) order by n) from page), '[]'::jsonb),
    'hasMore', exists(select 1 from numbered where n > p_offset + 20)
  ) into result;
  return result;
end;
$$;

create or replace function public.list_games_ordered(
  p_dispute_id uuid, p_query text default '', p_offset integer default 0,
  p_sort text default 'date', p_direction text default 'asc'
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.list_games_ordered_filtered(
    p_dispute_id, p_query, p_offset, p_sort, p_direction, null, null, null
  );
$$;

create function private.list_admin_games_filtered(
  p_dispute_id uuid, p_query text, p_offset integer, p_sort text, p_direction text,
  p_team_id uuid, p_state text, p_date date
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  page jsonb;
  items jsonb;
begin
  if not exists (select from public.admin_access where user_id = auth.uid() and enabled) then
    raise sqlstate 'PT403' using message = 'forbidden';
  end if;

  page := private.list_games_ordered_filtered(p_dispute_id, p_query, p_offset, p_sort, p_direction, p_team_id, p_state, p_date);
  select coalesce(jsonb_agg(
    g.item || jsonb_build_object('score', case
      when private.regulation_integer(result.snapshot #> '{facts,teams,home,points}', 0, 2147483647)
        and private.regulation_integer(result.snapshot #> '{facts,teams,away,points}', 0, 2147483647)
      then jsonb_build_object(
        'home', result.snapshot #> '{facts,teams,home,points}',
        'away', result.snapshot #> '{facts,teams,away,points}'
      ) else null end)
    order by g.ordinal
  ), '[]'::jsonb)
  into items
  from jsonb_array_elements(page -> 'items') with ordinality as g(item, ordinal)
  left join public.published_games result
    on result.game_id = (g.item ->> 'id')::uuid
   and result.dispute_id = p_dispute_id;

  return jsonb_set(page, '{items}', items);
end;
$$;

create function public.list_admin_games_filtered(
  p_dispute_id uuid, p_query text, p_offset integer, p_sort text, p_direction text,
  p_team_id uuid, p_state text, p_date date
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.list_admin_games_filtered(p_dispute_id, p_query, p_offset, p_sort, p_direction, p_team_id, p_state, p_date);
$$;

create or replace function private.list_admin_games_with_scores(
  p_dispute_id uuid, p_query text, p_offset integer, p_sort text, p_direction text
) returns jsonb
language sql stable security definer set search_path = '' as $$
  select private.list_admin_games_filtered(
    p_dispute_id, p_query, p_offset, p_sort, p_direction, null, null, null
  );
$$;

revoke all on function private.list_games_ordered_filtered(uuid,text,integer,text,text,uuid,text,date),
  private.list_admin_games_filtered(uuid,text,integer,text,text,uuid,text,date),
  public.list_admin_games_filtered(uuid,text,integer,text,text,uuid,text,date)
  from public, anon, authenticated, service_role;
grant execute on function private.list_games_ordered_filtered(uuid,text,integer,text,text,uuid,text,date),
  private.list_admin_games_filtered(uuid,text,integer,text,text,uuid,text,date),
  public.list_admin_games_filtered(uuid,text,integer,text,text,uuid,text,date) to authenticated;
