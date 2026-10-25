import { expect, it } from "vitest";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import {
  confirmAchievementsSchema,
  publicAchievementsSchema,
  achievementPublicationStateSchema,
  achievementConfirmationAckSchema,
  achievementPublicationVersionSchema,
} from "./publication-contract";

it.each(["zero", "upgrade"] as const)(
  "confirmação de premiações no %s publica apenas decisão conferida",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const names = (await readdir("supabase/migrations"))
          .filter((n) => n.endsWith(".sql"))
          .sort(),
        split = names.findIndex((n) =>
          n.endsWith("_achievement_publication.sql"),
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
      const before = (
        await db.query(
          "select * from private.game_publication_versions order by game_id,version",
        )
      ).rows;
      if (mode === "upgrade" && split >= 0)
        for (const n of names.slice(split))
          await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
      const proof = await readFile(
        "supabase/tests/achievement_publication.sql",
        "utf8",
      );
      const rows = (await db.exec(proof)).flatMap((r) => r.rows);
      const publicValue = publicAchievementsSchema.parse(
        rows.find((r) => r.public_achievements)?.public_achievements,
      );
      expect(publicValue.version).toBe(2);
      expect(publicValue.honors[0].athletes[0].name).toBe(
        "Nome revisado após confirmação",
      );
      expect(publicValue.placements[0].registrations).toHaveLength(2);
      const state = achievementPublicationStateSchema.parse(
        rows.find((r) => r.achievement_publication_state)
          ?.achievement_publication_state,
      );
      expect(state.sourceChanged).toBe(false);
      expect(state.history).toHaveLength(2);
      achievementConfirmationAckSchema.parse(
        rows.find((r) => r.achievement_confirmation_ack)
          ?.achievement_confirmation_ack,
      );
      achievementPublicationVersionSchema.parse(
        rows.find((r) => r.achievement_publication_version)
          ?.achievement_publication_version,
      );
      expect(
        (
          await db.query(
            "select * from private.game_publication_versions order by game_id,version",
          )
        ).rows,
      ).toEqual(before);
      await db.exec("reset role;");
      const id = "f9200000-0000-4000-8000-000000000003",
        c = {
          commandId: id,
          disputeId: id,
          expectedDraftVersion: 23,
          expectedPublicationVersion: 0,
          expectedContextFingerprint: "a".repeat(64),
          reason: "",
          acknowledgeImpact: true,
        };
      for (const value of [
        c,
        { ...c, expectedPublicationVersion: 1 },
        { ...c, expectedPublicationVersion: 1, reason: "Revisão explícita" },
        { ...c, acknowledgeImpact: false },
        { ...c, expectedDraftVersion: 0 },
        { ...c, reason: "🙂".repeat(2000) },
        { ...c, reason: "🙂".repeat(2001) },
        { ...c, snapshot: {} },
        { ...c, reason: 123 },
      ]) {
        const sql = await db.query<{ ok: boolean }>(
          "select private.valid_achievement_confirmation($1::jsonb) ok",
          [JSON.stringify(value)],
        );
        expect(sql.rows[0].ok).toBe(
          confirmAchievementsSchema.safeParse(value).success,
        );
      }
      if (
        process.env.BDB_EXPORT_ACHIEVEMENT_PUBLICATION_PROOF === "1" &&
        mode === "zero"
      )
        await writeFile(
          ".preview-artifacts/achievement-publication-proof.sql",
          seed + proof + "\nrollback;\n",
        );
      await db.exec("rollback;");
    } finally {
      await db.close();
    }
  },
  30000,
);
