-- C2 fixtures are isolated by IDs and every change, including admin replacement, rolls back.
begin;
create function pg_temp.tm_id(n integer) returns uuid language sql immutable as $$
 select ('30000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid
$$;
create function pg_temp.tm_assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end
$$;
create function pg_temp.tm_error(statement text, state text) returns void language plpgsql as $$
begin begin execute statement; exception when others then if sqlstate=state then return; end if; raise; end;
raise exception 'Expected SQLSTATE %',state; end
$$;
create function pg_temp.tm_team(n integer default 0) returns jsonb language sql as $$
 select jsonb_build_object('commandId',pg_temp.tm_id(n+1),'expectedVersion',0,
 'team',jsonb_build_object('id',pg_temp.tm_id(n+2),'name','  Lobos   Clube ','abbreviation','LOB'))
$$;
create function pg_temp.tm_reg(n integer default 0) returns jsonb language sql as $$
 select jsonb_build_object('commandId',pg_temp.tm_id(n+3),'expectedVersion',0,
 'registration',jsonb_build_object('id',pg_temp.tm_id(n+4),'disputeId',pg_temp.tm_id(92),'teamId',pg_temp.tm_id(2),'name',case when n=0 then 'Lobos' else 'Lobos B' end))
$$;
grant execute on function pg_temp.tm_id(integer),pg_temp.tm_assert(boolean,text),pg_temp.tm_error(text,text),pg_temp.tm_team(integer),pg_temp.tm_reg(integer) to anon,authenticated,service_role;
delete from public.admin_access;
insert into auth.users(id) values(pg_temp.tm_id(98)),(pg_temp.tm_id(99));
insert into public.admin_access(user_id) values(pg_temp.tm_id(98));
insert into public.championships(id,name) values(pg_temp.tm_id(90),'C2 fixture');
insert into public.seasons(id,championship_id,year) values(pg_temp.tm_id(91),pg_temp.tm_id(90),2026);
insert into public.disputes(id,season_id,gender,category) values(pg_temp.tm_id(92),pg_temp.tm_id(91),'masculino','Adulto'),(pg_temp.tm_id(93),pg_temp.tm_id(91),'feminino','Adulto');
set local role anon;
select pg_temp.tm_error('select public.list_teams()','42501');
select pg_temp.tm_error('select public.save_team(pg_temp.tm_team())','42501');
set local role authenticated;
set local request.jwt.claim.sub='30000000-0000-4000-8000-000000000099';
select pg_temp.tm_assert(public.get_team(pg_temp.tm_id(2)) is null,'nonadmin cannot see teams');
select pg_temp.tm_error('select public.save_team(pg_temp.tm_team())','PT403');
set local request.jwt.claim.sub='30000000-0000-4000-8000-000000000098';
select pg_temp.tm_error($q$insert into public.teams(id,name) values(pg_temp.tm_id(60),'Bypass')$q$,'42501');
select pg_temp.tm_error('delete from public.registrations','42501');
select pg_temp.tm_assert((public.save_team(pg_temp.tm_team())->>'version')::int=1,'create team');
select pg_temp.tm_assert((public.save_team(pg_temp.tm_team())->>'version')::int=1,'replay same team command');
select pg_temp.tm_assert(public.get_team(pg_temp.tm_id(2))->>'name'='Lobos Clube','normalized name');
select pg_temp.tm_error($q$select public.save_team(jsonb_set(pg_temp.tm_team(),'{team,name}','"different"'))$q$,'PT409');
select public.save_registration(pg_temp.tm_reg());
select public.save_registration(pg_temp.tm_reg(10));
select pg_temp.tm_assert((public.list_registrations(pg_temp.tm_id(92))->'items') @> jsonb_build_array(jsonb_build_object('id',pg_temp.tm_id(4)),jsonb_build_object('id',pg_temp.tm_id(14))),'two registrations of same team');
select pg_temp.tm_assert((public.list_registrations(pg_temp.tm_id(93))->'items')='[]'::jsonb,'context isolation');
select public.save_registration(pg_temp.tm_reg());
select pg_temp.tm_assert((select count(*) from public.registrations where team_id=pg_temp.tm_id(2))=2,'no duplicate retry');
select pg_temp.tm_error($q$select public.save_registration(jsonb_set(jsonb_set(pg_temp.tm_reg(),'{commandId}',to_jsonb(pg_temp.tm_id(50))),'{expectedVersion}','0'))$q$,'PT409');
select pg_temp.tm_error($q$select public.save_registration(jsonb_set(jsonb_set(jsonb_set(pg_temp.tm_reg(),'{commandId}',to_jsonb(pg_temp.tm_id(51))),'{expectedVersion}','1'),'{registration,disputeId}',to_jsonb(pg_temp.tm_id(93))))$q$,'PT400');
select pg_temp.tm_error($q$select public.save_registration(jsonb_set(pg_temp.tm_reg(20),'{registration,teamId}',to_jsonb(pg_temp.tm_id(80))))$q$,'PT400');
select pg_temp.tm_assert(public.get_registration(pg_temp.tm_id(24)) is null,'missing parent leaves no partial registration');
select public.save_team(jsonb_set(jsonb_set(jsonb_set(pg_temp.tm_team(),'{commandId}',to_jsonb(pg_temp.tm_id(52))),'{expectedVersion}','1'),'{team,name}','"Lobos Renomeados"'));
select pg_temp.tm_assert(public.get_registration(pg_temp.tm_id(4))->>'name'='Lobos','global rename preserves public name');
select pg_temp.tm_assert(public.get_registration(pg_temp.tm_id(14))->'team'->>'name'='Lobos Renomeados','global identity retained');
select public.save_team(pg_temp.tm_team(60));
select pg_temp.tm_error($q$select public.save_registration(jsonb_set(jsonb_set(jsonb_set(pg_temp.tm_reg(),'{commandId}',to_jsonb(pg_temp.tm_id(53))),'{expectedVersion}','1'),'{registration,teamId}',to_jsonb(pg_temp.tm_id(62))))$q$,'PT400');
select pg_temp.tm_assert((public.save_registration(jsonb_set(jsonb_set(jsonb_set(pg_temp.tm_reg(),'{commandId}',to_jsonb(pg_temp.tm_id(54))),'{expectedVersion}','1'),'{registration,name}','"Lobos A"'))->>'version')::int=2,'public name can be edited');
select pg_temp.tm_assert(public.get_registration(pg_temp.tm_id(14))->>'name'='Lobos B','editing one registration preserves sibling');
select pg_temp.tm_assert((select count(*) from public.teams where id in (pg_temp.tm_id(2),pg_temp.tm_id(62)))=2,'same global name does not merge identities');
select pg_temp.tm_error($q$select public.save_team(jsonb_set(pg_temp.tm_team(70),'{team,name}','"  "'))$q$,'PT400');
select pg_temp.tm_assert(public.get_team(pg_temp.tm_id(72)) is null,'invalid team rolled back');
-- Read-only access does not touch competition Recentes or the C1 version.
create temp table tm_before as select saved_at,version from public.championships where id=pg_temp.tm_id(90);
select public.list_registrations(pg_temp.tm_id(92));
select public.list_teams('Lobos');
select pg_temp.tm_assert((select c.saved_at=b.saved_at and c.version=b.version and c.version=1 from public.championships c cross join tm_before b where c.id=pg_temp.tm_id(90)),'reads do not touch Recentes or C1 version');
select pg_temp.tm_assert((public.list_teams('not found')->'items')='[]'::jsonb,'search filters');
select pg_temp.tm_error('select * from private.team_commands','42501');
reset role;
update public.admin_access set enabled=false;
set local role authenticated;
select pg_temp.tm_assert(public.get_registration(pg_temp.tm_id(4)) is null,'revoked read');
select pg_temp.tm_error('select public.save_registration(pg_temp.tm_reg(30))','PT403');
select pg_temp.tm_error('select public.save_team(pg_temp.tm_team())','PT403');
set local role service_role;
select pg_temp.tm_error($q$insert into public.teams(id,name) values(pg_temp.tm_id(60),'Bypass')$q$,'42501');
reset role;
rollback;
