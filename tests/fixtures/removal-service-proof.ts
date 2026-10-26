/** Export the exact rollback contract without creating or modifying an admin. */
export function buildRemovalServiceProof(source: string): string {
  const setup =
    /-- DISPOSABLE ADMIN SETUP[\s\S]*?-- END DISPOSABLE ADMIN SETUP/g;
  const revocation =
    /-- DISPOSABLE REVOCATION CHECK[\s\S]*?-- END DISPOSABLE REVOCATION CHECK/g;
  if (
    [...source.matchAll(setup)].length !== 1 ||
    [...source.matchAll(revocation)].length !== 1 ||
    !source.trimEnd().endsWith("rollback;")
  ) {
    throw new Error("Removal proof markers/rollback missing");
  }
  // Replacement callbacks preserve PostgreSQL dollar quotes literally.
  // A replacement string would turn $$ into $, corrupting executable SQL.
  const sql = source
    .replace(
      setup,
      () => `do $$declare actor uuid;begin
    select user_id into actor from public.admin_access where enabled;
    if actor is null then raise exception 'Existing enabled admin required';end if;
    insert into pg_temp.rm_fixture_state values(false,actor);
  end$$;`,
    )
    .replace(
      revocation,
      () => `do $$begin
    perform set_config('request.jwt.claim.sub',pg_temp.rm_id(99)::text,true);
  end$$;`,
    );
  if (
    /(?:insert\s+into|update|delete\s+from)\s+public\.admin_access\b/iu.test(
      sql,
    )
  ) {
    throw new Error("Service proof must preserve the administrative account");
  }
  return sql;
}
