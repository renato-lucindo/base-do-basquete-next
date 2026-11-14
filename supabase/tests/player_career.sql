-- Continues the rolled-back publication/regulation/achievement_drafts fixtures.
reset role;
update public.admin_access set enabled=true;
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.pu_id(98)::text,true);
select public.save_achievement_draft(jsonb_set(pg_temp.ad_command(100,23),'{draft,honors,0,personIds}',jsonb_build_array(pg_temp.pu_id(201),pg_temp.pu_id(910))));
select public.confirm_achievements(jsonb_build_object('commandId',pg_temp.pu_id(99001),'disputeId',pg_temp.pu_id(3),'expectedDraftVersion',24,'expectedPublicationVersion',0,'expectedContextFingerprint',public.get_achievement_context(pg_temp.pu_id(3))->'contextFingerprint','reason','','acknowledgeImpact',true));
set local role anon;
select public.get_player_career_source(pg_temp.pu_id(201)) as player_career;
reset role;
create policy test_hide_player_games on public.published_player_games as restrictive for select to anon using(false);
set local role anon;
select pg_temp.pu_assert(
 public.get_player_career_with_age(pg_temp.pu_id(201))-'currentAge'=public.get_player_career_source(pg_temp.pu_id(201))
 and jsonb_array_length(public.get_player_career_with_age(pg_temp.pu_id(201))->'participations')=0,
 'age wrapper respects the caller game visibility'
);
reset role;
drop policy test_hide_player_games on public.published_player_games;
set local role anon;
select public.get_player_career_source(pg_temp.pu_id(910)) as recipient_without_games;
select pg_temp.pu_assert(public.get_player_career_source(pg_temp.pu_id(999)) is null,'unknown identity is not a public profile');
reset role;
insert into public.persons(id,name) values(pg_temp.pu_id(930),'Perfil sem jogos'),(pg_temp.pu_id(931),'Cadastro privado sem publicação');
insert into private.athletes(person_id,sex,birth_date) values(pg_temp.pu_id(930),'male','1997-01-01'),(pg_temp.pu_id(931),'male','1997-01-01');
set local role authenticated;
select public.confirm_player_profile(jsonb_build_object('commandId',pg_temp.pu_id(99002),'personId',pg_temp.pu_id(930),'expectedPersonVersion',1,'expectedPublicationVersion',0,'reason','','acknowledgeImpact',true));
reset role;
update public.persons set name='Nome privado posterior',biography='Biografia privada posterior',version=version+1 where id=pg_temp.pu_id(930);
set local role anon;
select public.get_player_career_source(pg_temp.pu_id(930)) as profile_without_games;
select pg_temp.pu_assert(public.get_player_career_source(pg_temp.pu_id(931)) is null,'private cadastre alone is not a public source');
select pg_temp.pu_assert(public.get_player_career_source(pg_temp.pu_id(930))#>>'{profile,person,publicBirthYear}'='1997','birth year is captured on independent profile confirmation');
reset role;
set local role authenticated;
select public.save_achievement_draft(jsonb_set(pg_temp.ad_command(101,24),'{draft}',jsonb_build_object('disputeId',pg_temp.pu_id(3),'placements','[]'::jsonb,'honors','[]'::jsonb)));
set local role anon;
select pg_temp.pu_assert(jsonb_array_length(public.get_player_career_source(pg_temp.pu_id(910))->'honors')=1,'clearing draft does not withdraw public honor');
set local role authenticated;
select public.confirm_achievements(jsonb_build_object('commandId',pg_temp.pu_id(99003),'disputeId',pg_temp.pu_id(3),'expectedDraftVersion',25,'expectedPublicationVersion',1,'expectedContextFingerprint',public.get_achievement_context(pg_temp.pu_id(3))->'contextFingerprint','reason','Retirada de honraria equivocada','acknowledgeImpact',true));
set local role anon;
select pg_temp.pu_assert(public.get_player_career_source(pg_temp.pu_id(910)) is null,'only explicit current honors count, not private history or live roster');
select pg_temp.pu_assert(jsonb_array_length(public.get_player_career_source(pg_temp.pu_id(201))->'honors')=0,'honor withdrawal retains published game history only');
select pg_temp.pu_assert(not has_function_privilege('anon','public.list_initial_player_cards(uuid)','EXECUTE'),'anon cannot inventory private cards');
reset role;
update public.persons set height_cm=180 where id=pg_temp.pu_id(201);
set local role authenticated;
select pg_temp.pu_assert(public.list_initial_player_cards()->'items' @>
 jsonb_build_array(jsonb_build_object('personId',pg_temp.pu_id(201))),'visible player with data enters the inventory');
select pg_temp.pu_assert(not (public.list_initial_player_cards()->'items' @>
 jsonb_build_array(jsonb_build_object('personId',pg_temp.pu_id(931)))),'private player with data is excluded');
create function pg_temp.batch_card(n integer,pid uuid,pv integer) returns jsonb language sql as $$
 select jsonb_build_object('commandId',pg_temp.pu_id(n),'personId',pid,
  'expectedPersonVersion',pv,'expectedPublicationVersion',0,'reason','Lote','acknowledgeImpact',true,'initialBatch',true)
$$;
do $$
declare pv int; cmd jsonb; ack jsonb;
begin
 begin
  perform public.confirm_player_profile(pg_temp.batch_card(99004,pg_temp.pu_id(931),1));
  raise exception 'Private athlete became public';
 exception when sqlstate 'PT409' then
  if sqlerrm<>'profile_not_eligible' then raise;end if;
 end;
 select version into pv from public.persons where id=pg_temp.pu_id(201);
 begin
  perform public.confirm_player_profile(pg_temp.batch_card(99005,pg_temp.pu_id(201),pv+1));
  raise exception 'Stale inventory was accepted';
 exception when sqlstate 'PT409' then
  if sqlerrm<>'version_conflict' then raise;end if;
 end;
 cmd:=pg_temp.batch_card(99006,pg_temp.pu_id(201),pv);
 ack:=public.confirm_player_profile(cmd);
 perform pg_temp.pu_assert(ack=public.confirm_player_profile(cmd),'batch retry recovers its receipt');
 perform pg_temp.pu_assert(not (public.list_initial_player_cards()->'items' @>
  jsonb_build_array(jsonb_build_object('personId',pg_temp.pu_id(201)))),'published item leaves the inventory');
end$$;
reset role;
rollback;
