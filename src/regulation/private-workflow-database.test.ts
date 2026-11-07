import { expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { createDefaultDefinition, createFibaRules } from "./defaults";
import {
  previewRegulationDefinition,
  regulationStateSchema,
} from "./persistence-contract";
import { publicStandingsSourceSchema } from "./public-contract";
import { buildPublicStandings } from "./public";
const id = (n: number) =>
  `f9200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function setup() {
  const db = await PGlite.create();
  await db.exec(platform);
  for (const file of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  const seed = await readFile("supabase/tests/publication.sql", "utf8");
  await db.exec(seed.slice(0, seed.indexOf("set local role anon;")));
  await db.exec(
    `set local role authenticated; set local request.jwt.claim.sub='${id(98)}'`,
  );
  return db;
}
async function json(db: PGlite, expression: string, args: unknown[] = []) {
  return (
    await db.query<{ value: unknown }>(`select ${expression} as value`, args)
  ).rows[0].value;
}
async function rejected(
  db: PGlite,
  expression: string,
  args: unknown[],
  code: string,
) {
  await db.exec("savepoint expected_error");
  await expect(json(db, expression, args)).rejects.toMatchObject({ code });
  await db.exec(
    "rollback to savepoint expected_error; release savepoint expected_error",
  );
}
it("audits tie comments server-side and publishes only the confirmed order", async () => {
  const db = await setup();
  try {
    const state = regulationStateSchema.parse(
      await json(db, "public.get_regulation_state($1,0)", [id(3)]),
    );
    const definition = createDefaultDefinition();
    definition.registrationIds = [id(5), id(6)];
    definition.groupPhases = [
      {
        phaseId: id(800),
        name: "Fase",
        rules: createFibaRules(),
        groups: [
          {
            id: id(801),
            name: "Grupo",
            registrationIds: [id(5), id(6)],
            gameIds: [id(8)],
          },
        ],
      },
    ];
    const preview = previewRegulationDefinition(
      definition,
      state.context,
      id(3),
      1,
    );
    definition.tieDecisions = [
      {
        id: id(802),
        phaseId: id(800),
        groupId: id(801),
        order: [id(6), id(5)],
        basis: preview.groupPhases[0].groups[0].tieContext,
      },
    ];
    const command = {
      commandId: id(850),
      disputeId: id(3),
      expectedVersion: 0,
      expectedContextFingerprint: state.contextFingerprint,
      definition,
      reason: "",
      acknowledgeImpact: false,
    };
    await rejected(db, "public.save_regulation($1)", [command], "PT400");
    definition.tieNotes = [
      {
        id: id(802),
        comment: "Decisão privada da organização",
        actorId: id(99),
        decidedAt: "2000-01-01T00:00:00Z",
      },
    ];
    const receipt = await json(db, "public.save_regulation($1)", [command]);
    expect(await json(db, "public.save_regulation($1)", [command])).toEqual(
      receipt,
    );
    const saved = regulationStateSchema.parse(
      await json(db, "public.get_regulation_state($1,0)", [id(3)]),
    );
    expect(saved.definition?.tieNotes?.[0]).toMatchObject({
      actorId: id(98),
      comment: "Decisão privada da organização",
    });
    expect(saved.definition?.tieNotes?.[0].decidedAt).not.toBe(
      "2000-01-01T00:00:00Z",
    );
    const candidate = (await json(db, "public.preview_public_standings($1)", [
      id(3),
    ])) as { source: unknown; fingerprint: string };
    expect(JSON.stringify(candidate)).not.toContain("Decisão privada");
    const source = publicStandingsSourceSchema.parse(candidate.source);
    expect(source.definition).not.toHaveProperty("tieNotes");
    expect(
      buildPublicStandings(source).projection.groupPhases[0].groups[0].standings
        .rows[0].registrationId,
    ).toBe(id(6));
    await json(db, "public.confirm_public_standings($1)", [
      {
        commandId: id(851),
        disputeId: id(3),
        expectedPublicationVersion: 0,
        fingerprint: candidate.fingerprint,
      },
    ]);
    await db.exec("set local role anon");
    const published = publicStandingsSourceSchema.parse(
      await json(db, "public.get_public_standings($1)", [id(3)]),
    );
    expect(JSON.stringify(published)).not.toContain("tieNotes");
    expect(
      buildPublicStandings(published).projection.groupPhases[0].groups[0]
        .standings.rows[0].registrationId,
    ).toBe(id(6));
  } finally {
    await db.close();
  }
}, 20000);

it("keeps incomplete drafts private, detects concurrent edits and replays commands", async () => {
  const db = await setup();
  try {
    expect(
      await json(db, "public.get_regulation_draft($1)", [id(3)]),
    ).toBeNull();
    const command = {
      commandId: id(860),
      disputeId: id(3),
      expectedVersion: 0,
      baseRegulationVersion: 0,
      document: {
        definition: {
          ...createDefaultDefinition(),
          groupPhases: [
            {
              phaseId: id(800),
              name: "",
              rules: createFibaRules(),
              groups: [],
            },
          ],
        },
      },
    };
    await rejected(
      db,
      "public.save_regulation_draft($1)",
      [{ ...command, document: { definition: {} } }],
      "PT400",
    );
    const result = await json(db, "public.save_regulation_draft($1)", [
      command,
    ]);
    expect(
      await json(db, "public.save_regulation_draft($1)", [command]),
    ).toEqual(result);
    const draft = (await json(db, "public.get_regulation_draft($1)", [
      id(3),
    ])) as { version: number; document: unknown };
    expect(draft.version).toBe(1);
    expect(draft.document).toEqual(command.document);
    await rejected(
      db,
      "public.save_regulation_draft($1)",
      [{ ...command, document: { definition: createDefaultDefinition() } }],
      "PT409",
    );
    await rejected(
      db,
      "public.save_regulation_draft($1)",
      [{ ...command, commandId: id(861) }],
      "PT409",
    );
    expect(
      (
        (await json(db, "public.get_regulation_state($1,0)", [id(3)])) as {
          version: number;
        }
      ).version,
    ).toBe(0);
    const official = regulationStateSchema.parse(
      await json(db, "public.get_regulation_state($1,0)", [id(3)]),
    );
    await json(db, "public.save_regulation($1)", [
      {
        commandId: id(862),
        disputeId: id(3),
        expectedVersion: 0,
        expectedContextFingerprint: official.contextFingerprint,
        definition: createDefaultDefinition(),
        reason: "",
        acknowledgeImpact: false,
      },
    ]);
    await rejected(
      db,
      "public.save_regulation_draft($1)",
      [{ ...command, commandId: id(863), expectedVersion: 1 }],
      "PT409",
    );
    await db.exec("set local role anon");
    expect(
      await json(db, "public.get_public_standings($1)", [id(3)]),
    ).toBeNull();
    await rejected(db, "public.get_regulation_draft($1)", [id(3)], "42501");
    await db.exec(
      `set local role authenticated;set local request.jwt.claim.sub='${id(99)}'`,
    );
    await rejected(db, "public.get_regulation_draft($1)", [id(3)], "PT403");
    await rejected(db, "public.save_regulation_draft($1)", [command], "PT403");
  } finally {
    await db.close();
  }
}, 20000);
