-- Own synthetic IDs only, including the temporary admin. Always roll back.
begin;
create function pg_temp.rm_id(n integer) returns uuid language sql immutable as $$select ('f9500000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.rm_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
create function pg_temp.rm_error(statement text,state text) returns void language plpgsql as $$begin begin execute statement;exception when others then if sqlstate=state then return;end if;raise;end;raise exception 'Expected SQLSTATE %',state;end$$;
create function pg_temp.rm_command(n integer default 10,c integer default 510) returns jsonb language sql as $$select jsonb_build_object('commandId',pg_temp.rm_id(c),'registrationId',pg_temp.rm_id(n),'disputeId',pg_temp.rm_id(92),'expectedVersion',1)$$;
create function pg_temp.rm_create(n integer) returns jsonb language sql as $$select jsonb_build_object('commandId',pg_temp.rm_id(n+1000),'expectedVersion',0,'registration',jsonb_build_object('id',pg_temp.rm_id(n),'disputeId',pg_temp.rm_id(92),'teamId',pg_temp.rm_id(2),'name','Reserva '||n))$$;
grant execute on function pg_temp.rm_id(integer),pg_temp.rm_assert(boolean,text),pg_temp.rm_error(text,text),pg_temp.rm_command(integer,integer),pg_temp.rm_create(integer) to anon,authenticated,service_role;
insert into auth.users(id) values(pg_temp.rm_id(98)),(pg_temp.rm_id(99));
insert into public.admin_access(user_id) values(pg_temp.rm_id(98));
insert into public.championships(id,name) values(pg_temp.rm_id(90),'Removal fixture');
insert into public.seasons(id,championship_id,year) values(pg_temp.rm_id(91),pg_temp.rm_id(90),2026);
insert into public.disputes(id,season_id,gender,category) values(pg_temp.rm_id(92),pg_temp.rm_id(91),'masculino','Adulto'),(pg_temp.rm_id(93),pg_temp.rm_id(91),'feminino','Adulto');
insert into public.teams(id,name) values(pg_temp.rm_id(2),'Mesmo clube');
set local role authenticated;
set local request.jwt.claim.sub='f9500000-0000-4000-8000-000000000098';
select public.save_registration(pg_temp.rm_create(n)) from generate_series(10,17) n;
reset role;
insert into public.persons(id,name) values(pg_temp.rm_id(201),'Homônimo sintético');
insert into private.athletes(person_id,sex) values(pg_temp.rm_id(201),'male');
insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey,started_at,ended_at)
 values(pg_temp.rm_id(70),pg_temp.rm_id(12),pg_temp.rm_id(92),pg_temp.rm_id(201),'00','2025-01-01Z','2025-12-01Z');
insert into public.games(id,dispute_id,home_registration_id,away_registration_id)
 values(pg_temp.rm_id(80),pg_temp.rm_id(92),pg_temp.rm_id(13),pg_temp.rm_id(11));
-- Stored pending targets are dependencies even before they are prepared/linked.
insert into private.text_reviews(id,actor_id,dispute_id,registration_id,document)
 values(pg_temp.rm_id(61),pg_temp.rm_id(98),pg_temp.rm_id(92),pg_temp.rm_id(14),'{}'),
 (pg_temp.rm_id(62),pg_temp.rm_id(98),pg_temp.rm_id(92),null,jsonb_build_object('target',jsonb_build_object('registrationId',upper(pg_temp.rm_id(15)::text))));
insert into public.persons(id,name) values(pg_temp.rm_id(202),'Técnico sintético');
insert into public.coaches(person_id) values(pg_temp.rm_id(202));
insert into public.staff_entries(id,registration_id,dispute_id,person_id,role)
 values(pg_temp.rm_id(72),pg_temp.rm_id(16),pg_temp.rm_id(92),pg_temp.rm_id(202),'head');

-- REMOVAL PROOF
set local role anon;
select pg_temp.rm_error('select public.get_registration_removal_context(pg_temp.rm_id(10),pg_temp.rm_id(92))','42501');
select pg_temp.rm_error('select public.remove_registration(pg_temp.rm_command())','42501');
set local role authenticated;
set local request.jwt.claim.sub='f9500000-0000-4000-8000-000000000099';
select pg_temp.rm_error('select public.get_registration_removal_context(pg_temp.rm_id(10),pg_temp.rm_id(92))','PT403');
select pg_temp.rm_error('select public.remove_registration(pg_temp.rm_command())','PT403');
set local request.jwt.claim.sub='f9500000-0000-4000-8000-000000000098';
select pg_temp.rm_assert(public.get_registration_removal_context(pg_temp.rm_id(10),pg_temp.rm_id(92))->>'state'='available','empty registration is eligible');
select pg_temp.rm_error('select public.get_registration_removal_context(pg_temp.rm_id(10),pg_temp.rm_id(93))','PT404');
select pg_temp.rm_error('select public.remove_registration(pg_temp.rm_command()||jsonb_build_object(''disputeId'',pg_temp.rm_id(93)))','PT404');
select pg_temp.rm_error('select public.remove_registration(pg_temp.rm_command()||jsonb_build_object(''canRemove'',true))','PT400');
select pg_temp.rm_error('select public.remove_registration(jsonb_set(pg_temp.rm_command(),''{expectedVersion}'',''0''))','PT400');
select pg_temp.rm_error('select public.remove_registration(jsonb_set(pg_temp.rm_command(),''{expectedVersion}'',''2''))','PT409');
select pg_temp.rm_error('delete from public.registrations where id=pg_temp.rm_id(10)','42501');
select pg_temp.rm_error('select * from private.registration_removals','42501');
select pg_temp.rm_assert(public.get_registration_removal_context(pg_temp.rm_id(12),pg_temp.rm_id(92))->'blockers' @> '["roster"]','inactive history blocks removal');
select pg_temp.rm_error('select public.remove_registration(pg_temp.rm_command(12,512))','PT409');
select pg_temp.rm_assert(public.get_registration_removal_context(pg_temp.rm_id(13),pg_temp.rm_id(92))->'blockers' @> '["games"]','unpublished agenda is a dependency');
select pg_temp.rm_error('select public.remove_registration(pg_temp.rm_command(13,513))','PT409');
select pg_temp.rm_assert(public.get_registration_removal_context(pg_temp.rm_id(14),pg_temp.rm_id(92))->'blockers' @> '["text_review"]','linked text draft blocks');
select pg_temp.rm_assert(public.get_registration_removal_context(pg_temp.rm_id(15),pg_temp.rm_id(92))->'blockers' @> '["text_review"]','JSON pending target blocks');
select pg_temp.rm_assert(public.get_registration_removal_context(pg_temp.rm_id(16),pg_temp.rm_id(92))->'blockers' @> '["staff"]','staff blocks');
select pg_temp.rm_error('select public.remove_registration(pg_temp.rm_command(14,514))','PT409');
select pg_temp.rm_error('select public.remove_registration(pg_temp.rm_command(15,515))','PT409');
select pg_temp.rm_error('select public.remove_registration(pg_temp.rm_command(16,516))','PT409');
select pg_temp.rm_assert(public.get_registration(pg_temp.rm_id(12)) is not null and public.get_registration(pg_temp.rm_id(13)) is not null,'blocked rows intact');
select pg_temp.rm_assert(public.remove_registration(pg_temp.rm_command())=jsonb_build_object('state','removed','id',pg_temp.rm_id(10),'disputeId',pg_temp.rm_id(92),'deletedVersion',1),'confirmed minimal ACK');
select pg_temp.rm_assert(public.remove_registration(pg_temp.rm_command())=public.get_registration_removal_context(pg_temp.rm_id(10),pg_temp.rm_id(92)),'replay and recovery read agree');
select pg_temp.rm_assert(public.get_registration(pg_temp.rm_id(10)) is null,'registration physically removed');
select pg_temp.rm_assert(public.get_registration(pg_temp.rm_id(11)) is not null and public.get_team(pg_temp.rm_id(2)) is not null,'sister and team preserved');
select pg_temp.rm_error('select public.remove_registration(pg_temp.rm_command(10,511))','PT409');
select pg_temp.rm_error('select public.remove_registration(pg_temp.rm_command()||jsonb_build_object(''registrationId'',pg_temp.rm_id(14)))','PT409');
select pg_temp.rm_assert(public.save_registration(pg_temp.rm_create(10))->>'id'=pg_temp.rm_id(10)::text,'old creation ACK remains an ACK');
select pg_temp.rm_assert(public.get_registration(pg_temp.rm_id(10)) is null,'old ACK did not resurrect registration');
select pg_temp.rm_error('select public.save_registration(pg_temp.rm_create(10)||jsonb_build_object(''commandId'',pg_temp.rm_id(1510)))','PT409');
reset role;
select pg_temp.rm_assert((select count(*)=1 from private.registration_removals where registration_id=pg_temp.rm_id(10)),'exactly one removal receipt');
select pg_temp.rm_assert((select count(*)=1 from private.registration_removals where actor_id=pg_temp.rm_id(98)),'no receipts on failure');
select pg_temp.rm_error('update private.registration_removals set deleted_version=2 where registration_id=pg_temp.rm_id(10)','PT403');
select pg_temp.rm_error('delete from private.registration_removals where registration_id=pg_temp.rm_id(10)','PT403');
update public.admin_access set enabled=false where user_id=pg_temp.rm_id(98);
set local role authenticated;
select pg_temp.rm_error('select public.remove_registration(pg_temp.rm_command())','PT403');
select pg_temp.rm_error('select public.get_registration_removal_context(pg_temp.rm_id(10),pg_temp.rm_id(92))','PT403');
reset role;
rollback;
