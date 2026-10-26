import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";
import { preparationContextSchema } from "./preparation-contract";
it.each(["zero", "upgrade"])(
  "preparation source is authorized, bounded and chronological (%s)",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const files = (await readdir("supabase/migrations"))
        .filter((f) => f.endsWith(".sql"))
        .sort();
      const added = files.filter((f) => f.endsWith("_sheet_preparation.sql"));
      for (const f of files.filter(
        (f) => mode === "zero" || !added.includes(f),
      ))
        await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
      await db.exec(
        "insert into auth.users(id) values('fd300000-0000-4000-8000-000000000098'); insert into public.admin_access(user_id) values('fd300000-0000-4000-8000-000000000098')",
      );
      const fixture = await readFile(
          "supabase/tests/sheet_preparation.sql",
          "utf8",
        ),
        [setup, assertions] = fixture.split("-- PREPARATION_ASSERTIONS");
      await db.exec(setup);
      if (mode === "upgrade")
        for (const f of added)
          await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
      const result = await db.query<{ context: unknown }>(
        "select public.get_game_sheet_preparation(pg_temp.sd_id(9)) context",
      );
      expect(
        preparationContextSchema.parse(result.rows[0].context).sides.home
          .roster,
      ).toHaveLength(23);
      await db.exec(assertions);
    } finally {
      await db.close();
    }
  },
  20000,
);
