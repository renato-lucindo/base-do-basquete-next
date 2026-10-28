import { expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { transferFixture, transferId } from "../../tests/fixtures/transfers";
import { saveTransferSchema } from "./transfer-contract";

function commandCases(): [string, unknown, boolean][] {
  const c = transferFixture().command;
  const cases: [string, unknown, boolean][] = [
    ["preview without acknowledgment", c, true],
    ["acknowledged", { ...c, acknowledgeImpact: true }, true],
    ["null jersey", { ...c, jersey: null }, true],
    ["zero", { ...c, jersey: "0" }, true],
    [
      "maximum source version",
      { ...c, expectedSourceVersion: 2147483646 },
      true,
    ],
    [
      "maximum destination version",
      { ...c, expectedDestinationVersion: 2147483647 },
      true,
    ],
    ["unconfigured regulation", { ...c, expectedRegulationVersion: 0 }, true],
    ["Unicode min", { ...c, reason: "🙂ab" }, true],
    ["Unicode max", { ...c, reason: "🙂".repeat(2000) }, true],
    ["Unicode too short", { ...c, reason: "🙂a" }, false],
    ["Unicode too long", { ...c, reason: "🙂".repeat(2001) }, false],
    ["unicode trim", { ...c, reason: "\ufeff\u00a0🙂ab\u2028" }, true],
    ["unicode whitespace only", { ...c, reason: "\u00a0\u2000\u3000" }, false],
    ["NUL", { ...c, reason: "Motivo\u0000inválido" }, false],
    ["lone surrogate", { ...c, reason: "abc\ud800" }, false],
    ["same identity", { ...c, newEntryId: c.sourceEntryId }, false],
    [
      "same UUID different case",
      { ...c, newEntryId: c.sourceEntryId.toUpperCase() },
      false,
    ],
    [
      "line breaks inside reason",
      { ...c, reason: "Um motivo\nconferido" },
      true,
    ],
    ["version overflow", { ...c, expectedSourceVersion: 2147483647 }, false],
    ["decimal version", { ...c, expectedSourceVersion: 1.5 }, false],
    ["version string", { ...c, expectedSourceVersion: "1" }, false],
    ["jersey numeric", { ...c, jersey: 0 }, false],
    ["jersey leading zero", { ...c, jersey: "01" }, false],
    ["ack string", { ...c, acknowledgeImpact: "true" }, false],
    ["foreign actor", { ...c, actorId: transferId(999) }, false],
    ["derived person", { ...c, personId: transferId(999) }, false],
    ["client clock", { ...c, effectiveAt: "2000-01-01T00:00:00Z" }, false],
    ["client rule", { ...c, transfers: "allowed" }, false],
    ["client facts", { ...c, games: [] }, false],
    ["array", [], false],
    ["null", null, false],
  ];
  for (const key of Object.keys(c)) {
    const missing: Record<string, unknown> = { ...c };
    delete missing[key];
    cases.push([`missing ${key}`, missing, false]);
  }
  for (const key of [
    "commandId",
    "disputeId",
    "sourceEntryId",
    "destinationRegistrationId",
    "newEntryId",
  ]) {
    cases.push([`invalid ${key}`, { ...c, [key]: "not-a-uuid" }, false]);
    cases.push([
      `uppercase ${key}`,
      { ...c, [key]: (c[key as keyof typeof c] as string).toUpperCase() },
      true,
    ]);
  }
  return cases;
}
it("recusa textos que PostgreSQL JSONB não representa antes de enviar o comando", () => {
  for (const [name, value, valid] of commandCases())
    expect(saveTransferSchema.safeParse(value).success, name).toBe(valid);
});
it("confere o contrato fechado de comando TS×SQL sem confundir ACK com autorização", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    for (const [name, input, valid] of commandCases()) {
      const parsed = saveTransferSchema.safeParse(input);
      if (name === "NUL" || name === "lone surrogate") {
        await expect(
          db.query("select private.valid_roster_transfer_command($1::jsonb)", [
            JSON.stringify(input),
          ]),
        ).rejects.toMatchObject({ code: name === "NUL" ? "22P05" : "22P02" });
        continue;
      }
      const actual = (
        await db.query<{ valid: boolean }>(
          "select private.valid_roster_transfer_command($1::jsonb) as valid",
          [JSON.stringify(parsed.success ? parsed.data : input)],
        )
      ).rows[0].valid;
      expect(actual, name).toBe(valid);
      expect(actual, name).toBe(parsed.success);
    }
  } finally {
    await db.close();
  }
}, 20000);
