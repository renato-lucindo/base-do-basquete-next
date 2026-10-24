import { readFile } from "node:fs/promises";
import { extractSupportedPdf } from "../../src/boxscore/extract";
import {
  parsedBoxscoreSchema,
  type PdfReviewSnapshot,
} from "../../src/boxscore/source-contract";
import type { PdfSupplement } from "../../src/publication/pdf-selection";
import type { PdfAuthority } from "../../src/publication/pdf-authority";
import { pubId } from "./publication";
export const pdfPublicationFixtures = [
  "Boxscore-site.pdf",
  "Box Score FIBA ALC vs AVA 09 maio.pdf",
  "Box Score FIBA SAL vs SAN 09 maio.pdf",
  "Box Score FIBA IVV vs CAC 06 maio.pdf",
];
export async function pdfPublicationFixture(
  filename = pdfPublicationFixtures[0],
) {
  const bytes = new Uint8Array(
    await readFile(
      "especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/docs/plan/referencias/modelos-boxscore/" +
        filename,
    ),
  );
  const p = await extractSupportedPdf(bytes, filename, "application/pdf"),
    isSite = p.parsed.format === "BASKETBALL_SITE";
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
  const supplement: PdfSupplement = {
    rows: mappings.map((m) => {
      const r = p.parsed.teams[m.sourceSide].players[m.sourceIndex];
      return {
        sourceSide: m.sourceSide,
        sourceIndex: m.sourceIndex,
        played: isSite || !r.didNotPlay,
        starter: isSite ? m.sourceIndex < 5 : r.starter,
        captain: m.sourceIndex === 0,
      };
    }),
    staff: {
      home: { coachStaffEntryId: null, assistantStaffEntryId: null },
      away: { coachStaffEntryId: null, assistantStaffEntryId: null },
    },
  };
  const authority: PdfAuthority = {
    scorePoints: "pdf",
    periodScores: isSite ? "none" : "pdf",
    playerAdvanced: "pdf",
    foulsReceived: isSite ? "none" : "pdf",
    teamAdvanced: isSite ? "none" : "pdf",
    gameAdvanced: isSite ? "none" : "pdf",
  };
  return { review, supplement, authority };
}
