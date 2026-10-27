begin;
create function pg_temp.rr_id(n integer) returns uuid language sql immutable as $$select ('a7300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.rr_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
create function pg_temp.rr_error(statement text,state text) returns void language plpgsql as $$begin begin execute statement;exception when others then if sqlstate=state then return;end if;raise;end;raise exception 'Expected %',state;end$$;
grant execute on function pg_temp.rr_id(integer),pg_temp.rr_assert(boolean,text),pg_temp.rr_error(text,text) to anon,authenticated;
insert into auth.users(id) values(pg_temp.rr_id(900)),(pg_temp.rr_id(901));
insert into public.admin_access(user_id) values(pg_temp.rr_id(900));
insert into public.championships(id,name) values(pg_temp.rr_id(1),'Reuso de elenco');
insert into public.seasons(id,championship_id,year) values(pg_temp.rr_id(2),pg_temp.rr_id(1),2026),(pg_temp.rr_id(3),pg_temp.rr_id(1),2025);
insert into public.disputes(id,season_id,gender,category) values
 (pg_temp.rr_id(10),pg_temp.rr_id(2),'feminino','Sub-23'),
 (pg_temp.rr_id(11),pg_temp.rr_id(2),'feminino','Adulto'),
 (pg_temp.rr_id(12),pg_temp.rr_id(2),'masculino','Adulto'),
 (pg_temp.rr_id(13),pg_temp.rr_id(3),'feminino','Adulto');
insert into public.teams(id,name) values(pg_temp.rr_id(20),'Lobos'),(pg_temp.rr_id(21),'Outra equipe');
insert into public.registrations(id,dispute_id,team_id,name) values
 (pg_temp.rr_id(30),pg_temp.rr_id(10),pg_temp.rr_id(20),'Lobos A'),
 (pg_temp.rr_id(31),pg_temp.rr_id(10),pg_temp.rr_id(20),'Lobos B'),
 (pg_temp.rr_id(32),pg_temp.rr_id(11),pg_temp.rr_id(20),'Lobos Adulto'),
 (pg_temp.rr_id(33),pg_temp.rr_id(11),pg_temp.rr_id(21),'Outra Adulto'),
 (pg_temp.rr_id(34),pg_temp.rr_id(12),pg_temp.rr_id(20),'Lobos Masculino'),
 (pg_temp.rr_id(35),pg_temp.rr_id(13),pg_temp.rr_id(20),'Lobos anterior'),
 (pg_temp.rr_id(36),pg_temp.rr_id(10),pg_temp.rr_id(21),'Outra Sub-23');
insert into public.persons(id,name,nickname) select pg_temp.rr_id(100+n),'Atleta '||n,case when n=1 then 'Primeira' end from generate_series(1,13) n;
insert into private.athletes(person_id,sex) select pg_temp.rr_id(100+n),'female' from generate_series(1,13) n;
insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey)
 select pg_temp.rr_id(200+n),pg_temp.rr_id(30),pg_temp.rr_id(10),pg_temp.rr_id(100+n),case when n=1 then '0' when n=2 then '00' when n=3 then null else n::text end from generate_series(1,11) n;
insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) values
 (pg_temp.rr_id(212),pg_temp.rr_id(31),pg_temp.rr_id(10),pg_temp.rr_id(112),'12'),
 (pg_temp.rr_id(301),pg_temp.rr_id(32),pg_temp.rr_id(11),pg_temp.rr_id(101),'99'),
 (pg_temp.rr_id(302),pg_temp.rr_id(33),pg_temp.rr_id(11),pg_temp.rr_id(102),'00'),
 (pg_temp.rr_id(304),pg_temp.rr_id(32),pg_temp.rr_id(11),pg_temp.rr_id(112),'4'),
 (pg_temp.rr_id(305),pg_temp.rr_id(35),pg_temp.rr_id(13),pg_temp.rr_id(113),'13'),
 (pg_temp.rr_id(306),pg_temp.rr_id(36),pg_temp.rr_id(10),pg_temp.rr_id(113),'13');
insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey,started_at,ended_at) values
 (pg_temp.rr_id(303),pg_temp.rr_id(33),pg_temp.rr_id(11),pg_temp.rr_id(103),null,'2026-01-01Z','2026-01-02Z');

-- REUSE_CONTEXT_ASSERTIONS
set local role anon;
select pg_temp.rr_error('select public.list_roster_reuse_sources(pg_temp.rr_id(32),0)','42501');
select pg_temp.rr_error('select public.get_roster_reuse_context(pg_temp.rr_id(30),pg_temp.rr_id(32))','42501');
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.rr_id(901)::text,true);
select pg_temp.rr_error('select public.list_roster_reuse_sources(pg_temp.rr_id(32),0)','PT403');
select pg_temp.rr_error('select public.get_roster_reuse_context(pg_temp.rr_id(30),pg_temp.rr_id(32))','PT403');
select set_config('request.jwt.claim.sub',pg_temp.rr_id(900)::text,true);
select pg_temp.rr_assert(jsonb_array_length(public.list_roster_reuse_sources(pg_temp.rr_id(32),0)->'items')=2,'A e B são origens explícitas, sem misturar ou incluir outra temporada/disputa destino');
select pg_temp.rr_assert((public.list_roster_reuse_sources(pg_temp.rr_id(32),0)->>'hasMore')::boolean=false,'página completa');
select pg_temp.rr_assert(jsonb_array_length(public.get_roster_reuse_context(pg_temp.rr_id(30),pg_temp.rr_id(32))->'candidates')=11,'os11atletas da origem disponíveis sem matching por nome');
select pg_temp.rr_assert(public.get_roster_reuse_context(pg_temp.rr_id(30),pg_temp.rr_id(32))#>>'{source,category}'='Sub-23','origem identificada');
select pg_temp.rr_assert(jsonb_array_length(public.get_roster_reuse_context(pg_temp.rr_id(30),pg_temp.rr_id(32))->'targetRoster')=2,'vínculos atuais do destino preservados');
select pg_temp.rr_error('select public.get_roster_reuse_context(pg_temp.rr_id(30),pg_temp.rr_id(31))','PT400');
select pg_temp.rr_error('select public.get_roster_reuse_context(pg_temp.rr_id(30),pg_temp.rr_id(33))','PT400');
select pg_temp.rr_error('select public.get_roster_reuse_context(pg_temp.rr_id(35),pg_temp.rr_id(32))','PT400');
select pg_temp.rr_error('select public.list_roster_reuse_sources(pg_temp.rr_id(999),0)','PT404');
select pg_temp.rr_error('select public.list_roster_reuse_sources(pg_temp.rr_id(32),-1)','PT400');
reset role;
