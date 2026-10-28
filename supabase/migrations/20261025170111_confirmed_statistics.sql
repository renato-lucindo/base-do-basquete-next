-- Statistics follow confirmed game projections in the SAME publication transaction.
-- History stores incremental references, not another full copy of every old dispute.
create table private.statistics_publication_versions (
 dispute_id uuid not null references public.disputes(id) on delete restrict,
 version integer not null check(version>0),confirmed_at timestamptz not null,
 minimum_seconds integer not null check(minimum_seconds between 1 and 2147483647),
 primary key(dispute_id,version)
);
create table private.statistics_publication_changes (
 dispute_id uuid not null,version integer not null,game_id uuid not null,
 publication_version integer,phase text check(phase in('round_robin','knockout')),
 primary key(dispute_id,version,game_id),
 foreign key(dispute_id,version) references private.statistics_publication_versions(dispute_id,version) on delete restrict,
 foreign key(game_id,dispute_id) references public.games(id,dispute_id) on delete restrict,
 foreign key(game_id,publication_version) references private.game_publication_versions(game_id,version) on delete restrict,
 check(publication_version is null or publication_version>0)
);
create index statistics_changes_game_version on private.statistics_publication_changes(game_id,publication_version);
create index statistics_changes_game_history on private.statistics_publication_changes(dispute_id,game_id,version desc);
create table public.published_statistics (
 dispute_id uuid primary key,version integer not null,
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=4194304),
 foreign key(dispute_id,version) references private.statistics_publication_versions(dispute_id,version) on delete restrict,
 check(snapshot->>'disputeId'=dispute_id::text and snapshot->>'version'=version::text)
);
create index published_statistics_version on public.published_statistics(dispute_id,version);
alter table private.statistics_publication_versions enable row level security;
alter table private.statistics_publication_changes enable row level security;
alter table public.published_statistics enable row level security;
revoke all on private.statistics_publication_versions,private.statistics_publication_changes,public.published_statistics from public,anon,authenticated,service_role;
create policy never_direct_statistics_versions on private.statistics_publication_versions as restrictive for all to public using(false) with check(false);
create policy never_direct_statistics_changes on private.statistics_publication_changes as restrictive for all to public using(false) with check(false);
grant select on public.published_statistics to anon,authenticated;
create policy read_confirmed_statistics on public.published_statistics for select to anon,authenticated using(true);
create trigger statistics_versions_immutable before update or delete on private.statistics_publication_versions for each row execute function private.publication_history_immutable();
create trigger statistics_changes_immutable before update or delete on private.statistics_publication_changes for each row execute function private.publication_history_immutable();

create function private.refresh_confirmed_statistics(did uuid,changed_game uuid default null) returns void language plpgsql volatile security definer set search_path='' as $$
declare root uuid;v integer;minimum integer;now_at timestamptz;games jsonb;body jsonb;begin
 -- Existing game writers already acquire this root before the published row.
 -- This function is not callable by application roles. Owner-only backfill is below.
 select s.championship_id into root from public.disputes d join public.seasons s on s.id=d.season_id where d.id=did;
 if root is null then raise sqlstate 'PT404' using message='statistics_context_not_found';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 select p.version,h.minimum_seconds into v,minimum from public.published_statistics p join private.statistics_publication_versions h on h.dispute_id=p.dispute_id and h.version=p.version where p.dispute_id=did for update of p;
 if coalesce(v,0)=2147483647 then raise sqlstate 'PT409' using message='statistics_version_exhausted';end if;
 v:=coalesce(v,0)+1;minimum:=coalesce(minimum,600);now_at:=clock_timestamp();
 if (select count(*)>10000 from public.published_games where dispute_id=did) then raise sqlstate 'PT413' using message='statistics_source_too_large';end if;
 -- No private regulation, future schedule, live person or live team fields are read.
 -- A later source version can acquire phase only from an explicitly public authority.
 select coalesce(jsonb_agg(jsonb_build_object('phase',null,'snapshot',snapshot) order by game_id),'[]'::jsonb) into games from public.published_games where dispute_id=did;
 body:=jsonb_build_object('kind','confirmed-statistics-v1','disputeId',did,'version',v,'confirmedAt',now_at,'minimumSeconds',minimum,'games',games);
 if octet_length(body::text)>4194304 then raise sqlstate 'PT413' using message='statistics_source_too_large';end if;
 insert into private.statistics_publication_versions(dispute_id,version,confirmed_at,minimum_seconds) values(did,v,now_at,minimum);
 if changed_game is null then
  insert into private.statistics_publication_changes(dispute_id,version,game_id,publication_version)
   select did,v,game_id,version from public.published_games where dispute_id=did;
 else
  insert into private.statistics_publication_changes(dispute_id,version,game_id,publication_version)
   values(did,v,changed_game,(select version from public.published_games where game_id=changed_game and dispute_id=did));
 end if;
 insert into public.published_statistics(dispute_id,version,snapshot) values(did,v,body)
 on conflict(dispute_id) do update set version=excluded.version,snapshot=excluded.snapshot;
end$$;
create function private.on_confirmed_game_statistics() returns trigger language plpgsql volatile security definer set search_path='' as $$begin
 if tg_op='UPDATE' and new.version=old.version and new.snapshot=old.snapshot then return new;end if;
 if tg_op='DELETE' then perform private.refresh_confirmed_statistics(old.dispute_id,old.game_id);return old;end if;
 perform private.refresh_confirmed_statistics(new.dispute_id,new.game_id);return new;
end$$;
revoke all on function private.refresh_confirmed_statistics(uuid,uuid),private.on_confirmed_game_statistics() from public,anon,authenticated,service_role;
create trigger confirmed_game_statistics after insert or update or delete on public.published_games for each row execute function private.on_confirmed_game_statistics();
create function public.get_public_statistics_source(p_dispute_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select snapshot from public.published_statistics where dispute_id=p_dispute_id$$;
revoke all on function public.get_public_statistics_source(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_public_statistics_source(uuid) to anon,authenticated;

-- Upgrade derives only already-published facts; original source/history rows are untouched.
do $$declare did uuid;begin
 for did in select distinct dispute_id from public.published_games order by dispute_id loop perform private.refresh_confirmed_statistics(did);end loop;
end$$;
