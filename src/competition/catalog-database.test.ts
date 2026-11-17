import { afterAll, beforeAll, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import {
  disputeListPageSchema,
  disputeListQuerySchema,
} from "./catalog-contract";

let db: PGlite;
const id = (n: number) =>
  "4c5a0000-0000-4000-8000-" + String(n).padStart(12, "0");
beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(platform);
  for (const file of (await readdir("supabase/migrations")).sort())
    if (file.endsWith(".sql"))
      await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
  await db.query("insert into auth.users(id) values ($1)", [id(1)]);
  await db.query("insert into public.admin_access(user_id) values ($1)", [
    id(1),
  ]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id(1),
  ]);
  await db.query(
    "insert into public.championships(id,name) values ($1,'Copa')",
    [id(2)],
  );
  await db.query(
    "insert into public.seasons(id,championship_id,year) values ($1,$2,2026)",
    [id(3), id(2)],
  );
  for (let i = 0; i < 31; i++)
    await db.query(
      "insert into public.disputes(id,season_id,gender,category,division) values ($1,$2,'masculino','Adulto',$3)",
      [id(100 + i), id(3), "Divisão " + String(i).padStart(2, "0")],
    );
}, 20000);
afterAll(async () => db?.close());
async function list(query: object = {}) {
  return disputeListPageSchema.parse(
    (
      await db.query<{ result: unknown }>(
        "select public.list_admin_dispute_catalog($1) result",
        [disputeListQuerySchema.parse(query)],
      )
    ).rows[0].result,
  );
}
it("pages disputes independently of championships and filters the full set before sorting", async () => {
  const first = await list({ sort: "division", direction: "asc" });
  expect(first.items).toHaveLength(25);
  expect(first.total).toBe(31);
  expect(first.hasMore).toBe(true);
  expect(first.items[0].division).toBe("Divisão 00");
  const last = await list({ sort: "division", direction: "asc", offset: 25 });
  expect(last.items).toHaveLength(6);
  expect(last.items[0].division).toBe("Divisão 25");
  const found = await list({ q: "Divisão 30" });
  expect(found.total).toBe(1);
  expect(found.items[0].administration.visibility).toBe("private");
  expect((await list({ status: "completed" })).items).toEqual([]);
});
it("sorts youth, adult and masters by age and filters multiple championships", async () => {
  const categories = ["55+", "Adulto", "Sub-23", "30+", "Sub-15", "Sub-12"];
  for (const n of [4, 6]) {
    await db.query("insert into public.championships(id,name) values ($1,$2)", [
      id(n),
      "Liga " + n,
    ]);
    await db.query(
      "insert into public.seasons(id,championship_id,year) values ($1,$2,2027)",
      [id(n + 1), id(n)],
    );
  }
  for (const [index, category] of categories.entries()) {
    await db.query(
      "insert into public.disputes(id,season_id,gender,category) values ($1,$2,'feminino',$3)",
      [id(200 + index), id(index % 2 ? 5 : 7), category],
    );
  }
  const filters = { championshipIds: [id(4), id(6)], sort: "category" };
  const asc = await list({ ...filters, direction: "asc" });
  const expected = ["Sub-12", "Sub-15", "Sub-23", "Adulto", "30+", "55+"];
  expect(asc.items.map((row) => row.category)).toEqual(expected);
  expect(asc.championships.map((row) => row.id)).toEqual([id(2), id(4), id(6)]);
  expect(
    (await list({ ...filters, direction: "desc" })).items.map(
      (row) => row.category,
    ),
  ).toEqual(expected.toReversed());
  expect((await list({ ...filters, championshipIds: [id(6)] })).total).toBe(3);
});
it("rejects anonymous and revoked administrative reads", async () => {
  await db.exec("set role anon");
  await expect(list()).rejects.toMatchObject({ code: "42501" });
  await db.exec("reset role;set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id(99),
  ]);
  await expect(list()).rejects.toMatchObject({ code: "PT403" });
  await db.exec("reset role");
});
