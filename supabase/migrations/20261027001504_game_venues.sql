-- Private reusable names. Games/publication snapshots keep their own original text.
create function private.venue_key(value text) returns text language sql immutable strict security invoker set search_path='' as $$
 select lower(btrim(regexp_replace(regexp_replace(normalize(value,NFD),'['||chr(768)||'-'||chr(879)||']','','g'),'[[:space:]]+',' ','g')))
$$;
create table private.game_venues (
 name_key text primary key check(length(name_key)>0),
 name text not null check(length(name) between 1 and 160 and name=btrim(name) and name !~ '[[:cntrl:]]'),
 created_at timestamptz not null default clock_timestamp(),
 check(name_key=private.venue_key(name))
);
alter table private.game_venues enable row level security;
revoke all on private.game_venues from public,anon,authenticated,service_role;
revoke all on function private.venue_key(text) from public,anon,authenticated,service_role;

-- Trigger entry only: existing game writers already enforce admin/version/command.
-- No browser can insert/update games directly; catalog capture rolls back with its game.
create function private.capture_game_venue() returns trigger language plpgsql security definer set search_path='' as $$
declare label text;
begin
 if new.venue is not null then
  label:=btrim(regexp_replace(new.venue,'[[:space:]]+',' ','g'));
  if length(private.venue_key(label))>0 then
   insert into private.game_venues(name_key,name) values(private.venue_key(label),label) on conflict(name_key) do nothing;
  end if;
 end if;
 return new;
end
$$;
revoke all on function private.capture_game_venue() from public,anon,authenticated,service_role;
create trigger capture_game_venue after insert or update of venue on public.games for each row execute function private.capture_game_venue();
insert into private.game_venues(name_key,name)
select distinct on(private.venue_key(venue)) private.venue_key(venue),btrim(regexp_replace(venue,'[[:space:]]+',' ','g'))
from public.games where venue is not null and length(private.venue_key(venue))>0 order by private.venue_key(venue),saved_at,id
on conflict(name_key) do nothing;

create function private.list_game_venues(p_query text,p_offset integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare needle text;result jsonb;
begin
 if not exists(select 1 from public.admin_access where user_id=auth.uid() and enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 if p_query is null or length(p_query)>160 or p_query~'[[:cntrl:]]' or p_offset is null or p_offset<0 or p_offset>100000 then raise sqlstate 'PT400' using message='invalid_venue_query';end if;
 needle:=private.venue_key(p_query);
 with matching as (
  select name_key,name from private.game_venues where position(needle in name_key)>0 order by name_key limit 21 offset p_offset
 ),page as(select name_key,name from matching order by name_key limit 20)
 select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('name',name) order by name_key) from page),'[]'::jsonb),'hasMore',(select count(*)>20 from matching)) into result;
 return result;
end
$$;
create function public.list_game_venues(p_query text default '',p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$select private.list_game_venues(p_query,p_offset)$$;
revoke all on function private.list_game_venues(text,integer),public.list_game_venues(text,integer) from public,anon,authenticated,service_role;
grant execute on function private.list_game_venues(text,integer),public.list_game_venues(text,integer) to authenticated;
