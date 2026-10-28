import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";

it.each(["zero", "upgrade"])(
  "venue catalog preserves game history and transaction boundaries (%s)",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const files = (await readdir("supabase/migrations"))
        .filter((f) => f.endsWith(".sql"))
        .sort();
      const added = files.filter((f) => f.endsWith("_game_venues.sql"));
      for (const f of files.filter(
        (f) => mode === "zero" || !added.includes(f),
      ))
        await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
      await db.exec(
        "insert into auth.users(id) values('fd500000-0000-4000-8000-000000000098');insert into public.admin_access(user_id) values('fd500000-0000-4000-8000-000000000098')",
      );
      const [setup, assertions] = (
        await readFile("supabase/tests/game_venues.sql", "utf8")
      ).split("-- VENUE_ASSERTIONS");
      await db.exec(setup);
      if (mode === "upgrade")
        for (const f of added)
          await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
      await db.exec(assertions);
      expect(
        (await db.query("select count(*)::int n from public.games")).rows,
      ).toEqual([{ n: 0 }]);
    } finally {
      await db.close();
    }
  },
  20000,
);
