-- G1: direct game agenda. All rows remain administrative until explicit publication.
create table public.games (
 id uuid primary key,
 dispute_id uuid not null references public.disputes(id) on delete restrict,
 home_registration_id uuid not null,
 away_registration_id uuid not null,
 scheduled_date date check (scheduled_date between date '0001-01-01' and date '9999-12-31'),
 scheduled_time time without time zone check (scheduled_time<time '24:00:00' and extract(second from scheduled_time)=0),
 venue text check (length(venue) between 1 and 160 and venue=btrim(venue) and venue !~ '[[:cntrl:]]'),
 game_number text check (length(game_number) between 1 and 40 and game_number=btrim(game_number) and game_number !~ '[[:cntrl:]]'),
 state text not null default 'scheduled' check (state in ('scheduled')),
 version integer not null default 1 check (version>0),
 saved_at timestamptz not null default clock_timestamp(),
 unique(id,dispute_id),
 foreign key(home_registration_id,dispute_id) references public.registrations(id,dispute_id) on delete restrict,
 foreign key(away_registration_id,dispute_id) references public.registrations(id,dispute_id) on delete restrict,
 check(home_registration_id<>away_registration_id),
 check(scheduled_time is null or scheduled_date is not null)
);
create index games_context_schedule on public.games(dispute_id,scheduled_date,scheduled_time,id);
create index games_home_registration on public.games(home_registration_id,dispute_id);
create index games_away_registration on public.games(away_registration_id,dispute_id);
create table private.game_commands (
 command_id uuid primary key,
 actor_id uuid not null references auth.users(id) on delete restrict,
 payload jsonb not null,
 result jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
create index game_commands_actor on private.game_commands(actor_id);
alter table public.games enable row level security;
alter table private.game_commands enable row level security;
revoke all on public.games,private.game_commands from public,anon,authenticated,service_role;
grant select on public.games to authenticated;
create policy admin_reads_games on public.games for select to authenticated using(exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy never_access_game_receipts on private.game_commands as restrictive for all to public using(false) with check(false);

create function public.get_game(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',g.id,'disputeId',g.dispute_id,'homeRegistrationId',g.home_registration_id,'awayRegistrationId',g.away_registration_id,
 'date',g.scheduled_date,'time',to_char(g.scheduled_time,'HH24:MI'),'venue',g.venue,'number',g.game_number,
 'version',g.version,'savedAt',g.saved_at,'state',g.state,'timeZone','America/Sao_Paulo',
 'scheduledAt',case when g.scheduled_date is not null and g.scheduled_time is not null then (g.scheduled_date+g.scheduled_time) at time zone 'America/Sao_Paulo' else null end,
 'home',public.get_registration(g.home_registration_id),'away',public.get_registration(g.away_registration_id))
 from public.games g where g.id=p_id
$$;
create function public.list_games(p_dispute_id uuid,p_query text default '',p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with matching as (
 select g.id,g.scheduled_date,g.scheduled_time from public.games g
 join public.registrations h on h.id=g.home_registration_id and h.dispute_id=g.dispute_id
 join public.registrations a on a.id=g.away_registration_id and a.dispute_id=g.dispute_id
 where g.dispute_id=p_dispute_id and position(lower(left(coalesce(p_query,''),120)) in lower(h.name||' '||a.name||' '||coalesce(g.venue,'')||' '||coalesce(g.game_number,'')))>0
 order by g.scheduled_date nulls last,g.scheduled_time nulls last,g.id limit 21 offset greatest(0,least(coalesce(p_offset,0),100000))
 ), page as(select * from matching order by scheduled_date nulls last,scheduled_time nulls last,id limit 20)
 select jsonb_build_object('items',coalesce((select jsonb_agg(public.get_game(id) order by scheduled_date nulls last,scheduled_time nulls last,id) from page),'[]'::jsonb),'hasMore',(select count(*)>20 from matching))
$$;
create function private.save_game(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;gid uuid;did uuid;hid uuid;aid uuid;root uuid;expected integer;r jsonb;receipt private.game_commands%rowtype;old public.games%rowtype;next_version integer;day date;hour time;place text;num text;result jsonb;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','expectedVersion','game']) or octet_length(p_command::text)>8192 or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' or (p_command->>'expectedVersion')!~'^[0-9]+$' then raise sqlstate 'PT400' using message='invalid_game';end if;
 r:=p_command->'game';
 if not private.context_keys(r,array['id','disputeId','homeRegistrationId','awayRegistrationId','date','time','venue','number']) or
 jsonb_typeof(r->'date') not in('string','null') or jsonb_typeof(r->'time') not in('string','null') or jsonb_typeof(r->'venue') not in('string','null') or jsonb_typeof(r->'number') not in('string','null') then raise sqlstate 'PT400' using message='invalid_game';end if;
 cmd:=(p_command->>'commandId')::uuid;gid:=(r->>'id')::uuid;did:=(r->>'disputeId')::uuid;hid:=(r->>'homeRegistrationId')::uuid;aid:=(r->>'awayRegistrationId')::uuid;expected:=(p_command->>'expectedVersion')::integer;
 if cmd is null or gid is null or did is null or hid is null or aid is null or hid=aid or expected not between 0 and 2147483646 then raise sqlstate 'PT400' using message='invalid_game';end if;
 if r->>'date' is not null then
 if (r->>'date')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise sqlstate 'PT400' using message='invalid_game';end if;day:=(r->>'date')::date;
 end if;
 if r->>'time' is not null then
 if day is null or (r->>'time')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise sqlstate 'PT400' using message='invalid_game';end if;hour:=(r->>'time')::time;
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
 next_version:=coalesce(old.version,0)+1;
 if old.id is null then insert into public.games(id,dispute_id,home_registration_id,away_registration_id,scheduled_date,scheduled_time,venue,game_number) values(gid,did,hid,aid,day,hour,place,num);
 else update public.games set home_registration_id=hid,away_registration_id=aid,scheduled_date=day,scheduled_time=hour,venue=place,game_number=num,version=next_version,saved_at=clock_timestamp() where id=gid;end if;
 update public.championships set saved_at=clock_timestamp() where id=root;
 result:=jsonb_build_object('id',gid,'version',next_version);
 insert into private.game_commands(command_id,actor_id,payload,result) values(cmd,actor,p_command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_game';
end
$$;
create function public.save_game(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_game(p_command)$$;
revoke all on function public.get_game(uuid),public.list_games(uuid,text,integer),private.save_game(jsonb),public.save_game(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.get_game(uuid),public.list_games(uuid,text,integer),private.save_game(jsonb),public.save_game(jsonb) to authenticated;
