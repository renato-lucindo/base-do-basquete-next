-- The list exposes only confirmed totals, including results hidden from public routes.
create function private.list_admin_games_with_scores(
  p_dispute_id uuid, p_query text, p_offset integer, p_sort text, p_direction text
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  page jsonb;
  items jsonb;
begin
  if not exists (select from public.admin_access where user_id = auth.uid() and enabled) then
    raise sqlstate 'PT403' using message = 'forbidden';
  end if;

  page := public.list_games_ordered(p_dispute_id, p_query, p_offset, p_sort, p_direction);
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

create function public.list_admin_games_with_scores(
  p_dispute_id uuid, p_query text, p_offset integer, p_sort text, p_direction text
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.list_admin_games_with_scores(p_dispute_id, p_query, p_offset, p_sort, p_direction);
$$;

revoke all on function private.list_admin_games_with_scores(uuid,text,integer,text,text),
  public.list_admin_games_with_scores(uuid,text,integer,text,text)
  from public, anon, authenticated, service_role;
grant execute on function private.list_admin_games_with_scores(uuid,text,integer,text,text),
  public.list_admin_games_with_scores(uuid,text,integer,text,text) to authenticated;
