-- Post-upgrade reader assertions, run after publication.sql in its open rollback-only transaction.
update public.admin_access set enabled=true where user_id=pg_temp.pu_id(98);
set local role authenticated;
set local request.jwt.claim.sub='f9200000-0000-4000-8000-000000000098';
select pg_temp.pu_assert(public.get_game_publication_state(pg_temp.pu_id(9))->'requiresFallback'='true' and public.get_game_publication_state(pg_temp.pu_id(8))->'requiresFallback'='false','state reports manual fallback requirement without leaking PDF metadata');
select pg_temp.pu_assert(public.get_game_publication_state(pg_temp.pu_id(8))->>'gameId'=pg_temp.pu_id(8)::text,'reader correlates game ID');
select pg_temp.pu_assert(public.get_game_publication_state(pg_temp.pu_id(8))::text!~'storagePath|sha256|sourceId','state contains no private PDF metadata');
reset role;
