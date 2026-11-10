import { z } from "zod";
const count = z.number().int().min(0).max(2147483647);
export const gameDetailSchema = z
  .object({
    periods: z
      .array(
        z
          .object({
            players: z
              .array(
                z
                  .object({
                    side: z.enum(["home", "away"]),
                    jersey: z.string().regex(/^(00|0|[1-9][0-9]?)$/u),
                    played: z.boolean().nullable(),
                    points: count,
                    two: count,
                    three: count,
                    free: count,
                    fouls: count,
                    technical: count,
                    unsportsmanlike: count,
                    status: z.enum(["eligible", "excluded", "GD", "D"]),
                  })
                  .strict(),
              )
              .min(10)
              .max(24),
            teams: z
              .object({
                home: z
                  .object({
                    points: count,
                    freeMade: count,
                    freeTaken: count,
                    fouls: count,
                  })
                  .strict(),
                away: z
                  .object({
                    points: count,
                    freeMade: count,
                    freeTaken: count,
                    fouls: count,
                  })
                  .strict(),
              })
              .strict(),
          })
          .strict(),
      )
      .min(4)
      .max(12),
    fouls: z
      .array(
        z
          .object({
            side: z.enum(["home", "away"]),
            jersey: z.string().regex(/^(00|0|[1-9][0-9]?)$/u),
            period: z.number().int().min(1).max(12),
            code: z.string().regex(/^[PTUD][123C]?$/u),
          })
          .strict(),
      )
      .max(2000),
  })
  .strict();
export type GameDetail = z.infer<typeof gameDetailSchema>;

/** Reject a detail response that does not belong to the same published facts. */
export function gameDetailMatches(g: {
  source: { kind: string };
  details?: GameDetail | null;
  facts: {
    teams: {
      home: { points: number; periods: number[] | null };
      away: { points: number; periods: number[] | null };
    };
    players: {
      side: "home" | "away";
      jersey: string;
      played: boolean;
      starter: boolean;
      points: number;
      two: number;
      three: number;
      free: number;
      fouls?: number;
      status?: string;
    }[];
  };
}): boolean {
  const d = g.details;
  if (!d) return true;
  if (
    g.source.kind !== "sheet" ||
    d.periods.length !== g.facts.teams.home.periods?.length
  )
    return false;
  const sums = new Map(
    g.facts.players.map((p) => [
      p.side + ":" + p.jersey,
      { points: 0, two: 0, three: 0, free: 0, fouls: 0, status: "eligible" },
    ]),
  );
  for (const [i, cut] of d.periods.entries()) {
    const seen = new Set<string>();
    if (cut.players.length !== g.facts.players.length) return false;
    for (const p of cut.players) {
      const key = p.side + ":" + p.jersey,
        previous = sums.get(key);
      const whole = g.facts.players.find(
        (q) => q.side === p.side && q.jersey === p.jersey,
      );
      if (!previous || !whole || seen.has(key)) return false;
      seen.add(key);
      if (
        p.points !== 2 * p.two + 3 * p.three + p.free ||
        p.technical + p.unsportsmanlike > p.fouls
      )
        return false;
      if (p.played !== true && (p.points > 0 || p.fouls > 0)) return false;
      if (!whole.played && p.played !== false) return false;
      if (i === 0 && whole.starter && p.played !== true) return false;
      if (
        previous.status !== "eligible" &&
        (p.status !== previous.status || p.played !== false)
      )
        return false;
      for (const metric of ["points", "two", "three", "free", "fouls"] as const)
        previous[metric] += p[metric];
      previous.status = p.status;
      const events = d.fouls.filter(
        (e) => e.side === p.side && e.jersey === p.jersey && e.period === i + 1,
      );
      if (events.length !== p.fouls) return false;
    }
    for (const side of ["home", "away"] as const) {
      const rows = cut.players.filter((p) => p.side === side),
        t = cut.teams[side];
      if (
        rows.reduce((n, p) => n + p.points, 0) !== t.points ||
        t.points !== g.facts.teams[side].periods?.[i] ||
        rows.reduce((n, p) => n + p.free, 0) !== t.freeMade ||
        rows.reduce((n, p) => n + p.fouls, 0) !== t.fouls
      )
        return false;
    }
  }
  if (
    d.fouls.some(
      (e) => e.period > d.periods.length || !sums.has(e.side + ":" + e.jersey),
    )
  )
    return false;
  return g.facts.players.every((p) => {
    const sum = sums.get(p.side + ":" + p.jersey)!;
    return (
      ["points", "two", "three", "free"].every(
        (k) => sum[k as "points"] === p[k as "points"],
      ) &&
      (p.fouls === undefined || p.fouls === sum.fouls) &&
      (p.status === undefined || p.status === sum.status)
    );
  });
}
