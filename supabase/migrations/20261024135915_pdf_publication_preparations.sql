-- A saved preparation is a private, versioned intent, never a public result.
create table private.pdf_publication_preparations (
 source_id uuid primary key references public.pdf_sources(id) on delete restrict,
 game_id uuid not null references public.games(id) on delete restrict,
 publication jsonb not null,
 version integer not null check(version>0),
 saved_at timestamptz not null default clock_timestamp(),
 saved_by uuid not null references auth.users(id) on delete restrict,
 check(publication->'source'->>'sourceId'=source_id::text and publication->>'gameId'=game_id::text)
);
create index pdf_preparations_game on private.pdf_publication_preparations(game_id);
create index pdf_preparations_actor on private.pdf_publication_preparations(saved_by);
create table private.pdf_preparation_commands (
 command_id uuid primary key,actor_id uuid not null references auth.users(id) on delete restrict,
 payload jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp()
);
create index pdf_preparation_commands_actor on private.pdf_preparation_commands(actor_id);
alter table private.pdf_publication_preparations enable row level security;
alter table private.pdf_preparation_commands enable row level security;
revoke all on private.pdf_publication_preparations,private.pdf_preparation_commands from public,anon,authenticated,service_role;
create policy never_direct_pdf_preparations on private.pdf_publication_preparations as restrictive for all to public using(false) with check(false);
create policy never_direct_pdf_preparation_commands on private.pdf_preparation_commands as restrictive for all to public using(false) with check(false);

create function private.get_pdf_publication_preparation(sid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r private.pdf_publication_preparations%rowtype;
begin
 if not exists(select 1 from public.admin_access where user_id=auth.uid() and enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 select * into r from private.pdf_publication_preparations where source_id=sid;
 if not found then return null;end if;
 return jsonb_build_object('sourceId',r.source_id,'version',r.version,'savedAt',r.saved_at,'publication',r.publication);
end$$;
create function public.get_pdf_publication_preparation(p_source_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.get_pdf_publication_preparation(p_source_id)$$;

create function private.save_pdf_publication_preparation(command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;sid uuid;gid uuid;expected integer;intent jsonb;reason text;manual_needed boolean;rv integer;gv integer;pv integer;sv integer;roots uuid[];root uuid;
 receipt private.pdf_preparation_commands%rowtype;old private.pdf_publication_preparations%rowtype;s public.pdf_sources%rowtype;r public.pdf_reviews%rowtype;g public.games%rowtype;sh public.game_sheets%rowtype;manual jsonb;result jsonb;new_version integer;
begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not private.context_keys(command,array['commandId','expectedVersion','publication']) or octet_length(command::text)>65536 or not private.pdf_number(command->'expectedVersion') then raise sqlstate 'PT400' using message='invalid_pdf_preparation';end if;
 cmd:=(command->>'commandId')::uuid;expected:=(command->>'expectedVersion')::integer;intent:=command->'publication';
 if not private.context_keys(intent,array['requestId','gameId','gameVersion','basePublicationVersion','source','supplement','authority','sheetVersion','reason','acceptDivergence']) or not private.context_keys(intent->'source',array['kind','sourceId','sourceVersion','reviewVersion']) or intent->'source'->>'kind'<>'pdf' or intent->'source'->'sourceVersion' is distinct from '2'::jsonb or not private.pdf_number(intent->'gameVersion') or not private.pdf_number(intent->'basePublicationVersion') or not private.pdf_number(intent->'source'->'reviewVersion') or jsonb_typeof(intent->'reason') is distinct from 'string' or jsonb_typeof(intent->'acceptDivergence') is distinct from 'boolean' then raise sqlstate 'PT400' using message='invalid_pdf_preparation';end if;
 sid:=(intent->'source'->>'sourceId')::uuid;gid:=(intent->>'gameId')::uuid;gv:=(intent->>'gameVersion')::integer;pv:=(intent->>'basePublicationVersion')::integer;rv:=(intent->'source'->>'reviewVersion')::integer;
 reason:=regexp_replace(intent->>'reason','^[[:space:]]+|[[:space:]]+$','','g');manual_needed:=intent->'authority'->>'scorePoints'='sheet' or intent->'authority'->>'periodScores'='sheet';
 if cmd is null or sid is null or gid is null or (intent->>'requestId')::uuid is null or expected not between 0 and 2147483646 or gv not between 1 and 2147483646 or pv not between 0 and 2147483646 or rv not between 1 and 2147483646 or length(reason)>500 or ((manual_needed or pv>0 or (intent->>'acceptDivergence')::boolean) and length(reason)<10) then raise sqlstate 'PT400' using message='invalid_pdf_preparation';end if;
 if manual_needed then
  if not private.pdf_number(intent->'sheetVersion') then raise sqlstate 'PT400' using message='invalid_pdf_preparation';end if;
  sv:=(intent->>'sheetVersion')::integer;if sv not between 1 and 2147483646 then raise sqlstate 'PT400' using message='invalid_pdf_preparation';end if;
 elsif intent->'sheetVersion' is distinct from 'null'::jsonb then raise sqlstate 'PT400' using message='invalid_pdf_preparation';end if;
 perform pg_advisory_xact_lock(hashtextextended('pdf-preparation-command:'||cmd::text,0));
 select * into receipt from private.pdf_preparation_commands where command_id=cmd;
 if found then if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;if receipt.payload<>command then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;end if;
 -- No publication path acquires preparation locks after a game/root lock.
 perform pg_advisory_xact_lock(hashtextextended('pdf-preparation:'||sid::text,0));
 perform pg_advisory_xact_lock(hashtextextended('pdf-review:'||sid::text,0));
 select * into s from public.pdf_sources where id=sid;
 select * into r from public.pdf_reviews where source_id=sid;
 if s.id is null or not s.ready or s.version<>2 then raise sqlstate 'PT409' using message='source_upload_incomplete';end if;
 if r.source_id is null or r.game_id is distinct from gid then raise sqlstate 'PT400' using message='invalid_pdf_context';end if;
 if r.version<>rv then raise sqlstate 'PT409' using message='version_conflict';end if;
 select array_agg(distinct se.championship_id order by se.championship_id) into roots from public.disputes di join public.seasons se on se.id=di.season_id where di.id in(s.dispute_id,r.dispute_id);
 foreach root in array roots loop perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));end loop;
 perform pg_advisory_xact_lock(hashtextextended('game:'||gid::text,0));
 select * into g from public.games where id=gid for share;
 select * into sh from public.game_sheets where game_id=gid for share;
 select * into old from private.pdf_publication_preparations where source_id=sid;
 if g.id is null or g.dispute_id<>r.dispute_id then raise sqlstate 'PT400' using message='invalid_pdf_context';end if;
 if g.version<>gv or coalesce((select version from public.published_games where game_id=gid),0)<>pv or coalesce(old.version,0)<>expected or (manual_needed and coalesce(sh.version,0)<>sv) then raise sqlstate 'PT409' using message='version_conflict';end if;
 if s.parsed->>'gameNumber' is not null and g.game_number is not null and s.parsed->>'gameNumber'<>g.game_number and (not (intent->>'acceptDivergence')::boolean or length(reason)<10) then raise sqlstate 'PT400' using message='pdf_divergence_decision_required';end if;
 if manual_needed then manual:=jsonb_build_object('document',sh.document,'version',sh.version);end if;
 perform private.pdf_publication_facts(jsonb_build_object('source',public.get_pdf_source(sid),'document',r.document,'version',r.version,'savedAt',r.saved_at),intent->'supplement',intent->'authority',manual,reason,(intent->>'acceptDivergence')::boolean);
 insert into private.pdf_publication_preparations(source_id,game_id,publication,version,saved_by) values(sid,gid,intent,expected+1,actor)
 on conflict(source_id) do update set game_id=excluded.game_id,publication=excluded.publication,version=excluded.version,saved_at=clock_timestamp(),saved_by=excluded.saved_by returning version into new_version;
 result:=jsonb_build_object('sourceId',sid,'version',new_version,'requestId',intent->>'requestId');
 insert into private.pdf_preparation_commands(command_id,actor_id,payload,result) values(cmd,actor,command,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or null_value_not_allowed then raise sqlstate 'PT400' using message='invalid_pdf_preparation';
end$$;
create function public.save_pdf_publication_preparation(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_pdf_publication_preparation(p_command)$$;
revoke all on function private.get_pdf_publication_preparation(uuid),public.get_pdf_publication_preparation(uuid),private.save_pdf_publication_preparation(jsonb),public.save_pdf_publication_preparation(jsonb) from public,anon,authenticated,service_role;
grant execute on function private.get_pdf_publication_preparation(uuid),public.get_pdf_publication_preparation(uuid),private.save_pdf_publication_preparation(jsonb),public.save_pdf_publication_preparation(jsonb) to authenticated;
