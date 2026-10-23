import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";
import {
  emptyPersistedSheet,
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
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
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
  } finally {
    await db.close();
  }
}, 20000);
