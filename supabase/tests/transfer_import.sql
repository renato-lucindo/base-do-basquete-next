-- Runs after the real text_confirm.sql contract, inside the same rollback.
reset role;
update public.admin_access set enabled=true where user_id=pg_temp.c_id(98);
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.c_id(98)::text,true);
select public.save_roster_entry(jsonb_build_object('commandId',pg_temp.c_id(350),'expectedVersion',1,'entry',jsonb_build_object('id',pg_temp.c_id(60),'registrationId',pg_temp.c_id(96),'personId',pg_temp.c_id(50),'jersey','0','active',false)));
select public.save_text_review(jsonb_build_object('commandId',pg_temp.c_id(351),'expectedVersion',0,'review',pg_temp.c_document()||jsonb_build_object('id',pg_temp.c_id(12),'target',jsonb_build_object('kind','registration','registrationId',pg_temp.c_id(95),'version',2),'rows',jsonb_build_array((pg_temp.c_document()->'rows'->0)||jsonb_build_object('rosterId',pg_temp.c_id(42),'decision',jsonb_build_object('kind','existing','personId',pg_temp.c_id(50),'version',1,'approveChanges',true),'data',(pg_temp.c_document()->'rows'->0->'data')||'{"name":"Edição que deve reverter","jersey":null}'::jsonb)))));
reset role;
create temp table ti_before as select
 (select jsonb_agg(to_jsonb(r) order by id) from public.roster_entries r) roster,
 (select jsonb_agg(to_jsonb(r) order by command_id) from private.text_review_commands r) receipts,
 (select to_jsonb(p) from public.persons p where id=pg_temp.c_id(50)) person;
set local role authenticated;
do $$begin
 begin
  perform public.confirm_text_row(jsonb_build_object('commandId',pg_temp.c_id(352),'reviewId',pg_temp.c_id(12),'rowId',pg_temp.c_id(10),'expectedVersion',1));
 exception when sqlstate 'PT400' then
  if sqlerrm='transfer_required' then return;end if;raise;
 end;
 raise exception 'import must require an explicit transfer';
end$$;
select pg_temp.c_assert(public.get_person(pg_temp.c_id(50))->>'name'='João Silva' and public.get_roster_entry(pg_temp.c_id(42)) is null,'import cannot reopen an inactive identity or retain approved global edits');
select pg_temp.c_assert((public.get_text_review(pg_temp.c_id(12))->>'version')::int=1 and jsonb_array_length(public.get_text_review(pg_temp.c_id(12))->'results')=0,'failed import leaves the review unconfirmed');
reset role;
select pg_temp.c_assert((select roster is not distinct from (select jsonb_agg(to_jsonb(r) order by id) from public.roster_entries r) and receipts is not distinct from (select jsonb_agg(to_jsonb(r) order by command_id) from private.text_review_commands r) and person=(select to_jsonb(p) from public.persons p where id=pg_temp.c_id(50)) from ti_before),'failed import changes no period, receipt or person');
select pg_temp.c_assert((select count(*)=0 from private.roster_transfers),'import cannot create transfer intent');
