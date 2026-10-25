import { expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { statisticsSourceSchema, selectStatisticsFacts } from "./source";
import { aggregateConfirmedStatistics } from "./aggregate";
it.each(["zero", "upgrade"] as const)(
  "fonte estatística transacional no %s sóobserva resultados publicados",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const files = (await readdir("supabase/migrations"))
          .filter((n) => n.endsWith(".sql"))
          .sort(),
        split = files.findIndex((n) => n.endsWith("_confirmed_statistics.sql"));
      for (const file of files.slice(
        0,
        mode === "upgrade" && split >= 0 ? split : files.length,
      ))
        await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
      await db.exec(
        (await readFile("supabase/tests/publication.sql", "utf8")).replace(
          /\nrollback;\s*$/u,
          "\n",
        ),
      );
      const before = (
        await db.query(
          "select * from private.game_publication_versions order by game_id,version",
        )
      ).rows;
      if (mode === "upgrade" && split >= 0)
        for (const file of files.slice(split))
          await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
      const initial = statisticsSourceSchema.parse(
        (
          await db.query<{ source: unknown }>(
            "select public.get_public_statistics_source('f9200000-0000-4000-8000-000000000003') as source",
          )
        ).rows[0].source,
      );
      expect(initial.games).toHaveLength(2);
      expect(initial.minimumSeconds).toBe(600);
      const selected = selectStatisticsFacts(initial, "all");
      expect(selected.coverage).toEqual({
        regularGames: 0,
        playoffGames: 0,
        unclassifiedGames: 2,
      });
      expect(
        aggregateConfirmedStatistics(selected.facts, {
          mode: "total",
          minimumSeconds: 600,
        }).find((r) => r.personId.endsWith("201"))?.metrics.points.value,
      ).toBe(5);
      expect(
        (
          await db.query(
            "select * from private.game_publication_versions order by game_id,version",
          )
        ).rows,
      ).toEqual(before);
      const result = (
        await db.exec(await readFile("supabase/tests/statistics.sql", "utf8"))
      )
        .flatMap((r) => r.rows)
        .find((r) => r.statistics_source)?.statistics_source;
      const current = statisticsSourceSchema.parse(result);
      expect(current.version).toBe(initial.version + 1);
      expect(
        current.games.find((g) => g.snapshot.id.endsWith("008"))?.snapshot
          .version,
      ).toBe(3);
      expect(
        aggregateConfirmedStatistics(
          selectStatisticsFacts(current, "all").facts,
          { mode: "total", minimumSeconds: 600 },
        ).find((r) => r.personId.endsWith("201"))?.metrics.points.value,
      ).toBe(4);
    } finally {
      await db.close();
    }
  },
  20000,
);
