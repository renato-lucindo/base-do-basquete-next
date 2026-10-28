import { expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { achievementWorkspaceSchema } from "./view-contract";
it.each(["zero", "upgrade"] as const)(
  "workspace de premiações no %s entrega nomes escolhidos sem fatos internos",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const names = (await readdir("supabase/migrations"))
          .filter((n) => n.endsWith(".sql"))
          .sort(),
        split = names.findIndex((n) =>
          n.endsWith("_achievement_workspace.sql"),
        );
      for (const n of names.slice(
        0,
        mode === "zero" || split < 0 ? names.length : split,
      ))
        await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
      const seed =
        (await readFile("supabase/tests/publication.sql", "utf8")).replace(
          /\nrollback;\s*$/u,
          "\n",
        ) +
        (await readFile("supabase/tests/regulation.sql", "utf8")) +
        (await readFile("supabase/tests/achievement_drafts.sql", "utf8"));
      await db.exec(seed);
      if (mode === "upgrade" && split >= 0)
        for (const n of names.slice(split))
          await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
      const rows = (
        await db.exec(
          await readFile("supabase/tests/achievement_workspace.sql", "utf8"),
        )
      ).flatMap((r) => r.rows);
      const view = achievementWorkspaceSchema.parse(
        rows.find((r) => r.achievement_workspace)?.achievement_workspace,
      );
      expect(view.selectedPeople).toHaveLength(1);
      expect(view.selectedPeople[0].name).toBe("Identidade corrigida");
      expect(view.sourceOptions.groups[0].groupId).toBe(
        "f9200000-0000-4000-8000-000000000611",
      );
      expect(view).not.toHaveProperty("eligibleAthletes");
      expect(view.publication).not.toHaveProperty("published");
      expect(view.draft.version).toBe(23);
      const empty = achievementWorkspaceSchema.parse(
        rows.find((r) => r.achievement_empty_workspace)
          ?.achievement_empty_workspace,
      );
      expect(empty.selectedPeople).toEqual([]);
      expect(empty.draft.version).toBe(0);
      expect(empty.sourceOptions.groups).toEqual([]);
      await db.exec("rollback;");
    } finally {
      await db.close();
    }
  },
  30000,
);
