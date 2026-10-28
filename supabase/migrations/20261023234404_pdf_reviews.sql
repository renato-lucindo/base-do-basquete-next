-- G3b2: mutable private review, independent of immutable PDF bytes.
create table public.pdf_reviews (
 source_id uuid primary key references public.pdf_sources(id) on delete restrict,
 dispute_id uuid not null references public.disputes(id) on delete restrict,game_id uuid,
 document jsonb not null,version integer not null default 1 check(version>0),saved_at timestamptz not null default clock_timestamp(),
 saved_by uuid not null references auth.users(id) on delete restrict,
 foreign key(game_id,dispute_id) references public.games(id,dispute_id) on delete restrict
);
create index pdf_reviews_context on public.pdf_reviews(dispute_id,saved_at desc,source_id);
create index pdf_reviews_game on public.pdf_reviews(game_id,dispute_id);
create index pdf_reviews_actor on public.pdf_reviews(saved_by);
create table private.pdf_review_commands (
 command_id uuid primary key,actor_id uuid not null references auth.users(id) on delete restrict,payload jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp()
);
create index pdf_review_commands_actor on private.pdf_review_commands(actor_id);
alter table public.pdf_reviews enable row level security;
alter table private.pdf_review_commands enable row level security;
revoke all on public.pdf_reviews,private.pdf_review_commands from public,anon,authenticated,service_role;
grant select on public.pdf_reviews to authenticated;
create policy admin_reads_pdf_reviews on public.pdf_reviews for select to authenticated using(exists(select 1 from public.admin_access a where a.user_id=(select auth.uid()) and a.enabled));
create policy never_access_pdf_review_commands on private.pdf_review_commands as restrictive for all to public using(false) with check(false);

create function public.get_pdf_review(p_source_id uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare s public.pdf_sources%rowtype;r public.pdf_reviews%rowtype;d jsonb;
begin
 select * into s from public.pdf_sources where id=p_source_id;if not found then return null;end if;
 if not s.ready then raise sqlstate 'PT409' using message='source_upload_incomplete';end if;
 select * into r from public.pdf_reviews where source_id=p_source_id;
 if r.source_id is null then
  select jsonb_build_object('disputeId',s.dispute_id,'gameId',null,'invertSides',false,'notes','','mappings',coalesce(jsonb_agg(jsonb_build_object('sourceSide',t.n-1,'sourceIndex',p.n-1,'rosterEntryId',null,'jersey',p.value->>'jerseyNumber') order by t.n,p.n),'[]'::jsonb)) into d
  from jsonb_array_elements(s.parsed->'teams') with ordinality t(value,n) cross join lateral jsonb_array_elements(t.value->'players') with ordinality p(value,n);
 else d:=r.document;end if;
 return jsonb_build_object('source',public.get_pdf_source(s.id),'document',d,'version',coalesce(r.version,0),'savedAt',r.saved_at);
end$$;
create or replace function public.list_pdf_sources(p_dispute_id uuid,p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$
 with found as(select s.id,coalesce(r.saved_at,s.saved_at) as saved_at from public.pdf_sources s left join public.pdf_reviews r on r.source_id=s.id where coalesce(r.dispute_id,s.dispute_id)=p_dispute_id order by coalesce(r.saved_at,s.saved_at) desc,s.id limit 21 offset greatest(0,least(coalesce(p_offset,0),100000))),page as(select * from found order by saved_at desc,id limit 20)
 select jsonb_build_object('items',coalesce((select jsonb_agg(public.get_pdf_source(id) order by saved_at desc,id) from page),'[]'::jsonb),'hasMore',(select count(*)>20 from found))
$$;
create function private.save_pdf_review(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;sid uuid;did uuid;gid uuid;expected integer;d jsonb;m jsonb;s public.pdf_sources%rowtype;old public.pdf_reviews%rowtype;receipt private.pdf_review_commands%rowtype;g public.games%rowtype;root uuid;roots uuid[];n integer;side_index integer;row_index integer;rid uuid;reg uuid;pid uuid;ended timestamptz;sex text;gender text;persons uuid[]:=array[]::uuid[];result jsonb;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(p_command,array['commandId','sourceId','expectedVersion','document']) or octet_length(p_command::text)>32768 or not private.pdf_number(p_command->'expectedVersion') then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
 d:=p_command->'document';
 if not private.context_keys(d,array['disputeId','gameId','invertSides','mappings','notes']) or jsonb_typeof(d->'invertSides') is distinct from 'boolean' or jsonb_typeof(d->'gameId') not in('string','null') or jsonb_typeof(d->'mappings') is distinct from 'array' or jsonb_array_length(d->'mappings')>24 or jsonb_typeof(d->'notes') is distinct from 'string' or length(d->>'notes')>500 then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
 cmd:=(p_command->>'commandId')::uuid;sid:=(p_command->>'sourceId')::uuid;did:=(d->>'disputeId')::uuid;gid:=(d->>'gameId')::uuid;expected:=(p_command->>'expectedVersion')::integer;
 if cmd is null or sid is null or did is null or expected not between 0 and 2147483646 then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
 perform pg_advisory_xact_lock(hashtextextended('pdf-review-command:'||cmd::text,0));
 select * into receipt from private.pdf_review_commands where command_id=cmd;
 if found then if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;if receipt.payload<>p_command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;end if;
 -- All review writers take this resource lock before roots; roots are sorted.
 perform pg_advisory_xact_lock(hashtextextended('pdf-review:'||sid::text,0));
 select * into s from public.pdf_sources where id=sid;if not found or not s.ready then raise sqlstate 'PT409' using message='source_upload_incomplete';end if;
 select * into old from public.pdf_reviews where source_id=sid;
 if (old.source_id is null and expected<>0) or (old.source_id is not null and old.version<>expected) then raise sqlstate 'PT409' using message='version_conflict';end if;
 select array_agg(distinct se.championship_id order by se.championship_id) into roots from public.disputes di join public.seasons se on se.id=di.season_id where di.id in(s.dispute_id,old.dispute_id,did);
 foreach root in array roots loop perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));end loop;
 select case when di.gender='feminino' then 'female' else 'male' end into gender from public.disputes di where di.id=did;if gender is null then raise sqlstate 'PT400' using message='invalid_pdf_context';end if;

 if gid is not null then
  perform pg_advisory_xact_lock(hashtextextended('game:'||gid::text,0));
  select * into g from public.games where id=gid and dispute_id=did;if not found then raise sqlstate 'PT400' using message='invalid_pdf_context';end if;
 end if;
 n:=jsonb_array_length(s.parsed->'teams'->0->'players')+jsonb_array_length(s.parsed->'teams'->1->'players');
 if n<>jsonb_array_length(d->'mappings') then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
 for m in select value from jsonb_array_elements(d->'mappings') loop
  if not private.context_keys(m,array['sourceSide','sourceIndex','rosterEntryId','jersey']) or not private.pdf_number(m->'sourceSide') or not private.pdf_number(m->'sourceIndex') or (m->>'sourceSide')::integer not between 0 and 1 or (m->>'sourceIndex')::integer not between 0 and 11 or jsonb_typeof(m->'rosterEntryId') not in('string','null') or not private.pdf_text(m->'jersey',2,1) or (m->>'jersey')!~'^(00|0|[1-9][0-9]?)$' then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
  side_index:=(m->>'sourceSide')::integer;row_index:=(m->>'sourceIndex')::integer;rid:=(m->>'rosterEntryId')::uuid;
  if row_index>=jsonb_array_length(s.parsed->'teams'->side_index->'players') then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
  if rid is null then continue;end if;
  if gid is null then raise sqlstate 'PT400' using message='invalid_pdf_context';end if;
  reg:=case when (side_index=0)<>(d->>'invertSides')::boolean then g.home_registration_id else g.away_registration_id end;
  select re.person_id,re.ended_at,a.sex into pid,ended,sex from public.roster_entries re join private.athletes a on a.person_id=re.person_id where re.id=rid and re.registration_id=reg and re.dispute_id=did;
  if pid is null or pid=any(persons) or sex<>gender or (ended is not null and (old.game_id is distinct from gid or not exists(select 1 from jsonb_array_elements(old.document->'mappings') prev where (prev->>'sourceSide')::integer=side_index and (prev->>'sourceIndex')::integer=row_index and (prev->>'rosterEntryId')::uuid=rid))) then raise sqlstate 'PT400' using message='invalid_pdf_context';end if;
  persons:=array_append(persons,pid);
 end loop;
 if exists(select 1 from jsonb_array_elements(d->'mappings') x group by (x->>'sourceSide')::integer,(x->>'sourceIndex')::integer having count(*)>1) or exists(select 1 from jsonb_array_elements(d->'mappings') x group by (x->>'sourceSide')::integer,x->>'jersey' having count(*)>1) then raise sqlstate 'PT400' using message='invalid_pdf_review';end if;
 if old.source_id is null then insert into public.pdf_reviews(source_id,dispute_id,game_id,document,saved_by) values(sid,did,gid,d,actor);
 else update public.pdf_reviews set dispute_id=did,game_id=gid,document=d,version=old.version+1,saved_at=clock_timestamp(),saved_by=actor where source_id=sid;end if;
 update public.championships set saved_at=clock_timestamp() where id=any(roots);
 result:=jsonb_build_object('id',sid,'version',coalesce(old.version,0)+1);insert into private.pdf_review_commands(command_id,actor_id,payload,result) values(cmd,actor,p_command,result);return result;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_pdf_review';
end$$;
create function public.save_pdf_review(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_pdf_review(p_command)$$;
create function private.guard_pdf_game_context() returns trigger language plpgsql volatile security invoker set search_path='' as $$begin
 if (new.dispute_id<>old.dispute_id or new.home_registration_id<>old.home_registration_id or new.away_registration_id<>old.away_registration_id) and exists(select 1 from public.pdf_reviews where game_id=old.id) then raise sqlstate 'PT409' using message='pdf_review_context_locked';end if;return new;
end$$;
create trigger pdf_review_game_context before update of dispute_id,home_registration_id,away_registration_id on public.games for each row execute function private.guard_pdf_game_context();
create function private.guard_pdf_review_gender() returns trigger language plpgsql volatile security invoker set search_path='' as $$begin
 if new.gender is distinct from old.gender and exists(select 1 from public.pdf_reviews where dispute_id=old.id) then raise sqlstate 'PT409' using message='pdf_review_context_locked';end if;return new;
end$$;
create trigger pdf_review_gender before update of gender on public.disputes for each row execute function private.guard_pdf_review_gender();
revoke all on function public.get_pdf_review(uuid),private.save_pdf_review(jsonb),public.save_pdf_review(jsonb),private.guard_pdf_game_context(),private.guard_pdf_review_gender() from public,anon,authenticated,service_role;
grant execute on function public.get_pdf_review(uuid),private.save_pdf_review(jsonb),public.save_pdf_review(jsonb) to authenticated;
