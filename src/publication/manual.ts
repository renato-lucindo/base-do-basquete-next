import { aggregate } from "../domain/scoresheet";
import {
  toEngineSheet,
  validatePersistedSheet,
  type PersistedSheet,
} from "../games/sheet-contract";
import { publishSheetSchema, type PublishSheet } from "./contract";
import { deriveSheetTeamStatistics } from "./sheet-team-statistics";
export function prepareManualPublication(
  input: PublishSheet,
  previousConfirmed?: PersistedSheet,
  requiresFallback = false,
) {
  const command = publishSheetSchema.parse(input),
    document = validatePersistedSheet(command.source.document, true);
  if (requiresFallback && (!command.fallback || command.reason.length < 10))
    throw Error(
      "Escolha explicitamente a fonte manual e informe o motivo do fallback (10 a 500 caracteres).",
    );
  if (previousConfirmed) {
    if (command.reason.length < 10)
      throw Error("Informe o motivo da revisão (10 a 500 caracteres).");
    const identity = (d: PersistedSheet) =>
      JSON.stringify(
        d.participants
          .map((p) => ({
            rosterEntryId: p.rosterEntryId,
            side: p.side,
          }))
          .sort((a, b) => a.rosterEntryId.localeCompare(b.rosterEntryId)),
      );
    if (identity(document) !== identity(previousConfirmed))
      throw Error(
        "Os relacionados confirmados não podem ser alterados nesta revisão; a camisa pode ser corrigida com motivo.",
      );
  }
  return {
    command,
    facts: deriveManualFacts(document, command.source.teamReview),
  };
}
export function deriveManualFacts(
  input: PersistedSheet,
  review?: PublishSheet["source"]["teamReview"],
) {
  const document = validatePersistedSheet(input, true);
  const total = aggregate(toEngineSheet(document));
  const collective = deriveSheetTeamStatistics(document, review);
  const team = (side: "home" | "away") => {
    const {
      activeCoachId: _active,
      staffPeople: _people,
      ...facts
    } = total.teams[side];
    const { minimumDisqualifications: _minimum, ...teamStatistics } =
      collective[side];
    void _active;
    void _people;
    void _minimum;
    return { ...facts, teamStatistics };
  };
  return {
    rulesVersion: document.rulesVersion,
    periods: document.periods,
    teams: { home: team("home"), away: team("away") },
    players: document.participants.map((p, index) => {
      const t = total.players[index];
      return {
        rosterEntryId: p.rosterEntryId,
        side: p.side,
        jersey: p.jersey,
        played: p.played,
        starter: p.starter,
        captain:
          document.staff[p.side].captainRosterEntryId === p.rosterEntryId,
        two: t.two,
        three: t.three,
        free: t.free,
        points: t.points,
        fouls: t.fouls,
        technical: t.technical,
        unsportsmanlike: t.unsportsmanlike,
        status: t.status,
      };
    }),
  };
}
