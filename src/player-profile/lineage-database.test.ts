import { expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { confirmedPlayerGameSchema } from "./participation-contract";
import { normalizeConfirmedGame } from "../statistics/confirmed-facts";

it.each(["zero", "upgrade"] as const)(
  "participações indexadas acompanham resultado atomicamente no %s",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const files = (await readdir("supabase/migrations"))
        .filter((n) => n.endsWith(".sql"))
        .sort();
      const split = files.findIndex((n) =>
        n.endsWith("_player_participation_projection.sql"),
      );
      const index = split < 0 ? files.length : split;
      for (const n of files.slice(0, mode === "zero" ? files.length : index))
        await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
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
      if (mode === "upgrade")
        for (const n of files.slice(index))
          await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
      expect(
        (
          await db.query(
            "select * from private.game_publication_versions order by game_id,version",
          )
        ).rows,
      ).toEqual(before);
      const initial = (
        await db.query<{ snapshot: unknown }>(
          "select snapshot from public.published_player_games order by person_id,game_id",
        )
      ).rows.map((r) => confirmedPlayerGameSchema.parse(r.snapshot));
      expect(initial).toHaveLength(22);
      const games = (
        await db.query<{ snapshot: unknown }>(
          "select snapshot from public.published_games order by game_id",
        )
      ).rows;
      for (const { snapshot } of games) {
        const expected = normalizeConfirmedGame(snapshot);
        for (const fact of expected)
          expect(
            initial.find(
              (p) =>
                p.fact.gameId === fact.gameId &&
                p.fact.person.id === fact.person.id,
            )?.fact,
          ).toEqual(fact);
      }
      await db.exec(
        (
          await readFile("supabase/tests/player_participations.sql", "utf8")
        ).replace(/\nrollback;\s*$/u, "\n"),
      );
      const current = (
        await db.query<{ snapshot: unknown }>(
          "select snapshot from public.published_player_games order by person_id,game_id",
        )
      ).rows.map((r) => confirmedPlayerGameSchema.parse(r.snapshot));
      expect(current).toHaveLength(11);
      expect(current.every((r) => r.fact.publicationVersion === 3)).toBe(true);
      expect(
        current.find((r) => r.fact.person.id.endsWith("201"))?.fact.scoring
          ?.points,
      ).toBe(2);
      expect(
        current.some((r) => r.fact.played && r.fact.scoring?.points === 0),
      ).toBe(true);
      await db.exec("rollback;");
    } finally {
      await db.close();
    }
  },
  20000,
);
