import { expect, it, beforeAll, afterAll } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { defaultCompetitionSetup } from "./format";
import { competitionSetupStateSchema } from "./setup-contract";
import {
  buildLivePublicStandings,
  SupabaseCompetitionSetups,
} from "./setup-provider";
const id = (n: number) =>
  `f9200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function provisionDatabase() {
  const db = await PGlite.create();
  await db.exec(platform);
  for (const f of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
  const seed = await readFile("supabase/tests/publication.sql", "utf8");
  await db.exec(seed.slice(0, seed.indexOf("set local role anon;")));
  await db.exec(
    `set local role authenticated;set local request.jwt.claim.sub='${id(98)}'`,
  );
  return db;
}
// Provision the platform once; every scenario rolls back to its own savepoint.
// Product operations retain Vitest's normal per-test limit.
let shared: PGlite;
beforeAll(async () => {
  shared = await provisionDatabase();
}, 20000);
afterAll(async () => {
  await shared?.close();
});
async function database() {
  await shared.exec("savepoint setup_case");
  return shared;
}
async function json(db: PGlite, expression: string, args: unknown[] = []) {
  return (
    await db.query<{ value: unknown }>(`select ${expression} as value`, args)
  ).rows[0].value;
}
async function rejects(
  db: PGlite,
  expression: string,
  args: unknown[],
  code: string,
) {
  await db.exec("savepoint expected_failure");
  await expect(json(db, expression, args)).rejects.toMatchObject({ code });
  await db.exec(
    "rollback to savepoint expected_failure;release savepoint expected_failure",
  );
}
it("persists incomplete organization separately, checks versions and keeps legacy heads untouched", async () => {
  const db = await database();
  try {
    const state = competitionSetupStateSchema.parse(
      await json(db, "public.get_competition_setup($1)", [id(3)]),
    );
    expect(state.document).toBeNull();
    const provider = new SupabaseCompetitionSetups(
      { url: "https://db.example.test", key: "fixture" },
      async () =>
        Response.json(
          await json(db, "public.get_competition_setup($1)", [id(3)]),
        ),
    );
    expect((await provider.get("fixture", id(3))).document.groupCount).toBe(1);
    const document = defaultCompetitionSetup();
    document.manualOrder = [id(5), null, null, null, null, null, null, null];
    document.groupCount = 3;
    document.knockoutSize = 8;
    document.directPerGroup = 2;
    document.extras = [{ position: 3, count: 2 }];
    const command = {
      commandId: id(9000),
      disputeId: id(3),
      expectedVersion: 0,
      expectedContextFingerprint: state.contextFingerprint,
      document,
    };
    const receipt = await json(db, "public.save_competition_setup($1)", [
      command,
    ]);
    expect(receipt).toMatchObject({ version: 1, commandId: id(9000) });
    expect(
      await json(db, "public.save_competition_setup($1)", [command]),
    ).toEqual(receipt);
    expect(
      competitionSetupStateSchema.parse(
        await json(db, "public.get_competition_setup($1)", [id(3)]),
      ).document,
    ).toEqual(document);
    await rejects(
      db,
      "public.save_competition_setup($1)",
      [{ ...command, commandId: id(9001) }],
      "PT409",
    );
    await rejects(
      db,
      "public.save_competition_setup($1)",
      [{ ...command, document: { ...document, turns: 2 } }],
      "PT409",
    );
    await db.exec("reset role");
    expect(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from private.regulation_heads",
        )
      ).rows[0].n,
    ).toBe(0);
    await db.exec(
      `set local role authenticated;set local request.jwt.claim.sub='${id(99)}'`,
    );
    await rejects(db, "public.get_competition_setup($1)", [id(3)], "PT403");
  } finally {
    await db.exec(
      "rollback to savepoint setup_case;release savepoint setup_case",
    );
  }
});
it("finalizes and corrects without a user comment; public data follows the commit, never a draft", async () => {
  const db = await database();
  try {
    expect(
      await json(db, "public.get_live_competition_source($1)", [id(3)]),
    ).toBeNull();
    const command = (await json(db, "pg_temp.pu_command()")) as Record<
      string,
      unknown
    >;
    const first = await json(db, "public.finalize_sheet_game($1)", [command]);
    expect(first).toMatchObject({ version: 1 });
    expect(await json(db, "public.finalize_sheet_game($1)", [command])).toEqual(
      first,
    );
    const source = (await json(db, "public.get_live_competition_source($1)", [
      id(3),
    ])) as { publishedGames: unknown[] };
    expect(source.publishedGames).toHaveLength(1);
    expect((await buildLivePublicStandings(source)).games).toHaveLength(1);
    const revision = (await json(db, "pg_temp.pu_revision()")) as Record<
      string,
      unknown
    >;
    expect(
      await json(db, "public.finalize_sheet_game($1)", [
        { ...revision, reason: "" },
      ]),
    ).toMatchObject({ version: 2 });
    const after = await json(db, "public.get_live_competition_source($1)", [
      id(3),
    ]);
    expect(JSON.stringify(after)).not.toContain("reason");
    expect(JSON.stringify(after)).not.toContain("participants");
    expect(
      await json(db, "public.get_public_standings($1)", [id(3)]),
    ).toBeNull();
    const state = competitionSetupStateSchema.parse(
      await json(db, "public.get_competition_setup($1)", [id(3)]),
    );
    const { createDefaultDefinition } = await import("./defaults");
    await json(db, "public.save_competition_setup($1)", [
      {
        commandId: id(9800),
        disputeId: id(3),
        expectedVersion: 0,
        expectedContextFingerprint: state.contextFingerprint,
        document: {
          ...defaultCompetitionSetup(),
          mode: "custom",
          customDefinition: createDefaultDefinition(),
        },
      },
    ]);
    const unorganized = await buildLivePublicStandings(
      await json(db, "public.get_live_competition_source($1)", [id(3)]),
    );
    expect(
      unorganized.games.find((g) => g.id === id(8))?.score?.homePoints,
    ).toBe(3);
    expect(unorganized.organizationPendingGameIds).toContain(id(8));
  } finally {
    await db.exec(
      "rollback to savepoint setup_case;release savepoint setup_case",
    );
  }
});
it("a legacy group assignment cannot prevent manual scheduling in the flexible writer", async () => {
  const db = await database();
  try {
    const state = competitionSetupStateSchema.parse(
      await json(db, "public.get_competition_setup($1)", [id(3)]),
    );
    const { definition } = await import("../../tests/fixtures/regulation").then(
      (m) => m.regulationFixture(),
    );
    // A local legacy head is sufficient for the existing trigger; no remote seed.
    const legacy = {
      ...definition,
      registrationIds: [id(5), id(6)],
      groupPhases: [
        {
          phaseId: id(40),
          name: "Grupo",
          rules: defaultCompetitionSetup().rules,
          groups: [
            {
              id: id(41),
              name: "Grupo único",
              registrationIds: [id(5), id(6)],
              gameIds: [id(8)],
            },
          ],
        },
      ],
      knockoutPhases: [],
      series: [],
    };
    delete legacy.tieDecisions;
    delete legacy.tieNotes;
    await db.exec("reset role");
    await db.query(
      "insert into public.registrations(id,dispute_id,team_id,name) values($1,$2,$3,'Third')",
      [id(7), id(3), id(4)],
    );
    await db.query(
      "insert into private.regulation_versions(dispute_id,version,definition,context,context_fingerprint,algorithm_version,reason,saved_by,saved_at) values($1,1,$2,$3,$4,'organized-v1','Fixture',$5,clock_timestamp())",
      [id(3), legacy, state.context, state.contextFingerprint, id(98)],
    );
    await db.query(
      "insert into private.regulation_heads(dispute_id,version) values($1,1)",
      [id(3)],
    );
    await db.exec(
      `set local role authenticated;set local request.jwt.claim.sub='${id(98)}'`,
    );
    const { emptyOfficiating } = await import("../games/officiating-contract");
    const command = {
      commandId: id(9990),
      expectedVersion: 1,
      game: {
        id: id(8),
        disputeId: id(3),
        homeRegistrationId: id(5),
        awayRegistrationId: id(7),
        date: null,
        time: null,
        venue: null,
        number: null,
      },
      officiating: emptyOfficiating(),
    };
    // Use the canonical empty slots from the application contract.

    await rejects(db, "public.save_game_editor($1)", [command], "PT409");
    expect(
      await json(db, "public.save_flexible_game_editor($1)", [command]),
    ).toMatchObject({ id: id(8), version: 2 });
    expect(
      await json(db, "public.save_flexible_game_editor($1)", [command]),
    ).toMatchObject({ version: 2 });
    expect(
      await json(
        db,
        "current_setting('base_do_basquete.flexible_game_editor',true)",
      ),
    ).not.toBe("true");
  } finally {
    await db.exec(
      "rollback to savepoint setup_case;release savepoint setup_case",
    );
  }
});
