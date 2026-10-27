create function pg_temp.rw_command(n integer default 800) returns jsonb language sql as $$
 select jsonb_build_object('commandId',pg_temp.rr_id(n),'sourceRegistrationId',pg_temp.rr_id(30),'targetRegistrationId',pg_temp.rr_id(32),
  'expectedContextFingerprint',public.get_roster_reuse_context(pg_temp.rr_id(30),pg_temp.rr_id(32))->>'contextFingerprint','confirmed',true,
  'items',jsonb_build_array(
   jsonb_build_object('sourceEntryId',pg_temp.rr_id(204),'sourceVersion',1,'newEntryId',pg_temp.rr_id(801),'jersey','0'),
   jsonb_build_object('sourceEntryId',pg_temp.rr_id(205),'sourceVersion',1,'newEntryId',pg_temp.rr_id(802),'jersey','00'),
   jsonb_build_object('sourceEntryId',pg_temp.rr_id(206),'sourceVersion',1,'newEntryId',pg_temp.rr_id(803),'jersey',null)))
$$;
grant execute on function pg_temp.rw_command(integer) to authenticated;
-- REUSE_WRITE_ASSERTIONS
set local role anon;
select pg_temp.rr_error($q$select public.apply_roster_reuse('{}'::jsonb)$q$,'42501');
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.rr_id(901)::text,true);
select pg_temp.rr_error($q$select public.apply_roster_reuse('{}'::jsonb)$q$,'PT403');
select set_config('request.jwt.claim.sub',pg_temp.rr_id(900)::text,true);
create temp table reuse_request as select pg_temp.rw_command() c;
select pg_temp.rr_error($q$select public.apply_roster_reuse(jsonb_set((select c from reuse_request),'{confirmed}','false'))$q$,'PT400');
select pg_temp.rr_error($q$select public.apply_roster_reuse(jsonb_set((select c from reuse_request),'{items,1,sourceEntryId}',to_jsonb(pg_temp.rr_id(202))))$q$,'PT400');
select pg_temp.rr_error($q$select public.apply_roster_reuse(jsonb_set((select c from reuse_request),'{items,1,sourceEntryId}',to_jsonb(pg_temp.rr_id(201))))$q$,'PT400');
select pg_temp.rr_error($q$select public.apply_roster_reuse(jsonb_set((select c from reuse_request),'{items,1,jersey}','"0"'))$q$,'PT400');
select pg_temp.rr_error($q$select public.apply_roster_reuse(jsonb_set((select c from reuse_request),'{items,0,jersey}','"4"'))$q$,'PT400');
select pg_temp.rr_error($q$select public.apply_roster_reuse(jsonb_set((select c from reuse_request),'{items,0,sourceVersion}','2'))$q$,'PT409');
select pg_temp.rr_error($q$select public.apply_roster_reuse(jsonb_set((select c from reuse_request),'{items,0,newEntryId}',to_jsonb(pg_temp.rr_id(301))))$q$,'PT400');
select pg_temp.rr_assert(public.get_roster_entry(pg_temp.rr_id(801)) is null and public.get_roster_entry(pg_temp.rr_id(802)) is null,'falha posterior reverte todas as inclusões do conjunto');
reset role;
select pg_temp.rr_assert((select count(*) from private.roster_reuse_commands)=0,'nenhum recibo após erros');
update public.roster_entries set jersey='98',version=2 where id=pg_temp.rr_id(301);
set local role authenticated;
select pg_temp.rr_error('select public.apply_roster_reuse((select c from reuse_request))','PT409');
reset role;
update public.roster_entries set jersey='99',version=1 where id=pg_temp.rr_id(301);
set local role authenticated;
select public.apply_roster_reuse((select c from reuse_request));
select pg_temp.rr_assert(public.get_roster_entry(pg_temp.rr_id(801))->>'personId'=pg_temp.rr_id(104)::text,'mesma pessoa global, vínculo novo');
select pg_temp.rr_assert(public.get_roster_entry(pg_temp.rr_id(801))->>'jersey'='0' and public.get_roster_entry(pg_temp.rr_id(802))->>'jersey'='00' and public.get_roster_entry(pg_temp.rr_id(803))->'jersey'='null'::jsonb,'0/00/null distintos');
select pg_temp.rr_assert(public.get_roster_entry(pg_temp.rr_id(301))->>'jersey'='99' and public.get_roster_entry(pg_temp.rr_id(301))->>'version'='1','jogador do destino já salvo permanece intacto');
select pg_temp.rr_assert(public.get_roster_entry(pg_temp.rr_id(204))->>'jersey'='4' and public.get_roster_entry(pg_temp.rr_id(204))->>'version'='1','camisa e versão da origem intactas');
select pg_temp.rr_assert(public.apply_roster_reuse((select c from reuse_request))=public.apply_roster_reuse((select c from reuse_request)),'replay exato após mudança do contexto retorna o mesmo ACK');
select pg_temp.rr_assert(public.get_registration_removal_context(pg_temp.rr_id(30),pg_temp.rr_id(10))->>'state'='blocked' and public.get_registration_removal_context(pg_temp.rr_id(32),pg_temp.rr_id(11))->>'state'='blocked','origem e destino com cópia nunca são inscrições vazias');
select pg_temp.rr_error($q$select public.remove_registration(jsonb_build_object('commandId',pg_temp.rr_id(880),'registrationId',pg_temp.rr_id(32),'disputeId',pg_temp.rr_id(11),'expectedVersion',1))$q$,'PT409');
select pg_temp.rr_error($q$select public.apply_roster_reuse(jsonb_set((select c from reuse_request),'{items,0,jersey}','"8"'))$q$,'PT409');
select pg_temp.rr_error('select * from private.roster_reuse_commands','42501');
select pg_temp.rr_error('select * from private.roster_reuse_items','42501');
reset role;
select pg_temp.rr_assert((select count(*) from private.roster_reuse_commands)=1 and (select count(*) from private.roster_reuse_items)=3,'um recibo e três origens relacionais');
select pg_temp.rr_error('delete from private.roster_reuse_commands','PT409');
select pg_temp.rr_error('update private.roster_reuse_items set person_id=pg_temp.rr_id(111)','PT409');
savepoint close_reused_rosters;
update public.roster_entries set ended_at=clock_timestamp() where registration_id in(pg_temp.rr_id(30),pg_temp.rr_id(32));
set local role authenticated;
select pg_temp.rr_assert(public.get_registration_removal_context(pg_temp.rr_id(30),pg_temp.rr_id(10))->'blockers' ? 'roster' and public.get_registration_removal_context(pg_temp.rr_id(32),pg_temp.rr_id(11))->'blockers' ? 'roster','histórico encerrado mantém bloqueio já existente de elenco');
select pg_temp.rr_error($q$select public.remove_registration(jsonb_build_object('commandId',pg_temp.rr_id(881),'registrationId',pg_temp.rr_id(30),'disputeId',pg_temp.rr_id(10),'expectedVersion',1))$q$,'PT409');
reset role;
rollback to savepoint close_reused_rosters;
release savepoint close_reused_rosters;
delete from public.admin_access;
insert into public.admin_access(user_id) values(pg_temp.rr_id(901));
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.rr_id(901)::text,true);
select pg_temp.rr_error('select public.apply_roster_reuse((select c from reuse_request))','PT403');
reset role;
delete from public.admin_access;
insert into public.admin_access(user_id,enabled) values(pg_temp.rr_id(900),false);
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.rr_id(900)::text,true);
select pg_temp.rr_error('select public.apply_roster_reuse((select c from reuse_request))','PT403');
reset role;
