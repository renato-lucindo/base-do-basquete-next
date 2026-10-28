// Disposable PostgreSQL only. No remote service calls, seeds or disabled guards.
export const capacitySetup = `
begin;
create function pg_temp.cap_id(n integer) returns uuid language sql immutable as $$
 select ('f9400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid
$$;
insert into auth.users(id) values(pg_temp.cap_id(98));
insert into public.admin_access(user_id) values(pg_temp.cap_id(98));
insert into public.championships(id,name) values(pg_temp.cap_id(1),'Capacidade descartável');
insert into public.seasons(id,championship_id,year) values(pg_temp.cap_id(2),pg_temp.cap_id(1),2026);
insert into public.disputes(id,season_id,gender,category) values(pg_temp.cap_id(3),pg_temp.cap_id(2),'masculino','Adulto');
insert into public.teams(id,name) values(pg_temp.cap_id(4),'Equipe global confirmada');
insert into public.registrations(id,dispute_id,team_id,name)
 select pg_temp.cap_id(1000+n),pg_temp.cap_id(3),pg_temp.cap_id(4),'Inscrição '||n from generate_series(0,99) n;
insert into public.persons(id,name)
 select pg_temp.cap_id(20000+r*20+n),'Atleta '||r||' '||n from generate_series(0,99) r cross join generate_series(1,6) n;
insert into private.athletes(person_id,sex)
 select pg_temp.cap_id(20000+r*20+n),'male' from generate_series(0,99) r cross join generate_series(1,6) n;
insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey)
 select pg_temp.cap_id(40000+r*20+n),pg_temp.cap_id(1000+r),pg_temp.cap_id(3),pg_temp.cap_id(20000+r*20+n),
 case n when 1 then '0' when 2 then '00' when 6 then '9' else (n+1)::text end
 from generate_series(0,99) r cross join generate_series(1,6) n;
insert into public.games(id,dispute_id,home_registration_id,away_registration_id)
 select pg_temp.cap_id(100000+n),pg_temp.cap_id(3),pg_temp.cap_id(1000+((n-1)*2)%100),pg_temp.cap_id(1001+((n-1)*2)%100)
 from generate_series(1,1000) n;
create function pg_temp.cap_command(n integer) returns jsonb language sql stable as $$
 select jsonb_build_object('requestId',pg_temp.cap_id(200000+n),'gameId',pg_temp.cap_id(100000+n),
 'gameVersion',1,'basePublicationVersion',0,'reason','','fallback',false,'source',jsonb_build_object('kind','sheet','baseSheetVersion',0,
 'document',jsonb_build_object('rulesVersion','FIBA_2024','periods',4,
 'participants',(select jsonb_agg(jsonb_build_object('rosterEntryId',pg_temp.cap_id(40000+(((n-1)*2)%100+side)*20+i),
 'side',case side when 0 then 'home' else 'away' end,
 'jersey',case i when 1 then '0' when 2 then '00' when 6 then '9' else (i+1)::text end,'played',i<>6,'starter',i<>6) order by side,i)
 from generate_series(0,1) side cross join generate_series(1,6) i where side=0 or i<=5),
 'staff',jsonb_build_object('home',jsonb_build_object('captainRosterEntryId',pg_temp.cap_id(40001+(((n-1)*2)%100)*20),'coachStaffEntryId',null,'assistantStaffEntryId',null),
 'away',jsonb_build_object('captainRosterEntryId',pg_temp.cap_id(40001+(((n-1)*2)%100+1)*20),'coachStaffEntryId',null,'assistantStaffEntryId',null)),
 'events',jsonb_build_array(jsonb_build_object('id',pg_temp.cap_id(300000+n),'side','home','period',4,'target','0','code','2')))))
$$;
grant execute on function pg_temp.cap_id(integer),pg_temp.cap_command(integer) to authenticated;
set local role authenticated;
set local request.jwt.claim.sub='f9400000-0000-4000-8000-000000000098';
`;

export const capacityPublish = `
create temporary table capacity_run(completed integer,failed_game integer,state text,message text,elapsed_ms numeric);
do $$declare n integer;done integer:=0;started timestamptz:=clock_timestamp();error_state text;error_message text;begin
 for n in 1..1000 loop
  begin
   perform public.publish_sheet_game(pg_temp.cap_command(n));
   done:=n;
  exception when others then
   get stacked diagnostics error_state=returned_sqlstate,error_message=message_text;
   insert into capacity_run values(done,n,error_state,error_message,extract(epoch from clock_timestamp()-started)*1000);
   return;
  end;
 end loop;
 insert into capacity_run values(done,null,null,null,extract(epoch from clock_timestamp()-started)*1000);
end$$;
reset role;
`;
