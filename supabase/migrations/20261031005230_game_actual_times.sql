-- Record actual start/end in local wall-clock time for America/Sao_Paulo.
-- Do not confuse with scheduled_date/time. Applied migration files remain unchanged.
alter table public.games add column started_at timestamp without time zone;
alter table public.games add column ended_at timestamp without time zone;
alter table public.games add constraint games_actual_times_valid check (
 ended_at is null or (started_at is not null and ended_at>started_at and ended_at<=started_at+interval '24 hours')
);

create or replace function public.get_game(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',g.id,'disputeId',g.dispute_id,'homeRegistrationId',g.home_registration_id,'awayRegistrationId',g.away_registration_id,
 'date',g.scheduled_date,'time',to_char(g.scheduled_time,'HH24:MI'),'startAt',to_char(g.started_at,'YYYY-MM-DD"T"HH24:MI'),'endAt',to_char(g.ended_at,'YYYY-MM-DD"T"HH24:MI'),'venue',g.venue,'number',g.game_number,
 'version',g.version,'savedAt',g.saved_at,'state',g.state,'timeZone','America/Sao_Paulo',
 'scheduledAt',case when g.scheduled_date is not null and g.scheduled_time is not null then (g.scheduled_date+g.scheduled_time) at time zone 'America/Sao_Paulo' else null end,
 'home',public.get_registration(g.home_registration_id),'away',public.get_registration(g.away_registration_id))
 from public.games g where g.id=p_id
$$;
create or replace function private.save_game(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;gid uuid;did uuid;hid uuid;aid uuid;root uuid;expected integer;r jsonb;receipt private.game_commands%rowtype;old public.games%rowtype;next_version integer;day date;hour time;started timestamp;ended timestamp;place text;num text;result jsonb;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','expectedVersion','game']) or octet_length(p_command::text)>8192 or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' or (p_command->>'expectedVersion')!~'^[0-9]+$' then raise sqlstate 'PT400' using message='invalid_game';end if;
 r:=p_command->'game';
 if not (private.context_keys(r,array['id','disputeId','homeRegistrationId','awayRegistrationId','date','time','venue','number']) or private.context_keys(r,array['id','disputeId','homeRegistrationId','awayRegistrationId','date','time','startAt','endAt','venue','number'])) or
 (r ? 'startAt' and jsonb_typeof(r->'startAt') not in('string','null')) or (r ? 'endAt' and jsonb_typeof(r->'endAt') not in('string','null')) or
 jsonb_typeof(r->'date') not in('string','null') or jsonb_typeof(r->'time') not in('string','null') or jsonb_typeof(r->'venue') not in('string','null') or jsonb_typeof(r->'number') not in('string','null') then raise sqlstate 'PT400' using message='invalid_game';end if;
 cmd:=(p_command->>'commandId')::uuid;gid:=(r->>'id')::uuid;did:=(r->>'disputeId')::uuid;hid:=(r->>'homeRegistrationId')::uuid;aid:=(r->>'awayRegistrationId')::uuid;expected:=(p_command->>'expectedVersion')::integer;
 if cmd is null or gid is null or did is null or hid is null or aid is null or hid=aid or expected not between 0 and 2147483646 then raise sqlstate 'PT400' using message='invalid_game';end if;
 if r->>'date' is not null then
 if (r->>'date')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise sqlstate 'PT400' using message='invalid_game';end if;day:=(r->>'date')::date;
 end if;
 if r->>'time' is not null then
 if day is null or (r->>'time')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise sqlstate 'PT400' using message='invalid_game';end if;hour:=(r->>'time')::time;
 end if;
 if r ? 'startAt' and r->>'startAt' is not null then
  if (r->>'startAt')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]$'
    then raise sqlstate 'PT400' using message='invalid_game';end if;
  started:=(r->>'startAt')::timestamp;
 end if;
 if r ? 'endAt' and r->>'endAt' is not null then
  if (r->>'endAt')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]$'
    then raise sqlstate 'PT400' using message='invalid_game';end if;
  ended:=(r->>'endAt')::timestamp;
 end if;
 place:=nullif(regexp_replace(btrim(r->>'venue'),'[[:space:]]+',' ','g'),'');num:=nullif(regexp_replace(btrim(r->>'number'),'[[:space:]]+',' ','g'),'');
 if length(place)>160 or length(num)>40 or coalesce(r->>'venue','')~'[[:cntrl:]]' or coalesce(r->>'number','')~'[[:cntrl:]]' then raise sqlstate 'PT400' using message='invalid_game';end if;
 perform pg_advisory_xact_lock(hashtextextended('game-command:'||cmd::text,0));
 select * into receipt from private.game_commands where command_id=cmd;
 if found then
 if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
 if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;
 end if;
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if root is null then raise sqlstate 'PT400' using message='invalid_game';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 perform pg_advisory_xact_lock(hashtextextended('game:'||gid::text,0));
 select * into old from public.games where id=gid for update;
 if (found and old.version<>expected) or (not found and expected<>0) then raise sqlstate 'PT409' using message='version_conflict';end if;
 if old.id is not null and old.dispute_id<>did then raise sqlstate 'PT400' using message='immutable_parent';end if;
 if old.id is not null and old.state<>'scheduled' then raise sqlstate 'PT409' using message='game_locked';end if;
 if not exists(select 1 from public.registrations where id=hid and dispute_id=did) or not exists(select 1 from public.registrations where id=aid and dispute_id=did) then raise sqlstate 'PT400' using message='invalid_game';end if;
 if not (r ? 'startAt') and old.id is not null then started:=old.started_at;end if;
 if not (r ? 'endAt') and old.id is not null then ended:=old.ended_at;end if;
 if ended is not null and (started is null or ended<=started or ended>started+interval '24 hours')
   then raise sqlstate 'PT400' using message='invalid_game_time';end if;
 next_version:=coalesce(old.version,0)+1;
 if old.id is null then insert into public.games(id,dispute_id,home_registration_id,away_registration_id,scheduled_date,scheduled_time,started_at,ended_at,venue,game_number) values(gid,did,hid,aid,day,hour,started,ended,place,num);
 else update public.games set home_registration_id=hid,away_registration_id=aid,scheduled_date=day,scheduled_time=hour,started_at=started,ended_at=ended,venue=place,game_number=num,version=next_version,saved_at=clock_timestamp() where id=gid;end if;
 update public.championships set saved_at=clock_timestamp() where id=root;
 result:=jsonb_build_object('id',gid,'version',next_version);
 insert into private.game_commands(command_id,actor_id,payload,result) values(cmd,actor,p_command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_game';
end
$$;
