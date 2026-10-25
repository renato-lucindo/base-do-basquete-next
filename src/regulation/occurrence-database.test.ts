import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";
import {
  gameOccurrenceStateSchema,
  gameOccurrenceVersionSchema,
  saveGameOccurrenceSchema,
} from "./occurrence-contract";
import {
  regulationStateSchema,
  previewRegulationDefinition,
} from "./persistence-contract";
const fixtures = async () =>
  (await readFile("supabase/tests/publication.sql", "utf8")).replace(
    /\nrollback;\s*$/u,
    "\n",
  ) + (await readFile("supabase/tests/regulation.sql", "utf8"));
const migrations = async () =>
  (await readdir("supabase/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort();
const id = (n: number) =>
  `f9200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function verifyShapes(results: { rows: Record<string, unknown>[] }[]) {
  const rows = results.flatMap((r) => r.rows);
  const state = gameOccurrenceStateSchema.parse(
    rows.find((r) => r.occurrence_state)?.occurrence_state,
  );
  expect(state).toMatchObject({
    gameId: id(8),
    publicationVersion: 3,
    head: { version: 4, publicationVersion: 2, effect: { kind: "postponed" } },
  });
  expect(
    gameOccurrenceVersionSchema.parse(
      rows.find((r) => r.occurrence_version)?.occurrence_version,
    ).version,
  ).toBe(1);
  expect(
    gameOccurrenceStateSchema.parse(
      rows.find((r) => r.additional_occurrence_state)
        ?.additional_occurrence_state,
    ).head?.effect,
  ).toEqual({ kind: "cancelled" });
  const regulation = regulationStateSchema.parse(
    rows.find((r) => r.regulation_state)?.regulation_state,
  );
  expect(regulation.context.decisionVersion).toBe(4);
  const p = previewRegulationDefinition(
    regulation.definition,
    regulation.context,
    regulation.disputeId,
    regulation.version,
  );
  expect(p.games.find((g) => g.gameId === id(8))).toMatchObject({
    state: "conflict",
    needs: "occurrence_review",
    outcome: null,
  });
  expect(p.groupPhases[0].groups[0].pendingGameIds).toContain(id(8));
  const withoutRule = regulationStateSchema.parse(
    rows.find((r) => r.missing_wo_rule_state)?.missing_wo_rule_state,
  );
  expect(
    previewRegulationDefinition(
      withoutRule.definition,
      withoutRule.context,
      withoutRule.disputeId,
      withoutRule.version,
    ).games.find((g) => g.gameId === id(600)),
  ).toMatchObject({
    state: "conflict",
    needs: "occurrence_review",
    outcome: null,
  });
}
it("creates occurrence writers from zero and preserves G4/regulation facts through their rollback contract", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of await migrations())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    expect(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from pg_constraint c where c.contype='f' and c.conrelid in ('private.game_occurrence_records'::regclass,'private.game_occurrence_heads'::regclass) and not exists(select 1 from pg_index i where i.indrelid=c.conrelid and i.indisvalid and c.conkey <@ (i.indkey::smallint[])[0:cardinality(c.conkey)-1])",
        )
      ).rows,
    ).toEqual([{ n: 0 }]);
    const proof =
      (await fixtures()) +
      (await readFile("supabase/tests/game_occurrences.sql", "utf8")) +
      "\nrollback;\n";
    if (process.env.BDB_EXPORT_OCCURRENCE_PROOF === "1")
      await writeFile(".preview-artifacts/game-occurrences-proof.sql", proof);
    verifyShapes(await db.exec(proof));
    expect(
      (await db.query("select count(*)::int n from public.games")).rows,
    ).toEqual([{ n: 0 }]);
  } finally {
    await db.close();
  }
}, 20000);
it("upgrades a database with existing G4 facts and historical regulation contexts without adding invented decisions", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    const pending: string[] = [];
    for (const name of await migrations()) {
      if (name >= "20261025001835") pending.push(name);
      else await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    }
    await db.exec(await fixtures());
    const before = await db.query(
      "select snapshot from public.published_games order by game_id",
    );
    for (const name of pending)
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    expect(
      (
        await db.query(
          "select snapshot from public.published_games order by game_id",
        )
      ).rows,
    ).toEqual(before.rows);
    expect(
      (
        await db.query(
          "select count(*)::int n from private.game_occurrence_heads",
        )
      ).rows,
    ).toEqual([{ n: 0 }]);
    const old = await db.query<{ context: unknown }>(
      "select context from private.regulation_versions where version=1",
    );
    expect(old.rows[0].context).not.toHaveProperty("decisionVersion");
    verifyShapes(
      await db.exec(
        await readFile("supabase/tests/game_occurrences.sql", "utf8"),
      ),
    );
    await db.exec("rollback");
  } finally {
    await db.close();
  }
}, 20000);
it("agrees between SQL and TypeScript for closed occurrence effects and Unicode reason limits", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of await migrations())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    const award = {
      kind: "administrative",
      decision: {
        kind: "award",
        winnerRegistrationId: id(5),
        homeLeaguePoints: 2,
        awayLeaguePoints: -1,
        score: null,
      },
    };
    const command = {
      commandId: id(1000),
      disputeId: id(3),
      gameId: id(8),
      occurrenceId: id(1001),
      expectedVersion: 1,
      expectedGameVersion: 2,
      expectedPublicationVersion: 0,
      expectedRegulationVersion: 1,
      expectedContextFingerprint: "a".repeat(64),
      reason: "Conferido",
      acknowledgeImpact: true,
    };
    const cases: [string, unknown, boolean][] = [
      ["inactive", null, true],
      ["postponed", { kind: "postponed" }, true],
      ["interrupted", { kind: "interrupted" }, true],
      ["cancelled", { kind: "cancelled" }, true],
      ["WO", { kind: "wo", winnerRegistrationId: id(5) }, true],
      [
        "exclude",
        { kind: "administrative", decision: { kind: "exclude" } },
        true,
      ],
      ["award", award, true],
      [
        "score",
        {
          ...award,
          decision: {
            ...award.decision,
            score: { homePoints: 20, awayPoints: 0 },
          },
        },
        true,
      ],
      ["empty", {}, false],
      ["unknown", { kind: "resume" }, false],
      ["scalar", "cancelled", false],
      ["array", [], false],
      ["missing winner", { kind: "wo" }, false],
      [
        "foreign structure",
        { kind: "wo", winnerRegistrationId: "invalid" },
        false,
      ],
      ["stats", { kind: "cancelled", players: [] }, false],
      ["extra", { ...award, formula: "rank()" }, false],
      [
        "tie",
        {
          ...award,
          decision: {
            ...award.decision,
            score: { homePoints: 1, awayPoints: 1 },
          },
        },
        false,
      ],
      [
        "fraction",
        { ...award, decision: { ...award.decision, homeLeaguePoints: 1.5 } },
        false,
      ],
      [
        "overflow",
        {
          ...award,
          decision: {
            ...award.decision,
            score: { homePoints: 2147483648, awayPoints: 0 },
          },
        },
        false,
      ],
    ];
    for (const [label, effect, want] of cases) {
      expect(
        saveGameOccurrenceSchema.safeParse({ ...command, effect }).success,
        label + " TS",
      ).toBe(want);
      expect(
        (
          await db.query<{ ok: boolean }>(
            "select private.valid_game_occurrence_effect($1::jsonb) ok",
            [JSON.stringify(effect)],
          )
        ).rows[0].ok,
        label + " SQL",
      ).toBe(want);
    }
    for (const [reason, want] of [
      ["　\u2000", false],
      ["😀😀", false],
      ["😀".repeat(1001), true],
      ["😀".repeat(2001), false],
      [" Confirmado ", true],
      ["vvv", true],
      ["ab", false],
      ["motivo".repeat(334), false],
    ] as const) {
      expect(
        saveGameOccurrenceSchema.safeParse({ ...command, effect: null, reason })
          .success,
      ).toBe(want);
      expect(
        (
          await db.query<{ ok: boolean }>(
            "select private.occurrence_reason($1::jsonb) is not null ok",
            [JSON.stringify(reason)],
          )
        ).rows[0].ok,
      ).toBe(want);
    }
  } finally {
    await db.close();
  }
}, 20000);
