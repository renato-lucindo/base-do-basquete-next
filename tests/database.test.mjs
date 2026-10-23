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
const competitionContract = await readFile(
  "supabase/tests/competition.sql",
  "utf8",
);
const teamsContract = await readFile("supabase/tests/teams.sql", "utf8");
const peopleContract = await readFile("supabase/tests/people.sql", "utf8");
const rosterContract = await readFile("supabase/tests/roster.sql", "utf8");
const staffContract = await readFile("supabase/tests/staff.sql", "utf8");
const importFieldsContract = await readFile(
  "supabase/tests/import_fields.sql",
  "utf8",
);

const textReviewContract = await readFile(
  "supabase/tests/text_review.sql",
  "utf8",
);

test("C4 upgrade preserves existing C3 people, private details and numbered rosters", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    const boundary = migrations.findIndex((sql) =>
      sql.includes("-- C4: nullable contextual jerseys"),
    );
    assert.ok(boundary > 0);
    for (const migration of migrations.slice(0, boundary))
      await db.exec(migration);
    await db.exec(`insert into public.championships(id,name) values('b1000000-0000-4000-8000-000000000001','Existing C3');
   insert into public.seasons(id,championship_id,year) values('b1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001',2026);
   insert into public.disputes(id,season_id,gender,category) values('b1000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000002','feminino','Adulto');
   insert into public.teams(id,name) values('b1000000-0000-4000-8000-000000000004','Existing');
   insert into public.registrations(id,dispute_id,team_id,name) values('b1000000-0000-4000-8000-000000000005','b1000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000004','Existing A');
   insert into public.persons(id,name,nickname,position) values('b1000000-0000-4000-8000-000000000006','Existing athlete','Nickname','Armador / Ala');
   insert into private.athletes(person_id,sex,birth_date,federation_registration) values('b1000000-0000-4000-8000-000000000006','female','2000-02-29','000123');
   insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) values('b1000000-0000-4000-8000-000000000007','b1000000-0000-4000-8000-000000000005','b1000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000006','00');`);
    const query =
      "select public.get_person('b1000000-0000-4000-8000-000000000006') as person, public.get_roster_entry('b1000000-0000-4000-8000-000000000007') as roster";
    const before = await db.query(query);
    for (const migration of migrations.slice(boundary))
      await db.exec(migration);
    assert.deepEqual((await db.query(query)).rows, before.rows);
    assert.deepEqual(
      (await db.query("select birth_year from private.athletes")).rows,
      [{ birth_year: null }],
    );
  } finally {
    await db.close();
  }
});

test("migrations from zero enforce the shared SQL access contract", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const migration of migrations)
      await db.exec(`begin;\n${migration}\ncommit;`);
    await db.exec(contract);
    await db.exec(competitionContract);
    await db.exec(teamsContract);
    await db.exec(peopleContract);
    await db.exec(rosterContract);
    await db.exec(staffContract);
    await db.exec(importFieldsContract);
    await db.exec(textReviewContract);
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
    await db.exec(competitionContract);
    await db.exec(teamsContract);
    await db.exec(peopleContract);
    await db.exec(rosterContract);
    await db.exec(staffContract);
    await db.exec(importFieldsContract);
    await db.exec(textReviewContract);
  } finally {
    await db.close();
  }
});

test("C2 upgrade and rolled-back fixtures preserve saved C1 data", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const migration of migrations.slice(0, 4)) await db.exec(migration);
    await db.exec(`insert into public.championships(id,name) values('40000000-0000-4000-8000-000000000001','Existing');
      insert into public.seasons(id,championship_id,year) values('40000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001',2026);
      insert into public.disputes(id,season_id,gender,category) values('40000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000002','feminino','Adulto');`);
    const before = await db.query(
      "select public.get_competition('40000000-0000-4000-8000-000000000001') as data",
    );
    for (const migration of migrations.slice(4)) await db.exec(migration);
    await db.exec(teamsContract);
    await db.exec(peopleContract);
    await db.exec(rosterContract);
    await db.exec(staffContract);
    await db.exec(importFieldsContract);
    await db.exec(textReviewContract);
    const after = await db.query(
      "select public.get_competition('40000000-0000-4000-8000-000000000001') as data",
    );
    assert.deepEqual(after.rows, before.rows);
    assert.deepEqual(
      (await db.query("select count(*)::int as count from public.teams")).rows,
      [{ count: 0 }],
    );
  } finally {
    await db.close();
  }
});

test("C3 upgrade preserves C2 registrations and their global identity", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const migration of migrations.slice(0, 5)) await db.exec(migration);
    await db.exec(`insert into public.championships(id,name) values('70000000-0000-4000-8000-000000000001','Existing');
   insert into public.seasons(id,championship_id,year) values('70000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000001',2026);
   insert into public.disputes(id,season_id,gender,category) values('70000000-0000-4000-8000-000000000003','70000000-0000-4000-8000-000000000002','masculino','Adulto');
   insert into public.teams(id,name) values('70000000-0000-4000-8000-000000000004','Team');
   insert into public.registrations(id,dispute_id,team_id,name) values('70000000-0000-4000-8000-000000000005','70000000-0000-4000-8000-000000000003','70000000-0000-4000-8000-000000000004','Team B');`);
    const before = await db.query(
      "select public.get_registration('70000000-0000-4000-8000-000000000005') as data",
    );
    for (const migration of migrations.slice(5)) await db.exec(migration);
    await db.exec(peopleContract);
    await db.exec(rosterContract);
    await db.exec(staffContract);
    await db.exec(importFieldsContract);
    await db.exec(textReviewContract);
    assert.deepEqual(
      (
        await db.query(
          "select public.get_registration('70000000-0000-4000-8000-000000000005') as data",
        )
      ).rows,
      before.rows,
    );
    assert.deepEqual(
      (await db.query("select count(*)::int as count from public.persons"))
        .rows,
      [{ count: 0 }],
    );
  } finally {
    await db.close();
  }
});
