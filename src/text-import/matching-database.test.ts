import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { nameCases } from "../../tests/fixtures/name-matching";
import { importNameSimilarity } from "./name-matching";
import { platform } from "../../tests/fixtures/database-platform";

it.each(["zero", "upgrade"])(
  "player matching rejects first-name-only suggestions (%s)",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const files = (await readdir("supabase/migrations"))
        .filter((f) => f.endsWith(".sql"))
        .sort();
      const added = files.filter((f) =>
        f.endsWith("_precise_player_matching.sql"),
      );
      for (const f of files.filter(
        (f) => mode === "zero" || !added.includes(f),
      ))
        await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
      await db.exec(
        "insert into auth.users(id) values('fd400000-0000-4000-8000-000000000098');insert into public.admin_access(user_id) values('fd400000-0000-4000-8000-000000000098')",
      );
      const [setup, assertions] = (
        await readFile("supabase/tests/player_matching.sql", "utf8")
      ).split("-- MATCHING_ASSERTIONS");
      await db.exec(setup);
      if (mode === "upgrade")
        for (const f of added)
          await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
      for (const [a, b] of nameCases) {
        const result = await db.query<{ score: number }>(
          "select private.import_name_similarity($1,$2) score",
          [a, b],
        );
        expect(result.rows[0].score).toBeCloseTo(
          importNameSimilarity(a, b),
          12,
        );
      }
      expect(
        (
          await db.query(
            "select has_function_privilege('anon','private.import_name_similarity(text,text)','EXECUTE') allowed",
          )
        ).rows,
      ).toEqual([{ allowed: false }]);
      await db.exec(assertions);
      expect(
        (await db.query("select count(*)::int n from public.persons")).rows,
      ).toEqual([{ n: 0 }]);
    } finally {
      await db.close();
    }
  },
  20000,
);
