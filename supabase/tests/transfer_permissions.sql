-- Run inside the rolled-back publication.sql + regulation.sql fixture transaction.
reset role;
create temp table tp_publications as select * from private.game_publication_versions;
create temp table tp_old_rules as select * from private.regulation_versions;
grant select on tp_old_rules to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.pu_id(98)::text,true);
select pg_temp.pu_assert(not(public.get_regulation_version(pg_temp.pu_id(3),1)->'definition' ? 'transfers'),'legacy rule has no inferred transfer permission');
create temp table tp_command as select jsonb_set(pg_temp.rg_command(80,2),'{definition}',(public.get_regulation_state(pg_temp.pu_id(3))->'definition')||'{"transfers":"allowed"}'::jsonb) as command;
select pg_temp.pu_assert(public.save_regulation((select command from tp_command))->'version'='3','explicit transfer permission saved through authorized regulation writer');
select pg_temp.pu_assert(public.get_regulation_state(pg_temp.pu_id(3))#>>'{definition,transfers}'='allowed','permission read from current regulation');
select pg_temp.pu_assert(public.save_regulation((select command from tp_command))->'version'='3','same command replays without another version');
select pg_temp.pu_assert(public.save_regulation(jsonb_set(pg_temp.rg_command(81,3),'{definition}',(public.get_regulation_state(pg_temp.pu_id(3))->'definition')||'{"transfers":"forbidden"}'::jsonb))->'version'='4','permission may be revoked explicitly');
select pg_temp.pu_assert(public.save_regulation(jsonb_set(pg_temp.rg_command(82,4),'{definition}',(public.get_regulation_state(pg_temp.pu_id(3))->'definition')||'{"transfers":null}'::jsonb))->'version'='5','null restores pending configuration, never implicit allowance');
select pg_temp.pu_assert(public.get_regulation_version(pg_temp.pu_id(3),3)#>>'{definition,transfers}'='allowed','historical permission immutable');
reset role;
select pg_temp.pu_assert(not exists((select * from tp_old_rules except select * from private.regulation_versions) union all (select * from private.regulation_versions where version<=2 except select * from tp_old_rules)),'old regulation versions unchanged');
select pg_temp.pu_assert(not exists((select * from tp_publications except select * from private.game_publication_versions) union all (select * from private.game_publication_versions except select * from tp_publications)),'G4 publications unchanged');
select 'transfer permission SQL contract PASS' as result;
