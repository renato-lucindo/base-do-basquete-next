-- Cover the lineage FK in its declared order (advisor finding after initial deployment).
create index statistics_changes_game_context on private.statistics_publication_changes(game_id,dispute_id);
