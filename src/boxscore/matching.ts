import { suggestPlayerMatch } from "./matching-reference";
import type { RosterSnapshot } from "../people/roster-contract";
type Candidate = Pick<
  RosterSnapshot,
  | "id"
  | "personId"
  | "registrationId"
  | "disputeId"
  | "active"
  | "jersey"
  | "person"
>;
/** Suggestions only. Original numeric slots never become database identity. */
export function suggestPdfPlayer(
  name: string,
  jersey: string,
  sourceTeam: string,
  roster: Candidate[],
  context: {
    disputeId: string;
    registrationId: string;
    registrationName: string;
    complete: boolean;
  },
) {
  const scoped = roster.filter(
    (r) =>
      r.active &&
      r.registrationId === context.registrationId &&
      r.disputeId === context.disputeId,
  );
  const candidates = [...new Map(scoped.map((r) => [r.id, r])).values()];
  const suggestion = suggestPlayerMatch(
    name,
    jersey,
    candidates.map((r, i) => ({
      playerId: i + 1,
      rosterEntryId: i + 1,
      registrationId: 1,
      playerName: r.person.name,
      jerseyNumber: r.jersey,
      teamName: context.registrationName,
    })),
    sourceTeam,
  );
  return {
    kind:
      suggestion.kind === "exact" && !context.complete
        ? ("similar" as const)
        : suggestion.kind,
    alternatives: suggestion.alternatives.flatMap((a) => {
      const r = candidates[a.playerId - 1];
      return r
        ? [
            {
              rosterEntryId: r.id,
              personId: r.personId,
              name: r.person.name,
              jersey: r.jersey,
              score: a.score,
            },
          ]
        : [];
    }),
  };
}
