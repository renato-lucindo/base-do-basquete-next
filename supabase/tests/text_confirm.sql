begin;
create function pg_temp.c_id(n integer) returns uuid language sql immutable as $$select ('c2000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.c_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
create function pg_temp.c_error(statement text,state text) returns void language plpgsql as $$begin begin execute statement;exception when others then if sqlstate=state then return;end if;raise;end;raise exception 'Expected %',state;end$$;
create function pg_temp.c_probe(n integer,name text,reg text default null) returns jsonb language sql as $$select jsonb_build_object('rowId',pg_temp.c_id(n),'name',name,'nickname',null,'birthDate',null,'birthYear',null,'federationRegistration',reg)$$;
create function pg_temp.c_document() returns jsonb language sql as $$select jsonb_build_object('id',pg_temp.c_id(2),'disputeId',pg_temp.c_id(92),'text',E'Equipe: Time\n7 - Nova','teamName','Time','target',jsonb_build_object('kind','registration','registrationId',pg_temp.c_id(95),'version',1),
 'ignoredLines',jsonb_build_array(jsonb_build_object('line',1,'source','Equipe: Time','kind','team')),'issues','[]'::jsonb,
 'rows',jsonb_build_array(jsonb_build_object('id',pg_temp.c_id(10),'line',2,'source','7 - Nova','selected',true,'rosterId',pg_temp.c_id(11),'rosterVersion',0,'decision',null,'issues','[]'::jsonb,'provided',jsonb_build_array('name','jersey'),
 'data',jsonb_build_object('name','Nova','jersey','7','nickname',null,'birthDate',null,'birthYear',null,'positions','[]'::jsonb,'heightCm',null,'weightKg',null,'dominantHand','right','federationRegistration',null))))$$;
create function pg_temp.c_command() returns jsonb language sql as $$select jsonb_build_object('commandId',pg_temp.c_id(1),'expectedVersion',0,'review',pg_temp.c_document())$$;
grant execute on function pg_temp.c_id(integer),pg_temp.c_assert(boolean,text),pg_temp.c_error(text,text),pg_temp.c_probe(integer,text,text),pg_temp.c_document(),pg_temp.c_command() to anon,authenticated;
delete from public.admin_access;
insert into auth.users(id) values(pg_temp.c_id(98)),(pg_temp.c_id(99));
insert into public.admin_access(user_id) values(pg_temp.c_id(98));
insert into public.championships(id,name) values(pg_temp.c_id(90),'Text review');
insert into public.seasons(id,championship_id,year) values(pg_temp.c_id(91),pg_temp.c_id(90),2026);
insert into public.disputes(id,season_id,gender,category) values(pg_temp.c_id(92),pg_temp.c_id(91),'feminino','Adulto');
insert into public.teams(id,name) values(pg_temp.c_id(94),'Team');
insert into public.registrations(id,dispute_id,team_id,name) values(pg_temp.c_id(95),pg_temp.c_id(92),pg_temp.c_id(94),'Time'),(pg_temp.c_id(96),pg_temp.c_id(92),pg_temp.c_id(94),'Outra');
insert into public.persons(id,name,nickname) values(pg_temp.c_id(50),'João Silva','JS'),(pg_temp.c_id(51),'Joao Silva',null),(pg_temp.c_id(52),'Luka Silva',null);
insert into private.athletes(person_id,sex,federation_registration,birth_year) values(pg_temp.c_id(50),'female','001234',1999),(pg_temp.c_id(51),'female',null,null),(pg_temp.c_id(52),'female',null,null);
insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) values(pg_temp.c_id(60),pg_temp.c_id(96),pg_temp.c_id(92),pg_temp.c_id(50),'0');
create function pg_temp.c_multi() returns jsonb language sql as $$
 with b as(select pg_temp.c_document() d),r as(select d,d->'rows'->0 row from b)
 select d||jsonb_build_object('text',E'Equipe: Time\n7 - Nova\n8 - Nova Dois\n9 - Nova Três','rows',jsonb_build_array(
 row||jsonb_build_object('decision',jsonb_build_object('kind','new','personId',pg_temp.c_id(70),'confirmHomonym',false),'data',(row->'data')||'{"birthYear":1999,"federationRegistration":"000777"}'::jsonb),
 row||jsonb_build_object('id',pg_temp.c_id(20),'line',3,'source','8 - Nova Dois','rosterId',pg_temp.c_id(21),'decision',jsonb_build_object('kind','new','personId',pg_temp.c_id(71),'confirmHomonym',false),'data',(row->'data')||'{"name":"Nova Dois","jersey":"7"}'::jsonb),
 row||jsonb_build_object('id',pg_temp.c_id(30),'line',4,'source','9 - Nova Três','rosterId',pg_temp.c_id(31),'decision',jsonb_build_object('kind','new','personId',pg_temp.c_id(72),'confirmHomonym',false),'data',(row->'data')||'{"name":"Nova Três","jersey":"9"}'::jsonb))) from r
$$;
create function pg_temp.c_rowcmd(n integer,row_n integer,v integer) returns jsonb language sql as $$select jsonb_build_object('commandId',pg_temp.c_id(n),'reviewId',pg_temp.c_id(2),'rowId',pg_temp.c_id(row_n),'expectedVersion',v)$$;
grant execute on function pg_temp.c_multi(),pg_temp.c_rowcmd(integer,integer,integer) to authenticated;
set local role authenticated;
set local request.jwt.claim.sub='c2000000-0000-4000-8000-000000000098';
select public.save_text_review(jsonb_build_object('commandId',pg_temp.c_id(1),'expectedVersion',0,'review',pg_temp.c_multi()));
select public.prepare_text_target(jsonb_build_object('commandId',pg_temp.c_id(300),'reviewId',pg_temp.c_id(2),'expectedVersion',1));
select pg_temp.c_assert((public.confirm_text_row(pg_temp.c_rowcmd(301,10,1))->>'version')::int=2,'first row saved atomically');
select pg_temp.c_assert((public.confirm_text_row(pg_temp.c_rowcmd(301,10,1))->>'version')::int=2,'row replay does not duplicate');
select pg_temp.c_error('select public.confirm_text_row(pg_temp.c_rowcmd(302,20,2))','PT400');
select pg_temp.c_assert(public.get_person(pg_temp.c_id(71)) is null and (public.get_text_review(pg_temp.c_id(2))->>'version')::int=2,'failed roster insertion rolls back new person and review version');
select pg_temp.c_assert((public.confirm_text_row(pg_temp.c_rowcmd(303,30,2))->>'version')::int=3,'success after failed item preserves earlier result');
select pg_temp.c_error('select public.confirm_text_row(pg_temp.c_rowcmd(301,20,3))','PT409');
select public.save_text_review(jsonb_build_object('commandId',pg_temp.c_id(304),'expectedVersion',3,'review',jsonb_set(public.get_text_review(pg_temp.c_id(2))-'version'-'savedAt'-'results','{rows,1,data,jersey}','"8"')));
select public.confirm_text_row(pg_temp.c_rowcmd(305,20,4));
select pg_temp.c_assert(jsonb_array_length(public.get_text_review(pg_temp.c_id(2))->'results')=3,'all confirmed results can be resumed');
select pg_temp.c_assert(public.get_person(pg_temp.c_id(70))->'athlete'->>'sex'='female' and public.get_person(pg_temp.c_id(70))->>'dominantHand'='right' and public.get_person(pg_temp.c_id(70))->'publicBirthYear'='null'::jsonb,'new athlete sex derived, right default and no inferred public year');
select pg_temp.c_assert((select birth_year=1999 and federation_registration='000777' from private.athletes where person_id=pg_temp.c_id(70)),'private partial year and federation registration persisted');
select pg_temp.c_error($q$select public.save_text_review(jsonb_build_object('commandId',pg_temp.c_id(306),'expectedVersion',5,'review',jsonb_set(public.get_text_review(pg_temp.c_id(2))-'version'-'savedAt'-'results','{rows,0,data,name}','"rewrite applied"')))$q$,'PT400');
-- Existing identity in another registration of this dispute cannot be moved implicitly.
select public.save_text_review(jsonb_build_object('commandId',pg_temp.c_id(310),'expectedVersion',0,'review',pg_temp.c_document()||jsonb_build_object('id',pg_temp.c_id(4),'rows',jsonb_build_array((pg_temp.c_document()->'rows'->0)||jsonb_build_object('rosterId',pg_temp.c_id(41),'decision',jsonb_build_object('kind','existing','personId',pg_temp.c_id(50),'version',1,'approveChanges',true),'data',(pg_temp.c_document()->'rows'->0->'data')||'{"name":"Renomeada"}'::jsonb)))));
select pg_temp.c_error($q$select public.confirm_text_row(jsonb_build_object('commandId',pg_temp.c_id(311),'reviewId',pg_temp.c_id(4),'rowId',pg_temp.c_id(10),'expectedVersion',1))$q$,'PT400');
select pg_temp.c_assert(public.get_person(pg_temp.c_id(50))->>'name'='João Silva','failed contextual binding rolls back approved global edit');
-- Existing same-registration athlete: absent imported fields must preserve saved values.
reset role;
insert into public.persons(id,name,nickname,dominant_hand,position,public_birth_year) values(pg_temp.c_id(53),'Nome salvo','Apelido salvo','left','Armador',1980);
insert into private.athletes(person_id,sex,birth_year) values(pg_temp.c_id(53),'female',1980);
insert into public.coaches(person_id) values(pg_temp.c_id(53));
insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) values(pg_temp.c_id(61),pg_temp.c_id(95),pg_temp.c_id(92),pg_temp.c_id(53),'55');
set local role authenticated;
select public.save_text_review(jsonb_build_object('commandId',pg_temp.c_id(320),'expectedVersion',0,'review',pg_temp.c_document()||jsonb_build_object('id',pg_temp.c_id(5),'rows',jsonb_build_array((pg_temp.c_document()->'rows'->0)||jsonb_build_object('rosterId',pg_temp.c_id(61),'rosterVersion',1,'provided',jsonb_build_array('name'),'decision',jsonb_build_object('kind','existing','personId',pg_temp.c_id(53),'version',1,'approveChanges',false),'data',(pg_temp.c_document()->'rows'->0->'data')||'{"name":"Nome importado","jersey":null}'::jsonb)))));
select public.confirm_text_row(jsonb_build_object('commandId',pg_temp.c_id(321),'reviewId',pg_temp.c_id(5),'rowId',pg_temp.c_id(10),'expectedVersion',1));
select pg_temp.c_assert(public.get_person(pg_temp.c_id(53))->>'name'='Nome salvo' and public.get_person(pg_temp.c_id(53))->>'dominantHand'='left' and public.get_roster_entry(pg_temp.c_id(61))->>'jersey'='55','using existing without approved changes preserves profile and omitted jersey');
select public.save_text_review(jsonb_build_object('commandId',pg_temp.c_id(322),'expectedVersion',0,'review',pg_temp.c_document()||jsonb_build_object('id',pg_temp.c_id(6),'rows',jsonb_build_array((pg_temp.c_document()->'rows'->0)||jsonb_build_object('rosterId',pg_temp.c_id(61),'rosterVersion',2,'provided',jsonb_build_array('name','nickname'),'decision',jsonb_build_object('kind','existing','personId',pg_temp.c_id(53),'version',1,'approveChanges',true),'data',(pg_temp.c_document()->'rows'->0->'data')||'{"name":"Nome corrigido","nickname":"Apelido novo","jersey":null}'::jsonb)))));
select public.confirm_text_row(jsonb_build_object('commandId',pg_temp.c_id(323),'reviewId',pg_temp.c_id(6),'rowId',pg_temp.c_id(10),'expectedVersion',1));
select pg_temp.c_assert(public.get_person(pg_temp.c_id(53))->>'name'='Nome corrigido' and public.get_person(pg_temp.c_id(53))->>'nickname'='Apelido novo' and public.get_person(pg_temp.c_id(53))->>'dominantHand'='left' and (public.get_person(pg_temp.c_id(53))->>'coach')::boolean,'only approved supplied fields change, identity/coach/private details preserved');
-- New team and registration are one atomic target operation, with distinct inner receipts.
select public.save_text_review(jsonb_build_object('commandId',pg_temp.c_id(330),'expectedVersion',0,'review',pg_temp.c_document()||jsonb_build_object('id',pg_temp.c_id(7),'target',jsonb_build_object('kind','newTeam','teamId',pg_temp.c_id(80),'registrationId',pg_temp.c_id(81),'teamName','Nova equipe','registrationName','Nova inscrição'))));
select public.prepare_text_target(jsonb_build_object('commandId',pg_temp.c_id(331),'reviewId',pg_temp.c_id(7),'expectedVersion',1));
select public.prepare_text_target(jsonb_build_object('commandId',pg_temp.c_id(331),'reviewId',pg_temp.c_id(7),'expectedVersion',1));
select pg_temp.c_assert(public.get_registration(pg_temp.c_id(81))->>'teamId'=pg_temp.c_id(80)::text,'new team and registration connected');
select public.save_text_review(jsonb_build_object('commandId',pg_temp.c_id(332),'expectedVersion',0,'review',pg_temp.c_document()||jsonb_build_object('id',pg_temp.c_id(8),'target',jsonb_build_object('kind','newTeam','teamId',pg_temp.c_id(82),'registrationId',pg_temp.c_id(83),'teamName','Não deve ficar','registrationName',''))));
select pg_temp.c_error($q$select public.prepare_text_target(jsonb_build_object('commandId',pg_temp.c_id(333),'reviewId',pg_temp.c_id(8),'expectedVersion',1))$q$,'PT400');
select pg_temp.c_assert(public.get_team(pg_temp.c_id(82)) is null and public.get_registration(pg_temp.c_id(83)) is null,'invalid registration rolls back team creation');
-- An outdated registration version must roll back even after inner writes succeed.
reset role;
update public.registrations set version=2 where id=pg_temp.c_id(95);
set local role authenticated;
select public.save_text_review(jsonb_build_object('commandId',pg_temp.c_id(340),'expectedVersion',0,'review',pg_temp.c_document()||jsonb_build_object('id',pg_temp.c_id(9),'rows',jsonb_build_array((pg_temp.c_document()->'rows'->0)||jsonb_build_object('rosterId',pg_temp.c_id(74),'decision',jsonb_build_object('kind','new','personId',pg_temp.c_id(73),'confirmHomonym',false),'data',(pg_temp.c_document()->'rows'->0->'data')||'{"name":"Nova quatro","jersey":null}'::jsonb)))));
select pg_temp.c_error($q$select public.confirm_text_row(jsonb_build_object('commandId',pg_temp.c_id(341),'reviewId',pg_temp.c_id(9),'rowId',pg_temp.c_id(10),'expectedVersion',1))$q$,'PT409');
select pg_temp.c_assert(public.get_person(pg_temp.c_id(73)) is null and public.get_roster_entry(pg_temp.c_id(74)) is null,'stale context leaves no partial person or membership');
reset role;
update public.admin_access set enabled=false;
set local role authenticated;
select pg_temp.c_error('select public.confirm_text_row(pg_temp.c_rowcmd(301,10,1))','PT403');
reset role;
rollback;
