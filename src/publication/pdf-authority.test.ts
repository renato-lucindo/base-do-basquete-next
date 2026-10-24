import { it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { extractSupportedPdf } from "../boxscore/extract";
import {
  parsedBoxscoreSchema,
  type PdfReviewSnapshot,
} from "../boxscore/source-contract";
import type { PdfSupplement } from "./pdf-selection";
import { preparePdfFacts, type PdfAuthority } from "./pdf-authority";
import { pubId } from "../../tests/fixtures/publication";
import { emptyPersistedSheet } from "../games/sheet-contract";
let site: PdfReviewSnapshot, fiba: PdfReviewSnapshot, supplement: PdfSupplement;
const choice = (): PdfAuthority => ({
  scorePoints: "pdf",
  periodScores: "none",
  playerAdvanced: "pdf",
  foulsReceived: "none",
  teamAdvanced: "none",
  gameAdvanced: "none",
});
beforeAll(async () => {
  for (const filename of [
    "Boxscore-site.pdf",
    "Box Score FIBA ALC vs AVA 09 maio.pdf",
  ]) {
    const bytes = new Uint8Array(
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
    const review: PdfReviewSnapshot = {
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
    if (p.parsed.format === "BASKETBALL_SITE") site = review;
    else fiba = review;
  }
  supplement = {
    rows: site.document.mappings.map((m) => ({
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
it("publishes only actual Site domains, with covered advanced points and no false quarters or plus-minus", () => {
  const f = preparePdfFacts(site, supplement, choice());
  expect(f.teams.home.points).toBe(site.source.parsed.teams[0].score);
  expect(f.teams.home.periods).toBeNull();
  expect(f.teams.home.advanced).toBeNull();
  expect(f.gameAdvanced).toBeNull();
  expect(f.players[0].advanced?.points).toBe(
    site.source.parsed.teams[0].players[0].points,
  );
  expect(f.players[0].advanced?.plusMinus).toBeNull();
  expect(f.players[0].foulsReceived).toBeNull();
  expect(f.origins.playerAdvanced).toEqual({
    kind: "pdf",
    sourceId: pubId(1),
    sourceVersion: 2,
    reviewVersion: 1,
  });
  for (const field of [
    "periodScores",
    "teamAdvanced",
    "gameAdvanced",
    "foulsReceived",
  ] as const) {
    const c = choice();
    c[field] = "pdf";
    expect(() => preparePdfFacts(site, supplement, c)).toThrow();
  }
});
it("supports FIBA real periods, collective and game blocks without treating report duration as court minutes", () => {
  const s: PdfSupplement = {
    ...supplement,
    rows: fiba.document.mappings.map((m) => ({
      sourceSide: m.sourceSide,
      sourceIndex: m.sourceIndex,
      played:
        !fiba.source.parsed.teams[m.sourceSide].players[m.sourceIndex]
          .didNotPlay,
      starter:
        fiba.source.parsed.teams[m.sourceSide].players[m.sourceIndex].starter,
      captain: m.sourceIndex === 0,
    })),
  };
  const c = choice();
  c.periodScores = "pdf";
  c.teamAdvanced = "pdf";
  c.gameAdvanced = "pdf";
  const f = preparePdfFacts(fiba, s, c);
  expect(f.teams.home.periods).toEqual(
    fiba.source.parsed.teams[0].periodScores,
  );
  expect(f.teams.home.advanced).toEqual(
    fiba.source.parsed.teams[0].teamStatistics,
  );
  expect(f.gameAdvanced).toEqual(fiba.source.parsed.gameStatistics);
  expect(f).not.toHaveProperty("durationSeconds");
});
it("requires explicit manual fallback and divergence while keeping PDF advanced points separate", () => {
  const d = emptyPersistedSheet();
  d.participants = site.document.mappings.map((m) => ({
    rosterEntryId: m.rosterEntryId!,
    side: m.sourceSide === 0 ? "home" : "away",
    jersey: m.jersey,
    played: true,
    starter: m.sourceIndex < 5,
  }));
  d.staff.home.captainRosterEntryId = pubId(100);
  d.staff.away.captainRosterEntryId = pubId(120);
  d.events = [
    {
      id: pubId(500),
      side: "home",
      period: 4,
      target: d.participants[0].jersey,
      code: "2",
    },
  ];
  const c = choice();
  c.scorePoints = "sheet";
  expect(() =>
    preparePdfFacts(site, supplement, c, { document: d, version: 1 }, "", true),
  ).toThrow();
  expect(() =>
    preparePdfFacts(
      site,
      supplement,
      c,
      { document: d, version: 1 },
      "Conferência da fonte manual",
      false,
    ),
  ).toThrow();
  const f = preparePdfFacts(
    site,
    supplement,
    c,
    { document: d, version: 1 },
    "Conferência da fonte manual",
    true,
  );
  expect(f.teams.home.points).toBe(2);
  expect(f.players[0].advanced?.points).toBe(
    site.source.parsed.teams[0].players[0].points,
  );
  expect(f.origins.scorePoints).toEqual({ kind: "sheet", version: 1 });
  const altered = structuredClone(d);
  altered.participants[0].rosterEntryId = pubId(999);
  altered.staff.home.captainRosterEntryId = pubId(999);
  expect(() =>
    preparePdfFacts(
      site,
      supplement,
      c,
      { document: altered, version: 1 },
      "Revisão identidade errada",
      true,
    ),
  ).toThrow();
});
it("requires needed source/version, honors none domains and rejects mismatched manual periods", () => {
  const c = choice();
  c.periodScores = "sheet";
  expect(() => preparePdfFacts(site, supplement, c)).toThrow();
  c.periodScores = "none";
  c.playerAdvanced = "none";
  const f = preparePdfFacts(site, supplement, c);
  expect(f.players.every((p) => p.advanced === null)).toBe(true);
  expect(() =>
    preparePdfFacts(site, supplement, {
      ...c,
      teamAdvanced: "unsupported",
    } as unknown as PdfAuthority),
  ).toThrow();
});

it("rejects unrelated zero-stat rows when mixing instead of supplying fabricated basic values", () => {
  const d = emptyPersistedSheet();
  d.participants = site.document.mappings.map((m) => ({
    rosterEntryId: m.rosterEntryId!,
    side: m.sourceSide === 0 ? "home" : "away",
    jersey: m.jersey,
    played: true,
    starter: m.sourceIndex < 5,
  }));
  d.staff.home.captainRosterEntryId = pubId(100);
  d.staff.away.captainRosterEntryId = pubId(120);
  d.events = [
    {
      id: pubId(500),
      side: "home",
      period: 4,
      target: d.participants[0].jersey,
      code: "2",
    },
  ];
  const zero = site.source.parsed.teams[0].players.findIndex(
    (p, i) => i >= 5 && p.secondsPlayed === 0,
  );
  expect(zero).toBeGreaterThanOrEqual(0);
  const s = structuredClone(supplement);
  s.rows[zero].played = false;
  d.participants[zero].played = false;
  d.participants.splice(zero, 1);
  const c = choice();
  c.scorePoints = "sheet";
  expect(() =>
    preparePdfFacts(
      site,
      s,
      c,
      { document: d, version: 1 },
      "Revisão com atleta ausente",
      true,
    ),
  ).toThrow(/relacionados/u);
});
