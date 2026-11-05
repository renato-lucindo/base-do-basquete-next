import { expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";

it("a primeira publicação congela stage_kind; só a republicação explícita muda a fase", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const file of (await readdir("supabase/migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    const fixture = await readFile("supabase/tests/publication.sql", "utf8");
    const boundary = fixture.indexOf("\nset local role anon;");
    expect(boundary).toBeGreaterThan(0);
    await db.exec(fixture.slice(0, boundary));
    await db.exec(
      "update public.games set stage_kind='knockout' where id=pg_temp.pu_id(8)",
    );
    await db.exec(
      fixture.slice(boundary).replace(/\nrollback;\s*$/u, "\n"),
    );
    const rows = (
      await db.query<{ game_id: string; phase: string }>(
        "select game_id,phase from public.published_statistics_games order by game_id",
      )
    ).rows;
    expect(rows).toHaveLength(2);
    expect(rows[0].phase).toBe("knockout");
    expect(rows[1].phase).toBe("round_robin");
    expect(
      (
        await db.query<{ phase: string; total: number }>(
          "select snapshot#>>'{fact,phase}' as phase,count(*)::integer as total from public.published_player_games group by 1 order by 1",
        )
      ).rows,
    ).toEqual([
      { phase: "knockout", total: 11 },
      { phase: "round_robin", total: 11 },
    ]);
    const before = (
      await db.query<{ version: number }>(
        "select version from public.published_statistics where dispute_id=pg_temp.pu_id(3)",
      )
    ).rows[0].version;
    await db.exec(
      "update public.games set stage_kind='round_robin' where id=pg_temp.pu_id(8)",
    );
    expect(
      (
        await db.query<{ phase: string }>(
          "select phase from public.published_statistics_games where game_id=pg_temp.pu_id(8)",
        )
      ).rows[0].phase,
    ).toBe("knockout");
    expect(
      (
        await db.query<{ version: number }>(
          "select version from public.published_statistics where dispute_id=pg_temp.pu_id(3)",
        )
      ).rows[0].version,
    ).toBe(before);
    await db.exec("rollback");
  } finally {
    await db.close();
  }
}, 20000);
