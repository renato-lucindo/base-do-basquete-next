-- Assumes the publication.sql fixture is open in the same rollback-only transaction.
select pg_temp.pu_assert((select count(*) from private.publication_sources where kind='sheet')=2,'existing manual sources retained');
select pg_temp.pu_assert((select bool_and(sheet_game_id=bound_game_id and id=sheet_game_id and pdf_source_id is null) from private.publication_sources where kind='sheet'),'typed sheet references');
update public.admin_access set enabled=true where user_id=pg_temp.pu_id(98);
set local role authenticated;
set local request.jwt.claim.sub='f9200000-0000-4000-8000-000000000098';
select pg_temp.pu_assert(public.publish_sheet_game(jsonb_build_object('requestId',pg_temp.pu_id(950),'gameId',pg_temp.pu_id(8),'gameVersion',3,'basePublicationVersion',2,'source',jsonb_build_object('kind','sheet','baseSheetVersion',3,'document',public.get_game_sheet(pg_temp.pu_id(8))->'document'),'reason','Correção confirmada da participação.','fallback',false))->'version'='3','new manual versions still use registered typed source');
select pg_temp.pu_error('select * from private.publication_sources','42501');
reset role;
insert into private.game_publication_versions(game_id,version,source_kind,source_id,source_version,snapshot,document,reason,published_by,published_at) select pg_temp.pu_id(8),4,'pdf',pg_temp.pu_id(800),1,snapshot,'{}','Fixture of typed FK only',pg_temp.pu_id(98),clock_timestamp() from public.published_games where game_id=pg_temp.pu_id(8);
select pg_temp.pu_assert(exists(select 1 from private.publication_sources where kind='pdf' and id=pg_temp.pu_id(800) and pdf_source_id=pg_temp.pu_id(800) and bound_game_id=pg_temp.pu_id(8) and sheet_game_id is null),'PDF reference typed and bound');
select pg_temp.pu_error($q$insert into private.game_publication_versions(game_id,version,source_kind,source_id,source_version,snapshot,document,reason,published_by,published_at) select pg_temp.pu_id(9),2,'pdf',pg_temp.pu_id(800),1,snapshot,'{}','Wrong game',pg_temp.pu_id(98),clock_timestamp() from public.published_games where game_id=pg_temp.pu_id(9)$q$,'PT409');
select pg_temp.pu_error($q$insert into private.game_publication_versions(game_id,version,source_kind,source_id,source_version,snapshot,document,reason,published_by,published_at) select pg_temp.pu_id(8),5,'pdf',pg_temp.pu_id(899),1,snapshot,'{}','Missing source',pg_temp.pu_id(98),clock_timestamp() from public.published_games where game_id=pg_temp.pu_id(8)$q$,'23503');
select pg_temp.pu_error($q$update private.publication_sources set bound_game_id=pg_temp.pu_id(9) where kind='pdf'$q$,'PT409');
select pg_temp.pu_error($q$delete from private.publication_sources where kind='pdf'$q$,'PT409');
select pg_temp.pu_assert((select count(*) from private.publication_sources)=3,'failed writes do not leave typed sources');
select pg_temp.pu_assert((select bool_and(not has_table_privilege(role,'private.publication_sources','select,insert,update,delete')) from unnest(array['anon','authenticated','service_role']) role),'no direct grants');
select pg_temp.pu_assert(exists(select 1 from pg_indexes where schemaname='private' and tablename='game_publication_versions' and indexdef like '%(source_kind, source_id, game_id)%'),'typed source FK has covering index');
