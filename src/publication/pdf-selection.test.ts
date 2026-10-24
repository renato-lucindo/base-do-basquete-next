import { beforeAll, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { extractSupportedPdf } from "../boxscore/extract";
import {
  parsedBoxscoreSchema,
  type PdfReviewSnapshot,
} from "../boxscore/source-contract";
import { resolvePdfSelection, type PdfSupplement } from "./pdf-selection";
import { pubId } from "../../tests/fixtures/publication";
let review: PdfReviewSnapshot, supplement: PdfSupplement;
beforeAll(async () => {
  const filename = "Boxscore-site.pdf",
    bytes = new Uint8Array(
      await readFile(
        "especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/docs/plan/referencias/modelos-boxscore/" +
          filename,
      ),
    );
  const p = await extractSupportedPdf(bytes, filename, "application/pdf");
  const mappings = p.parsed.teams.flatMap((t, sourceSide) =>
    t.players.map((r, sourceIndex) => ({
      sourceSide: sourceSide as 0 | 1,
      sourceIndex,
      rosterEntryId: pubId(100 + sourceSide * 20 + sourceIndex),
      jersey: r.jerseyNumber,
    })),
  );
  review = {
    source: {
      id: pubId(1),
      disputeId: pubId(2),
      filename,
      sha256: p.sha256,
      byteSize: bytes.length,
      pageCount: p.pageCount,
      parsed: parsedBoxscoreSchema.parse(p.parsed),
      version: 2,
      ready: true,
      savedAt: "2026-10-24T08:00:00Z",
    },
    version: 1,
    savedAt: "2026-10-24T08:01:00Z",
    document: {
      disputeId: pubId(2),
      gameId: pubId(3),
      invertSides: false,
      mappings,
      notes: "",
    },
  };
  supplement = {
    rows: mappings.map((m) => ({
      sourceSide: m.sourceSide,
      sourceIndex: m.sourceIndex,
      played: true,
      starter: m.sourceIndex < 5,
      captain: m.sourceIndex === 0,
    })),
    staff: {
      home: { coachStaffEntryId: null, assistantStaffEntryId: null },
      away: { coachStaffEntryId: null, assistantStaffEntryId: null },
    },
  };
});
it("requires explicit Site markers and attributes them to supplementation without inventing quarters", () => {
  const r = resolvePdfSelection(review, supplement);
  expect(r.participants).toHaveLength(review.document.mappings.length);
  expect(r.participants[0]).toMatchObject({
    rosterEntryId: pubId(100),
    side: "home",
    played: true,
    starter: true,
    captain: true,
    sourceMarkers: { starter: null, captain: null },
  });
  expect(r.staff.home).toEqual({
    captainRosterEntryId: pubId(100),
    coachStaffEntryId: null,
    assistantStaffEntryId: null,
  });
  expect(review.source.parsed.teams[0].periodScores).toBeNull();
  const zero = review.source.parsed.teams[0].players.findIndex(
    (p) => p.secondsPlayed === 0,
  );
  expect(zero).toBeGreaterThanOrEqual(0);
  expect(r.participants[zero].played).toBe(true);
});
it("blocks incomplete, duplicate or unresolved rows and unsaved reviews", () => {
  const s = structuredClone(supplement);
  s.rows.pop();
  expect(() => resolvePdfSelection(review, s)).toThrow();
  const d = structuredClone(supplement);
  d.rows[1] = { ...d.rows[0] };
  expect(() => resolvePdfSelection(review, d)).toThrow();
  const r = structuredClone(review);
  r.document.mappings[0].rosterEntryId = null;
  expect(() => resolvePdfSelection(r, supplement)).toThrow();
  expect(() =>
    resolvePdfSelection({ ...review, version: 0, savedAt: null }, supplement),
  ).toThrow();
  const missing = structuredClone(supplement);
  delete (missing.rows[0] as Partial<PdfSupplement["rows"][number]>).played;
  expect(() => resolvePdfSelection(review, missing)).toThrow();
});
it("enforces exactly five starters, captain, participation and assistant only with a proper coach", () => {
  const a = structuredClone(supplement);
  a.rows[0].starter = false;
  expect(() => resolvePdfSelection(review, a)).toThrow();
  const b = structuredClone(supplement);
  b.rows[0].captain = false;
  expect(() => resolvePdfSelection(review, b)).toThrow();
  const c = structuredClone(supplement);
  c.rows[0].played = false;
  expect(() => resolvePdfSelection(review, c)).toThrow();
  const d = structuredClone(supplement);
  d.staff.home.assistantStaffEntryId = pubId(7);
  expect(() => resolvePdfSelection(review, d)).toThrow();
  d.staff.home.coachStaffEntryId = pubId(8);
  expect(resolvePdfSelection(review, d).staff.home.assistantStaffEntryId).toBe(
    pubId(7),
  );
});
it("prevents DNP selection for rows containing real participation evidence and respects explicit side inversion", () => {
  const s = structuredClone(supplement);
  const n = review.source.parsed.teams[0].players.findIndex(
    (p, i) => i >= 5 && p.secondsPlayed > 0,
  );
  expect(n).toBeGreaterThanOrEqual(0);
  s.rows[n].played = false;
  expect(() => resolvePdfSelection(review, s)).toThrow();
  const r = resolvePdfSelection(
    { ...review, document: { ...review.document, invertSides: true } },
    supplement,
  );
  expect(r.participants[0].side).toBe("away");
  expect(r.staff.away.captainRosterEntryId).toBe(pubId(100));
});
