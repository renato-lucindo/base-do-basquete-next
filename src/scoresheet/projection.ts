import {
  aggregate,
  periodColor,
  type Sheet,
  type Entry,
  type ActionProgress,
} from "../domain/scoresheet";
export type AnnotatedAction = {
  event: Entry;
  sequence: number;
  kind: "points" | "fouls" | "timeouts";
  annotation: string;
};
export function projectSheet(sheet: Sheet) {
  const progress = new Map<string, ActionProgress>(),
    totals = aggregate(sheet, (p) => progress.set(p.event.id, p));
  const actions: AnnotatedAction[] = sheet.events.map((event, i) => {
    const p = progress.get(event.id),
      kind =
        event.target === "TO"
          ? "timeouts"
          : /^[123]$/u.test(event.code)
            ? "points"
            : "fouls";
    const code =
      kind === "timeouts"
        ? `TO · minuto ${event.code} decorrido`
        : kind === "points"
          ? event.code + "p"
          : event.code.replace(/C$/u, "c");
    const status = p?.playerStatus ?? p?.coachStatus;
    const count =
      kind === "timeouts"
        ? null
        : kind === "points"
          ? p?.teamPoints
          : status === "GD" || status === "D"
            ? status
            : p?.playerFouls;
    return {
      event,
      sequence: i + 1,
      kind,
      annotation: `${code}${count !== null && count !== undefined ? " (" + count + ")" : ""}${status === "excluded" ? " · excluído por 5 faltas" : ""}`,
    };
  });
  const players = totals.players.map((p) => {
    const own = sheet.events
        .filter((e) => e.side === p.side && e.target === p.jersey)
        .sort((a, b) => a.period - b.period),
      pointsByQuarter = [0, 0, 0, 0];
    for (const e of own)
      if (/^[123]$/u.test(e.code))
        pointsByQuarter[Math.min(3, e.period - 1)] += Number(e.code);
    return {
      ...p,
      pointsByQuarter,
      fouls: own
        .filter((e) => e.target !== "TO" && !/^[123]$/u.test(e.code))
        .map((e) => ({
          id: e.id,
          code: e.code.replace(/C$/u, "c"),
          period: e.period,
          firstHalf: e.period <= 2,
          color: periodColor(e.period),
        })),
    };
  });
  return { totals, players, actions };
}
export type HistoryQuery = {
  mode: "recent" | "history";
  periods: number[];
  sides: Entry["side"][];
  kinds: AnnotatedAction["kind"][];
  order: "entry" | "period";
  page: number;
};
export function selectActionHistory(
  actions: AnnotatedAction[],
  q: HistoryQuery,
) {
  const matches =
    q.mode === "recent"
      ? actions.slice(-10)
      : actions.filter(
          (a) =>
            q.periods.includes(a.event.period) &&
            q.sides.includes(a.event.side) &&
            q.kinds.includes(a.kind),
        );
  const ordered = [...matches].sort(
    (a, b) =>
      (q.order === "period" ? a.event.period - b.event.period : 0) ||
      a.sequence - b.sequence,
  );
  const page =
    q.mode === "recent"
      ? 0
      : Math.max(
          0,
          Math.min(q.page, Math.max(0, Math.ceil(ordered.length / 10) - 1)),
        );
  return {
    items: ordered.slice(page * 10, page * 10 + 10),
    total: ordered.length,
    page,
    hasMore: (page + 1) * 10 < ordered.length,
  };
}
