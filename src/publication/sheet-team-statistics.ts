import { aggregate, parseFoul } from "../domain/scoresheet";
import { toEngineSheet, type PersistedSheet } from "../games/sheet-contract";
import { sheetTeamReviewSchema, type SheetTeamReview } from "./contract";

/** Reviewed counts are whole-team totals, never added to athlete/staff totals. */
export function deriveSheetTeamStatistics(
  d: PersistedSheet,
  input?: SheetTeamReview,
) {
  const review = input ? sheetTeamReviewSchema.parse(input) : undefined;
  const totals = aggregate(toEngineSheet(d));
  return Object.fromEntries(
    (["home", "away"] as const).map((side) => {
      const players = totals.players.filter((p) => p.side === side);
      const disqualified = (status: string) =>
        status === "D" || status === "GD";
      const team = totals.teams[side];
      // Captain/acting coach is the same roster identity, not a second dismissal.
      const minimumDisqualifications =
        players.filter((p) => disqualified(p.status)).length +
        (d.formatVersion === 2
          ? Object.entries(team.staffPeople ?? {}).filter(
              ([id, p]) =>
                disqualified(p.status) &&
                !players.some((r) => r.actorId === id),
            ).length
          : d.staff[side].coachStaffEntryId && disqualified(team.coachStatus)
            ? 1
            : 0);
      const disqualifications = review?.[side].disqualifications ?? null;
      if (
        disqualifications !== null &&
        disqualifications < minimumDisqualifications
      )
        throw Error(
          "O total de desqualificações da equipe é menor que as ocorrências identificadas na súmula.",
        );
      // Count original infractions, across all acting coaches. B2 is only a penalty.
      const technicalFouls = d.events.filter((e) => {
        if (e.side !== side || e.target === "TO") return false;
        const foul = parseFoul(e.code, e.target);
        return (
          foul &&
          (foul.kind === "T" ||
            foul.kind === "C" ||
            (foul.kind === "B" && e.code !== "B2"))
        );
      }).length;
      return [
        side,
        {
          version: 1 as const,
          technicalFouls,
          disqualifications,
          foulsReceived: review?.[side].foulsReceived ?? null,
          minimumDisqualifications,
        },
      ];
    }),
  ) as Record<
    "home" | "away",
    {
      version: 1;
      technicalFouls: number;
      disqualifications: number | null;
      foulsReceived: number | null;
      minimumDisqualifications: number;
    }
  >;
}
