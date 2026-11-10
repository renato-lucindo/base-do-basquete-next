-- Keep the public game detail reader compatible with installations that
-- have not enabled the independent game draft feature yet. When drafts exist,
-- never bypass the private visibility head through a SECURITY DEFINER reader.
-- The previously published snapshot and detailed facts remain unchanged.
create or replace function public.get_public_game_detail(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare allowed boolean;
begin
  if pg_catalog.to_regclass('private.game_visibility_heads') is not null then
    -- Fail closed if visibility data exists but its predicate is unavailable.
    if pg_catalog.to_regprocedure('private.game_is_public(uuid)') is null then
      return null;
    end if;
    execute 'select private.game_is_public($1)' into allowed using p_id;
    if allowed is distinct from true then return null;end if;
  end if;
  return private.get_public_game_detail(p_id);
end$$;
