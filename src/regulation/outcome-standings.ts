import { z } from "zod";
import {
  roundRobinRulesSchema,
  type RoundRobinRules,
  type TieCriterion,
} from "./contract";
import {
  outcomeGameSchema,
  outcomeLineage,
  outcomeScore,
  outcomeWinner,
  type OutcomeGame,
} from "./outcome";
const uuid = z.uuid().transform((v) => v.toLowerCase());
export const outcomeStandingsInputSchema = z
  .object({
    disputeId: uuid,
    registrationIds: z.array(uuid).max(1000),
    rules: roundRobinRulesSchema,
    outcomes: z.array(outcomeGameSchema).max(10000),
  })
  .strict()
  .superRefine((s, c) => {
    const ids = new Set(s.registrationIds);
    if (
      ids.size !== s.registrationIds.length ||
      new Set(s.outcomes.map((g) => g.gameId)).size !== s.outcomes.length ||
      s.outcomes.some(
        (g) =>
          g.disputeId !== s.disputeId ||
          !ids.has(g.homeRegistrationId) ||
          !ids.has(g.awayRegistrationId),
      )
    )
      c.addIssue({
        code: "custom",
        message:
          "Confira efeitos únicos de partidas atribuídas e inscrições desta disputa.",
      });
  });
type Totals = {
  registrationId: string;
  games: number;
  playedGames: number;
  awardedGames: number;
  scoreGamesCovered: number;
  wins: number;
  losses: number;
  leaguePoints: number;
  pointsFor: number | null;
  pointsAgainst: number | null;
  difference: number | null;
};
function totals(
  ids: string[],
  outcomes: OutcomeGame[],
  rules: RoundRobinRules,
) {
  const table = new Map(
    ids.map((registrationId) => [
      registrationId,
      {
        registrationId,
        games: 0,
        playedGames: 0,
        awardedGames: 0,
        scoreGamesCovered: 0,
        wins: 0,
        losses: 0,
        leaguePoints: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      },
    ]),
  );
  for (const g of outcomes)
    for (const side of ["home", "away"] as const) {
      const id = side === "home" ? g.homeRegistrationId : g.awayRegistrationId,
        t = table.get(id)!,
        won = outcomeWinner(g) === id,
        score = outcomeScore(g);
      t.games++;
      t.wins += Number(won);
      t.losses += Number(!won);
      if (g.outcome.kind === "played") t.playedGames++;
      else t.awardedGames++;
      t.leaguePoints +=
        g.outcome.kind === "awarded"
          ? side === "home"
            ? g.outcome.award.homeLeaguePoints
            : g.outcome.award.awayLeaguePoints
          : won
            ? rules.points.win
            : rules.points.loss;
      if (score) {
        t.scoreGamesCovered++;
        t.pointsFor += side === "home" ? score.homePoints : score.awayPoints;
        t.pointsAgainst +=
          side === "home" ? score.awayPoints : score.homePoints;
      }
      if (
        ![t.leaguePoints, t.pointsFor, t.pointsAgainst].every(
          Number.isSafeInteger,
        )
      )
        throw Error("Total fora da precisão inteira suportada.");
    }
  return new Map(
    [...table].map(([id, t]): [string, Totals] => {
      const known = t.games > 0 && t.scoreGamesCovered === t.games;
      return [
        id,
        {
          ...t,
          pointsFor: known ? t.pointsFor : null,
          pointsAgainst: known ? t.pointsAgainst : null,
          difference: known ? t.pointsFor - t.pointsAgainst : null,
        },
      ];
    }),
  );
}
function partition(rows: Totals[], value: (r: Totals) => number) {
  const buckets = new Map<number, Totals[]>();
  for (const row of rows) {
    const v = value(row);
    if (!buckets.has(v)) buckets.set(v, []);
    buckets.get(v)!.push(row);
  }
  return [...buckets].sort(([a], [b]) => b - a).map(([, rows]) => rows);
}
export function calculateOutcomeStandings(input: unknown) {
  const s = outcomeStandingsInputSchema.parse(input),
    ids = [...s.registrationIds].sort(),
    table = totals(ids, s.outcomes, s.rules),
    blocked = new Set<string>(),
    tieSteps: {
      criterion: TieCriterion;
      registrationIds: string[];
      gameCount: number;
      blocked: boolean;
      values: { registrationId: string; value: number | null }[];
    }[] = [];
  let groups = partition(
    ids.map((id) => table.get(id)!),
    (r) => r.leaguePoints,
  );
  if (s.outcomes.length)
    for (const criterion of s.rules.tieBreakers)
      groups = groups.flatMap((group) => {
        const registrations = group.map((r) => r.registrationId).sort(),
          key = registrations.join(",");
        if (group.length < 2 || blocked.has(key)) return [group];
        const pool = new Set(registrations),
          direct = criterion.startsWith("head_to_head_"),
          games = s.outcomes.filter((g) =>
            direct
              ? pool.has(g.homeRegistrationId) && pool.has(g.awayRegistrationId)
              : pool.has(g.homeRegistrationId) ||
                pool.has(g.awayRegistrationId),
          ),
          values = direct ? totals(registrations, games, s.rules) : table;
        const metric = (r: Totals): number | null => {
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
        const unknown = group.some((r) => metric(r) === null);
        tieSteps.push({
          criterion,
          registrationIds: registrations,
          gameCount: games.length,
          blocked: unknown,
          values: registrations.map((id) => ({
            registrationId: id,
            value: metric(table.get(id)!),
          })),
        });
        if (unknown) {
          blocked.add(key);
          return [group];
        }
        return partition(group, (r) => metric(r)!);
      });
  const rows: (Totals & { position: number | null; tied: boolean })[] = [],
    unresolvedTies: string[][] = [];
  for (const group of groups) {
    const position = s.outcomes.length ? rows.length + 1 : null,
      tied = group.length > 1;
    if (tied) unresolvedTies.push(group.map((r) => r.registrationId).sort());
    group.forEach((r) => rows.push({ ...r, position, tied }));
  }
  return {
    algorithmVersion: "outcome-standings-v1" as const,
    status: s.outcomes.length ? ("provisional" as const) : ("empty" as const),
    rows,
    unresolvedTies,
    tieSteps,
    lineage: [...s.outcomes]
      .sort((a, b) => a.gameId.localeCompare(b.gameId))
      .map(outcomeLineage),
  };
}
