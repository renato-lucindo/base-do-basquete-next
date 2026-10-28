-- Administrative, versioned editor; legacy agenda contracts and public projections stay unchanged.
create function private.official_label(value text) returns text language sql immutable strict security invoker set search_path='' as $$
 select btrim(regexp_replace(translate(value,chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279),repeat(' ',19)),'[[:space:]]+',' ','g'))
$$;
create function private.official_name_key(value text) returns text language sql immutable strict security invoker set search_path='' as $$
 select lower(regexp_replace(normalize(private.official_label(value),NFD),'['||chr(768)||'-'||chr(879)||']','','g'))
$$;
create table private.game_officials (
 id uuid primary key, name text not null check(length(name) between 1 and 160 and name=btrim(name) and name !~ '[[:cntrl:]]'),
 name_key text not null, created_at timestamptz not null default clock_timestamp(),
 check(name_key=private.official_name_key(name))
);
create index game_officials_search on private.game_officials(name_key,id);
create table private.game_official_assignments (
 game_id uuid not null references public.games(id) on delete restrict,
 role text not null check(role in('referee','umpire1','umpire2','scorer','timer','shotClock')),
 official_id uuid not null references private.game_officials(id) on delete restrict,
 name_snapshot text not null check(length(name_snapshot) between 1 and 160),
 primary key(game_id,role),unique(game_id,official_id)
);
create index game_official_assignments_official on private.game_official_assignments(official_id,game_id);
create table private.game_officiating_commands (
 command_id uuid primary key references private.game_commands(command_id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict,
 game_id uuid not null references public.games(id) on delete restrict,
 payload jsonb not null,result jsonb not null,officiating_snapshot jsonb not null,
 saved_at timestamptz not null default clock_timestamp()
);
create index game_officiating_commands_game on private.game_officiating_commands(game_id,saved_at);
create index game_officiating_commands_actor on private.game_officiating_commands(actor_id);
alter table private.game_officials enable row level security;
alter table private.game_official_assignments enable row level security;
alter table private.game_officiating_commands enable row level security;
revoke all on private.game_officials,private.game_official_assignments,private.game_officiating_commands from public,anon,authenticated,service_role;

create function private.valid_game_officiating(slots jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare role text;item jsonb;ids uuid[]:='{}';oid uuid;label text;
begin
 if not private.context_keys(slots,array['referee','umpire1','umpire2','scorer','timer','shotClock']) then return false;end if;
 foreach role in array array['referee','umpire1','umpire2','scorer','timer','shotClock'] loop
  item:=slots->role;if item='null'::jsonb then continue;end if;
  if jsonb_typeof(item) is distinct from 'object' or not private.regulation_uuid(item->'id') then return false;end if;
  oid:=(item->>'id')::uuid;if oid=any(ids) then return false;end if;ids:=array_append(ids,oid);
  if item->>'kind'='existing' then
   if not private.context_keys(item,array['kind','id']) then return false;end if;
  elsif item->>'kind'='new' then
   if not private.context_keys(item,array['kind','id','name','confirmHomonym']) or jsonb_typeof(item->'name') is distinct from 'string' or jsonb_typeof(item->'confirmHomonym') is distinct from 'boolean' then return false;end if;
   label:=item->>'name';
   if length(label)>160 or label~'[[:cntrl:]]' or length(private.official_label(label))=0 then return false;end if;
  else return false;end if;
 end loop;
 return not((slots->'umpire1'<>'null'::jsonb and slots->'referee'='null'::jsonb) or(slots->'umpire2'<>'null'::jsonb and slots->'umpire1'='null'::jsonb) or(slots->'timer'<>'null'::jsonb and slots->'scorer'='null'::jsonb) or(slots->'shotClock'<>'null'::jsonb and slots->'timer'='null'::jsonb));
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end$$;

create function private.game_officiating_snapshot(gid uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_object_agg(r.role,case when a.official_id is null then 'null'::jsonb else jsonb_build_object('id',a.official_id,'name',a.name_snapshot) end)
 from unnest(array['referee','umpire1','umpire2','scorer','timer','shotClock']) r(role)
 left join private.game_official_assignments a on a.game_id=gid and a.role=r.role
$$;
create function private.get_game_editor(gid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare g jsonb;
begin
 if not exists(select 1 from public.admin_access where user_id=auth.uid() and enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 g:=public.get_game(gid);if g is null then return null;end if;
 return jsonb_build_object('game',g,'officiating',private.game_officiating_snapshot(gid));
end$$;
create function private.list_game_officials(p_query text,p_offset integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare needle text;result jsonb;
begin
 if not exists(select 1 from public.admin_access where user_id=auth.uid() and enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 if p_query is null or length(p_query)>160 or p_query~'[[:cntrl:]]' or p_offset is null or p_offset<0 or p_offset>100000 then raise sqlstate 'PT400' using message='invalid_official_query';end if;
 needle:=private.official_name_key(p_query);
 with matching as(select id,name,name_key from private.game_officials where position(needle in name_key)>0 order by name_key,id limit 21 offset p_offset),
 page as(select * from matching order by name_key,id limit 20)
 select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name_key,id) from page),'[]'::jsonb),'hasMore',(select count(*)>20 from matching)) into result;
 return result;
end$$;
create function private.save_game_editor(c jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;gid uuid;role text;item jsonb;oid uuid;label text;key text;result jsonb;receipt private.game_officiating_commands%rowtype;
begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(c,array['commandId','expectedVersion','game','officiating']) or octet_length(c::text)>8192 or not private.regulation_uuid(c->'commandId') or not private.valid_game_officiating(c->'officiating') then raise sqlstate 'PT400' using message='invalid_officiating';end if;
 cmd:=(c->>'commandId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('game-command:'||cmd::text,0));
 select * into receipt from private.game_officiating_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>c then raise sqlstate 'PT409' using message='idempotency_conflict';end if;
  return receipt.result;
 end if;
 if exists(select 1 from private.game_commands where command_id=cmd) then raise sqlstate 'PT409' using message='idempotency_conflict';end if;
 -- Preserve the authoritative writer's command -> competition -> game lock order and all guards.
 result:=private.save_game(c-'officiating');gid:=(result->>'id')::uuid;
 -- Order all identities before names; cross-game UUID collisions cannot invert row insertion order.
 for oid in select (v->>'id')::uuid from jsonb_each(c->'officiating') e(k,v) where v<>'null'::jsonb order by 1 loop
  perform pg_advisory_xact_lock(hashtextextended('official-identity:'||oid::text,0));
 end loop;
 -- Names are not identities. Ordered locks only serialize explicit homonym confirmation.
 for key in select distinct private.official_name_key(v->>'name') from jsonb_each(c->'officiating') e(k,v) where v->>'kind'='new' order by 1 loop
  perform pg_advisory_xact_lock(hashtextextended('official-name:'||key,0));
 end loop;
 foreach role in array array['referee','umpire1','umpire2','scorer','timer','shotClock'] loop
  item:=c->'officiating'->role;if item='null'::jsonb then continue;end if;
  oid:=(item->>'id')::uuid;
  if item->>'kind'='new' then
   label:=private.official_label(item->>'name');key:=private.official_name_key(label);
   if exists(select 1 from private.game_officials where id=oid) then raise sqlstate 'PT409' using message='official_identity_conflict';end if;
   if exists(select 1 from private.game_officials where name_key=key) and not(item->>'confirmHomonym')::boolean then raise sqlstate 'PT409' using message='official_homonym_confirmation_required';end if;
   insert into private.game_officials(id,name,name_key) values(oid,label,key);
  elsif not exists(select 1 from private.game_officials where id=oid) then raise sqlstate 'PT400' using message='invalid_official';end if;
 end loop;
 delete from private.game_official_assignments where game_id=gid;
 foreach role in array array['referee','umpire1','umpire2','scorer','timer','shotClock'] loop
  item:=c->'officiating'->role;if item='null'::jsonb then continue;end if;
  oid:=(item->>'id')::uuid;
  insert into private.game_official_assignments(game_id,role,official_id,name_snapshot)
  select gid,role,id,name from private.game_officials where id=oid;
 end loop;
 insert into private.game_officiating_commands(command_id,actor_id,game_id,payload,result,officiating_snapshot)
 values(cmd,actor,gid,c,result,private.game_officiating_snapshot(gid));
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_officiating';
end$$;
create function private.game_officiating_receipt_immutable() returns trigger language plpgsql security invoker set search_path='' as $$begin raise sqlstate 'PT403' using message='immutable_officiating_receipt';end$$;
create trigger immutable_game_officiating_receipt before update or delete on private.game_officiating_commands for each row execute function private.game_officiating_receipt_immutable();
create function public.list_game_officials(p_query text default '',p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$select private.list_game_officials(p_query,p_offset)$$;
create function public.get_game_editor(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.get_game_editor(p_id)$$;
create function public.save_game_editor(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_game_editor(p_command)$$;
revoke all on function private.official_label(text),private.official_name_key(text),private.valid_game_officiating(jsonb),private.game_officiating_snapshot(uuid),private.get_game_editor(uuid),private.list_game_officials(text,integer),private.save_game_editor(jsonb),private.game_officiating_receipt_immutable(),public.list_game_officials(text,integer),public.get_game_editor(uuid),public.save_game_editor(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.get_game_editor(uuid),private.list_game_officials(text,integer),private.save_game_editor(jsonb),public.list_game_officials(text,integer),public.get_game_editor(uuid),public.save_game_editor(jsonb) to authenticated;
