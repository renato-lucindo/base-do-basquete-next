-- Runs in the open rolled-back G4 publication fixture transaction.
reset role;
select pg_temp.pu_assert(private.context_keys('{}'::jsonb,array['wo']) is false,'missing required keys are false, not NULL');
select pg_temp.pu_assert(private.context_keys('{}'::jsonb,array[]::text[]) is true,'closed empty object accepts an explicitly empty key set');
select pg_temp.pu_assert(private.context_keys('[]'::jsonb,array[]::text[]) is false,'array is not a closed object');
create or replace function pg_temp.pu_error(statement text,state text) returns void language plpgsql as $$begin begin execute statement;exception when others then if sqlstate=state then return;end if;raise exception 'Expected SQLSTATE %, got %: %',state,sqlstate,sqlerrm;end;raise exception 'Expected SQLSTATE %',state;end$$;
create function pg_temp.rg_restrict(statement text,expected_constraint text) returns void language plpgsql as $$declare blocked_constraint text;begin
 begin execute statement;exception when others then get stacked diagnostics blocked_constraint=constraint_name;
 if sqlstate in('23503','23001') and blocked_constraint=expected_constraint then return;end if;raise;end;
 raise exception 'Expected restricted historical reference %',expected_constraint;
end$$;
update public.admin_access set enabled=true;
insert into public.registrations(id,dispute_id,team_id,name) values(pg_temp.pu_id(604),pg_temp.pu_id(3),pg_temp.pu_id(4),'Third registration');
insert into public.disputes(id,season_id,gender,category) values(pg_temp.pu_id(605),pg_temp.pu_id(2),'feminino','Adulto');
insert into public.registrations(id,dispute_id,team_id,name) values(pg_temp.pu_id(606),pg_temp.pu_id(605),pg_temp.pu_id(4),'Foreign home'),(pg_temp.pu_id(608),pg_temp.pu_id(605),pg_temp.pu_id(4),'Foreign away');
insert into public.games(id,dispute_id,home_registration_id,away_registration_id) values(pg_temp.pu_id(607),pg_temp.pu_id(605),pg_temp.pu_id(606),pg_temp.pu_id(608));
insert into auth.users(id) values(pg_temp.pu_id(97));
insert into public.games(id,dispute_id,home_registration_id,away_registration_id) values(pg_temp.pu_id(600),pg_temp.pu_id(3),pg_temp.pu_id(5),pg_temp.pu_id(6));
create function pg_temp.rg_definition() returns jsonb language sql as $$select jsonb_build_object(
 'registrationIds',jsonb_build_array(pg_temp.pu_id(5),pg_temp.pu_id(6)),'occurrenceRules',jsonb_build_object('wo',null),
 'groupPhases',jsonb_build_array(jsonb_build_object('phaseId',pg_temp.pu_id(610),'name','Fase inicial','rules',jsonb_build_object('format','round_robin','points',jsonb_build_object('win',2,'loss',1),'tieBreakers',jsonb_build_array('point_difference')),
 'groups',jsonb_build_array(jsonb_build_object('id',pg_temp.pu_id(611),'name','Grupo A','registrationIds',jsonb_build_array(pg_temp.pu_id(5),pg_temp.pu_id(6)),'gameIds',jsonb_build_array(pg_temp.pu_id(8),pg_temp.pu_id(9),pg_temp.pu_id(600)))))),
 'knockoutPhases',jsonb_build_array(jsonb_build_object('id',pg_temp.pu_id(620),'name','Finais')),'series','[]'::jsonb)$$;
create function pg_temp.rg_command(n integer default 1,expected integer default 0) returns jsonb language sql as $$select jsonb_build_object(
 'commandId',pg_temp.pu_id(700+n),'disputeId',pg_temp.pu_id(3),'expectedVersion',expected,
 'expectedContextFingerprint',public.get_regulation_state(pg_temp.pu_id(3))->'contextFingerprint',
 'definition',pg_temp.rg_definition(),'reason','Regulamento conferido com os resultados existentes.','acknowledgeImpact',true)$$;
grant execute on function pg_temp.rg_definition(),pg_temp.rg_command(integer,integer) to anon,authenticated,service_role;
update public.championships set saved_at='2000-01-01T00:00:00Z' where id=pg_temp.pu_id(1);
set local role anon;
select pg_temp.pu_error('select public.get_regulation_state(pg_temp.pu_id(3))','42501');
select pg_temp.pu_error('select public.get_regulation_version(pg_temp.pu_id(3),1)','42501');
select pg_temp.pu_error('select public.save_regulation(''{}''::jsonb)','42501');
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.pu_id(99)::text,true);
select pg_temp.pu_error('select public.get_regulation_state(pg_temp.pu_id(3))','PT403');
select set_config('request.jwt.claim.sub',pg_temp.pu_id(98)::text,true);
select pg_temp.pu_assert(public.get_regulation_state(pg_temp.pu_id(3))->'version'='0','new regulation has no invented head');
select pg_temp.pu_assert(jsonb_array_length(public.get_regulation_state(pg_temp.pu_id(3))#>'{context,publishedGames}')=2,'minimal current facts from G4 only');
select pg_temp.pu_assert(not jsonb_path_exists(public.get_regulation_state(pg_temp.pu_id(3))->'context','$.**.participants'),'no athlete snapshots in competitive context');
select pg_temp.pu_error('select * from private.regulation_heads','42501');
select pg_temp.pu_error('select public.save_regulation(pg_temp.rg_command()||''{"actorId":"f9200000-0000-4000-8000-000000000099"}''::jsonb)','PT400');
select pg_temp.pu_error('select public.save_regulation(pg_temp.rg_command()||''{"acknowledgeImpact":false}''::jsonb)','PT400');
select pg_temp.pu_error('select public.save_regulation(pg_temp.rg_command()||''{"reason":""}''::jsonb)','PT400');
select pg_temp.pu_error('select public.save_regulation(pg_temp.rg_command()||jsonb_build_object(''expectedContextFingerprint'',repeat(''b'',64)))','PT409');
select pg_temp.pu_error('select public.save_regulation(pg_temp.rg_command(1,1))','PT409');
select pg_temp.pu_error('select public.save_regulation(jsonb_set(pg_temp.rg_command(),''{definition,formula}'',''"rank()"''))','PT400');
select pg_temp.pu_error('select public.save_regulation(jsonb_set(pg_temp.rg_command(),''{definition,registrationIds,0}'',to_jsonb(pg_temp.pu_id(999))))','PT400');
select pg_temp.pu_error('select public.save_regulation(jsonb_set(pg_temp.rg_command(),''{definition,groupPhases,0,groups,0,gameIds,0}'',to_jsonb(pg_temp.pu_id(999))))','PT400');
select pg_temp.pu_error('select public.save_regulation(pg_temp.rg_command()||jsonb_build_object(''definition'',pg_temp.rg_definition()||jsonb_build_object(''groupPhases'',''[]''::jsonb,''registrationIds'',jsonb_build_array(pg_temp.pu_id(606)))))','PT400');
select pg_temp.pu_error('select public.save_regulation(jsonb_set(pg_temp.rg_command(),''{definition,groupPhases,0,groups,0,gameIds,0}'',to_jsonb(pg_temp.pu_id(607))))','PT400');
select pg_temp.pu_error('select public.save_regulation(jsonb_set(pg_temp.rg_command(),''{definition,groupPhases,0,rules,tieBreakers}'',''["wins","wins"]''))','PT400');
select pg_temp.pu_assert(public.save_regulation(pg_temp.rg_command())->'version'='1','save head version1');
select pg_temp.pu_assert(public.save_regulation(pg_temp.rg_command())->'version'='1','identical command replay');
select pg_temp.pu_error('select public.save_regulation(pg_temp.rg_command()||''{"reason":"Pedido alterado com mesma chave"}''::jsonb)','PT409');
-- Trusted fixture-only reassignment preserves the single-operator constraint.
reset role;
update public.admin_access set user_id=pg_temp.pu_id(97);
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.pu_id(97)::text,true);
select pg_temp.pu_error('select public.save_regulation(pg_temp.rg_command())','PT403');
reset role;
update public.admin_access set user_id=pg_temp.pu_id(98);
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.pu_id(98)::text,true);
reset role;
select pg_temp.pu_assert((select count(*) from private.regulation_versions)=1,'single immutable version');
select pg_temp.pu_assert((select count(*) from private.regulation_game_links)=3,'anchors include unpublished scheduled game');
select pg_temp.pu_assert((select count(*) from private.regulation_registration_links)=2,'contextual registration anchors');
select pg_temp.pu_assert((select saved_at>'2000-01-01T00:00:00Z' from public.championships where id=pg_temp.pu_id(1)),'new save touches Recentes');
select pg_temp.pu_assert((select count(*) from private.game_publication_versions)=3,'G4 history unchanged');
select pg_temp.pu_error('update public.games set away_registration_id=pg_temp.pu_id(604),version=version+1 where id=pg_temp.pu_id(600)','PT409');
select pg_temp.pu_error('update private.regulation_versions set reason=''rewrite''','PT409');
select pg_temp.pu_error('delete from private.regulation_game_links','PT409');
update public.championships set saved_at='2001-01-01T00:00:00Z' where id=pg_temp.pu_id(1);
set local role authenticated;
select pg_temp.pu_assert(public.save_regulation(pg_temp.rg_command())->'version'='1','replay ACK unchanged');
select pg_temp.pu_assert(public.get_regulation_version(pg_temp.pu_id(3),1)->>'algorithmVersion'='organized-v1','historical algorithm fixed');
select pg_temp.pu_assert(public.get_regulation_version(pg_temp.pu_id(3),999) is null,'missing history version absent');
reset role;
select pg_temp.pu_assert((select saved_at='2001-01-01T00:00:00Z' from public.championships where id=pg_temp.pu_id(1)),'replay and reads do not touch Recentes');
create temp table rg_frozen(command jsonb);
insert into rg_frozen select pg_temp.rg_command(2,1);
grant select on rg_frozen to authenticated;
update public.games set venue='Agenda alterada',version=version+1 where id=pg_temp.pu_id(600);
set local role authenticated;
select pg_temp.pu_error('select public.save_regulation((select command from rg_frozen))','PT409');
select pg_temp.pu_assert(public.save_regulation(jsonb_set(pg_temp.rg_command(2,1),'{definition,groupPhases,0,groups,0,gameIds}',jsonb_build_array(pg_temp.pu_id(8),pg_temp.pu_id(9))))->'version'='2','review after context changed, remove assignment without deleting game');
select pg_temp.pu_assert(jsonb_array_length(public.get_regulation_state(pg_temp.pu_id(3))->'history')=2,'history visible only to administrator');
select pg_temp.pu_assert(jsonb_array_length(public.get_regulation_state(pg_temp.pu_id(3),20)->'history')=0,'history paging');
select pg_temp.pu_assert((public.get_regulation_version(pg_temp.pu_id(3),1)#>>'{context,games,2,version}')::integer=1,'historical agenda version preserved');
reset role;
update public.games set away_registration_id=pg_temp.pu_id(604),version=version+1 where id=pg_temp.pu_id(600);
select pg_temp.rg_restrict('delete from public.games where id=pg_temp.pu_id(600)','regulation_game_links_game_id_dispute_id_fkey');
update public.admin_access set enabled=false;
set local role authenticated;
select pg_temp.pu_error('select public.save_regulation(pg_temp.rg_command())','PT403');
select pg_temp.pu_error('select public.get_regulation_state(pg_temp.pu_id(3))','PT403');
set local role service_role;
select pg_temp.pu_error('select public.get_regulation_state(pg_temp.pu_id(3))','42501');
select pg_temp.pu_error('select public.save_regulation(''{}''::jsonb)','42501');
reset role;
update public.admin_access set enabled=true;
select 'regulation SQL contract PASS' as result;
