-- Current metadata stays small. The existing immutable, incremental ledger is retained.
-- Serialize the conversion against result writers, before reading any old head.
-- No root advisory lock is taken by DDL while a writer waits on this relation.
lock table public.published_games,public.published_statistics in share row exclusive mode;
create table public.published_statistics_games (
 game_id uuid not null,dispute_id uuid not null,publication_version integer not null,
 phase text check(phase in('round_robin','knockout')),
 primary key(game_id,dispute_id),unique(game_id,publication_version),
 foreign key(game_id,dispute_id) references public.games(id,dispute_id) on delete restrict,
 foreign key(game_id,publication_version) references private.game_publication_versions(game_id,version) on delete restrict
);
create index published_statistics_games_cursor on public.published_statistics_games(dispute_id,game_id) include(publication_version,phase);
alter table public.published_statistics_games enable row level security;
revoke all on public.published_statistics_games from public,anon,authenticated,service_role;
grant select on public.published_statistics_games to anon,authenticated;
create policy read_confirmed_statistics_games on public.published_statistics_games for select to anon,authenticated using(true);

-- Upgrade reads only the previous PUBLIC source and current published results.
-- It neither increments versions nor rewrites private history or player projections.
insert into public.published_statistics_games(game_id,dispute_id,publication_version,phase)
 select p.game_id,p.dispute_id,p.version,item->>'phase'
 from public.published_statistics h cross join lateral jsonb_array_elements(h.snapshot->'games') item
 join public.published_games p on p.game_id=(item#>>'{snapshot,id}')::uuid and p.dispute_id=h.dispute_id
 and p.version=(item#>>'{snapshot,version}')::integer and p.snapshot=item->'snapshot';
do $$begin
 if exists(select 1 from public.published_statistics h where jsonb_array_length(h.snapshot->'games')<>(select count(*) from public.published_statistics_games g where g.dispute_id=h.dispute_id))
 then raise sqlstate 'PT409' using message='statistics_upgrade_source_conflict';end if;
end$$;
update public.published_statistics h set snapshot=jsonb_build_object(
 'kind','confirmed-statistics-head-v1','disputeId',h.dispute_id,'version',h.version,
 'confirmedAt',h.snapshot->'confirmedAt','minimumSeconds',h.snapshot->'minimumSeconds','gameCount',jsonb_array_length(h.snapshot->'games'));
alter table public.published_statistics add constraint compact_statistics_head check(coalesce(
 private.context_keys(snapshot,array['kind','disputeId','version','confirmedAt','minimumSeconds','gameCount'])
 and snapshot->>'kind'='confirmed-statistics-head-v1' and snapshot->>'disputeId'=dispute_id::text and snapshot->>'version'=version::text
 and private.regulation_integer(snapshot->'gameCount',0,10000) and private.regulation_integer(snapshot->'minimumSeconds',1,2147483647)
 and jsonb_typeof(snapshot->'confirmedAt')='string' and octet_length(snapshot::text)<=1024,false));

create or replace function private.refresh_confirmed_statistics(did uuid,changed_game uuid default null) returns void language plpgsql volatile security definer set search_path='' as $$
declare root uuid;v integer;minimum integer;now_at timestamptz;n integer;g public.published_games%rowtype;begin
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if root is null then raise sqlstate 'PT404' using message='statistics_context_not_found';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 select p.version,h.minimum_seconds into v,minimum from public.published_statistics p join private.statistics_publication_versions h on h.dispute_id=p.dispute_id and h.version=p.version where p.dispute_id=did for update of p;
 if coalesce(v,0)=2147483647 then raise sqlstate 'PT409' using message='statistics_version_exhausted';end if;
 v:=coalesce(v,0)+1;minimum:=coalesce(minimum,600);now_at:=clock_timestamp();
 select count(*) into n from public.published_games where dispute_id=did;
 if n>10000 then raise sqlstate 'PT413' using message='statistics_source_too_large';end if;
 if changed_game is null then
  if exists(select 1 from public.published_games where dispute_id=did and octet_length(snapshot::text)>1048576)
  then raise sqlstate 'PT413' using message='statistics_game_too_large';end if;
  delete from public.published_statistics_games m where m.dispute_id=did and not exists(select 1 from public.published_games p where p.game_id=m.game_id and p.dispute_id=did);
  insert into public.published_statistics_games(game_id,dispute_id,publication_version)
   select game_id,dispute_id,version from public.published_games where dispute_id=did
   on conflict(game_id,dispute_id) do update set publication_version=excluded.publication_version;
 else
  select * into g from public.published_games where game_id=changed_game and dispute_id=did;
  if found then
   if octet_length(g.snapshot::text)>1048576 then raise sqlstate 'PT413' using message='statistics_game_too_large';end if;
   insert into public.published_statistics_games(game_id,dispute_id,publication_version) values(g.game_id,did,g.version)
    on conflict(game_id,dispute_id) do update set publication_version=excluded.publication_version;
  else delete from public.published_statistics_games where game_id=changed_game and dispute_id=did;end if;
 end if;
 insert into private.statistics_publication_versions(dispute_id,version,confirmed_at,minimum_seconds) values(did,v,now_at,minimum);
 if changed_game is null then
  insert into private.statistics_publication_changes(dispute_id,version,game_id,publication_version,phase)
   select did,v,game_id,publication_version,phase from public.published_statistics_games where dispute_id=did;
 else
  insert into private.statistics_publication_changes(dispute_id,version,game_id,publication_version,phase)
   values(did,v,changed_game,(select publication_version from public.published_statistics_games where game_id=changed_game and dispute_id=did),(select phase from public.published_statistics_games where game_id=changed_game and dispute_id=did));
 end if;
 insert into public.published_statistics(dispute_id,version,snapshot)
  values(did,v,jsonb_build_object('kind','confirmed-statistics-head-v1','disputeId',did,'version',v,'confirmedAt',now_at,'minimumSeconds',minimum,'gameCount',n))
  on conflict(dispute_id) do update set version=excluded.version,snapshot=excluded.snapshot;
end$$;

create or replace function private.refresh_player_game(gid uuid) returns void language plpgsql volatile security definer set search_path='' as $$
declare root uuid;g public.published_games%rowtype;stats_version integer;minimum_seconds integer;phase text;items jsonb;begin
 select s.championship_id into root from public.games x join public.disputes d on d.id=x.dispute_id join public.seasons s on s.id=d.season_id where x.id=gid;
 if root is null then raise sqlstate 'PT404' using message='player_game_not_found';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 select * into g from public.published_games where game_id=gid for share;
 if not found then delete from public.published_player_games where game_id=gid;return;end if;
 if not exists(select 1 from private.game_publication_versions v where v.game_id=gid and v.version=g.version and v.snapshot=g.snapshot)
 then raise sqlstate 'PT409' using message='player_game_source_conflict';end if;
 select h.version,m.minimum_seconds,x.phase into stats_version,minimum_seconds,phase
 from public.published_statistics h join private.statistics_publication_versions m on m.dispute_id=h.dispute_id and m.version=h.version
 join public.published_statistics_games x on x.dispute_id=h.dispute_id and x.game_id=gid and x.publication_version=g.version
 where h.dispute_id=g.dispute_id and (h.snapshot->>'minimumSeconds')::integer=m.minimum_seconds;
 if not found then raise sqlstate 'PT409' using message='player_statistics_source_conflict';end if;
 items:=private.normalize_player_publication(g.snapshot,stats_version,minimum_seconds,phase);
 delete from public.published_player_games where game_id=gid;
 insert into public.published_player_games(person_id,game_id,dispute_id,publication_version,statistics_version,snapshot)
 select (x#>>'{fact,person,id}')::uuid,gid,g.dispute_id,g.version,stats_version,x from jsonb_array_elements(items) x;
end$$;

create function public.get_public_statistics_head(p_dispute_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select snapshot from public.published_statistics where dispute_id=p_dispute_id
$$;
create function public.get_public_statistics_page(p_dispute_id uuid,p_version integer,p_after uuid default null) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare h public.published_statistics%rowtype;r record;items jsonb[]:='{}';item jsonb;total integer:=0;bytes integer:=0;last_id uuid;more boolean:=false;body jsonb;begin
 if p_dispute_id is null or p_version is null or p_version<1 then raise sqlstate 'PT400' using message='invalid_statistics_page';end if;
 select * into h from public.published_statistics where dispute_id=p_dispute_id;
 if not found then raise sqlstate 'PT404' using message='statistics_context_not_found';end if;
 if h.version<>p_version then raise sqlstate 'PT409' using message='statistics_source_changed';end if;
 for r in select m.game_id,m.phase,p.snapshot from public.published_statistics_games m
  join public.published_games p on p.game_id=m.game_id and p.dispute_id=m.dispute_id and p.version=m.publication_version
  where m.dispute_id=p_dispute_id and (p_after is null or m.game_id>p_after) order by m.game_id limit 101
 loop
  item:=jsonb_build_object('phase',r.phase,'snapshot',r.snapshot);
  if total=100 or bytes+octet_length(item::text)>3145728 then more:=true;exit;end if;
  items:=array_append(items,item);total:=total+1;bytes:=bytes+octet_length(item::text)+2;last_id:=r.game_id;
 end loop;
 if more and total=0 then raise sqlstate 'PT413' using message='statistics_page_too_large';end if;
 body:=jsonb_build_object('kind','confirmed-statistics-page-v1','disputeId',p_dispute_id,'version',h.version,'after',p_after,'next',case when more then last_id else null end,'games',to_jsonb(items));
 if octet_length(body::text)>4194304 then raise sqlstate 'PT413' using message='statistics_page_too_large';end if;
 return body;
end$$;

-- Bounded compatibility for the old Worker. Never called by a publication trigger.
create or replace function public.get_public_statistics_source(p_dispute_id uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare h public.published_statistics%rowtype;body jsonb;games jsonb;bytes bigint;n integer;begin
 select * into h from public.published_statistics where dispute_id=p_dispute_id;
 if not found then return null;end if;
 body:=(h.snapshot-'gameCount')||jsonb_build_object('kind','confirmed-statistics-v1','games','[]'::jsonb);
 select count(*),coalesce(sum(octet_length(jsonb_build_object('phase',m.phase,'snapshot',p.snapshot)::text)),0) into n,bytes
 from public.published_statistics_games m join public.published_games p on p.game_id=m.game_id and p.dispute_id=m.dispute_id and p.version=m.publication_version where m.dispute_id=p_dispute_id;
 if n<>(h.snapshot->>'gameCount')::integer then raise sqlstate 'PT409' using message='statistics_source_changed';end if;
 if bytes+2*greatest(n-1,0)+octet_length(body::text)>4194304 then raise sqlstate 'PT413' using message='statistics_source_too_large';end if;
 select coalesce(jsonb_agg(jsonb_build_object('phase',m.phase,'snapshot',p.snapshot) order by m.game_id),'[]'::jsonb) into games
 from public.published_statistics_games m join public.published_games p on p.game_id=m.game_id and p.dispute_id=m.dispute_id and p.version=m.publication_version where m.dispute_id=p_dispute_id;
 return jsonb_set(body,'{games}',games);
end$$;
revoke all on function public.get_public_statistics_head(uuid),public.get_public_statistics_page(uuid,integer,uuid),public.get_public_statistics_source(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_public_statistics_head(uuid),public.get_public_statistics_page(uuid,integer,uuid),public.get_public_statistics_source(uuid) to anon,authenticated;
revoke all on function private.refresh_confirmed_statistics(uuid,uuid),private.refresh_player_game(uuid) from public,anon,authenticated,service_role;
