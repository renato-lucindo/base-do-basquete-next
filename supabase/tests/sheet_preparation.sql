-- Own synthetic business fixtures; no modification of the existing administrator. Entire proof rolls back.
begin;
create function pg_temp.sd_id(n integer) returns uuid language sql immutable as $$select ('fd300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.sd_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
create function pg_temp.sd_error(statement text,state text) returns void language plpgsql as $$begin begin execute statement;exception when others then if sqlstate=state then return;end if;raise;end;raise exception 'Expected SQLSTATE %',state;end$$;
create function pg_temp.sd_actor() returns uuid language sql security definer set search_path='' as $$select user_id from public.admin_access where enabled limit 1$$;
grant execute on function pg_temp.sd_id(integer),pg_temp.sd_assert(boolean,text),pg_temp.sd_error(text,text),pg_temp.sd_actor() to authenticated;
insert into public.championships(id,name) values(pg_temp.sd_id(1),'Desktop synthetic');
insert into public.seasons(id,championship_id,year) values(pg_temp.sd_id(2),pg_temp.sd_id(1),2026);
insert into public.disputes(id,season_id,gender,category) values(pg_temp.sd_id(3),pg_temp.sd_id(2),'masculino','Adulto');
insert into public.teams(id,name) values(pg_temp.sd_id(4),'Synthetic global');
insert into public.registrations(id,dispute_id,team_id,name) values(pg_temp.sd_id(5),pg_temp.sd_id(3),pg_temp.sd_id(4),'Synthetic A'),(pg_temp.sd_id(6),pg_temp.sd_id(3),pg_temp.sd_id(4),'Synthetic B');
insert into public.persons(id,name) select pg_temp.sd_id(200+n),'Synthetic athlete '||n from generate_series(1,25)n;
insert into private.athletes(person_id,sex) select pg_temp.sd_id(200+n),'male' from generate_series(1,25)n;
insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) select pg_temp.sd_id(100+n),pg_temp.sd_id(case when n<=23 then 5 else 6 end),pg_temp.sd_id(3),pg_temp.sd_id(200+n),case when n=1 then '00' when n=2 then '0' else n::text end from generate_series(1,25)n;
insert into public.games(id,dispute_id,home_registration_id,away_registration_id,scheduled_date) values
(pg_temp.sd_id(8),pg_temp.sd_id(3),pg_temp.sd_id(6),pg_temp.sd_id(5),'2026-10-20'),
(pg_temp.sd_id(9),pg_temp.sd_id(3),pg_temp.sd_id(5),pg_temp.sd_id(6),'2026-10-26'),
(pg_temp.sd_id(10),pg_temp.sd_id(3),pg_temp.sd_id(6),pg_temp.sd_id(5),'2026-12-01');
select set_config('request.jwt.claim.sub',pg_temp.sd_actor()::text,true);
set local role authenticated;
select public.save_game_sheet(jsonb_build_object('requestId',pg_temp.sd_id(80),'gameId',pg_temp.sd_id(8),'gameVersion',1,'baseVersion',0,'confirm',false,'reason','','document',jsonb_build_object('rulesVersion','FIBA_2024','periods',4,'participants',jsonb_build_array(jsonb_build_object('rosterEntryId',pg_temp.sd_id(124),'side','home','jersey','24','played',true,'starter',true),jsonb_build_object('rosterEntryId',pg_temp.sd_id(101),'side','away','jersey','77','played',true,'starter',true)),'staff',jsonb_build_object('home',jsonb_build_object('captainRosterEntryId',pg_temp.sd_id(124),'coachStaffEntryId',null,'assistantStaffEntryId',null),'away',jsonb_build_object('captainRosterEntryId',pg_temp.sd_id(101),'coachStaffEntryId',null,'assistantStaffEntryId',null)),'events','[]'::jsonb)));
reset role;
-- A future saved draft must not become the suggestion for the earlier target game.
select set_config('request.jwt.claim.sub',pg_temp.sd_actor()::text,true);
set local role authenticated;
select public.save_game_sheet(jsonb_build_object('requestId',pg_temp.sd_id(81),'gameId',pg_temp.sd_id(10),'gameVersion',1,'baseVersion',0,'confirm',false,'reason','','document',jsonb_build_object('rulesVersion','FIBA_2024','periods',4,'participants',jsonb_build_array(jsonb_build_object('rosterEntryId',pg_temp.sd_id(124),'side','home','jersey','24','played',true,'starter',false),jsonb_build_object('rosterEntryId',pg_temp.sd_id(101),'side','away','jersey','88','played',true,'starter',false)),'staff',jsonb_build_object('home',jsonb_build_object('captainRosterEntryId',null,'coachStaffEntryId',null,'assistantStaffEntryId',null),'away',jsonb_build_object('captainRosterEntryId',null,'coachStaffEntryId',null,'assistantStaffEntryId',null)),'events','[]'::jsonb)));
reset role;
-- PREPARATION_ASSERTIONS
set local role authenticated;
select pg_temp.sd_assert(public.get_game_sheet_preparation(pg_temp.sd_id(9))#>>'{sides,home,registrationId}'=pg_temp.sd_id(5)::text,'correct registration');
select pg_temp.sd_assert(jsonb_array_length(public.get_game_sheet_preparation(pg_temp.sd_id(9))#>'{sides,home,roster}')=23,'complete roster beyond first page');
select pg_temp.sd_assert(public.get_game_sheet_preparation(pg_temp.sd_id(9))#>>'{sides,home,previous,gameId}'=pg_temp.sd_id(8)::text,'previous oriented away to home, not future');
select pg_temp.sd_assert(public.get_game_sheet_preparation(pg_temp.sd_id(9))#>>array['sides','home','lastJerseys',pg_temp.sd_id(101)::text]='77','last game jersey rather than roster jersey');
select pg_temp.sd_assert(public.get_game_sheet_preparation(pg_temp.sd_id(9))#>>'{sides,home,previous,captainPersonId}'=pg_temp.sd_id(201)::text,'captain actual identity');
select pg_temp.sd_assert(public.get_game_sheet(pg_temp.sd_id(9)) is null,'read does not create a sheet');
select pg_temp.sd_error(format('select public.get_game_sheet_preparation(%L)',pg_temp.sd_id(999)),'PT404');
select set_config('request.jwt.claim.sub',pg_temp.sd_id(99)::text,true);
select pg_temp.sd_error(format('select public.get_game_sheet_preparation(%L)',pg_temp.sd_id(9)),'PT403');
reset role;
select pg_temp.sd_assert(not has_function_privilege('anon','public.get_game_sheet_preparation(uuid)','execute'),'anonymous denied');
rollback;
