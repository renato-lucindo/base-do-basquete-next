import { durationMinutes, type SaveGame } from "./contract";

type Game = SaveGame["game"];
export type ActualTimeFields = {
  date: string;
  start: string;
  end: string;
  endNextDay: boolean;
};

export function actualTimeFields(game: Game): ActualTimeFields {
  return {
    date: game.startAt?.slice(0, 10) ?? game.date ?? "",
    start: game.startAt?.slice(11, 16) ?? "",
    end: game.endAt?.slice(11, 16) ?? "",
    endNextDay: !!(
      game.startAt &&
      game.endAt &&
      game.startAt.slice(0, 10) !== game.endAt.slice(0, 10)
    ),
  };
}

export function changeActualTimeField<K extends keyof ActualTimeFields>(
  fields: ActualTimeFields,
  key: K,
  value: ActualTimeFields[K],
): ActualTimeFields {
  const next = { ...fields, [key]: value };
  if (
    (key === "start" || key === "end") &&
    next.start &&
    next.end &&
    next.start !== next.end
  )
    next.endNextDay = next.end < next.start;
  return next;
}

export function applyActualTimeFields(
  game: Game,
  fields: ActualTimeFields,
): Game {
  return { ...game, ...actualClocks(fields) };
}

function actualClocks(fields: ActualTimeFields) {
  const { date, start, end, endNextDay } = fields;
  let endDate = date;
  if (date && end && endNextDay) {
    const day = new Date(`${date}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + 1);
    endDate = day.toISOString().slice(0, 10);
  }
  return {
    startAt: date && start ? `${date}T${start}` : null,
    endAt: date && end ? `${endDate}T${end}` : null,
  };
}

export function actualTimeError(fields: ActualTimeFields): string {
  if ((fields.start || fields.end) && !fields.date)
    return "Informe a data dos horários reais.";
  if (fields.end && !fields.start)
    return "Informe a hora de início antes da hora de fim.";
  if (fields.start && fields.end) {
    const times = actualClocks(fields);
    if (durationMinutes(times.startAt, times.endAt) === null)
      return "O fim deve ser posterior ao início e a duração não pode exceder 24 horas. Confira a opção de término no dia seguinte.";
  }
  return "";
}
