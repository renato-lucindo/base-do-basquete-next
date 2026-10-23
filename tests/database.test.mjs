import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Platform fixture only. The same SQL contract also runs on Supabase's real
// auth.uid(), auth.users and API roles before this unit is considered integrated.
const platform = `
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
    (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub'))::uuid
$$;
grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
-- Match observed defaults in the newly provisioned Supabase project.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;
const migrations = await Promise.all(
  (await readdir("supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFile(`supabase/migrations/${name}`, "utf8")),
);
const contract = await readFile("supabase/tests/admin_access.sql", "utf8");

test("migrations from zero enforce the shared SQL access contract", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const migration of migrations)
      await db.exec(`begin;\n${migration}\ncommit;`);
    await db.exec(contract);
    const { rows } = await db.query(
      "select count(*)::int as count from auth.users",
    );
    assert.equal(rows[0].count, 0, "test identities rolled back");
  } finally {
    await db.close();
  }
});

test("upgrade preserves an existing administrator and enforces new defaults", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    await db.exec(migrations[0]);
    await db.exec(`
      insert into auth.users values ('10000000-0000-4000-8000-000000000003');
      insert into public.admin_access(user_id) values ('10000000-0000-4000-8000-000000000003');
    `);
    for (const migration of migrations.slice(1)) await db.exec(migration);
    const { rows } = await db.query(
      "select user_id, enabled from public.admin_access",
    );
    assert.deepEqual(rows, [
      { user_id: "10000000-0000-4000-8000-000000000003", enabled: true },
    ]);
    await db.exec("delete from public.admin_access; delete from auth.users;");
    await db.exec(contract);
  } finally {
    await db.close();
  }
});
