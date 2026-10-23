-- Fixed unsaved-target operation: avoid optional/null ambiguity in generated RPC argument types.
create function public.match_import_players_new_target(p_dispute_id uuid,p_players jsonb) returns jsonb language sql stable security invoker set search_path='' as $$select public.match_import_players(p_dispute_id,null,p_players)$$;
revoke all on function public.match_import_players_new_target(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.match_import_players_new_target(uuid,jsonb) to authenticated;
