-- Privacy guard for the public detail introduced by 20261110130218.
-- Keep detailed public game data available, but never bypass the game draft
-- visibility policy through a SECURITY DEFINER reader.
CREATE OR REPLACE FUNCTION public.get_public_game_detail(p_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO '' AS $$
  SELECT CASE
    WHEN private.game_is_public(p_id)
    THEN private.get_public_game_detail(p_id)
    ELSE NULL::jsonb
  END
$$;