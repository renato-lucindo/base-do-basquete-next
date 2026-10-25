-- Read-only transfer context: run after publication.sql + regulation.sql in rollback.
reset role;
-- Owner-only historical fixture bootstrap, inside this rollback transaction. This
-- does not exercise/relax product authorization; transfers.sql proves the guard enabled.
do $$declare guarded boolean;begin
 guarded:=exists(select 1 from pg_trigger where tgrelid='public.roster_entries'::regclass and tgname='roster_transfer_required');
 if guarded then alter table public.roster_entries disable trigger roster_transfer_required;end if;
 insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey,started_at,ended_at)
 values(pg_temp.pu_id(800),pg_temp.pu_id(6),pg_temp.pu_id(3),pg_temp.pu_id(201),'0','2000-01-01Z','2001-01-01Z');
 if guarded then alter table public.roster_entries enable trigger roster_transfer_required;end if;
end$$;
create temp table tc_publications as select * from private.game_publication_versions;
update public.championships set saved_at='2000-01-01Z' where id=pg_temp.pu_id(1);
set local role anon;
select pg_temp.pu_error('select public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6))','42501');
set local role service_role;
select pg_temp.pu_error('select public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6))','42501');
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.pu_id(99)::text,true);
select pg_temp.pu_error('select public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6))','PT403');
select set_config('request.jwt.claim.sub',pg_temp.pu_id(98)::text,true);
select pg_temp.pu_error('select private.transfer_context(pg_temp.pu_id(3),pg_temp.pu_id(201),pg_temp.pu_id(6))','42501');
select pg_temp.pu_error('select public.get_transfer_context(pg_temp.pu_id(999),pg_temp.pu_id(6))','PT404');
select pg_temp.pu_error('select public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(606))','PT400');
select pg_temp.pu_assert(public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6))#>'{regulation,transfers}'='null'::jsonb,'old rule remains unconfigured');
select pg_temp.pu_assert(public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6))->'personId'=to_jsonb(pg_temp.pu_id(201)),'person derived from source, never supplied by browser');
select pg_temp.pu_assert(jsonb_array_length(public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6))->'memberships')=7,'full source history plus all active destination occupants');
select pg_temp.pu_assert(not jsonb_path_exists(public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6)),'$.**.birthDate'),'no private person fields');
select pg_temp.pu_assert(not jsonb_path_exists(public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6)),'$.**.actorId'),'no actor/history metadata');
create temp table tc_fingerprint as select public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6))->'contextFingerprint' as fingerprint;
select pg_temp.pu_assert(public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6))->'contextFingerprint'=(select fingerprint from tc_fingerprint),'clock is excluded from fingerprint');
select public.save_regulation(jsonb_set(pg_temp.rg_command(90,2),'{definition}',(public.get_regulation_state(pg_temp.pu_id(3))->'definition')||'{"transfers":"allowed"}'::jsonb));
select pg_temp.pu_assert(public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6))#>>'{regulation,transfers}'='allowed','reads current authorized rule');
select pg_temp.pu_assert(public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6))->'contextFingerprint'<>(select fingerprint from tc_fingerprint),'rule version affects transfer fingerprint');
reset role;
update tc_fingerprint set fingerprint=private.transfer_context(pg_temp.pu_id(3),pg_temp.pu_id(201),pg_temp.pu_id(6))->'contextFingerprint';
update public.roster_entries set jersey='77',version=version+1 where id=pg_temp.pu_id(106);
select pg_temp.pu_assert(private.transfer_context(pg_temp.pu_id(3),pg_temp.pu_id(201),pg_temp.pu_id(6))->'contextFingerprint'<>(select fingerprint from tc_fingerprint),'destination occupancy affects fingerprint');
update public.championships set saved_at='2000-01-01Z' where id=pg_temp.pu_id(1);
set local role authenticated;
select public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6));
reset role;
select pg_temp.pu_assert((select saved_at='2000-01-01Z' from public.championships where id=pg_temp.pu_id(1)),'reads do not change Recentes');
select pg_temp.pu_assert(not exists((select * from tc_publications except select * from private.game_publication_versions) union all (select * from private.game_publication_versions except select * from tc_publications)),'reading context never reassigns G4');
update public.admin_access set enabled=false;
set local role authenticated;
select pg_temp.pu_error('select public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6))','PT403');
reset role;
update public.admin_access set enabled=true;
select 'transfer context SQL contract PASS' as result;
