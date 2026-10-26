import { expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
it.each(["zero", "upgrade"] as const)(
  "fonte paginada no %s mantém precondição de versão, RLS e projeções na mesma publicação",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const files = (await readdir("supabase/migrations"))
          .filter((n) => n.endsWith(".sql"))
          .sort(),
        boundary = files.findIndex((n) =>
          n.endsWith("_paged_confirmed_statistics.sql"),
        );
      expect(boundary).toBeGreaterThan(0);
      for (const file of files.slice(
        0,
        mode === "upgrade" ? boundary : files.length,
      ))
        await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
      await db.exec(
        (await readFile("supabase/tests/publication.sql", "utf8")).replace(
          /\nrollback;\s*$/u,
          "\n",
        ),
      );
      const source = (
        await db.query<{ source: unknown }>(
          "select public.get_public_statistics_source(pg_temp.pu_id(3)) as source",
        )
      ).rows[0].source;
      const before = (
        await db.query(
          "select game_id,version,snapshot from private.game_publication_versions order by game_id,version",
        )
      ).rows;
      const players = (
        await db.query(
          "select * from public.published_player_games order by game_id,person_id",
        )
      ).rows;
      if (mode === "upgrade") {
        for (const file of files.slice(boundary))
          await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
        expect(
          (
            await db.query<{ source: unknown }>(
              "select public.get_public_statistics_source(pg_temp.pu_id(3)) as source",
            )
          ).rows[0].source,
        ).toEqual(source);
        expect(
          (
            await db.query(
              "select game_id,version,snapshot from private.game_publication_versions order by game_id,version",
            )
          ).rows,
        ).toEqual(before);
        expect(
          (
            await db.query(
              "select * from public.published_player_games order by game_id,person_id",
            )
          ).rows,
        ).toEqual(players);
      }
      await db.exec(
        await readFile("supabase/tests/statistics_pages.sql", "utf8"),
      );
      expect(source).toMatchObject({ kind: "confirmed-statistics-v1" });
    } finally {
      await db.close();
    }
  },
  20000,
);
