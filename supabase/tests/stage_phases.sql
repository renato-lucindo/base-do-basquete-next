-- Run after publication.sql with its final ROLLBACK removed. All fixture changes
-- are transactional and are rolled back at the end of this contract.
reset role;
create temporary table phase_before_game as
 select game_id,version,snapshot from public.published_games order by game_id;
create temporary table phase_before_players as
 select person_id,game_id,publication_version,
        (snapshot #- '{fact,phase}'::text[]) - 'statisticsVersion'::text as numerical_fact
 from public.published_player_games order by person_id,game_id;
select pg_temp.pu_assert(
 (select count(*)=2 from public.published_statistics_games where dispute_id=pg_temp.pu_id(3)),
 'fixture has two confirmed games');
select pg_temp.pu_assert(
 (select count(*)=22 from public.published_player_games where dispute_id=pg_temp.pu_id(3)),
 'published participation fixture intact');
select pg_temp.pu_assert(
 (select bool_and(stage_kind='round_robin') from public.games where dispute_id=pg_temp.pu_id(3)),
 'existing and new games default to regular');
-- Editing game metadata alone cannot publish any phase or create a version.
create temporary table phase_before_head as select version from public.published_statistics where dispute_id=pg_temp.pu_id(3);
create temporary table phase_before_public as select game_id,phase from public.published_statistics_games where dispute_id=pg_temp.pu_id(3);
update public.games set stage_kind='knockout',version=version+1 where id=pg_temp.pu_id(8);
select pg_temp.pu_assert((select version=(select version from phase_before_head) from public.published_statistics where dispute_id=pg_temp.pu_id(3)),
 'private editor does not publish a new version');
select pg_temp.pu_assert((select bool_and(p.phase is not distinct from b.phase) from public.published_statistics_games p join phase_before_public b using(game_id)),
 'private editor does not expose a new phase');
update public.admin_access set enabled=true where user_id=pg_temp.pu_id(98);
create function pg_temp.phase_command(n integer,games jsonb) returns jsonb language sql as $$
 select jsonb_build_object('requestId',pg_temp.pu_id(n),'disputeId',pg_temp.pu_id(3),
  'baseStatisticsVersion',(select version from public.published_statistics where dispute_id=pg_temp.pu_id(3)),
  'reason','Revisão explícita da etapa do jogo publicada.','games',games)
$$;
create function pg_temp.phase_game(n integer) returns jsonb language sql as $$
 select jsonb_build_object('gameId',g.id,'gameVersion',g.version,'publicationVersion',p.version,
  'previousPhase',m.phase) from public.games g join public.published_games p on p.game_id=g.id
 join public.published_statistics_games m on m.game_id=g.id where g.id=pg_temp.pu_id(n)
$$;
grant execute on function pg_temp.phase_command(integer,jsonb),pg_temp.phase_game(integer) to authenticated;
create temporary table phase_intent as select pg_temp.phase_command(9700,jsonb_build_array(pg_temp.phase_game(8))) as c;
grant select on phase_intent to authenticated;
set local role anon;
select pg_temp.pu_error('select public.confirm_game_stages((select c from phase_intent))','42501');
set local role authenticated;
set local request.jwt.claim.sub='f9200000-0000-4000-8000-000000000099';
select pg_temp.pu_error('select public.confirm_game_stages((select c from phase_intent))','PT403');
set local request.jwt.claim.sub='f9200000-0000-4000-8000-000000000098';
select pg_temp.pu_assert((public.confirm_game_stages((select c from phase_intent))->>'changedGameCount')::integer=1,
 'explicit correction creates one atomic version');
select pg_temp.pu_assert((public.confirm_game_stages((select c from phase_intent))->>'changedGameCount')::integer=1,
 'same request replays one receipt');
select pg_temp.pu_error($q$select public.confirm_game_stages(jsonb_set((select c from phase_intent),'{reason}','"Different intent"'))$q$,'PT409');
reset role;
select pg_temp.pu_assert((select version=(select version+1 from phase_before_head) from public.published_statistics where dispute_id=pg_temp.pu_id(3)),
 'one new head');
select pg_temp.pu_assert((select phase='knockout' from public.published_statistics_games where game_id=pg_temp.pu_id(8)),
 'knockout reaches public games');
select pg_temp.pu_assert((select bool_and(snapshot#>>'{fact,phase}'='knockout') from public.published_player_games where game_id=pg_temp.pu_id(8)),
 'knockout reaches all player projections');
select pg_temp.pu_assert((select bool_and(statistics_version=(select version from public.published_statistics where dispute_id=pg_temp.pu_id(3))) from public.published_player_games where game_id=pg_temp.pu_id(8)),
 'affected player projections share committed head version');
select pg_temp.pu_assert((select count(*)=1 from private.statistics_publication_changes
 where dispute_id=pg_temp.pu_id(3) and version=(select version from public.published_statistics where dispute_id=pg_temp.pu_id(3))),
 'history stores only changed game and its phase');
select pg_temp.pu_assert(
 (select bool_and(a.version=b.version and a.snapshot=b.snapshot)
 from public.published_games a join phase_before_game b using(game_id)), 'results and immutable snapshots unchanged');
select pg_temp.pu_assert(
 (select count(*)=0 from (
  (select person_id,game_id,publication_version,numerical_fact from phase_before_players
   except select person_id,game_id,publication_version,(snapshot #- '{fact,phase}'::text[]) - 'statisticsVersion'::text from public.published_player_games)
  union all
  (select person_id,game_id,publication_version,(snapshot #- '{fact,phase}'::text[]) - 'statisticsVersion'::text from public.published_player_games
   except select person_id,game_id,publication_version,numerical_fact from phase_before_players)
 ) x), 'scores, individual numbers, participation and provenance remain identical');
-- A new command for the ALREADY published phase is a version-free no-op.
set local role authenticated;
select pg_temp.pu_assert((public.confirm_game_stages(pg_temp.phase_command(9701,jsonb_build_array(pg_temp.phase_game(8))))->>'changedGameCount')::integer=0,
 'already-correct phase consumes no new statistics version');
reset role;
select pg_temp.pu_assert((select version=(select version+1 from phase_before_head) from public.published_statistics where dispute_id=pg_temp.pu_id(3)),
 'no-op kept head version');
-- A stale expected head, or duplicated game, must not partially publish.
set local role authenticated;
select pg_temp.pu_error($q$select public.confirm_game_stages(jsonb_set(pg_temp.phase_command(9702,jsonb_build_array(pg_temp.phase_game(8))),'{baseStatisticsVersion}',to_jsonb(1)))$q$,'PT409');
select pg_temp.pu_error($q$select public.confirm_game_stages(pg_temp.phase_command(9703,jsonb_build_array(pg_temp.phase_game(8),pg_temp.phase_game(8))))$q$,'PT400');
reset role;
-- Simulate a failure after the version is inserted; the whole write must roll back.
update public.games set stage_kind='round_robin',version=version+1 where id=pg_temp.pu_id(8);
create temporary table phase_retry as select pg_temp.phase_command(9704,jsonb_build_array(pg_temp.phase_game(8))) as c;
grant select on phase_retry to authenticated;
create function pg_temp.phase_fail() returns trigger language plpgsql as $$begin raise exception 'fixture phase failure';end$$;
create trigger phase_fixture_failure before insert on private.statistics_publication_changes
 for each row execute function pg_temp.phase_fail();
set local role authenticated;
select pg_temp.pu_error('select public.confirm_game_stages((select c from phase_retry))','P0001');
reset role;
select pg_temp.pu_assert((select phase='knockout' from public.published_statistics_games where game_id=pg_temp.pu_id(8)),
 'failed metadata version did not update public phase');
select pg_temp.pu_assert(not exists(select 1 from private.statistics_phase_commands where request_id=pg_temp.pu_id(9704)),
 'failed command does not persist a receipt');
drop trigger phase_fixture_failure on private.statistics_publication_changes;
set local role authenticated;
select pg_temp.pu_assert((public.confirm_game_stages((select c from phase_retry))->>'changedGameCount')::integer=1,
 'same intent retries cleanly');
reset role;
select pg_temp.pu_assert((select phase='round_robin' from public.published_statistics_games where game_id=pg_temp.pu_id(8)),
 'regular is restored by explicit publication');
-- Batch both games into ONE version, with two incremental history entries.
update public.games set stage_kind='knockout',version=version+1 where id in(pg_temp.pu_id(8),pg_temp.pu_id(9));
create temporary table phase_batch as select pg_temp.phase_command(9705,jsonb_build_array(pg_temp.phase_game(8),pg_temp.phase_game(9))) as c;
grant select on phase_batch to authenticated;
create temporary table phase_before_batch as select version from public.published_statistics where dispute_id=pg_temp.pu_id(3);
set local role authenticated;
select pg_temp.pu_assert((public.confirm_game_stages((select c from phase_batch))->>'changedGameCount')::integer=2,
 'batch confirmation updates both games');
reset role;
select pg_temp.pu_assert((select version=(select version+1 from phase_before_batch) from public.published_statistics where dispute_id=pg_temp.pu_id(3)),
 'batch created exactly one history version');
select pg_temp.pu_assert((select count(*)=2 from private.statistics_publication_changes
 where dispute_id=pg_temp.pu_id(3) and version=(select version from public.published_statistics where dispute_id=pg_temp.pu_id(3))),
 'batch history identifies both updates');
select pg_temp.pu_assert((select bool_and(m.phase='knockout' and
 (select bool_and(p.snapshot#>>'{fact,phase}'='knockout') from public.published_player_games p where p.game_id=m.game_id))
 from public.published_statistics_games m where m.dispute_id=pg_temp.pu_id(3)),
 'public source and all player projections remain consistent');
select pg_temp.pu_assert((select count(*)=22 from public.published_player_games where dispute_id=pg_temp.pu_id(3)),
 'no participant duplication');
select pg_temp.pu_assert((select bool_and(a.version=b.version and a.snapshot=b.snapshot)
 from public.published_games a join phase_before_game b using(game_id)), 'game results unchanged after batch');
select pg_temp.pu_error('update private.statistics_phase_commands set actor_id=actor_id','PT409');
select pg_temp.pu_assert((select relrowsecurity from pg_class where oid='private.statistics_phase_commands'::regclass),
 'phase command ledger protected by RLS');
rollback;
