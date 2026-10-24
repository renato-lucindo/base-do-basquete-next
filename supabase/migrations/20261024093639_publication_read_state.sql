-- P3a minimal administrative decision state, with no PDF details in this indicator.
create or replace function private.get_game_publication_state(p_game_id uuid,p_offset integer) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not exists(select 1 from public.admin_access where user_id=(select auth.uid()) and enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 if not exists(select 1 from public.games where id=p_game_id) then return null;end if;
 return jsonb_build_object('gameId',p_game_id,'requiresFallback',exists(select 1 from public.pdf_reviews r join public.pdf_sources so on so.id=r.source_id where r.game_id=p_game_id and so.ready) or coalesce((select snapshot->'source'->>'kind'='pdf' from public.published_games where game_id=p_game_id),false),'version',coalesce((select version from public.published_games where game_id=p_game_id),0),'published',(select snapshot from public.published_games where game_id=p_game_id),
 'history',(select coalesce(jsonb_agg(jsonb_build_object('version',version,'sourceKind',source_kind,'sourceVersion',source_version,'reason',reason,'actorId',published_by,'publishedAt',published_at) order by version desc),'[]'::jsonb) from(select * from private.game_publication_versions where game_id=p_game_id order by version desc limit 20 offset greatest(0,least(coalesce(p_offset,0),100000))) h),
 'hasMore',(select count(*)>20 from(select 1 from private.game_publication_versions where game_id=p_game_id order by version desc limit 21 offset greatest(0,least(coalesce(p_offset,0),100000))) h));
end$$;
