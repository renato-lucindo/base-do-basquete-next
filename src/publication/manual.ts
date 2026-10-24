import { aggregate } from "../domain/scoresheet";
import {
  toEngineSheet,
  validatePersistedSheet,
  type PersistedSheet,
} from "../games/sheet-contract";
import { publishSheetSchema, type PublishSheet } from "./contract";
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
            jersey: p.jersey,
          }))
          .sort((a, b) => a.rosterEntryId.localeCompare(b.rosterEntryId)),
      );
    if (identity(document) !== identity(previousConfirmed))
      throw Error(
        "Os relacionados e as camisas confirmados não podem ser alterados nesta revisão.",
      );
  }
  const total = aggregate(toEngineSheet(document));
  return {
    command,
    facts: {
      rulesVersion: document.rulesVersion,
      periods: document.periods,
      teams: total.teams,
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
    },
  };
}
