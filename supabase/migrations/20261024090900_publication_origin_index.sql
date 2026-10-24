-- Cover the typed source FK and source-bound history lookups.
create index game_publication_versions_typed_source on private.game_publication_versions(source_kind,source_id,game_id);
