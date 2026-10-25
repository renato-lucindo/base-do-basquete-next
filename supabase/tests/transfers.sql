-- T2b2 writer contract, after publication.sql + regulation.sql, always rolled back.
reset role;
create function pg_temp.tr_command(n integer default 1,source_id uuid default null,destination uuid default null) returns jsonb language sql volatile as $$
 select jsonb_build_object('commandId',pg_temp.pu_id(50000+n),'disputeId',ctx->'disputeId',
 'sourceEntryId',coalesce(source_id,pg_temp.pu_id(101)),
 'expectedSourceVersion',(select m->'version' from jsonb_array_elements(ctx->'memberships') m where m->>'id'=coalesce(source_id,pg_temp.pu_id(101))::text),
 'destinationRegistrationId',coalesce(destination,pg_temp.pu_id(6)),
 'expectedDestinationVersion',(select r->'version' from jsonb_array_elements(ctx->'registrations') r where r->>'id'=coalesce(destination,pg_temp.pu_id(6))::text),
 'expectedRegulationVersion',ctx#>'{regulation,version}','expectedContextFingerprint',ctx->'contextFingerprint',
 'newEntryId',pg_temp.pu_id(51000+n),'jersey','88','reason','Transferência conferida com o regulamento.','acknowledgeImpact',true)
 from (select public.get_transfer_context(coalesce(source_id,pg_temp.pu_id(101)),coalesce(destination,pg_temp.pu_id(6))) as ctx) s
$$;
grant execute on function pg_temp.tr_command(integer,uuid,uuid) to authenticated;
create temp table tr_publications as select * from private.game_publication_versions;
select pg_temp.pu_assert(private.transfer_reason(to_jsonb('🙂a'::text))='🙂a','reason uses UTF16 units like TypeScript');
select pg_temp.pu_assert(private.transfer_reason(to_jsonb(repeat('🙂',1001))) is null,'astral characters respect reason upper bound');
set local role anon;
select pg_temp.pu_error('select public.transfer_roster_entry(''{}''::jsonb)','42501');
set local role service_role;
select pg_temp.pu_error('select public.transfer_roster_entry(''{}''::jsonb)','42501');
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.pu_id(99)::text,true);
select pg_temp.pu_error('select public.transfer_roster_entry(''{}''::jsonb)','PT403');
select set_config('request.jwt.claim.sub',pg_temp.pu_id(98)::text,true);
select pg_temp.pu_error('select public.transfer_roster_entry(pg_temp.tr_command())','PT400');
select public.save_regulation(jsonb_set(pg_temp.rg_command(91,2),'{definition}',(public.get_regulation_state(pg_temp.pu_id(3))->'definition')||'{"transfers":"allowed"}'::jsonb));
select pg_temp.pu_error('select public.transfer_roster_entry(pg_temp.tr_command()||jsonb_build_object(''personId'',pg_temp.pu_id(206)))','PT400');
select pg_temp.pu_error('select public.transfer_roster_entry(pg_temp.tr_command()||''{"acknowledgeImpact":false}''::jsonb)','PT400');
select pg_temp.pu_error('select public.transfer_roster_entry(pg_temp.tr_command()||''{"jersey":"0"}''::jsonb)','PT400');
select pg_temp.pu_error('select public.transfer_roster_entry(pg_temp.tr_command()||jsonb_build_object(''expectedContextFingerprint'',repeat(''b'',64)))','PT409');
reset role;
update public.roster_entries set ended_at=clock_timestamp(),version=version+1 where id=pg_temp.pu_id(107);
set local role authenticated;
create temp table tr_frozen as select pg_temp.tr_command()||'{"jersey":"00"}'::jsonb as command;
reset role;
create function pg_temp.tr_fail() returns trigger language plpgsql as $$begin
 if new.id=pg_temp.pu_id(51001) then raise sqlstate 'PT500' using message='fixture_transfer_failure';end if;return new;
end$$;
create trigger a_transfer_fixture_failure before insert on public.roster_entries for each row execute function pg_temp.tr_fail();
set local role authenticated;
select pg_temp.pu_error('select public.transfer_roster_entry((select command from tr_frozen))','PT500');
select pg_temp.pu_assert(public.get_roster_entry(pg_temp.pu_id(101))->'active'='true','failed opening rolls back closing');
select pg_temp.pu_assert(public.get_roster_entry(pg_temp.pu_id(51001)) is null,'failed opening creates no new membership');
reset role;
select pg_temp.pu_assert((select count(*)=0 from private.roster_transfers),'failed transaction leaves no intent/receipt');
drop trigger a_transfer_fixture_failure on public.roster_entries;
set local role authenticated;
create temp table tr_first as select public.transfer_roster_entry((select command from tr_frozen)) as result;
select pg_temp.pu_assert((select result->>'kind'='transfer' from tr_first),'first move is a transfer');
select pg_temp.pu_assert(public.get_roster_entry(pg_temp.pu_id(51001))->>'jersey'='00','free 00 differs from occupied 0');
select pg_temp.pu_assert(public.get_roster_entry(pg_temp.pu_id(101))->'active'='false' and public.get_roster_entry(pg_temp.pu_id(51001))->'active'='true','single active membership changes atomically');
select pg_temp.pu_assert(public.get_roster_entry(pg_temp.pu_id(101))->>'endedAt'=public.get_roster_entry(pg_temp.pu_id(51001))->>'startedAt','no imposed gap between memberships');
select pg_temp.pu_assert(public.transfer_roster_entry((select command from tr_frozen))=(select result from tr_first),'lost ACK replay is exact');
select pg_temp.pu_error('select public.transfer_roster_entry((select command from tr_frozen)||''{"reason":"Outro motivo conferido"}''::jsonb)','PT409');
reset role;
update public.championships set saved_at='2000-01-01Z' where id=pg_temp.pu_id(1);
set local role authenticated;
select public.transfer_roster_entry((select command from tr_frozen));
reset role;
select pg_temp.pu_assert((select saved_at='2000-01-01Z' from public.championships where id=pg_temp.pu_id(1)),'replay does not update Recentes');
set local role authenticated;
select pg_temp.pu_error('select public.transfer_roster_entry(pg_temp.tr_command(2,pg_temp.pu_id(101),pg_temp.pu_id(5)))','PT409');
create temp table tr_stale as select pg_temp.tr_command(2,pg_temp.pu_id(51001),pg_temp.pu_id(5)) as command;
reset role;
update public.registrations set name='Home editado',version=version+1 where id=pg_temp.pu_id(5);
set local role authenticated;
select pg_temp.pu_error('select public.transfer_roster_entry((select command from tr_stale))','PT409');
select pg_temp.pu_assert(public.transfer_roster_entry(pg_temp.tr_command(2,pg_temp.pu_id(51001),pg_temp.pu_id(5)))->>'kind'='return','return creates a new historical period');
select pg_temp.pu_assert(public.get_roster_entry(pg_temp.pu_id(101))->'active'='false' and public.get_roster_entry(pg_temp.pu_id(51002))->'active'='true','return never reactivates original row');
select public.save_roster_entry(jsonb_build_object('commandId',pg_temp.pu_id(54000),'expectedVersion',1,'entry',jsonb_build_object('id',pg_temp.pu_id(51002),'registrationId',pg_temp.pu_id(5),'personId',pg_temp.pu_id(201),'jersey','88','active',false)));
select pg_temp.pu_error($q$select public.save_roster_entry(jsonb_build_object('commandId',pg_temp.pu_id(54001),'expectedVersion',0,'entry',jsonb_build_object('id',pg_temp.pu_id(53000),'registrationId',pg_temp.pu_id(6),'personId',pg_temp.pu_id(201),'jersey','89','active',true)))$q$,'PT400');
select pg_temp.pu_assert(public.transfer_roster_entry(pg_temp.tr_command(3,pg_temp.pu_id(51002),pg_temp.pu_id(5)))->>'kind'='return','inactive latest source returns without rewriting ended rows');
select pg_temp.pu_assert(public.transfer_roster_entry(pg_temp.tr_command(4,pg_temp.pu_id(51003),pg_temp.pu_id(6))||'{"jersey":null}'::jsonb)->>'kind'='return','nullable jersey stays unknown');
select pg_temp.pu_assert(public.get_roster_entry(pg_temp.pu_id(51004))->'jersey'='null'::jsonb,'unknown jersey is not zero');
select pg_temp.pu_error('select * from private.roster_transfers','42501');
reset role;
select pg_temp.pu_assert((select count(*)=1 from public.roster_entries where person_id=pg_temp.pu_id(201) and dispute_id=pg_temp.pu_id(3) and ended_at is null),'one active link per dispute');
select pg_temp.pu_assert(not exists((select * from tr_publications except select * from private.game_publication_versions) union all (select * from private.game_publication_versions except select * from tr_publications)),'all historical publications remain assigned to original participation');
select pg_temp.pu_error('delete from private.roster_transfers','PT409');
-- Trusted fixture reassignment keeps the application's single-operator constraint.
update public.admin_access set user_id=pg_temp.pu_id(97);
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.pu_id(97)::text,true);
select pg_temp.pu_error('select public.transfer_roster_entry((select command from tr_frozen))','PT403');
reset role;
update public.admin_access set user_id=pg_temp.pu_id(98);
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.pu_id(98)::text,true);
reset role;
update public.admin_access set enabled=false;
set local role authenticated;
select pg_temp.pu_error('select public.transfer_roster_entry((select command from tr_frozen))','PT403');
reset role;
select 'transfer writer SQL contract PASS' as result;
