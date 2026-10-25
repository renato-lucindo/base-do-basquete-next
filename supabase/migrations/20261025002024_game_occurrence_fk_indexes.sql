-- Complete leading-column coverage for contextual foreign keys (advisors O2).
create index game_occurrence_heads_version on private.game_occurrence_heads(id,version);
create index game_occurrence_records_game_context on private.game_occurrence_records(game_id,dispute_id);
