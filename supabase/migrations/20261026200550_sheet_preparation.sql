-- Read-only contextual suggestions. Existing sheets/writers and historical facts are unchanged.
create index game_sheet_entries_registration_person_game on public.game_sheet_entries(registration_id,person_id,game_id);
create function private.get_game_sheet_preparation(p_game_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare g public.games%rowtype; reg uuid; s text; source_side text; previous_game uuid;
 one jsonb; history jsonb; candidates jsonb; coaches jsonb; jerseys jsonb; result jsonb;
begin
 if not exists(select 1 from public.admin_access where user_id=(select auth.uid()) and enabled) then raise sqlstate 'PT403' using message='admin_required'; end if;
 select * into g from public.games where id=p_game_id;
 if not found then raise sqlstate 'PT404' using message='game_not_found';end if;
 result:=jsonb_build_object('gameId',g.id,'gameVersion',g.version,'sides','{}'::jsonb);
 foreach s in array array['home','away'] loop
  reg:=case when s='home' then g.home_registration_id else g.away_registration_id end;
  if (select count(*) from public.roster_entries where registration_id=reg and ended_at is null)>2000 or
     (select count(*) from public.staff_entries where registration_id=reg and ended_at is null)>200 then
   raise sqlstate 'PT413' using message='preparation_context_limit';end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'registrationId',r.registration_id,'personId',r.person_id,'jersey',r.jersey,
   'person',jsonb_build_object('id',p.id,'name',p.name,'nickname',p.nickname)) order by r.jersey::integer nulls last,length(r.jersey),p.name,r.id),'[]'::jsonb)
  into candidates from public.roster_entries r join public.persons p on p.id=r.person_id where r.registration_id=reg and r.dispute_id=g.dispute_id and r.ended_at is null;
  select coalesce(jsonb_agg(jsonb_build_object('id',se.id,'personId',se.person_id,'role',se.role,
   'person',jsonb_build_object('id',p.id,'name',p.name,'nickname',p.nickname)) order by se.role,p.name,se.id),'[]'::jsonb)
  into coaches from public.staff_entries se join public.persons p on p.id=se.person_id where se.registration_id=reg and se.dispute_id=g.dispute_id and se.ended_at is null;
  select past.id into previous_game from public.games past join public.game_sheets sh on sh.game_id=past.id
  where past.id<>g.id and past.dispute_id=g.dispute_id and reg in(past.home_registration_id,past.away_registration_id)
   and jsonb_array_length(sh.document->'participants')>0
   and (g.scheduled_date is null or past.scheduled_date is null or past.scheduled_date<g.scheduled_date or
    (past.scheduled_date=g.scheduled_date and (g.scheduled_time is null or past.scheduled_time is null or past.scheduled_time<g.scheduled_time)))
  order by case when g.scheduled_date is not null then past.scheduled_date end desc nulls last,
   case when g.scheduled_time is not null then past.scheduled_time end desc nulls last,sh.saved_at desc,past.id limit 1;
  history:=null;
  if previous_game is not null then
   select case when home_registration_id=reg then 'home' else 'away' end into source_side from public.games where id=previous_game;
   select jsonb_build_object('gameId',past.id,'version',sh.version,'date',past.scheduled_date,'time',to_char(past.scheduled_time,'HH24:MI'),'savedAt',sh.saved_at,
    'players',coalesce((select jsonb_agg(jsonb_build_object('personId',e.person_id,'jersey',e.jersey,'starter',(p->>'starter')::boolean) order by e.ordinal)
      from public.game_sheet_entries e cross join lateral jsonb_array_elements(sh.document->'participants') p
      where e.game_id=past.id and e.registration_id=reg and p->>'rosterEntryId'=e.roster_entry_id::text),'[]'::jsonb),
    'captainPersonId',(select e.person_id from public.game_sheet_entries e where e.game_id=past.id and e.registration_id=reg and e.roster_entry_id::text=sh.document->'staff'->source_side->>'captainRosterEntryId'),
    'coachPersonId',(select se.person_id from public.staff_entries se where se.registration_id=reg and se.id::text=sh.document->'staff'->source_side->>'coachStaffEntryId'),
    'assistantPersonId',(select se.person_id from public.staff_entries se where se.registration_id=reg and se.id::text=sh.document->'staff'->source_side->>'assistantStaffEntryId'))
   into history from public.games past join public.game_sheets sh on sh.game_id=past.id where past.id=previous_game;
  end if;
  with last as(
   select distinct on(e.person_id) e.person_id,e.jersey from public.game_sheet_entries e join public.games past on past.id=e.game_id join public.game_sheets sh on sh.game_id=past.id
   where e.registration_id=reg and past.dispute_id=g.dispute_id and past.id<>g.id and
    (g.scheduled_date is null or past.scheduled_date is null or past.scheduled_date<g.scheduled_date or
     (past.scheduled_date=g.scheduled_date and (g.scheduled_time is null or past.scheduled_time is null or past.scheduled_time<g.scheduled_time)))
   order by e.person_id,case when g.scheduled_date is not null then past.scheduled_date end desc nulls last,
    case when g.scheduled_time is not null then past.scheduled_time end desc nulls last,sh.saved_at desc,past.id
  ) select coalesce(jsonb_object_agg(r.id::text,last.jersey),'{}'::jsonb) into jerseys
   from public.roster_entries r join last on last.person_id=r.person_id where r.registration_id=reg and r.ended_at is null;
  one:=jsonb_build_object('registrationId',reg,'roster',candidates,'staff',coaches,'previous',history,'lastJerseys',jerseys);
  result:=jsonb_set(result,array['sides',s],one);
 end loop;
 if octet_length(result::text)>4194304 then raise sqlstate 'PT413' using message='preparation_context_limit';end if;
 return result;
end$$;
create function public.get_game_sheet_preparation(p_game_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.get_game_sheet_preparation(p_game_id)$$;
revoke all on function private.get_game_sheet_preparation(uuid),public.get_game_sheet_preparation(uuid) from public,anon,authenticated,service_role;
grant execute on function private.get_game_sheet_preparation(uuid),public.get_game_sheet_preparation(uuid) to authenticated;
