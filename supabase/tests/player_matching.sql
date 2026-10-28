-- Synthetic identities only; uses an existing administrator as actor, never edits Auth/admins.
begin;
create function pg_temp.cm_id(n integer) returns uuid language sql immutable as $$select ('fd400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.cm_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
create function pg_temp.cm_probe(name text,reg text default null,nick text default null,dob text default null) returns jsonb language sql as $$select jsonb_build_array(jsonb_build_object('rowId',pg_temp.cm_id(900),'name',name,'nickname',nick,'birthDate',dob,'birthYear',null,'federationRegistration',reg))$$;
create function pg_temp.cm_matches(name text,reg text default null,nick text default null,dob text default null) returns jsonb language sql as $$select public.match_import_players(pg_temp.cm_id(92),pg_temp.cm_id(95),pg_temp.cm_probe(name,reg,nick,dob))->'items'->0$$;
grant execute on function pg_temp.cm_id(integer),pg_temp.cm_assert(boolean,text),pg_temp.cm_probe(text,text,text,text),pg_temp.cm_matches(text,text,text,text) to authenticated,anon;
insert into public.championships(id,name) values(pg_temp.cm_id(90),'Matching contract');
insert into public.seasons(id,championship_id,year) values(pg_temp.cm_id(91),pg_temp.cm_id(90),2026);
insert into public.disputes(id,season_id,gender,category) values(pg_temp.cm_id(92),pg_temp.cm_id(91),'feminino','Adulto');
insert into public.teams(id,name) values(pg_temp.cm_id(94),'Matching team');
insert into public.registrations(id,dispute_id,team_id,name) values(pg_temp.cm_id(95),pg_temp.cm_id(92),pg_temp.cm_id(94),'Matching registration');
insert into public.persons(id,name,nickname) values
 (pg_temp.cm_id(1),'João Silva',null),(pg_temp.cm_id(2),'João Pereira','JS'),
 (pg_temp.cm_id(3),'Luka Silva',null),(pg_temp.cm_id(4),'Guilherme Cruz Santos',null),
 (pg_temp.cm_id(5),'Zorvílio D''Ávila',null),(pg_temp.cm_id(6),'Zorvilio D Avila',null),
 (pg_temp.cm_id(7),'Alexandre Xis',null),(pg_temp.cm_id(8),'Alexandre Yps',null);
insert into private.athletes(person_id,sex,federation_registration,birth_date) values
 (pg_temp.cm_id(1),'female','194826','2000-01-01'),(pg_temp.cm_id(2),'female',null,'2000-01-01');
-- MATCHING_ASSERTIONS
select set_config('request.jwt.claim.sub',(select user_id::text from public.admin_access where enabled order by user_id limit 1),true);
set local role authenticated;
select pg_temp.cm_assert(not ((pg_temp.cm_matches('Joao Silva')->'candidates') @> jsonb_build_array(jsonb_build_object('id',pg_temp.cm_id(2)))),'first name alone never suggests another surname');
select pg_temp.cm_assert(not ((pg_temp.cm_matches('Joao')->'candidates') @> jsonb_build_array(jsonb_build_object('id',pg_temp.cm_id(1)))),'isolated given name does not suggest a full name');
select pg_temp.cm_assert(not ((pg_temp.cm_matches('Alexandre Xis')->'candidates') @> jsonb_build_array(jsonb_build_object('id',pg_temp.cm_id(8)))),'long given name cannot hide an unrelated short surname');
select pg_temp.cm_assert(not ((pg_temp.cm_matches('Pessoa Distinta',null,'JS','2000-01-01')->'candidates') @> jsonb_build_array(jsonb_build_object('id',pg_temp.cm_id(2)))),'nickname and date do not independently create a match');
select pg_temp.cm_assert((pg_temp.cm_matches('Luke Silva')->'candidates') @> jsonb_build_array(jsonb_build_object('id',pg_temp.cm_id(3))),'small spelling change remains reviewable');
select pg_temp.cm_assert((pg_temp.cm_matches('Guilherme Cruz Santo')->'candidates') @> jsonb_build_array(jsonb_build_object('id',pg_temp.cm_id(4))),'near full surname remains reviewable');
select pg_temp.cm_assert(pg_temp.cm_matches('ZORVILIO D-AVILA')->>'status'='ambiguous','accents punctuation spaces and homonyms retain distinct identities');
select pg_temp.cm_assert(pg_temp.cm_matches('Nome completamente diferente','194826')->>'status'='registration','federation identity precedes name');
select pg_temp.cm_assert(public.match_import_players_new_target(pg_temp.cm_id(92),pg_temp.cm_probe('Luke Silva'))->'items'->0->>'status'='suggestion','new target uses the same conservative matching');
select pg_temp.cm_assert(not has_function_privilege('anon','public.match_import_players(uuid,uuid,jsonb)','EXECUTE'),'anonymous cannot match private identities');
reset role;
select set_config('request.jwt.claim.sub','fd400000-0000-4000-8000-000000000099',true);
set local role authenticated;
do $$begin
 begin perform pg_temp.cm_matches('Joao Silva');exception when sqlstate 'PT403' then return;end;
 raise exception 'FAIL: non administrator must not match';
end$$;
reset role;
rollback;
