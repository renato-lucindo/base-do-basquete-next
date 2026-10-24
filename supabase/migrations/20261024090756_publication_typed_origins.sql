-- G4c2 typed origins: preserve immutable manual versions while admitting actual PDF references.
create table private.publication_sources (
 kind text not null check(kind in('sheet','pdf')),id uuid not null,
 bound_game_id uuid not null references public.games(id) on delete restrict,
 sheet_game_id uuid references public.game_sheets(game_id) on delete restrict,
 pdf_source_id uuid references public.pdf_sources(id) on delete restrict,
 primary key(kind,id),unique(kind,id,bound_game_id),
 check((kind='sheet' and id=sheet_game_id and sheet_game_id=bound_game_id and sheet_game_id is not null and pdf_source_id is null) or (kind='pdf' and id=pdf_source_id and pdf_source_id is not null and sheet_game_id is null))
);
create index publication_sources_game on private.publication_sources(bound_game_id);
create index publication_sources_sheet on private.publication_sources(sheet_game_id) where sheet_game_id is not null;
create index publication_sources_pdf on private.publication_sources(pdf_source_id) where pdf_source_id is not null;
alter table private.publication_sources enable row level security;
revoke all on private.publication_sources from public,anon,authenticated,service_role;
create policy never_direct_publication_sources on private.publication_sources as restrictive for all to public using(false) with check(false);
-- Insert registry rows from the existing FK-validated history. No historic row is rewritten.
insert into private.publication_sources(kind,id,bound_game_id,sheet_game_id) select distinct source_kind,source_id,game_id,source_id from private.game_publication_versions;
alter table private.game_publication_versions drop constraint game_publication_versions_source_kind_check;
alter table private.game_publication_versions drop constraint game_publication_versions_check;
alter table private.game_publication_versions drop constraint game_publication_versions_source_id_fkey;
alter table private.game_publication_versions add constraint publication_version_source_kind check(source_kind in('sheet','pdf'));
alter table private.game_publication_versions add constraint publication_version_typed_source foreign key(source_kind,source_id,game_id) references private.publication_sources(kind,id,bound_game_id) on delete restrict;
create function private.register_publication_source() returns trigger language plpgsql security invoker set search_path='' as $$
declare bound uuid;
begin
 insert into private.publication_sources(kind,id,bound_game_id,sheet_game_id,pdf_source_id) values(new.source_kind,new.source_id,new.game_id,case when new.source_kind='sheet' then new.source_id else null end,case when new.source_kind='pdf' then new.source_id else null end) on conflict(kind,id) do nothing;
 select bound_game_id into bound from private.publication_sources where kind=new.source_kind and id=new.source_id;
 if bound is distinct from new.game_id then raise sqlstate 'PT409' using message='publication_source_game_locked';end if;
 return new;
end$$;
create trigger register_publication_source before insert on private.game_publication_versions for each row execute function private.register_publication_source();
create trigger publication_sources_immutable before update or delete on private.publication_sources for each row execute function private.publication_history_immutable();
revoke all on function private.register_publication_source() from public,anon,authenticated,service_role;
