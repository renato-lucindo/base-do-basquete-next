-- Additional writer invariants after transfers.sql; the entire fixture rolls back.
reset role;
update public.admin_access set enabled=true;
select set_config('request.jwt.claim.sub',pg_temp.pu_id(98)::text,true);
create function pg_temp.tr_rejected(statement text,expected_state text) returns void language plpgsql as $$
declare before_state jsonb;after_state jsonb;
begin
 select jsonb_build_object('roster',(select jsonb_agg(to_jsonb(r) order by r.id) from public.roster_entries r),
 'receipts',(select jsonb_agg(to_jsonb(t) order by t.command_id) from private.roster_transfers t),
 'recent',(select jsonb_agg(to_jsonb(c) order by c.id) from public.championships c)) into before_state;
 perform pg_temp.pu_error(statement,expected_state);
 select jsonb_build_object('roster',(select jsonb_agg(to_jsonb(r) order by r.id) from public.roster_entries r),
 'receipts',(select jsonb_agg(to_jsonb(t) order by t.command_id) from private.roster_transfers t),
 'recent',(select jsonb_agg(to_jsonb(c) order by c.id) from public.championships c)) into after_state;
 perform pg_temp.pu_assert(before_state=after_state,'refused command preserves source/destination/receipt/Recentes');
end$$;
select pg_temp.tr_rejected('select public.transfer_roster_entry(pg_temp.tr_command(10,pg_temp.pu_id(51004),pg_temp.pu_id(6)))','PT400');
select pg_temp.tr_rejected('select public.transfer_roster_entry(pg_temp.tr_command(10,pg_temp.pu_id(51004),pg_temp.pu_id(5))||jsonb_build_object(''newEntryId'',pg_temp.pu_id(51002)))','PT400');
select pg_temp.tr_rejected('select public.transfer_roster_entry(pg_temp.tr_command(10,pg_temp.pu_id(51004),pg_temp.pu_id(5))||''{"expectedSourceVersion":99}''::jsonb)','PT409');
select pg_temp.tr_rejected('select public.transfer_roster_entry(pg_temp.tr_command(10,pg_temp.pu_id(51004),pg_temp.pu_id(5))||''{"expectedDestinationVersion":99}''::jsonb)','PT409');
select pg_temp.tr_rejected('select public.transfer_roster_entry(pg_temp.tr_command(10,pg_temp.pu_id(51004),pg_temp.pu_id(5))||''{"expectedRegulationVersion":99}''::jsonb)','PT409');
select pg_temp.tr_rejected('select public.transfer_roster_entry(pg_temp.tr_command(10,pg_temp.pu_id(51004),pg_temp.pu_id(5))||jsonb_build_object(''reason'',repeat('' '',17000)||''Motivo''))','PT400');
select pg_temp.tr_rejected('select public.transfer_roster_entry(pg_temp.tr_command(10,pg_temp.pu_id(51004),pg_temp.pu_id(5))||jsonb_build_object(''disputeId'',pg_temp.pu_id(605)))','PT400');
select pg_temp.tr_rejected('select public.transfer_roster_entry(pg_temp.tr_command(10,pg_temp.pu_id(51004),pg_temp.pu_id(5))||jsonb_build_object(''destinationRegistrationId'',pg_temp.pu_id(606)))','PT400');
select pg_temp.rg_restrict('delete from public.roster_entries where id=pg_temp.pu_id(51003)','roster_transfers_source_entry_id_fkey');
select pg_temp.tr_rejected($q$do $$begin
 insert into private.roster_transfers select (jsonb_populate_record(null::private.roster_transfers,to_jsonb(t)||jsonb_build_object('command_id',pg_temp.pu_id(55000),'new_entry_id',pg_temp.pu_id(55001)))).* from private.roster_transfers t limit 1;
 set constraints all immediate;
end$$;$q$,'23503');
select pg_temp.pu_assert((select relrowsecurity from pg_class where oid='private.roster_transfers'::regclass),'private audit has RLS');
select pg_temp.pu_assert(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name) where has_table_privilege(r.name,'private.roster_transfers','SELECT,INSERT,UPDATE,DELETE')),'no direct table grants');
select pg_temp.pu_assert(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name) where has_function_privilege(r.name,'private.valid_roster_transfer_command(jsonb)','EXECUTE')),'validator has no direct grants');

-- A policy change blocks a fresh command, but an old receipt remains an ACK only.
set local role authenticated;
select public.save_regulation(jsonb_set(pg_temp.rg_command(92,3),'{definition}',(public.get_regulation_state(pg_temp.pu_id(3))->'definition')||'{"transfers":"forbidden"}'::jsonb));
reset role;
select pg_temp.tr_rejected('select public.transfer_roster_entry(pg_temp.tr_command(10,pg_temp.pu_id(51004),pg_temp.pu_id(5)))','PT400');
set local role authenticated;
select pg_temp.pu_assert(public.transfer_roster_entry((select command from tr_frozen))=(select result from tr_first),'policy change cannot execute an old command again');
select public.save_regulation(jsonb_set(pg_temp.rg_command(93,4),'{definition}',(public.get_regulation_state(pg_temp.pu_id(3))->'definition')||'{"transfers":"allowed"}'::jsonb));
reset role;

savepoint transfer_sex;
update public.roster_entries set ended_at=clock_timestamp(),version=version+1 where id=pg_temp.pu_id(51004);
create temp table tr_sex as select pg_temp.tr_command(10,pg_temp.pu_id(51004),pg_temp.pu_id(5)) command;
update private.athletes set sex='female' where person_id=pg_temp.pu_id(201);
select pg_temp.tr_rejected('select public.transfer_roster_entry((select command from tr_sex))','PT400');
rollback to transfer_sex;

-- Published/PDF contexts already lock gender. Preserve that guard instead of
-- disabling it to manufacture a state the product cannot create.
select pg_temp.tr_rejected('update public.disputes set gender=''feminino'' where id=pg_temp.pu_id(3)','PT400');
savepoint transfer_gender_guard;
update public.roster_entries set ended_at=clock_timestamp(),version=version+1 where dispute_id=pg_temp.pu_id(3) and ended_at is null;
select pg_temp.tr_rejected('update public.disputes set gender=''feminino'' where id=pg_temp.pu_id(3)','PT409');
rollback to transfer_gender_guard;

savepoint transfer_clock;
update public.roster_entries set started_at=clock_timestamp()+interval '1 day' where id=pg_temp.pu_id(51004);
select pg_temp.tr_rejected('select public.transfer_roster_entry(pg_temp.tr_command(10,pg_temp.pu_id(51004),pg_temp.pu_id(5)))','PT400');
rollback to transfer_clock;

savepoint transfer_capacity;
insert into public.persons(id,name) select pg_temp.pu_id(70000+n),'Capacity player '||n from generate_series(1,1990) n;
insert into private.athletes(person_id,sex) select pg_temp.pu_id(70000+n),'male' from generate_series(1,1990) n;
insert into public.roster_entries(id,person_id,dispute_id,registration_id,jersey) select pg_temp.pu_id(90000+n),pg_temp.pu_id(70000+n),pg_temp.pu_id(3),pg_temp.pu_id(5),null from generate_series(1,1989) n;
savepoint transfer_boundary;
set local role authenticated;
select pg_temp.pu_assert(jsonb_array_length(public.get_transfer_context(pg_temp.pu_id(51004),pg_temp.pu_id(5))->'memberships')=1999,'boundary source is complete');
select public.transfer_roster_entry(pg_temp.tr_command(5,pg_temp.pu_id(51004),pg_temp.pu_id(5))||'{"jersey":"89"}'::jsonb);
select pg_temp.pu_assert(jsonb_array_length(public.get_transfer_context(pg_temp.pu_id(51005),pg_temp.pu_id(5))->'memberships')=2000,'successful opening stays readable at the limit');
rollback to transfer_boundary;
insert into public.roster_entries(id,person_id,dispute_id,registration_id,jersey) values(pg_temp.pu_id(91990),pg_temp.pu_id(71990),pg_temp.pu_id(3),pg_temp.pu_id(5),null);
select pg_temp.tr_rejected('select public.transfer_roster_entry(pg_temp.tr_command(5,pg_temp.pu_id(51004),pg_temp.pu_id(5))||''{"jersey":"89"}''::jsonb)','PT413');
rollback to transfer_capacity;
select pg_temp.pu_assert(not exists((select * from tr_publications except select * from private.game_publication_versions) union all (select * from private.game_publication_versions except select * from tr_publications)),'edge cases preserve every G4 publication');
select 'transfer edge SQL contract PASS' as result;
