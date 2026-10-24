import { it, expect } from "vitest";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import {
  regulationDefinitionSchema,
  regulationStateSchema,
  regulationVersionSchema,
} from "./persistence-contract";
const seed = async () =>
  (await readFile("supabase/tests/publication.sql", "utf8")).replace(
    /\nrollback;\s*$/u,
    "\n",
  );
it("saves regulation atomically from zero, protects history and reads authoritative minimal facts", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    const proof =
      (await seed()) +
      (await readFile("supabase/tests/regulation.sql", "utf8")) +
      "\nrollback;\n";
    if (process.env.BDB_EXPORT_REGULATION_PROOF === "1")
      await writeFile(".preview-artifacts/regulation-proof.sql", proof);
    await db.exec(proof);
    expect(
      (
        await db.query(
          "select count(*)::int as n from private.regulation_heads",
        )
      ).rows,
    ).toEqual([{ n: 0 }]);
  } finally {
    await db.close();
  }
}, 20000);
it("agrees with the closed TypeScript definition contract across valid formats and malformed references", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    const id = (n: number) =>
      `f2100000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    const initial = {
      registrationIds: [id(1), id(2)],
      occurrenceRules: { wo: null },
      groupPhases: [],
      knockoutPhases: [{ id: id(10), name: "Eliminatória" }],
      series: [],
    };
    const node = {
      id: id(20),
      phaseId: id(10),
      name: "Confronto A",
      format: "single",
      home: { kind: "registration", registrationId: id(1) },
      away: { kind: "registration", registrationId: id(2) },
      games: [],
    };
    const group = {
      phaseId: id(30),
      name: "Fase de grupos",
      rules: {
        format: "round_robin",
        points: { win: 2, loss: 1 },
        tieBreakers: ["head_to_head_points"],
      },
      groups: [
        {
          id: id(31),
          name: "Grupo A",
          registrationIds: [id(1), id(2)],
          gameIds: [id(100)],
        },
      ],
    };
    const cases: [string, unknown, boolean][] = [
      ["empty", initial, true],
      ["single", { ...initial, series: [node] }, true],
      ["groups", { ...initial, groupPhases: [group] }, true],
      [
        "rank reference",
        {
          ...initial,
          groupPhases: [group],
          series: [
            {
              ...node,
              home: {
                kind: "group_rank",
                phaseId: id(30),
                groupId: id(31),
                position: 1,
              },
            },
          ],
        },
        true,
      ],
      ["missing field", { ...initial, occurrenceRules: undefined }, false],
      ["empty occurrence rules", { ...initial, occurrenceRules: {} }, false],
      ["empty WO rule", { ...initial, occurrenceRules: { wo: {} } }, false],
      ["formula", { ...initial, formula: "x()" }, false],
      [
        "WO explicit",
        {
          ...initial,
          occurrenceRules: {
            wo: { winnerLeaguePoints: 2, loserLeaguePoints: -1, score: null },
          },
        },
        true,
      ],
      [
        "WO score",
        {
          ...initial,
          occurrenceRules: {
            wo: {
              winnerLeaguePoints: 2,
              loserLeaguePoints: -1,
              score: { winner: 20, loser: 0 },
            },
          },
        },
        true,
      ],
      [
        "WO tied score",
        {
          ...initial,
          occurrenceRules: {
            wo: {
              winnerLeaguePoints: 2,
              loserLeaguePoints: 0,
              score: { winner: 20, loser: 20 },
            },
          },
        },
        false,
      ],
      [
        "WO unknown metric",
        {
          ...initial,
          occurrenceRules: {
            wo: {
              winnerLeaguePoints: 2,
              loserLeaguePoints: 0,
              score: null,
              minutes: 40,
            },
          },
        },
        false,
      ],
      [
        "duplicate registration",
        { ...initial, registrationIds: [id(1), id(1)] },
        false,
      ],
      [
        "foreign direct reference",
        {
          ...initial,
          series: [
            {
              ...node,
              home: { kind: "registration", registrationId: id(999) },
            },
          ],
        },
        false,
      ],
      [
        "missing series",
        {
          ...initial,
          series: [
            { ...node, home: { kind: "series_loser", seriesId: id(999) } },
          ],
        },
        false,
      ],
      [
        "self cycle",
        {
          ...initial,
          series: [
            { ...node, home: { kind: "series_winner", seriesId: id(20) } },
          ],
        },
        false,
      ],
      [
        "multi-node cycle",
        {
          ...initial,
          series: [
            { ...node, home: { kind: "series_winner", seriesId: id(21) } },
            {
              ...node,
              id: id(21),
              home: { kind: "series_loser", seriesId: id(20) },
            },
          ],
        },
        false,
      ],
      [
        "DAG",
        {
          ...initial,
          series: [
            node,
            {
              ...node,
              id: id(21),
              home: { kind: "series_winner", seriesId: id(20) },
            },
          ],
        },
        true,
      ],
      [
        "rank past cut",
        {
          ...initial,
          groupPhases: [group],
          series: [
            {
              ...node,
              home: {
                kind: "group_rank",
                phaseId: id(30),
                groupId: id(31),
                position: 3,
              },
            },
          ],
        },
        false,
      ],
      [
        "missing group",
        {
          ...initial,
          groupPhases: [group],
          series: [
            {
              ...node,
              home: {
                kind: "group_rank",
                phaseId: id(30),
                groupId: id(999),
                position: 1,
              },
            },
          ],
        },
        false,
      ],
      [
        "foreign group member",
        {
          ...initial,
          groupPhases: [
            {
              ...group,
              groups: [{ ...group.groups[0], registrationIds: [id(999)] }],
            },
          ],
        },
        false,
      ],
      [
        "duplicate phase",
        {
          ...initial,
          knockoutPhases: [
            initial.knockoutPhases[0],
            initial.knockoutPhases[0],
          ],
        },
        false,
      ],
      ["empty label", { ...initial, series: [{ ...node, name: "" }] }, false],
      [
        "control label",
        { ...initial, series: [{ ...node, name: "A\u0001B" }] },
        false,
      ],
      [
        "unknown criterion",
        {
          ...initial,
          groupPhases: [
            { ...group, rules: { ...group.rules, tieBreakers: ["name"] } },
          ],
        },
        false,
      ],
      [
        "duplicate criterion",
        {
          ...initial,
          groupPhases: [
            {
              ...group,
              rules: { ...group.rules, tieBreakers: ["wins", "wins"] },
            },
          ],
        },
        false,
      ],
      [
        "fractional points",
        {
          ...initial,
          groupPhases: [
            {
              ...group,
              rules: { ...group.rules, points: { win: 1.5, loss: 0 } },
            },
          ],
        },
        false,
      ],
      [
        "duplicate assignment",
        {
          ...initial,
          groupPhases: [group],
          series: [{ ...node, games: [{ slot: 1, gameId: id(100) }] }],
        },
        false,
      ],
      [
        "duplicate slot",
        {
          ...initial,
          series: [
            {
              ...node,
              format: "best_of_3",
              games: [
                { slot: 1, gameId: id(100) },
                { slot: 1, gameId: id(101) },
              ],
            },
          ],
        },
        false,
      ],
      [
        "fractional slot",
        {
          ...initial,
          series: [{ ...node, games: [{ slot: 1.5, gameId: id(100) }] }],
        },
        false,
      ],
    ];
    for (const [format, maximum] of [
      ["single", 1],
      ["two_leg", 2],
      ["best_of_3", 3],
      ["best_of_5", 5],
      ["best_of_7", 7],
    ] as const) {
      cases.push([
        `valid ${format} slots`,
        {
          ...initial,
          series: [
            {
              ...node,
              format,
              games: Array.from({ length: maximum }, (_, i) => ({
                slot: i + 1,
                gameId: id(100 + i),
              })),
            },
          ],
        },
        true,
      ]);
      cases.push([
        `invalid ${format} slot`,
        {
          ...initial,
          series: [
            {
              ...node,
              format,
              games: [{ slot: maximum + 1, gameId: id(100) }],
            },
          ],
        },
        false,
      ]);
    }
    for (const [label, value, expected] of cases) {
      const parsed = regulationDefinitionSchema.safeParse(value);
      expect(parsed.success, label + " TypeScript").toBe(expected);
      const result = (
        await db.query<{ valid: boolean }>(
          "select private.valid_regulation_definition($1::jsonb) as valid",
          [JSON.stringify(parsed.success ? parsed.data : value)],
        )
      ).rows[0].valid;
      expect(result, label + " PostgreSQL").toBe(expected);
    }
  } finally {
    await db.close();
  }
}, 20000);
it("upgrades existing G4 publications without rewriting history and returns strict TS-compatible snapshots", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    const names = (await readdir("supabase/migrations"))
        .filter((n) => n.endsWith(".sql"))
        .sort(),
      index = names.findIndex((n) => n.includes("_dispute_regulations")),
      start = index < 0 ? names.length : index;
    for (const name of names.slice(0, start))
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    await db.exec(await seed());
    const before = (
      await db.query(
        "select * from private.game_publication_versions order by game_id,version",
      )
    ).rows;
    for (const name of names.slice(start))
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    expect(
      (
        await db.query(
          "select * from private.game_publication_versions order by game_id,version",
        )
      ).rows,
    ).toEqual(before);
    await db.exec(await readFile("supabase/tests/regulation.sql", "utf8"));
    await db.exec(
      "set local role authenticated; select set_config('request.jwt.claim.sub',pg_temp.pu_id(98)::text,true);",
    );
    const state = (
      await db.query<{ value: unknown }>(
        "select public.get_regulation_state(pg_temp.pu_id(3)) as value",
      )
    ).rows[0].value;
    expect(regulationStateSchema.parse(state).version).toBe(2);
    const version = (
      await db.query<{ value: unknown }>(
        "select public.get_regulation_version(pg_temp.pu_id(3),1) as value",
      )
    ).rows[0].value;
    expect(regulationVersionSchema.parse(version).version).toBe(1);
    await db.exec("rollback;");
  } finally {
    await db.close();
  }
}, 20000);
