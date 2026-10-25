import { expect, it } from "vitest";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { achievementDraftSchema } from "./contract";
import {
  saveAchievementDraftSchema,
  achievementDraftStateSchema,
  achievementDraftVersionSchema,
  achievementDraftAckSchema,
} from "./draft-contract";

const id = (n: number) =>
  `f9200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
it.each(["zero", "upgrade"] as const)(
  "rascunho privado de premiações no %s preserva fatos e recibos",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const names = (await readdir("supabase/migrations"))
        .filter((n) => n.endsWith(".sql"))
        .sort();
      const split = names.findIndex((n) =>
        n.endsWith("_achievement_drafts.sql"),
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
        ) + (await readFile("supabase/tests/regulation.sql", "utf8"));
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
        "supabase/tests/achievement_drafts.sql",
        "utf8",
      );
      const rows = (await db.exec(proof)).flatMap((r) => r.rows);
      const state = achievementDraftStateSchema.parse(
        rows.find((r) => r.achievement_draft_state)?.achievement_draft_state,
      );
      expect(state.version).toBe(23);
      expect(state.draft?.honors[0].personIds).toEqual([id(201)]);
      expect(state.history).toHaveLength(3);
      expect(state.needsReview).toBe(false);
      achievementDraftVersionSchema.parse(
        rows.find((r) => r.achievement_draft_version)
          ?.achievement_draft_version,
      );
      achievementDraftAckSchema.parse(
        rows.find((r) => r.achievement_draft_ack)?.achievement_draft_ack,
      );
      expect(
        (
          await db.query(
            "select * from private.game_publication_versions order by game_id,version",
          )
        ).rows,
      ).toEqual(before);
      await db.exec("reset role;");
      const draft = {
        disputeId: id(3),
        placements: [{ position: 1, registrationIds: [id(5), id(6)] }],
        honors: [{ id: id(900), title: " MVP ", personIds: [id(201)] }],
      };
      const variants: unknown[] = [
        draft,
        { ...draft, placements: [] },
        { ...draft, honors: [] },
        null,
        {},
        { ...draft, actorId: id(98) },
        { ...draft, placements: [{ position: 0, registrationIds: [id(5)] }] },
        { ...draft, placements: [{ position: 1, registrationIds: [] }] },
        {
          ...draft,
          placements: [
            { position: 1, registrationIds: [id(5), id(5).toUpperCase()] },
          ],
        },
        { ...draft, honors: [draft.honors[0], draft.honors[0]] },
        ...[
          "🙂".repeat(80),
          "🙂".repeat(81),
          "\u00a0MVP\ufeff",
          "MVP\n",
          "M\u007fVP",
          "\t\n",
          "x",
        ].map((title) => ({
          ...draft,
          honors: [{ ...draft.honors[0], title }],
        })),
      ];
      for (const value of variants) {
        const sql = await db.query<{ ok: boolean }>(
          "select private.valid_achievement_draft($1::jsonb) ok",
          [JSON.stringify(value)],
        );
        expect(sql.rows[0].ok, JSON.stringify(value)).toBe(
          achievementDraftSchema.safeParse(value).success,
        );
      }
      const ids = (start: number, count: number) =>
        Array.from({ length: count }, (_, n) => id(start + n));
      const capacity = [
        {
          ...draft,
          placements: [{ position: 1000, registrationIds: ids(50000, 1000) }],
        },
        {
          ...draft,
          placements: [
            { position: 1, registrationIds: ids(50000, 1000) },
            { position: 2, registrationIds: [id(60000)] },
          ],
        },
        {
          ...draft,
          placements: [{ position: 1001, registrationIds: [id(5)] }],
        },
        {
          ...draft,
          honors: Array.from({ length: 10 }, (_, n) => ({
            id: id(30000 + n),
            title: "Conquista",
            personIds: ids(50000, 1000),
          })),
        },
        {
          ...draft,
          honors: Array.from({ length: 11 }, (_, n) => ({
            id: id(30000 + n),
            title: "Conquista",
            personIds: ids(50000, 1000),
          })),
        },
        {
          ...draft,
          honors: Array.from({ length: 1001 }, (_, n) => ({
            id: id(30000 + n),
            title: "Conquista",
            personIds: [id(201)],
          })),
        },
      ];
      for (const value of capacity) {
        const sql = await db.query<{ ok: boolean }>(
          "select private.valid_achievement_draft($1::jsonb) ok",
          [JSON.stringify(value)],
        );
        expect(sql.rows[0].ok).toBe(
          achievementDraftSchema.safeParse(value).success,
        );
      }
      const command = {
        commandId: id(40000),
        expectedVersion: 0,
        expectedContextFingerprint: "a".repeat(64),
        source: null,
        draft,
      };
      for (const value of [
        command,
        { ...command, expectedVersion: 2147483647 },
        { ...command, expectedVersion: -1 },
        { ...command, expectedVersion: 1.5 },
        { ...command, source: {} },
        {
          ...command,
          source: { kind: "group", phaseId: id(610), groupId: id(611) },
        },
        {
          ...command,
          source: {
            kind: "series",
            finalSeriesId: id(620),
            bronzeSeriesId: id(620).toUpperCase(),
          },
        },
        { ...command, expectedContextFingerprint: "A".repeat(64) },
        { ...command, eligibleAthletes: [] },
      ]) {
        const sql = await db.query<{ ok: boolean }>(
          "select private.valid_achievement_draft_command($1::jsonb) ok",
          [JSON.stringify(value)],
        );
        expect(sql.rows[0].ok, JSON.stringify(value)).toBe(
          saveAchievementDraftSchema.safeParse(value).success,
        );
      }
      if (
        process.env.BDB_EXPORT_ACHIEVEMENT_DRAFT_PROOF === "1" &&
        mode === "zero"
      )
        await writeFile(
          ".preview-artifacts/achievement-draft-proof.sql",
          seed + proof + "\nrollback;\n",
        );
      await db.exec("rollback;");
    } finally {
      await db.close();
    }
  },
  30000,
);
