import type { TeamAppearance } from "./aggregate";
function bench({ snapshot: g, side }: TeamAppearance): number | null {
  const players = g.facts.players.filter((p) => p.side === side),
    team = g.facts.teams[side];
  // Points and starters must cover the same entire game. Unknown flags never mean reserve.
  if (
    players.filter((p) => p.starter === true).length !== 5 ||
    players.some(
      (p) => typeof p.starter !== "boolean" || !Number.isFinite(p.points),
    ) ||
    players.reduce((n, p) => n + p.points, 0) !== team.points
  )
    return null;
  if (
    "origins" in g.facts &&
    "advanced" in team &&
    team.advanced &&
    g.facts.origins.teamAdvanced &&
    g.facts.origins.scorePoints.kind === "pdf"
  )
    return team.advanced.benchPoints;
  return players
    .filter((p) => p.starter === false)
    .reduce((n, p) => n + p.points, 0);
}

export function aggregateBenchPoints(
  appearances: TeamAppearance[],
  mode: "total" | "per-game",
) {
  const values = appearances.map(bench),
    covered = values.filter((v): v is number => v !== null),
    known = covered.length === appearances.length && appearances.length > 0,
    total = covered.reduce((n, v) => n + v, 0),
    points = appearances.reduce(
      (n, a) => n + a.snapshot.facts.teams[a.side].points,
      0,
    );
  const cell = (v: number | null) =>
    v === null
      ? { status: "unavailable" as const, value: null }
      : { status: "available" as const, value: v };
  return {
    benchPoints: cell(
      known ? total / (mode === "per-game" ? appearances.length : 1) : null,
    ),
    benchPointsShare: cell(known && points > 0 ? (100 * total) / points : null),
    covered: covered.length,
  };
}
