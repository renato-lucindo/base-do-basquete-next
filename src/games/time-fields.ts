import type { SaveGame } from "./contract";

type Game = SaveGame["game"];
type TimeField = "date" | "start" | "end";

// The editor has one date and two clock inputs. Keep the existing API's
// scheduled time for games without a real end, and persist actual times
// once the end is entered (or when editing an existing actual start).
export function gameTimeFields(game: Game) {
  return {
    date: game.startAt?.slice(0, 10) ?? game.date ?? "",
    start: game.startAt?.slice(11, 16) ?? game.time ?? "",
    end: game.endAt?.slice(11, 16) ?? "",
  };
}

function nextDay(date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

export function changeGameTime(
  game: Game,
  field: TimeField,
  value: string,
): Game {
  const fields = { ...gameTimeFields(game), [field]: value };
  const { date, start, end } = fields;
  const hasActualStart = !!game.startAt || !!game.endAt;
  const canRecordActual = !!date && !!start && (!!end || hasActualStart);
  return {
    ...game,
    date: date || null,
    time: date && start ? start : null,
    startAt: canRecordActual ? `${date}T${start}` : null,
    endAt:
      canRecordActual && end
        ? `${end <= start ? nextDay(date) : date}T${end}`
        : null,
  };
}
