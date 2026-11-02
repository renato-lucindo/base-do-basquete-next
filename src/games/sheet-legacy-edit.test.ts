import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";
import { validatePersistedSheet, type PersistedSheet } from "./sheet-contract";
import { emptyOfficiating } from "./officiating-contract";
import { changeSheetJersey, identifyPlayerEvents } from "./sheet-identity";
import { authorAction } from "./sheet-event-author";
import { aggregate } from "../domain/scoresheet";
import { toEngineSheet, sheetSnapshotSchema } from "./sheet-contract";

const id = (n: number) =>
  `f9200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function fixture(beforeUpgrade = false) {
  const db = await PGlite.create();
  await db.exec(platform);
  for (const name of (await readdir("supabase/migrations"))
    .filter(
      (n) =>
        n.endsWith(".sql") &&
        (!beforeUpgrade || !n.endsWith("_legacy_sheet_editing.sql")),
    )
    .sort())
    await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
  const setup = await readFile("supabase/tests/publication.sql", "utf8");
  await db.exec(setup.slice(0, setup.indexOf("set local role anon;")));
  await db.exec(
    `set local role authenticated; set local request.jwt.claim.sub='${id(98)}';`,
  );
  return db;
}
async function rpc(
  db: PGlite,
  name: "save_game_sheet" | "save_game_editor" | "publish_sheet_game",
  command: unknown,
) {
  return (
    await db.query<{ result: unknown }>(
      `select public.${name}($1::jsonb) result`,
      [JSON.stringify(command)],
    )
  ).rows[0].result;
}
async function fails(
  db: PGlite,
  statement: string,
  param: unknown[],
  code: string,
) {
  await db.exec("savepoint expected_failure");
  try {
    await expect(db.query(statement, param)).rejects.toMatchObject({ code });
  } finally {
    await db.exec(
      "rollback to savepoint expected_failure; release savepoint expected_failure",
    );
  }
}
async function snapshot(db: PGlite, gameId = id(8)) {
  return sheetSnapshotSchema.parse(
    (
      await db.query<{ s: unknown }>("select public.get_game_sheet($1) s", [
        gameId,
      ])
    ).rows[0].s,
  );
}
async function document(db: PGlite) {
  return (await db.query<{ d: PersistedSheet }>("select pg_temp.pu_doc() d"))
    .rows[0].d;
}

it("v1 accepts an explicitly entered timeout without converting legacy staff or actions", async () => {
  const db = await fixture();
  try {
    const legacy = await document(db);
    const edited: PersistedSheet = {
      ...legacy,
      events: [
        ...legacy.events,
        { id: id(801), side: "home", period: 2, target: "TO", code: "3" },
      ],
    };
    expect(() => validatePersistedSheet(edited)).not.toThrow();
    await expect(
      db.query("select public.save_game_sheet($1::jsonb)", [
        JSON.stringify({
          requestId: id(804),
          gameId: id(8),
          gameVersion: 1,
          baseVersion: 0,
          document: edited,
          confirm: false,
          reason: "",
        }),
      ]),
    ).resolves.toBeDefined();
    expect(edited.events[0]).toEqual(legacy.events[0]);
    expect(edited.formatVersion).toBeUndefined();
  } finally {
    await db.close();
  }
}, 20000);

it.each([undefined, 2] as const)(
  "allows adding and updating private officiating and real times on an already published format %s game",
  async (formatVersion) => {
    const db = await fixture();
    try {
      const initial = {
        ...(await document(db)),
        ...(formatVersion ? { formatVersion } : {}),
      };
      await db.query(
        "select public.publish_sheet_game(jsonb_set(pg_temp.pu_command(),'{source,document}',$1::jsonb))",
        [JSON.stringify(initial)],
      );
      const game = (
        await db.query<{ g: Record<string, unknown> }>(
          "select public.get_game($1) g",
          [id(8)],
        )
      ).rows[0].g;
      const {
        version,
        id: gameId,
        disputeId,
        homeRegistrationId,
        awayRegistrationId,
        date,
        time,
        startAt,
        endAt,
        venue,
        number,
      } = game;
      const command = {
        commandId: id(802),
        expectedVersion: version,
        game: {
          id: gameId,
          disputeId,
          homeRegistrationId,
          awayRegistrationId,
          date,
          time,
          startAt: "2026-10-30T23:15",
          endAt: "2026-10-31T00:47",
          venue,
          number,
        },
        officiating: {
          ...emptyOfficiating(),
          referee: {
            kind: "new",
            id: id(803),
            name: "Árbitro legado",
            confirmHomonym: false,
          },
        },
      };
      await expect(
        db.query("select public.save_game_editor($1::jsonb)", [
          JSON.stringify(command),
        ]),
      ).resolves.toBeDefined();
      expect(
        (
          await db.query<{ s: { officiating: { referee: { name: string } } } }>(
            "select public.get_game_editor($1) s",
            [id(8)],
          )
        ).rows[0].s.officiating.referee.name,
      ).toBe("Árbitro legado");
      const published = (
        await db.query("select public.get_public_game($1) p", [id(8)])
      ).rows;
      expect(
        (
          await db.query<{ g: Record<string, unknown> }>(
            "select public.get_game($1) g",
            [id(8)],
          )
        ).rows[0].g,
      ).toMatchObject({
        startAt: "2026-10-30T23:15",
        endAt: "2026-10-31T00:47",
        state: "finished",
        date,
        time,
      });
      const acknowledged = await rpc(db, "save_game_editor", command);
      expect(acknowledged).toEqual({ id: id(8), version: 3 });
      const revision = {
        ...command,
        commandId: id(805),
        expectedVersion: 3,
        game: { ...command.game, endAt: "2026-10-31T01:00" },
        officiating: {
          ...emptyOfficiating(),
          referee: { kind: "existing", id: id(803) },
          scorer: {
            kind: "new",
            id: id(806),
            name: "Apontador legado",
            confirmHomonym: false,
          },
        },
      };
      await rpc(db, "save_game_editor", revision);
      await fails(
        db,
        "select public.save_game_editor($1::jsonb)",
        [
          JSON.stringify({
            ...revision,
            commandId: id(807),
            expectedVersion: 4,
            game: { ...revision.game, venue: "Outro local" },
          }),
        ],
        "PT409",
      );
      await fails(
        db,
        "select public.save_game_editor($1::jsonb)",
        [
          JSON.stringify({
            ...revision,
            commandId: id(808),
            expectedVersion: 4,
            game: { ...revision.game, endAt: "2026-10-30T23:00" },
          }),
        ],
        "PT400",
      );
      await fails(
        db,
        "select public.save_game_editor($1::jsonb)",
        [
          JSON.stringify({
            ...revision,
            commandId: id(809),
            expectedVersion: 3,
          }),
        ],
        "PT409",
      );
      expect(
        (await db.query("select public.get_public_game($1) p", [id(8)])).rows,
      ).toEqual(published);
      expect((await snapshot(db)).document).toEqual(initial);
      expect(startAt).toBeNull();
      expect(endAt).toBeNull();
    } finally {
      await db.close();
    }
  },
  20000,
);

it.each([undefined, 2] as const)(
  "upgrades existing format %s drafts without rewriting them; stable authorship survives save/reload/replay/conflict",
  async (formatVersion) => {
    const db = await fixture(true);
    try {
      const legacy = {
        ...(await document(db)),
        ...(formatVersion ? { formatVersion } : {}),
      };
      const originalCommand = {
        requestId: id(820),
        gameId: id(8),
        gameVersion: 1,
        baseVersion: 0,
        document: legacy,
        confirm: false,
        reason: "",
      };
      legacy.events.push(
        formatVersion
          ? {
              id: id(819),
              side: "home",
              period: 2,
              target: "C",
              code: "BC",
              actorId: id(101),
            }
          : { id: id(819), side: "home", period: 2, target: "B", code: "B2" },
      );
      const originalAck = await rpc(db, "save_game_sheet", originalCommand);
      const before = await snapshot(db);
      await db.exec("reset role");
      await db.exec(
        await readFile(
          "supabase/migrations/20261102112205_legacy_sheet_editing.sql",
          "utf8",
        ),
      );
      await db.exec("set local role authenticated");
      expect(await snapshot(db)).toEqual(before);
      expect(await rpc(db, "save_game_sheet", originalCommand)).toEqual(
        originalAck,
      );
      // The same global roster participates in another game and must not change.
      await rpc(db, "save_game_sheet", {
        ...originalCommand,
        requestId: id(821),
        gameId: id(9),
      });
      const other = await snapshot(db, id(9));
      const next = changeSheetJersey(legacy, id(101), "17");
      next.events.push(
        authorAction(next, {
          side: "home",
          period: 4,
          target: "17",
          code: "3",
        }),
      );
      next.events.push({
        id: id(822),
        side: "home",
        period: 1,
        target: "TO",
        code: "3",
      });
      const command = {
        ...originalCommand,
        requestId: id(823),
        baseVersion: 1,
        document: next,
      };
      const ack = await rpc(db, "save_game_sheet", command);
      const saved = await snapshot(db);
      expect(saved.document).toEqual(next);
      expect(saved.participants).toEqual(before.participants);
      expect(saved.staff).toEqual(before.staff);
      expect(
        aggregate(toEngineSheet(saved.document)).players.find(
          (p) => p.actorId === id(101),
        ),
      ).toMatchObject({ jersey: "17", points: 5 });
      expect(await rpc(db, "save_game_sheet", command)).toEqual(ack);
      expect(await snapshot(db)).toEqual(saved);
      await fails(
        db,
        "select public.save_game_sheet($1::jsonb)",
        [
          JSON.stringify({
            ...command,
            reason: "Outro conteúdo no mesmo requestId",
          }),
        ],
        "PT409",
      );
      await fails(
        db,
        "select public.save_game_sheet($1::jsonb)",
        [
          JSON.stringify({
            ...command,
            requestId: id(827),
            gameVersion: 2,
            baseVersion: 2,
          }),
        ],
        "PT409",
      );
      await fails(
        db,
        "select public.save_game_sheet($1::jsonb)",
        [
          JSON.stringify({
            ...command,
            requestId: id(824),
            document: changeSheetJersey(next, id(101), "18"),
          }),
        ],
        "PT409",
      );
      const reloaded = identifyPlayerEvents((await snapshot(db)).document);
      const swapped = structuredClone(reloaded);
      swapped.participants[0].jersey = "00";
      swapped.participants[1].jersey = "17";
      swapped.events = swapped.events.map((event) => {
        const copy = { ...event };
        delete copy.playerRosterEntryId;
        return copy;
      });
      // Legacy clients without stable fields cannot silently transfer old actions either.
      expect(() => validatePersistedSheet(swapped)).not.toThrow();
      await fails(
        db,
        "select public.save_game_sheet($1::jsonb)",
        [
          JSON.stringify({
            ...command,
            requestId: id(828),
            baseVersion: 2,
            document: swapped,
          }),
        ],
        "PT400",
      );
      expect(() => changeSheetJersey(reloaded, id(101), "00")).toThrow(
        /ocupada/,
      );
      const forged = structuredClone(reloaded);
      forged.events[0].playerRosterEntryId = id(102);
      await fails(
        db,
        "select public.save_game_sheet($1::jsonb)",
        [
          JSON.stringify({
            ...command,
            requestId: id(826),
            baseVersion: 2,
            document: forged,
          }),
        ],
        "PT400",
      );
      await rpc(db, "save_game_sheet", {
        ...command,
        requestId: id(825),
        baseVersion: 2,
        document: changeSheetJersey(reloaded, id(101), "18"),
      });
      expect((await snapshot(db)).document.events[0]).toMatchObject({
        target: "18",
        playerRosterEntryId: id(101),
        id: legacy.events[0].id,
      });
      await db.exec(`set local request.jwt.claim.sub='${id(99)}'`);
      await fails(
        db,
        "select public.save_game_sheet($1::jsonb)",
        [JSON.stringify(command)],
        "PT403",
      );
      await db.exec(`set local request.jwt.claim.sub='${id(98)}'`);
      expect(await snapshot(db, id(9))).toEqual(other);
      await db.exec("reset role");
      expect(
        (
          await db.query<{ jersey: string }>(
            "select jersey from public.roster_entries where id=$1",
            [id(101)],
          )
        ).rows[0].jersey,
      ).toBe("0");
    } finally {
      await db.close();
    }
  },
  20000,
);

it("a confirmed jersey correction requires a reason and explicit republication; old public/statistical versions stay immutable", async () => {
  const db = await fixture();
  try {
    await db.query("select public.publish_sheet_game(pg_temp.pu_command())");
    const before = await snapshot(db);
    const publicBefore = (
      await db.query<{ p: unknown }>("select public.get_public_game($1) p", [
        id(8),
      ])
    ).rows;
    const statsBefore = (
      await db.query("select public.get_public_statistics_source($1) s", [
        id(3),
      ])
    ).rows;
    const next = changeSheetJersey(before.document, id(101), "17");
    const save = {
      requestId: id(830),
      gameId: id(8),
      gameVersion: 2,
      baseVersion: 1,
      document: next,
      confirm: false,
      reason: "Correção da camisa conferida na súmula original.",
    };
    await fails(
      db,
      "select public.save_game_sheet($1::jsonb)",
      [JSON.stringify({ ...save, reason: "" })],
      "PT400",
    );
    await rpc(db, "save_game_sheet", save);
    expect(
      (await db.query("select public.get_public_game($1) p", [id(8)])).rows,
    ).toEqual(publicBefore);
    expect(
      (
        await db.query("select public.get_public_statistics_source($1) s", [
          id(3),
        ])
      ).rows,
    ).toEqual(statsBefore);
    const publish = {
      requestId: id(831),
      gameId: id(8),
      gameVersion: 2,
      basePublicationVersion: 1,
      source: { kind: "sheet", baseSheetVersion: 2, document: next },
      reason: save.reason,
      fallback: false,
    };
    const ack = await rpc(db, "publish_sheet_game", publish);
    expect(await rpc(db, "publish_sheet_game", publish)).toEqual(ack);
    const now = (
      await db.query<{
        p: {
          version: number;
          facts: {
            players: {
              person: { id: string };
              jersey: string;
              points: number;
            }[];
          };
        };
      }>("select public.get_public_game($1) p", [id(8)])
    ).rows[0].p;
    expect(now.version).toBe(2);
    const statisticalPlayers = (
      await db.query<{
        players: { person: { id: string }; jersey: string; points: number }[];
      }>(
        "select public.get_public_statistics_source($1)#>'{games,0,snapshot,facts,players}' players",
        [id(3)],
      )
    ).rows[0].players;
    expect(
      statisticalPlayers.find((p) => p.person.id === id(201)),
    ).toMatchObject({ jersey: "17", points: 2 });
    expect(
      now.facts.players.find((p) => p.person.id === id(201)),
    ).toMatchObject({ jersey: "17", points: 2 });
    const old = (
      await db.query<{ h: { snapshot: unknown } }>(
        "select public.get_game_publication_version($1,1) h",
        [id(8)],
      )
    ).rows[0].h;
    expect(old.snapshot).toEqual(publicBefore[0].p);
    await db.exec("reset role");
    await fails(
      db,
      "update private.game_publication_versions set snapshot=snapshot where game_id=$1",
      [id(8)],
      "PT409",
    );
  } finally {
    await db.close();
  }
}, 20000);

it.each([undefined, 2] as const)(
  "format %s preserves the same timeout limits and rejects malformed or incomplete events in TS and SQL",
  async (formatVersion) => {
    const db = await fixture();
    try {
      const base = {
        ...(await document(db)),
        periods: 5,
        ...(formatVersion ? { formatVersion } : {}),
      };
      const time = (period: number, code: string, n: number) => ({
        id: id(900 + n),
        side: "home" as const,
        period,
        target: "TO",
        code,
      });
      const cases = [
        {
          valid: true,
          times: [
            time(1, "3", 1),
            time(2, "8", 2),
            time(3, "5", 3),
            time(4, "9", 4),
            time(5, "4", 5),
          ],
        },
        {
          valid: false,
          times: [time(1, "3", 1), time(2, "8", 2), time(2, "9", 3)],
        },
        {
          valid: false,
          times: [time(4, "9", 1), time(4, "9", 2), time(4, "10", 3)],
        },
        { valid: false, times: [time(5, "3", 1), time(5, "4", 2)] },
        { valid: false, times: [time(5, "6", 1)] },
        { valid: false, times: [time(1, "0", 1)] },
        { valid: false, times: [time(1, "11", 1)] },
        {
          valid: false,
          times: [{ ...time(1, "3", 1), id: base.events[0].id }],
        },
        { valid: false, times: [{ ...time(1, "3", 1), actorId: id(101) }] },
      ];
      await db.exec("reset role");
      for (const c of cases) {
        const d = { ...base, events: [...base.events, ...c.times] };
        if (c.valid) {
          expect(() => validatePersistedSheet(d)).not.toThrow();
          const facts = (
            await db.query<{ f: { teams: unknown } }>(
              "select private.compute_sheet_facts($1::jsonb) f",
              [JSON.stringify(d)],
            )
          ).rows[0].f;
          expect(facts.teams).toEqual(
            (
              await db.query<{ f: { teams: unknown } }>(
                "select private.compute_sheet_facts($1::jsonb) f",
                [JSON.stringify(base)],
              )
            ).rows[0].f.teams,
          );
        } else {
          expect(() => validatePersistedSheet(d)).toThrow();
          await fails(
            db,
            "select private.compute_sheet_facts($1::jsonb)",
            [JSON.stringify(d)],
            "PT400",
          );
        }
      }
      const incomplete = {
        ...base,
        participants: [],
        staff: {
          home: {
            captainRosterEntryId: null,
            coachStaffEntryId: null,
            assistantStaffEntryId: null,
          },
          away: {
            captainRosterEntryId: null,
            coachStaffEntryId: null,
            assistantStaffEntryId: null,
          },
        },
        events: [time(1, "3", 1)],
      };
      expect(() => validatePersistedSheet(incomplete)).toThrow();
      await fails(
        db,
        "select private.compute_sheet_facts($1::jsonb)",
        [JSON.stringify(incomplete)],
        "PT400",
      );
    } finally {
      await db.close();
    }
  },
  20000,
);
