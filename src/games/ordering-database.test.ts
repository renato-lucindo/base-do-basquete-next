import { expect, it, beforeAll, afterAll } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { gameListingSchema } from "./contract";
let db: PGlite;
beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(platform);
  for (const file of (await readdir("supabase/migrations"))
    .filter((x) => x.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
});
afterAll(async () => {
  await db?.close();
});
it("ordena toda a disputa antes da pagina, com numeros naturais, ausentes ao fim e RLS", async () => {
  const fixture = await readFile("supabase/tests/games.sql", "utf8");
  await db.exec(fixture.slice(0, fixture.indexOf("set local role anon;")));
  await db.exec(`insert into public.games(id,dispute_id,home_registration_id,away_registration_id,game_number,scheduled_date,scheduled_time,venue)
   select pg_temp.g_id(1000+i),pg_temp.g_id(92),pg_temp.g_id(95),pg_temp.g_id(96),i::text,date '2026-01-01'+(30-i),time '08:00'+i*interval '1 minute',case when i=30 then null else 'Local '||lpad(i::text,2,'0') end from generate_series(1,30) i;
   insert into public.games(id,dispute_id,home_registration_id,away_registration_id,game_number) values
   (pg_temp.g_id(2000),pg_temp.g_id(92),pg_temp.g_id(95),pg_temp.g_id(96),null),
   (pg_temp.g_id(2001),pg_temp.g_id(92),pg_temp.g_id(95),pg_temp.g_id(96),'00'),
   (pg_temp.g_id(2002),pg_temp.g_id(92),pg_temp.g_id(95),pg_temp.g_id(96),'A10'),
   (pg_temp.g_id(2003),pg_temp.g_id(92),pg_temp.g_id(95),pg_temp.g_id(96),'A2'),
   (pg_temp.g_id(2004),pg_temp.g_id(92),pg_temp.g_id(95),pg_temp.g_id(96),'9999999999999999999999999999999999999999');
   set local role authenticated;set local request.jwt.claim.sub='d1000000-0000-4000-8000-000000000098';`);
  const list = async (sort = "number", direction = "asc", offset = 0, q = "") =>
    gameListingSchema.parse(
      (
        await db.query<{ r: unknown }>(
          "select public.list_games_ordered(pg_temp.g_id(92),$1,$2,$3,$4) r",
          [q, offset, sort, direction],
        )
      ).rows[0].r,
    );
  const first = await list();
  expect(first.items.map((g) => g.number)).toEqual([
    "00",
    ...Array.from({ length: 19 }, (_, i) => String(i + 1)),
  ]);
  expect(first.hasMore).toBe(true);
  const last = await list("number", "asc", 20);
  expect(last.items.map((g) => g.number)).toEqual([
    ...Array.from({ length: 11 }, (_, i) => String(i + 20)),
    "9999999999999999999999999999999999999999",
    "A2",
    "A10",
    null,
  ]);
  expect(
    (await list("number", "desc")).items.slice(0, 4).map((g) => g.number),
  ).toEqual(["A10", "A2", "9999999999999999999999999999999999999999", "30"]);
  expect((await list("number", "desc", 20)).items.at(-1)?.number).toBeNull();
  expect(
    (await list("number", "asc", 0, "30")).items.map((g) => g.number),
  ).toEqual(["30"]);
  for (const direction of ["asc", "desc"]) {
    const pages = [
      ...(await list("date", direction)).items,
      ...(await list("date", direction, 20)).items,
    ];
    expect(pages.slice(30).every((g) => g.date === null)).toBe(true);
    const v = [
      ...(await list("venue", direction)).items,
      ...(await list("venue", direction, 20)).items,
    ];
    expect(v.slice(29).every((g) => g.venue === null)).toBe(true);
    const times = [
      ...(await list("time", direction)).items,
      ...(await list("time", direction, 20)).items,
    ];
    expect(times.slice(30).every((g) => g.time === null)).toBe(true);
  }
  expect((await list("date", "asc")).items[0].number).toBe("30");
  expect((await list("time", "asc")).items[0].number).toBe("1");
  expect((await list("state", "asc")).items.map((g) => g.id)).toEqual(
    (await list("matchup", "desc")).items.map((g) => g.id),
  );
  await db.exec(
    "reset role;update public.games set state='finished' where id=pg_temp.g_id(1030);set local role authenticated;",
  );
  expect((await list("state", "asc")).items[0].number).toBe("30");
  expect((await list("state", "desc")).items[0].state).toBe("scheduled");
  await db.exec(`select pg_temp.g_error($q$select public.list_games_ordered(pg_temp.g_id(92),'',0,'unsafe','asc')$q$,'PT400');
   select pg_temp.g_error($q$select public.list_games_ordered(pg_temp.g_id(92),'',0,'date','unsafe')$q$,'PT400');
   select pg_temp.g_error($q$select public.list_games_ordered(pg_temp.g_id(92),'',-1,'date','asc')$q$,'PT400');
   set local request.jwt.claim.sub='d1000000-0000-4000-8000-000000000099';`);
  expect((await list()).items).toEqual([]);
  await db.exec(
    `set local role anon;select pg_temp.g_error($q$select public.list_games_ordered(pg_temp.g_id(92))$q$,'42501');reset role;`,
  );
});
