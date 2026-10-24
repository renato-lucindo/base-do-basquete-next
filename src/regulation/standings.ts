import { publicResultSchema } from "../publication/pdf-contract";
import {
  competitiveFactSchema,
  standingsInputSchema,
  type CompetitiveFact,
  type RoundRobinRules,
  type TieCriterion,
} from "./contract";
type Totals = {
  registrationId: string;
  games: number;
  wins: number;
  losses: number;
  leaguePoints: number;
  pointsFor: number;
  pointsAgainst: number;
  difference: number;
};
type Row = Totals & { position: number | null; tied: boolean };
type Step = {
  criterion: TieCriterion;
  registrationIds: string[];
  gameCount: number;
  values: { registrationId: string; value: number }[];
};
export function competitiveFactFromPublication(
  input: unknown,
): CompetitiveFact {
  const p = publicResultSchema.parse(input);
  return competitiveFactSchema.parse({
    gameId: p.id,
    publicationVersion: p.version,
    disputeId: p.disputeId,
    homeRegistrationId: p.game.home.registrationId,
    awayRegistrationId: p.game.away.registrationId,
    homePoints: p.facts.teams.home.points,
    awayPoints: p.facts.teams.away.points,
    status: "played",
    pointsSource:
      "origins" in p.facts
        ? p.facts.origins.scorePoints
        : { kind: p.source.kind, version: p.source.version },
  });
}
const empty = (id: string): Totals => ({
  registrationId: id,
  games: 0,
  wins: 0,
  losses: 0,
  leaguePoints: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  difference: 0,
});
function safeAdd(a: number, b: number) {
  const value = a + b;
  if (!Number.isSafeInteger(value))
    throw Error("O total excede a precisão inteira suportada.");
  return value;
}
function totals(
  ids: string[],
  games: CompetitiveFact[],
  rules: RoundRobinRules,
) {
  const table = new Map(ids.map((id) => [id, empty(id)]));
  for (const g of games)
    for (const side of ["home", "away"] as const) {
      const t = table.get(
        side === "home" ? g.homeRegistrationId : g.awayRegistrationId,
      )!;
      const pf = side === "home" ? g.homePoints : g.awayPoints,
        pa = side === "home" ? g.awayPoints : g.homePoints,
        won = pf > pa;
      t.games++;
      t.wins += Number(won);
      t.losses += Number(!won);
      t.pointsFor = safeAdd(t.pointsFor, pf);
      t.pointsAgainst = safeAdd(t.pointsAgainst, pa);
      t.leaguePoints = safeAdd(
        t.leaguePoints,
        won ? rules.points.win : rules.points.loss,
      );
      t.difference = t.pointsFor - t.pointsAgainst;
    }
  return table;
}
function partition(rows: Totals[], value: (r: Totals) => number) {
  const groups = new Map<number, Totals[]>();
  for (const r of rows) {
    const v = value(r),
      group = groups.get(v);
    if (group) group.push(r);
    else groups.set(v, [r]);
  }
  return [...groups].sort(([a], [b]) => b - a).map(([, rows]) => rows);
}
export function calculateStandings(input: unknown) {
  const s = standingsInputSchema.parse(input),
    ids = [...s.registrationIds].sort(),
    table = totals(ids, s.games, s.rules),
    tieSteps: Step[] = [];
  let groups = partition(
    ids.map((id) => table.get(id)!),
    (r) => r.leaguePoints,
  );
  if (s.games.length)
    for (const criterion of s.rules.tieBreakers) {
      groups = groups.flatMap((group) => {
        if (group.length === 1) return [group];
        const registrations = group.map((r) => r.registrationId).sort(),
          pool = new Set(registrations),
          direct = criterion.startsWith("head_to_head_");
        const games = s.games.filter((g) =>
          direct
            ? pool.has(g.homeRegistrationId) && pool.has(g.awayRegistrationId)
            : pool.has(g.homeRegistrationId) || pool.has(g.awayRegistrationId),
        );
        const values = direct ? totals(registrations, games, s.rules) : table;
        const metric = (r: Totals) => {
          const t = values.get(r.registrationId)!;
          switch (criterion) {
            case "wins":
              return t.wins;
            case "point_difference":
            case "head_to_head_difference":
              return t.difference;
            case "points_for":
            case "head_to_head_for":
              return t.pointsFor;
            case "head_to_head_points":
              return t.leaguePoints;
          }
        };
        tieSteps.push({
          criterion,
          registrationIds: registrations,
          gameCount: games.length,
          values: registrations.map((id) => ({
            registrationId: id,
            value: metric(table.get(id)!),
          })),
        });
        return partition(group, metric);
      });
    }
  const rows: Row[] = [],
    unresolvedTies: string[][] = [];
  for (const group of groups) {
    const position = s.games.length ? rows.length + 1 : null,
      tied = group.length > 1;
    if (tied) unresolvedTies.push(group.map((r) => r.registrationId).sort());
    for (const row of group) rows.push({ ...row, position, tied });
  }
  return {
    algorithmVersion: "round-robin-v1" as const,
    status: s.games.length ? ("provisional" as const) : ("empty" as const),
    rows,
    unresolvedTies,
    tieSteps,
    lineage: [...s.games]
      .sort((a, b) => a.gameId.localeCompare(b.gameId))
      .map((g) => ({
        gameId: g.gameId,
        publicationVersion: g.publicationVersion,
        pointsSource: g.pointsSource,
      })),
  };
}
