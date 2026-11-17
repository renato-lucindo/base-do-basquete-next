begin;
create function pg_temp.age_id(n integer) returns uuid language sql immutable as $$
  select ('c3220000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid
$$;
create function pg_temp.age_assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end
$$;
create function pg_temp.age_command(n integer, target integer, person integer) returns jsonb language sql as $$
  select jsonb_build_object('commandId',pg_temp.age_id(n),'expectedVersion',0,'entry',
    jsonb_build_object('id',pg_temp.age_id(n+1000),'registrationId',pg_temp.age_id(target),
      'personId',pg_temp.age_id(person),'jersey',null,'active',true))
$$;
grant execute on function pg_temp.age_id(integer),pg_temp.age_assert(boolean,text),pg_temp.age_command(integer,integer,integer) to authenticated;
insert into auth.users(id) values (pg_temp.age_id(100));
insert into public.admin_access(user_id) values (pg_temp.age_id(100));
insert into public.championships(id,name) values (pg_temp.age_id(1),'Categorias etárias');
insert into public.seasons(id,championship_id,year) values (pg_temp.age_id(2),pg_temp.age_id(1),2020);
insert into public.disputes(id,season_id,gender,category) values
  (pg_temp.age_id(10),pg_temp.age_id(2),'feminino','ASa'),
  (pg_temp.age_id(11),pg_temp.age_id(2),'masculino','asda'),
  (pg_temp.age_id(12),pg_temp.age_id(2),'feminino','sub 17'),
  (pg_temp.age_id(13),pg_temp.age_id(2),'feminino','Master 50'),
  (pg_temp.age_id(14),pg_temp.age_id(2),'feminino','Sub-22'),
  (pg_temp.age_id(15),pg_temp.age_id(2),'masculino','Categoria histórica');
insert into public.teams(id,name) values (pg_temp.age_id(20),'Equipe etária');
insert into public.registrations(id,dispute_id,team_id,name)
  select pg_temp.age_id(30+n),pg_temp.age_id(n),pg_temp.age_id(20),'Equipe etária'
  from generate_series(10,14) n;
insert into public.persons(id,name,public_birth_year)
  select pg_temp.age_id(n),'Atleta '||n,year
  from (values (101,2006),(102,1999),(103,null),(104,null),(105,1970),(106,1957),(107,1973),
    (108,1997),(109,1996),(110,1995),(111,1994),(112,1997)) p(n,year);
insert into private.athletes(person_id,sex,birth_date,birth_year)
  select pg_temp.age_id(n),'female',case when n=102 then date '2003-12-31' end,
    case when n=103 then 2002 end
  from generate_series(101,112) n;

-- AFTER_AGE_MIGRATION
select pg_temp.age_assert((select count(*)=2 from public.disputes
  where id in (pg_temp.age_id(10),pg_temp.age_id(11)) and category='Adulto' and category_kind='adult' and category_age is null),'mapear os dois aliases sem trocar IDs');
select pg_temp.age_assert((select category='Sub-17' and category_kind='base' and category_age=17
  from public.disputes where id=pg_temp.age_id(12)),'Base normalizada');
select pg_temp.age_assert((select category='50+' and category_kind='master' and category_age=50
  from public.disputes where id=pg_temp.age_id(13)),'Master normalizada');
select pg_temp.age_assert((select category='Categoria histórica' and category_kind is null
  from public.disputes where id=pg_temp.age_id(15)),'rótulo legado preservado');

set local role authenticated;
set local request.jwt.claim.sub='c3220000-0000-4000-8000-000000000100';
select pg_temp.age_assert(not (public.save_roster_entry(pg_temp.age_command(201,42,101),true) ? 'ageWarning'),'Sub-17 aceita 14');
select pg_temp.age_assert(not (public.save_roster_entry(pg_temp.age_command(202,42,102),true) ? 'ageWarning'),'Sub-17 aceita 17 pelo ano da temporada e data completa');
select pg_temp.age_assert((public.save_roster_entry(pg_temp.age_command(203,42,103),true)->'ageWarning')
  = '{"code":"above_maximum","age":18,"category":"Sub-17"}','ano parcial informa aviso sem bloquear');
select pg_temp.age_assert(not (public.save_roster_entry(pg_temp.age_command(204,42,104),true) ? 'ageWarning'),'nascimento ausente');
select pg_temp.age_assert(not (public.save_roster_entry(pg_temp.age_command(205,43,105),true) ? 'ageWarning'),'Master aceita o mínimo');
select pg_temp.age_assert(not (public.save_roster_entry(pg_temp.age_command(206,43,106),true) ? 'ageWarning'),'Master aceita 63');
select pg_temp.age_assert((public.save_roster_entry(pg_temp.age_command(207,43,107),true)->'ageWarning')
  = '{"code":"below_minimum","age":47,"category":"50+"}','Master avisa aos 47');
select pg_temp.age_assert(not (public.save_roster_entry(pg_temp.age_command(207,43,107)) ? 'ageWarning'),'RPC legada omite aviso e recupera o mesmo vínculo');
select pg_temp.age_assert(not (public.save_roster_entry(pg_temp.age_command(208,44,108),true) ? 'ageWarning'),'primeira vaga Sub-22');
select pg_temp.age_assert(not (public.save_roster_entry(pg_temp.age_command(209,44,109),true) ? 'ageWarning'),'segunda vaga Sub-22');
select pg_temp.age_assert((public.save_roster_entry(pg_temp.age_command(210,44,110),true)#>>'{ageWarning,code}')='sub22_quota','terceira vaga Sub-22');
select pg_temp.age_assert((public.save_roster_entry(pg_temp.age_command(211,44,111),true)#>>'{ageWarning,code}')='above_maximum','26 anos excede a exceção');
select pg_temp.age_assert(not (public.save_roster_entry(pg_temp.age_command(215,40,111),true) ? 'ageWarning'),'Adulto sem aviso');
select public.save_roster_entry(jsonb_set(jsonb_set(jsonb_set(pg_temp.age_command(208,44,108),
  '{commandId}',to_jsonb(pg_temp.age_id(212))),'{expectedVersion}','1'),'{entry,active}','false'),true);
select public.save_roster_entry(jsonb_set(jsonb_set(jsonb_set(pg_temp.age_command(209,44,109),
  '{commandId}',to_jsonb(pg_temp.age_id(213))),'{expectedVersion}','1'),'{entry,active}','false'),true);
select pg_temp.age_assert(not (public.save_roster_entry(pg_temp.age_command(214,44,112),true) ? 'ageWarning'),'saídas liberam a vaga');
select pg_temp.age_assert((public.save_roster_entry(pg_temp.age_command(210,44,110),true)#>>'{ageWarning,code}')='sub22_quota','replay preserva aviso original');
select pg_temp.age_assert(public.get_roster_entry(pg_temp.age_id(1210))->>'active'='true','aviso não bloqueia a inscrição');
rollback;
