-- G4a pure helper proof. No person, game, source or Storage fixture is persisted.
begin;
create function pg_temp.pf_id(n integer) returns uuid language sql immutable as $$select ('f9100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.pf_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
create function pg_temp.pf_error(statement text,state text) returns void language plpgsql as $$begin begin execute statement;exception when others then if sqlstate=state then return;end if;raise;end;raise exception 'Expected SQLSTATE %',state;end$$;
create function pg_temp.pf_doc() returns jsonb language sql as $$
select jsonb_build_object('rulesVersion','FIBA_2024','periods',4,'participants',(select jsonb_agg(jsonb_build_object('rosterEntryId',pg_temp.pf_id(n),'side',case when n<=5 then 'home' else 'away' end,'jersey',case when n%5=1 then '0' when n%5=2 then '00' else (n%5+2)::text end,'played',true,'starter',true) order by n) from generate_series(1,10) n),'staff',jsonb_build_object('home',jsonb_build_object('captainRosterEntryId',pg_temp.pf_id(1),'coachStaffEntryId',null,'assistantStaffEntryId',null),'away',jsonb_build_object('captainRosterEntryId',pg_temp.pf_id(6),'coachStaffEntryId',null,'assistantStaffEntryId',null)),'events',jsonb_build_array(jsonb_build_object('id',pg_temp.pf_id(100),'side','home','period',4,'target','0','code','2')))
$$;
grant execute on function pg_temp.pf_id(integer),pg_temp.pf_doc(),pg_temp.pf_assert(boolean,text),pg_temp.pf_error(text,text) to anon,authenticated,service_role;
select pg_temp.pf_assert(private.final_sheet_facts(pg_temp.pf_doc())->'teams'->'home'->'points'='2','winner and actual points');
select pg_temp.pf_assert(private.final_sheet_facts(pg_temp.pf_doc())->'teams'->'home'->'periods'='[0,0,0,2]'::jsonb,'real periods');
select pg_temp.pf_assert(private.final_sheet_facts(pg_temp.pf_doc())->'players'->0->>'rosterEntryId'=pg_temp.pf_id(1)::text,'UUID not numeric engine slot');
select pg_temp.pf_assert(private.final_sheet_facts(pg_temp.pf_doc())->'players'->1->>'jersey'='00','00 distinct from 0');
select pg_temp.pf_assert(not(private.final_sheet_facts(pg_temp.pf_doc())->'players'->0 ? 'secondsPlayed'),'manual has no invented minutes');
select pg_temp.pf_error($q$select private.final_sheet_facts(jsonb_set(pg_temp.pf_doc(),'{events}','[]'))$q$,'PT400');
select pg_temp.pf_error($q$select private.final_sheet_facts(jsonb_set(pg_temp.pf_doc(),'{periods}','5'))$q$,'PT400');
select pg_temp.pf_assert(private.final_sheet_facts(jsonb_set(jsonb_set(pg_temp.pf_doc(),'{periods}','12'),'{events,0,period}','12'))->'teams'->'home'->'points'='2','up to OT8 with earlier ties');
select pg_temp.pf_error($q$select private.final_sheet_facts(jsonb_set(pg_temp.pf_doc(),'{periods}','13'))$q$,'PT400');
select pg_temp.pf_error($q$select private.final_sheet_facts(jsonb_set(pg_temp.pf_doc(),'{events,0,code}','"1"'))$q$,'PT400');
select pg_temp.pf_error($q$select private.final_sheet_facts(jsonb_set(pg_temp.pf_doc(),'{participants,0,starter}','false'))$q$,'PT400');
select pg_temp.pf_error($q$select private.final_sheet_facts(jsonb_set(pg_temp.pf_doc(),'{staff,home,captainRosterEntryId}','null'))$q$,'PT400');
select pg_temp.pf_assert(not has_function_privilege('anon','private.compute_sheet_facts(jsonb)','execute') and not has_function_privilege('authenticated','private.compute_sheet_facts(jsonb)','execute') and not has_function_privilege('service_role','private.final_sheet_facts(jsonb)','execute'),'private helpers have no API-role execute grant');
set local role authenticated;
select pg_temp.pf_error('select private.final_sheet_facts(pg_temp.pf_doc())','42501');
reset role;
set local role anon;
select pg_temp.pf_error('select private.compute_sheet_facts(pg_temp.pf_doc())','42501');
reset role;
rollback;
