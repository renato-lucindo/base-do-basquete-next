-- Isolated identity fixtures, always rolled back. Never counts/deletes user product data.
begin;
create function pg_temp.p_id(n integer) returns uuid language sql immutable as $$select ('60000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.p_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end$$;
create function pg_temp.p_error(statement text,state text) returns void language plpgsql as $$begin begin execute statement; exception when others then if sqlstate=state then return; end if; raise; end; raise exception 'Expected %',state; end$$;
create function pg_temp.p_command(n integer default 0) returns jsonb language sql as $$
 select jsonb_build_object('commandId',pg_temp.p_id(n+1),'expectedVersion',0,'disputeId',null,'confirmHomonym',false,
 'person',jsonb_build_object('id',pg_temp.p_id(n+2),'name',case when n=0 then 'João da Silva' else 'Pessoa teste '||n::text end,'nickname',null,'publicBirthYear',null,
 'heightCm',null,'weightKg',null,'position',null,'dominantHand',null,'originCity',null,'originState',null,'biography',null,
 'coach',false,'athlete',jsonb_build_object('sex','male','birthDate','2000-02-29','federationRegistration',lpad((400000+n)::text,6,'0'))))
$$;
grant execute on function pg_temp.p_id(integer),pg_temp.p_assert(boolean,text),pg_temp.p_error(text,text),pg_temp.p_command(integer) to anon,authenticated;
delete from public.admin_access;
insert into auth.users(id) values(pg_temp.p_id(98)),(pg_temp.p_id(99));
insert into public.admin_access(user_id) values(pg_temp.p_id(98));
insert into public.championships(id,name) values(pg_temp.p_id(90),'C3 fixture');
insert into public.seasons(id,championship_id,year) values(pg_temp.p_id(91),pg_temp.p_id(90),2026);
insert into public.disputes(id,season_id,gender,category) values(pg_temp.p_id(92),pg_temp.p_id(91),'feminino','Adulto');
set local role anon;
select pg_temp.p_error('select public.list_persons()','42501');
select pg_temp.p_error('select * from private.athletes','42501');
set local role authenticated;
set local request.jwt.claim.sub='60000000-0000-4000-8000-000000000099';
select pg_temp.p_error('select public.save_person(pg_temp.p_command())','PT403');
set local request.jwt.claim.sub='60000000-0000-4000-8000-000000000098';
select pg_temp.p_error($q$insert into public.persons(id,name) values(pg_temp.p_id(70),'Bypass')$q$,'42501');
select pg_temp.p_assert((public.save_person(pg_temp.p_command())->>'version')::int=1,'new athlete');
select pg_temp.p_assert((public.save_person(pg_temp.p_command())->>'version')::int=1,'idempotent replay');
select pg_temp.p_error($q$select public.save_person(jsonb_set(pg_temp.p_command(),'{person,nickname}','"changed"'))$q$,'PT409');
select pg_temp.p_error($q$insert into private.athletes(person_id,sex) values(pg_temp.p_id(70),'male')$q$,'42501');
select pg_temp.p_assert(public.get_person(pg_temp.p_id(2))->'athlete'->>'sex'='male','private details only in authorized response');
select pg_temp.p_error($q$select public.save_person(jsonb_set(pg_temp.p_command(10),'{person,name}','"  JOAO da SILVA  "'))$q$,'PT409');
select public.save_person(jsonb_set(jsonb_set(pg_temp.p_command(10),'{person,name}','"  JOAO da SILVA  "'),'{confirmHomonym}','true'));
select pg_temp.p_assert((select count(*)=2 from public.persons where id in (pg_temp.p_id(2),pg_temp.p_id(12))),'confirmed homonyms stay distinct');
select pg_temp.p_assert((public.save_person(jsonb_set(jsonb_set(jsonb_set(pg_temp.p_command(),'{commandId}',to_jsonb(pg_temp.p_id(3))),'{expectedVersion}','1'),'{person,coach}','true'))->>'version')::int=2,'add coach to same person');
select pg_temp.p_assert(exists(select 1 from public.coaches where person_id=pg_temp.p_id(2)) and exists(select 1 from private.athletes where person_id=pg_temp.p_id(2)),'own coach table shares person identity');
select pg_temp.p_error($q$select public.save_person(jsonb_set(pg_temp.p_command(),'{commandId}',to_jsonb(pg_temp.p_id(4))))$q$,'PT409');
select pg_temp.p_error($q$select public.save_person(jsonb_set(jsonb_set(jsonb_set(pg_temp.p_command(),'{commandId}',to_jsonb(pg_temp.p_id(5))),'{expectedVersion}','2'),'{person,coach}','false'))$q$,'PT400');
-- Context supplies sex of new athletes and cannot silently rewrite an existing athlete.
select pg_temp.p_error($q$select public.save_person(jsonb_set(pg_temp.p_command(20),'{disputeId}',to_jsonb(pg_temp.p_id(92))))$q$,'PT400');
select pg_temp.p_assert(public.get_person(pg_temp.p_id(22)) is null,'mismatch leaves no person or receipt');
select public.save_person(jsonb_set(jsonb_set(jsonb_set(pg_temp.p_command(20),'{disputeId}',to_jsonb(pg_temp.p_id(92))),'{person,athlete,sex}','"female"'),'{confirmHomonym}','true'));
select pg_temp.p_error($q$select public.save_person(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(pg_temp.p_command(),'{commandId}',to_jsonb(pg_temp.p_id(6))),'{expectedVersion}','2'),'{person,coach}','true'),'{disputeId}',to_jsonb(pg_temp.p_id(92))),'{person,athlete,sex}','"female"'))$q$,'PT400');
select pg_temp.p_assert(public.get_person(pg_temp.p_id(2))->'athlete'->>'sex'='male','existing sex preserved');
select pg_temp.p_error($q$select public.save_person(jsonb_set(pg_temp.p_command(30),'{person,athlete,birthDate}','"2001-02-29"'))$q$,'PT400');
select pg_temp.p_assert(public.get_person(pg_temp.p_id(32)) is null,'invalid date rolled back');
select public.save_person(jsonb_set(jsonb_set(pg_temp.p_command(40),'{person,athlete}','null'),'{person,coach}','true'));
select pg_temp.p_assert(public.get_person(pg_temp.p_id(42))->'athlete'='null'::jsonb and (public.get_person(pg_temp.p_id(42))->>'coach')::boolean,'coach does not require athlete identity or private sex');
select pg_temp.p_assert((public.list_persons('joao','athlete')->'items') @> jsonb_build_array(jsonb_build_object('id',pg_temp.p_id(2)),jsonb_build_object('id',pg_temp.p_id(12))),'normalized search returns homonyms distinctly');
select pg_temp.p_assert((public.list_persons('Pessoa teste 40','athlete')->'items')='[]'::jsonb,'role filter excludes coach-only identity');
select pg_temp.p_error('select * from private.person_commands','42501');
reset role;
select pg_temp.p_assert(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='persons' and column_name in ('sex','birth_date','federation_registration')),'private athlete columns absent from public profile table');
update public.admin_access set enabled=false;
set local role authenticated;
select pg_temp.p_assert(public.get_person(pg_temp.p_id(2)) is null,'revocation hides person');
select pg_temp.p_assert((select count(*) from private.athletes)=0,'revocation hides private details');
select pg_temp.p_error('select public.save_person(pg_temp.p_command())','PT403');
reset role;
rollback;
