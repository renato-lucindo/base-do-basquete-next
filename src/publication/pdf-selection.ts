import { z } from "zod";
import {
  pdfReviewSnapshotSchema,
  sourceMarkers,
  type PdfReviewSnapshot,
} from "../boxscore/source-contract";
import {
  emptyPersistedSheet,
  persistedSheetSchema,
} from "../games/sheet-contract";
const row = z
  .object({
    sourceSide: z.union([z.literal(0), z.literal(1)]),
    sourceIndex: z.number().int().min(0).max(11),
    played: z.boolean(),
    starter: z.boolean(),
    captain: z.boolean(),
  })
  .strict();
const staff = z
  .object({
    coachStaffEntryId: z.uuid().nullable(),
    assistantStaffEntryId: z.uuid().nullable(),
  })
  .strict();
export const pdfSupplementSchema = z
  .object({
    rows: z.array(row).min(10).max(24),
    staff: z.object({ home: staff, away: staff }).strict(),
  })
  .strict();
export type PdfSupplement = z.infer<typeof pdfSupplementSchema>;
/** Pure preparation only. Persistence must revalidate memberships, staff and source versions under locks. */
export function resolvePdfSelection(
  input: PdfReviewSnapshot,
  supplement: PdfSupplement,
) {
  const r = pdfReviewSnapshotSchema.parse(input),
    s = pdfSupplementSchema.parse(supplement);
  const fail = () => {
    throw Error(
      "Confira associações, participação, cinco titulares e capitão de cada equipe.",
    );
  };
  if (!r.source.ready || r.version < 1 || !r.document.gameId) fail();
  const key = (p: { sourceSide: number; sourceIndex: number }) =>
    `${p.sourceSide}:${p.sourceIndex}`;
  const choices = new Map(s.rows.map((p) => [key(p), p]));
  const mappings = new Map(r.document.mappings.map((p) => [key(p), p]));
  const sourceRows = r.source.parsed.teams.flatMap((t, sourceSide) =>
    t.players.map((p, sourceIndex) => ({ p, sourceSide, sourceIndex })),
  );
  if (
    choices.size !== sourceRows.length ||
    s.rows.length !== choices.size ||
    mappings.size !== sourceRows.length
  )
    fail();
  const participants = sourceRows.map(({ p, sourceSide, sourceIndex }) => {
    const k = `${sourceSide}:${sourceIndex}`,
      c = choices.get(k),
      m = mappings.get(k);
    if (!c || !m?.rosterEntryId) return fail();
    const markers = sourceMarkers(r.source.parsed, p);
    const hasFacts =
      p.secondsPlayed > 0 ||
      p.fieldGoals.attempted > 0 ||
      p.freeThrows.attempted > 0 ||
      p.rebounds > 0 ||
      p.assists > 0 ||
      p.turnovers > 0 ||
      p.steals > 0 ||
      p.blocks > 0 ||
      p.foulsCommitted > 0 ||
      (p.foulsReceived ?? 0) > 0;
    if (
      (c.starter && !c.played) ||
      (!c.played && (hasFacts || markers.participation === "played"))
    )
      fail();
    const side = (
      sourceSide === (r.document.invertSides ? 1 : 0) ? "home" : "away"
    ) as "home" | "away";
    return {
      rosterEntryId: m.rosterEntryId,
      side,
      jersey: m.jersey,
      played: c.played,
      starter: c.starter,
      captain: c.captain,
      sourceSide: sourceSide as 0 | 1,
      sourceIndex,
      sourceMarkers: markers,
    };
  });
  const selectedStaff = Object.fromEntries(
    (["home", "away"] as const).map((side) => {
      const rows = participants.filter((p) => p.side === side),
        captains = rows.filter((p) => p.captain);
      if (rows.filter((p) => p.starter).length !== 5 || captains.length !== 1)
        fail();
      return [
        side,
        { ...s.staff[side], captainRosterEntryId: captains[0].rosterEntryId },
      ];
    }),
  ) as {
    home: {
      coachStaffEntryId: string | null;
      assistantStaffEntryId: string | null;
      captainRosterEntryId: string;
    };
    away: {
      coachStaffEntryId: string | null;
      assistantStaffEntryId: string | null;
      captainRosterEntryId: string;
    };
  };
  const d = emptyPersistedSheet();
  d.participants = participants.map(
    ({ rosterEntryId, side, jersey, played, starter }) => ({
      rosterEntryId,
      side,
      jersey,
      played,
      starter,
    }),
  );
  d.staff = selectedStaff;
  persistedSheetSchema.parse(d);
  return { participants, staff: selectedStaff };
}
