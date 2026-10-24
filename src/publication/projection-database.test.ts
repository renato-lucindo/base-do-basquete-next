import { it, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { publicGameSchema } from "./contract";
it("actual SQL publications conform to a public-only projection with historical identity and covered facts", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    const sql = (
      await readFile("supabase/tests/publication.sql", "utf8")
    ).replace(/\nrollback;\s*$/u, "\n");
    await db.exec(sql);
    const rows = (
      await db.query<{ snapshot: unknown }>(
        "select snapshot from public.published_games order by game_id",
      )
    ).rows;
    expect(rows).toHaveLength(2);
    for (const { snapshot } of rows) {
      const p = publicGameSchema.parse(snapshot);
      expect(p.facts.players).toHaveLength(11);
      expect(p.staff.home.captainIsCoach).toBe(true);
      expect(p.staff.home.coach?.id).toBe(p.staff.home.captain?.id);
    }
    const previous = (
      await db.query<{ snapshot: unknown }>(
        "select snapshot from private.game_publication_versions where version=1 order by game_id limit 1",
      )
    ).rows[0].snapshot;
    expect(publicGameSchema.parse(previous).facts.teams.home.points).toBe(2);
    await db.exec("rollback;");
  } finally {
    await db.close();
  }
}, 20000);
