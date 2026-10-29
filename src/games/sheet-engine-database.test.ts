import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";
import { aggregate } from "../domain/scoresheet";
import {
  emptyPersistedSheet,
  toEngineSheet,
  validatePersistedSheet,
  type PersistedSheet,
} from "./sheet-contract";
const id = (n: number) =>
  `f3000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
it("PostgreSQL agrees with the supplied engine on draft event sequences and coach propagation", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      try {
        await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
      } catch (error) {
        throw new Error(`Failed migration ${name}: ${String(error)}`);
      }
    const base = emptyPersistedSheet();
    base.participants = ["home", "away"].flatMap((s, i) =>
      [0, 1].map((j) => ({
        rosterEntryId: id(i * 2 + j + 1),
        side: s as "home" | "away",
        jersey: j ? "00" : "0",
        played: true,
        starter: false,
      })),
    );
    base.staff.home.captainRosterEntryId = id(1);
    base.staff.away.captainRosterEntryId = id(3);
    let seed = 20261023;
    const random = (max: number) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed % max;
    };
    const codes = [
      "1",
      "2",
      "3",
      "P",
      "P1",
      "P2",
      "P3",
      "PC",
      "T1",
      "TC",
      "U",
      "U1",
      "U2",
      "U3",
      "UC",
      "D",
      "D1",
      "D2",
      "D3",
      "DC",
      "B1",
      "B2",
      "BC",
      "C1",
      "CC",
      "bad",
    ];
    const sequences: PersistedSheet["events"][] = [
      ["P", "P", "P", "P", "P", "2"],
      ["T1", "U", "2"],
      ["U", "U", "P"],
      ["C1", "C1", "2"],
      ["B1", "B1", "C1", "2"],
      ["D", "2"],
      ["B2", "B2", "2"],
    ].map((codes) =>
      codes.map((code, i) => ({
        id: id(100 + i),
        side: "home" as const,
        target: code.startsWith("B") ? "B" : code.startsWith("C") ? "C" : "0",
        period: 1,
        code,
      })),
    );
    for (const code of codes)
      for (const target of ["0", "00", "B", "C"])
        for (const side of ["home", "away"] as const) {
          sequences.push([{ id: id(100), side, target, period: 1, code }]);
        }
    for (let i = 0; i < 120; i++)
      sequences.push(
        Array.from({ length: random(14) }, (_, j) => ({
          id: id(100 + j),
          side: random(2) ? "home" : "away",
          target: ["0", "00", "B", "C"][random(4)],
          period: random(4) + 1,
          code: codes[random(codes.length)],
        })),
      );
    for (const events of sequences) {
      const d = { ...base, events };
      let engine = true,
        postgres = true;
      try {
        validatePersistedSheet(d);
      } catch {
        engine = false;
      }
      try {
        await db.query("select private.validate_sheet_document($1::jsonb)", [
          JSON.stringify(d),
        ]);
      } catch {
        postgres = false;
      }
      expect(postgres, JSON.stringify(events)).toBe(engine);
    }
    const v2 = {
      ...base,
      formatVersion: 2 as const,
      staff: {
        home: {
          captainRosterEntryId: id(1),
          coachStaffEntryId: id(7),
          assistantStaffEntryId: id(8),
        },
        away: {
          captainRosterEntryId: id(3),
          coachStaffEntryId: null,
          assistantStaffEntryId: null,
        },
      },
    };
    const staffEvent = (
      n: number,
      target: string,
      code: string,
      actorId?: string,
      period = 1,
      successorId?: string,
    ) => ({
      id: id(300 + n),
      side: "home" as const,
      period,
      target,
      code,
      ...(actorId ? { actorId } : {}),
      ...(successorId ? { successorId } : {}),
    });
    const playerEvent = (
      n: number,
      target: string,
      code: string,
      period = 1,
      successorId?: string,
    ) => staffEvent(n, target, code, undefined, period, successorId);
    const v2Sequences: PersistedSheet["events"][] = [
      [],
      [staffEvent(1, "C", "B1", id(7))],
      [staffEvent(1, "C", "BC", id(7))],
      [staffEvent(1, "C", "C1", id(7))],
      [staffEvent(1, "C", "D2", id(7)), staffEvent(2, "C", "B1", id(8))],
      [
        staffEvent(1, "C", "B1", id(7)),
        staffEvent(2, "C", "B1", id(7)),
        staffEvent(3, "C", "C1", id(7)),
        staffEvent(4, "C", "C1", id(8)),
      ],
      [staffEvent(1, "C", "B1", id(7), 2), staffEvent(2, "C", "C1", id(7), 1)],
      [staffEvent(1, "C", "BC", id(7)), staffEvent(2, "AT", "D2", id(8))],
      [staffEvent(1, "AT", "D2", id(8)), staffEvent(2, "C", "C1", id(7))],
      [
        staffEvent(1, "C", "C1", id(7)),
        staffEvent(2, "C", "C1", id(7)),
        staffEvent(3, "C", "B1", id(8)),
      ],
      [
        staffEvent(1, "AT", "D2", id(8)),
        staffEvent(2, "C", "D2", id(7)),
        staffEvent(3, "C", "C1", id(1)),
      ],
      [
        staffEvent(1, "AT", "D2", id(8)),
        staffEvent(2, "C", "D2", id(7)),
        playerEvent(3, "0", "D2", 1, id(2)),
        staffEvent(4, "C", "B1", id(2)),
      ],
      [
        staffEvent(1, "C", "D2", id(7)),
        staffEvent(2, "C", "D2", id(8)),
        staffEvent(3, "C", "C1", id(1)),
      ],
      [playerEvent(1, "0", "D2"), staffEvent(2, "C", "C1", id(7))],
      [
        playerEvent(1, "0", "T1"),
        playerEvent(2, "0", "U1"),
        playerEvent(3, "0", "P"),
      ],
      [
        playerEvent(1, "0", "P"),
        playerEvent(2, "0", "P"),
        playerEvent(3, "0", "P"),
        playerEvent(4, "0", "P"),
        playerEvent(5, "0", "P"),
      ],
      [
        playerEvent(1, "0", "2"),
        playerEvent(2, "00", "3"),
        playerEvent(3, "0", "T1"),
        staffEvent(4, "AT", "DC", id(8)),
      ],
      [
        playerEvent(1, "0", "U1", 3),
        playerEvent(2, "0", "P", 1),
        staffEvent(3, "C", "B1", id(7), 2),
      ],
      [staffEvent(1, "C", "B2", id(7))],
      [staffEvent(1, "B", "B1", id(7))],
      [staffEvent(1, "AT", "B1", id(8))],
      [staffEvent(1, "AT", "D2", id(8)), staffEvent(2, "AT", "D2", id(8))],
      [staffEvent(1, "C", "D2", id(7)), staffEvent(2, "C", "C1", id(7))],
      [staffEvent(1, "C", "C1", id(8))],
      [staffEvent(1, "C", "C1", id(7), 1, id(1))],
      [staffEvent(1, "C", "D2", id(7), 1, id(1))],
      [playerEvent(1, "0", "P", 1, id(2))],
      [playerEvent(1, "0", "U1"), playerEvent(2, "0", "D2")],
      [staffEvent(1, "AT", "D2")],
      [staffEvent(1, "0", "P", id(7))],
      [staffEvent(1, "AT", "D2", id(7))],
      [{ ...staffEvent(1, "AT", "D2", id(8)), side: "neither" as "home" }],
      [{ ...staffEvent(1, "AT", "D2", id(8)), period: 13 }],
      [{ ...staffEvent(1, "AT", "D2", id(8)), id: "not-a-uuid" }],
      [staffEvent(1, "C", "C1", id(7)), staffEvent(1, "AT", "D2", id(8))],
    ];
    const captainV2: PersistedSheet = {
      ...v2,
      staff: {
        ...v2.staff,
        home: {
          captainRosterEntryId: id(1),
          coachStaffEntryId: null,
          assistantStaffEntryId: null,
        },
      },
    };
    const captainSequences: PersistedSheet["events"][] = [
      [staffEvent(1, "C", "B1", id(1))],
      [
        staffEvent(1, "C", "C1", id(1)),
        staffEvent(2, "C", "C1", id(1)),
        staffEvent(3, "C", "B1", id(2)),
      ],
      [playerEvent(1, "0", "D2", 1, id(2)), staffEvent(2, "C", "B1", id(2))],
      [playerEvent(1, "0", "D2")],
      [playerEvent(1, "0", "D2", 1, id(1))],
      [
        playerEvent(1, "0", "T1"),
        staffEvent(2, "C", "C1", id(1)),
        staffEvent(3, "C", "B1", id(2)),
      ],
      [
        playerEvent(1, "0", "P"),
        playerEvent(2, "0", "P"),
        playerEvent(3, "0", "P"),
        playerEvent(4, "0", "P"),
        playerEvent(5, "0", "P", 1, id(2)),
      ],
      [playerEvent(1, "0", "D2", 2, id(2)), staffEvent(2, "C", "B1", id(1), 1)],
    ];
    const randomV2: PersistedSheet["events"][] = Array.from(
      { length: 90 },
      (_, i) =>
        Array.from({ length: random(8) }, (_, j) => {
          const target = ["0", "00", "B", "C", "AT"][random(5)];
          const code = codes[random(codes.length)];
          const actor = [id(7), id(8), id(1), id(2), undefined][random(5)];
          return {
            id: id(600 + i * 10 + j),
            side: random(2) ? ("home" as const) : ("away" as const),
            period: random(5) + 1,
            target,
            code,
            ...(actor ? { actorId: actor } : {}),
          };
        }),
    );
    const cases = [
      ...v2Sequences.map((events) => ({ document: v2, events })),
      ...captainSequences.map((events) => ({ document: captainV2, events })),
      ...randomV2.map((events) => ({ document: v2, events })),
    ];
    for (const { document, events } of cases) {
      const d: PersistedSheet = { ...document, events };
      let validTS = true,
        validPG = true;
      try {
        validatePersistedSheet(d);
      } catch {
        validTS = false;
      }
      try {
        await db.query("select private.validate_sheet_document($1::jsonb)", [
          JSON.stringify(d),
        ]);
      } catch {
        validPG = false;
      }
      expect(validPG, JSON.stringify(events)).toBe(validTS);
      if (validTS) {
        const { rows } = await db.query<{ facts: Record<string, unknown> }>(
          "select private.compute_sheet_facts($1::jsonb) as facts",
          [JSON.stringify(d)],
        );
        const result = aggregate(toEngineSheet(d));
        for (const side of ["home", "away"] as const) {
          const sql = (
            rows[0].facts.teams as Record<string, Record<string, unknown>>
          )[side];
          const ts = result.teams[side];
          for (const key of [
            "points",
            "periods",
            "freeMade",
            "freeConceded",
            "freeTaken",
            "foulsByPeriod",
            "coachB",
            "coachC",
            "coachStatus",
          ] as const)
            expect(
              sql[key],
              `${JSON.stringify(events)} ${side}.${key}`,
            ).toEqual(ts[key]);
        }
        const sqlPlayers = rows[0].facts.players as Array<
          Record<string, unknown>
        >;
        for (const player of result.players) {
          const sql = sqlPlayers.find(
            (p) => p.rosterEntryId === player.actorId,
          );
          expect(sql, `missing player ${player.actorId}`).toBeDefined();
          for (const key of [
            "points",
            "two",
            "three",
            "free",
            "fouls",
            "technical",
            "unsportsmanlike",
            "status",
          ] as const)
            expect(
              sql?.[key],
              `${JSON.stringify(events)} ${player.actorId}.${key}`,
            ).toEqual(player[key]);
        }
      }
    }
    // The published/confirmed path must dispatch to the v2 engine too.
    const final: PersistedSheet = {
      ...v2,
      participants: ["home", "away"].flatMap((side, i) =>
        Array.from({ length: 5 }, (_, j) => ({
          rosterEntryId: id(1000 + i * 5 + j),
          side: side as "home" | "away",
          jersey: String(j),
          starter: true,
          played: true,
        })),
      ),
      staff: {
        home: {
          captainRosterEntryId: id(1000),
          coachStaffEntryId: id(7),
          assistantStaffEntryId: id(8),
        },
        away: {
          captainRosterEntryId: id(1005),
          coachStaffEntryId: null,
          assistantStaffEntryId: null,
        },
      },
      events: [
        { ...staffEvent(1, "C", "B1", id(7)) },
        { ...playerEvent(2, "0", "2") },
      ],
    };
    expect(validatePersistedSheet(final, true)).toEqual(final);
    const published = await db.query<{
      facts: { teams: Record<string, { coachB: number }> };
    }>("select private.final_sheet_facts($1::jsonb) as facts", [
      JSON.stringify(final),
    ]);
    expect(published.rows[0].facts.teams.home.coachB).toBe(1);
    const badFinal = {
      ...final,
      events: [...final.events, { ...staffEvent(3, "AT", "D2", id(7)) }],
    };
    expect(() => validatePersistedSheet(badFinal, true)).toThrow();
    await expect(
      db.query("select private.final_sheet_facts($1::jsonb)", [
        JSON.stringify(badFinal),
      ]),
    ).rejects.toThrow();
  } finally {
    await db.close();
  }
}, 20000);
