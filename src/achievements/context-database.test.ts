import { expect, it } from "vitest";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import {
  achievementContextSchema,
  achievementCandidateListingSchema,
} from "./context-contract";
import { suggestPlacements } from "./suggest";

it.each(["zero", "upgrade"] as const)(
  "fonte de premiações privada no %s preserva G4 e pessoas históricas",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const names = (await readdir("supabase/migrations"))
          .filter((n) => n.endsWith(".sql"))
          .sort(),
        index = names.findIndex((n) => n.endsWith("_achievement_context.sql")),
        split = index < 0 ? names.length : index;
      for (const n of names.slice(0, mode === "zero" ? names.length : split))
        await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
      const seed =
        (await readFile("supabase/tests/publication.sql", "utf8")).replace(
          /\nrollback;\s*$/u,
          "\n",
        ) + (await readFile("supabase/tests/regulation.sql", "utf8"));
      await db.exec(seed);
      const before = (
        await db.query(
          "select * from private.game_publication_versions order by game_id,version",
        )
      ).rows;
      if (mode === "upgrade")
        for (const n of names.slice(split))
          await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
      const proof = await readFile(
        "supabase/tests/achievement_context.sql",
        "utf8",
      );
      if (
        process.env.BDB_EXPORT_ACHIEVEMENT_CONTEXT_PROOF === "1" &&
        mode === "zero"
      )
        await writeFile(
          ".preview-artifacts/achievement-context-proof.sql",
          seed +
            proof.replace(
              /-- LOCAL_CAPACITY_BEGIN[\s\S]*?-- LOCAL_CAPACITY_END/u,
              "-- Capacity boundary is verified locally; real proof uses36 eligible identities.",
            ) +
            "\nrollback;\n",
        );
      const results = await db.exec(proof),
        rows = results.flatMap((r) => r.rows);
      const context = achievementContextSchema.parse(
        rows.find((r) => r.achievement_context)?.achievement_context,
      );
      expect(context.eligibleAthletes).toHaveLength(36);
      expect(
        achievementCandidateListingSchema.parse(
          rows.find((r) => r.achievement_candidates)?.achievement_candidates,
        ).items,
      ).toHaveLength(5);
      const phase = context.regulation.definition!.groupPhases[0];
      expect(
        suggestPlacements(
          {
            disputeId: context.disputeId,
            expectedRegulationVersion: context.regulation.version,
            expectedContextFingerprint: context.regulation.contextFingerprint,
            source: {
              kind: "group",
              phaseId: phase.phaseId,
              groupId: phase.groups[0].id,
            },
          },
          context.regulation,
        ).requiresConfirmation,
      ).toBe(true);
      expect(
        (
          await db.query(
            "select * from private.game_publication_versions order by game_id,version",
          )
        ).rows,
      ).toEqual(before);
      await db.exec("rollback;");
      expect(
        (await db.query("select count(*)::int n from public.persons")).rows,
      ).toEqual([{ n: 0 }]);
    } finally {
      await db.close();
    }
  },
  30000,
);
