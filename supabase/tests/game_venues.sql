-- Synthetic fixtures; no changes to Auth/admins; everything rolls back.
begin;
create function pg_temp.v_id(n integer) returns uuid language sql immutable as $$select ('fd500000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.v_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
create function pg_temp.v_error(statement text,state text) returns void language plpgsql as $$begin begin execute statement;exception when others then if sqlstate=state then return;end if;raise;end;raise exception 'Expected SQLSTATE %',state;end$$;
create function pg_temp.v_command(n integer,place text) returns jsonb language sql as $$select jsonb_build_object('commandId',pg_temp.v_id(n),'expectedVersion',0,'game',jsonb_build_object('id',pg_temp.v_id(n+1),'disputeId',pg_temp.v_id(92),'homeRegistrationId',pg_temp.v_id(95),'awayRegistrationId',pg_temp.v_id(96),'date',null,'time',null,'venue',place,'number',null))$$;
grant execute on function pg_temp.v_id(integer),pg_temp.v_assert(boolean,text),pg_temp.v_error(text,text),pg_temp.v_command(integer,text) to authenticated,anon;
insert into public.championships(id,name) values(pg_temp.v_id(90),'Venue fixture');
insert into public.seasons(id,championship_id,year) values(pg_temp.v_id(91),pg_temp.v_id(90),2026);
insert into public.disputes(id,season_id,gender,category) values(pg_temp.v_id(92),pg_temp.v_id(91),'masculino','Adulto');
insert into public.teams(id,name) values(pg_temp.v_id(94),'Venue team');
insert into public.registrations(id,dispute_id,team_id,name) values(pg_temp.v_id(95),pg_temp.v_id(92),pg_temp.v_id(94),'Venue A'),(pg_temp.v_id(96),pg_temp.v_id(92),pg_temp.v_id(94),'Venue B');
insert into public.games(id,dispute_id,home_registration_id,away_registration_id,venue) values
(pg_temp.v_id(1),pg_temp.v_id(92),pg_temp.v_id(95),pg_temp.v_id(96),'Ginásio  Azul'),
(pg_temp.v_id(2),pg_temp.v_id(92),pg_temp.v_id(95),pg_temp.v_id(96),'GINASIO AZUL');
-- VENUE_ASSERTIONS
select set_config('request.jwt.claim.sub',(select user_id::text from public.admin_access where enabled order by user_id limit 1),true);
set local role authenticated;
select pg_temp.v_assert(jsonb_array_length(public.list_game_venues('ginasio azul',0)->'items')=1,'backfill deduplicates case accents spaces');
select pg_temp.v_assert(public.get_game(pg_temp.v_id(1))->>'venue'='Ginásio  Azul','backfill does not rewrite historical game');
select pg_temp.v_assert(not has_table_privilege('authenticated','private.game_venues','INSERT'),'no direct writes');
select pg_temp.v_assert(not has_function_privilege('anon','public.list_game_venues(text,integer)','EXECUTE'),'no anonymous lookup');
select pg_temp.v_error('select public.list_game_venues(repeat(''x'',161),0)','PT400');
select pg_temp.v_error('select public.list_game_venues('''',-1)','PT400');
select public.save_game(pg_temp.v_command(100,'Ginásio   Novo'));
select public.save_game(pg_temp.v_command(100,'Ginásio   Novo'));
select public.save_game(pg_temp.v_command(102,'GINASIO NOVO'));
select pg_temp.v_assert(jsonb_array_length(public.list_game_venues('ginasio novo',0)->'items')=1,'successful saves and replay do not duplicate venue');
select pg_temp.v_error($q$select public.save_game(jsonb_set(pg_temp.v_command(104,'Never committed'),'{game,awayRegistrationId}',to_jsonb(pg_temp.v_id(95))))$q$,'PT400');
select pg_temp.v_assert(public.list_game_venues('Never committed',0)->'items'='[]'::jsonb,'failed game does not create venue');
savepoint venue_cancel;
select public.save_game(pg_temp.v_command(106,'Rolled back venue'));
rollback to savepoint venue_cancel;
select pg_temp.v_assert(public.list_game_venues('Rolled back venue',0)->'items'='[]'::jsonb,'rolled back game does not create venue');
do $$begin for n in 1..21 loop perform public.save_game(pg_temp.v_command(200+n*2,'Page venue '||lpad(n::text,2,'0')));end loop;end$$;
select pg_temp.v_assert(jsonb_array_length(public.list_game_venues('Page venue',0)->'items')=20 and (public.list_game_venues('Page venue',0)->>'hasMore')::boolean,'first page bounded');
select pg_temp.v_assert(jsonb_array_length(public.list_game_venues('Page venue',20)->'items')=1 and not (public.list_game_venues('Page venue',20)->>'hasMore')::boolean,'second page complete');
select public.save_game(pg_temp.v_command(400,'東京'));
select public.save_game(pg_temp.v_command(402,'大阪'));
select pg_temp.v_assert(jsonb_array_length(public.list_game_venues('東京',0)->'items')=1 and jsonb_array_length(public.list_game_venues('大阪',0)->'items')=1,'unicode names do not collapse');
select public.save_game(pg_temp.v_command(404,chr(769)));
select pg_temp.v_assert(public.get_game(pg_temp.v_id(405))->>'venue'=chr(769),'catalog does not narrow legacy game validation');
select pg_temp.v_error($q$select public.save_game(jsonb_set(pg_temp.v_command(100,'Stale venue'),'{commandId}',to_jsonb(pg_temp.v_id(408))))$q$,'PT409');
select pg_temp.v_assert(public.list_game_venues('Stale venue',0)->'items'='[]'::jsonb,'stale version does not create venue');
select pg_temp.v_assert(not has_function_privilege('authenticated','private.capture_game_venue()','EXECUTE'),'collector cannot be invoked directly');
select set_config('request.jwt.claim.sub','fd500000-0000-4000-8000-000000000099',true);
select pg_temp.v_error('select public.list_game_venues('''',0)','PT403');
reset role;
rollback;
