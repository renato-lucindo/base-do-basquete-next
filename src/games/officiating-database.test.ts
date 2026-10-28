import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";
import {
  emptyOfficiating,
  officialRoles,
  officiatingSchema,
} from "./officiating-contract";

it.each(["zero", "upgrade"])(
  "private officiating saves atomically with legacy compatibility (%s)",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const files = (await readdir("supabase/migrations"))
        .filter((f) => f.endsWith(".sql"))
        .sort();
      const added = files.filter((f) => f.endsWith("_game_officiating.sql"));
      for (const f of files.filter(
        (f) => mode === "zero" || !added.includes(f),
      ))
        await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
      await db.exec(
        "insert into auth.users(id) values('fd600000-0000-4000-8000-000000000098');insert into public.admin_access(user_id) values('fd600000-0000-4000-8000-000000000098')",
      );
      const [setup, assertions] = (
        await readFile("supabase/tests/game_officiating.sql", "utf8")
      ).split("-- OFFICIATING_ASSERTIONS");
      await db.exec(setup);
      if (mode === "upgrade")
        for (const f of added)
          await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
      const cases: unknown[] = Array.from({ length: 64 }, (_, mask) =>
        Object.fromEntries(
          officialRoles.map((role, i) => [
            role,
            mask & (1 << i)
              ? { kind: "existing", id: crypto.randomUUID() }
              : null,
          ]),
        ),
      );
      const repeated = { kind: "existing", id: crypto.randomUUID() };
      cases.push(
        null,
        [],
        {},
        { ...emptyOfficiating(), referee: repeated, scorer: repeated },
        {
          ...emptyOfficiating(),
          referee: repeated,
          scorer: { ...repeated, id: repeated.id.toUpperCase() },
        },
      );
      for (const name of [
        "João",
        "東京",
        "x".repeat(160),
        "x".repeat(161),
        "🏀".repeat(80),
        "🏀".repeat(81),
        "🏀".repeat(160),
        "🏀".repeat(161),
        "",
        "   ",
        "\u00a0",
        "\uFEFF",
        "João\nSilva",
      ])
        cases.push({
          ...emptyOfficiating(),
          referee: {
            kind: "new",
            id: crypto.randomUUID(),
            name,
            confirmHomonym: false,
          },
        });
      for (const slots of cases) {
        const result = await db.query<{ valid: boolean }>(
          "select private.valid_game_officiating($1::jsonb) valid",
          [JSON.stringify(slots)],
        );
        expect(result.rows[0].valid, JSON.stringify(slots)).toBe(
          officiatingSchema.safeParse(slots).success,
        );
      }
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
