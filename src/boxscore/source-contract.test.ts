import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { extractSupportedPdf } from "./extract";
import {
  parsedBoxscoreSchema,
  sourceMarkers,
  savePdfReviewSchema,
} from "./source-contract";
const root =
  "especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/docs/plan/referencias/modelos-boxscore/";
it("validates original structured facts while preserving missing Site markers and real periods", async () => {
  for (const filename of [
    "Boxscore-site.pdf",
    "Box Score FIBA ALC vs AVA 09 maio.pdf",
  ]) {
    const r = await extractSupportedPdf(
        new Uint8Array(await readFile(root + filename)),
        filename,
        "application/pdf",
      ),
      p = parsedBoxscoreSchema.parse(r.parsed);
    const zero = p.teams
      .flatMap((t) => t.players)
      .find((p) => p.secondsPlayed === 0)!;
    const markers = sourceMarkers(p, zero);
    if (p.format === "BASKETBALL_SITE") {
      expect(markers).toEqual({
        starter: null,
        captain: null,
        participation: "unknown",
      });
      expect(p.teams.every((t) => t.periodScores === null)).toBe(true);
    }
    const broken = structuredClone(p);
    broken.teams[0].score++;
    expect(parsedBoxscoreSchema.safeParse(broken).success).toBe(false);
    const invalid = structuredClone(p);
    invalid.teams[0].players[0].twoPoints.made = -1;
    expect(parsedBoxscoreSchema.safeParse(invalid).success).toBe(false);
  }
});
it("requires stable source row keys, scoped target and independent review version", () => {
  const id = "f6000000-0000-4000-8000-000000000001",
    row = {
      sourceSide: 0 as const,
      sourceIndex: 0,
      rosterEntryId: null,
      jersey: "00",
    };
  const c = {
    commandId: id,
    sourceId: id,
    expectedVersion: 0,
    document: {
      disputeId: id,
      gameId: null,
      invertSides: false,
      mappings: [row],
      notes: "",
    },
  };
  expect(savePdfReviewSchema.safeParse(c).success).toBe(true);
  expect(
    savePdfReviewSchema.safeParse({
      ...c,
      document: { ...c.document, mappings: [row, row] },
    }).success,
  ).toBe(false);
  expect(
    savePdfReviewSchema.safeParse({
      ...c,
      document: { ...c.document, mappings: [{ ...row, rosterEntryId: id }] },
    }).success,
  ).toBe(false);
  expect(savePdfReviewSchema.safeParse({ ...c, actorId: id }).success).toBe(
    false,
  );
});
