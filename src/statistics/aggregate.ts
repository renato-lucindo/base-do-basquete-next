import { z } from "zod";
import {
  confirmedPlayerFactSchema,
  type ConfirmedPlayerFact,
} from "./confirmed-facts";
import {
  percentage,
  perGame,
} from "../../especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/app/modules/statistics/domain";
import {
  normalizePer30,
  MINIMUM_PER_30_SECONDS,
} from "../../especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/app/modules/statistics/boxscore-statistics-contract";

import { STATISTICS_METRICS, type StatisticsMetric } from "./metrics";
export { STATISTICS_METRICS, type StatisticsMetric } from "./metrics";
export type MetricCell =
  | { status: "available"; value: number }
  | { status: "unavailable" | "insufficient-sample"; value: null };
export const aggregationOptionsSchema = z
  .object({
    mode: z.enum(["total", "per-game", "per-30"]),
    minimumSeconds: z.number().int().min(1).max(2147483647),
  })
  .strict();
export type AggregationOptions = z.infer<typeof aggregationOptionsSchema>;
export interface StatisticsRow {
  personId: string;
  registrationId: string;
  teamId: string;
  names: string[];
  nicknames: (string | null)[];
  registrationNames: string[];
  teamNames: string[];
  jerseys: string[];
  gamesPlayed: number;
  coverage: {
    scoringGames: number;
    advancedGames: number;
    foulGames: number;
    foulsReceivedGames: number;
    plusMinusGames: number;
    disciplineGames: number;
  };
  metrics: Record<StatisticsMetric, MetricCell>;
}
const unavailable = (): MetricCell => ({ status: "unavailable", value: null });
function available(value: number | null): MetricCell {
  if (value === null) return unavailable();
  if (!Number.isFinite(value)) throw Error("Resultado estatístico inválido.");
  const rounded = Math.round(value * 10) / 10;
  return { status: "available", value: Object.is(rounded, -0) ? 0 : rounded };
}
const unique = <T extends string | null>(values: T[]) =>
  [...new Set(values)].sort((a, b) =>
    a === b ? 0 : a === null ? -1 : b === null ? 1 : a < b ? -1 : 1,
  );
type Observation = { value: number; seconds: number | null };

function validatedFacts(input: unknown): ConfirmedPlayerFact[] {
  const rows = z.array(confirmedPlayerFactSchema).parse(input);
  const seen = new Set<string>();
  const games = new Map<string, string>();
  const registrationTeams = new Map<string, string>();
  for (const r of rows) {
    const validOrigin = (o: { kind: "pdf" | "sheet"; version: number }) =>
      o.kind === "sheet"
        ? r.source.kind === "pdf" || o.version === r.source.version
        : r.source.kind === "pdf" && o.version === r.source.version;
    if (
      (r.scoring && !validOrigin(r.scoring.origin)) ||
      (r.advanced &&
        (r.advanced.origin.kind !== "pdf" ||
          !validOrigin(r.advanced.origin))) ||
      (r.foulsReceived &&
        (r.foulsReceived.origin.kind !== "pdf" ||
          !validOrigin(r.foulsReceived.origin))) ||
      (r.foulsCommitted && !validOrigin(r.foulsCommitted.origin))
    )
      throw Error("Origem estatística incompatível com a publicação.");
    if (r.advanced && r.scoring?.origin.kind === "pdf") {
      const a = r.advanced.statistics,
        s = r.scoring;
      if (
        s.points !== a.points ||
        s.twoMade !== a.twoPoints.made ||
        s.threeMade !== a.threePoints.made ||
        s.freeMade !== a.freeThrows.made
      )
        throw Error("Domínios da mesma fonte discordam.");
    }
    const registrationId = r.registration.registrationId,
      teamId = r.registration.team.id;
    if (
      registrationTeams.has(registrationId) &&
      registrationTeams.get(registrationId) !== teamId
    )
      throw Error("Inscrição associada a equipes diferentes.");
    registrationTeams.set(registrationId, teamId);
    const first = rows[0];
    if (
      r.disputeId !== first.disputeId ||
      r.context.championshipId !== first.context.championshipId ||
      r.context.seasonId !== first.context.seasonId
    )
      throw Error("Contextos estatísticos incompatíveis.");
    const key = `${r.gameId}/${r.person.id}`;
    if (seen.has(key))
      throw Error("Participação repetida ou revisão misturada.");
    seen.add(key);
    const publication = JSON.stringify([
      r.publicationVersion,
      r.publishedAt,
      r.context,
      r.source,
    ]);
    if (games.has(r.gameId) && games.get(r.gameId) !== publication)
      throw Error("Revisões do mesmo jogo são incompatíveis.");
    games.set(r.gameId, publication);
  }
  return rows;
}
function observedMetrics(
  related: ConfirmedPlayerFact[],
  config: AggregationOptions,
): Pick<StatisticsRow, "gamesPlayed" | "coverage" | "metrics"> {
  const played = related.filter((r) => r.played),
    advanced = played.flatMap((r) =>
      r.advanced ? [r.advanced.statistics] : [],
    );
  const observations = (metric: StatisticsMetric): Observation[] =>
    played.flatMap((r) => {
      const a = r.advanced?.statistics,
        seconds = a?.secondsPlayed ?? null;
      let value: number | null = null;
      switch (metric) {
        case "twoMade":
        case "threeMade":
        case "freeMade":
          value =
            config.mode === "per-30"
              ? a
                ? metric === "twoMade"
                  ? a.twoPoints.made
                  : metric === "threeMade"
                    ? a.threePoints.made
                    : a.freeThrows.made
                : null
              : (r.scoring?.[metric] ?? null);
          break;
        case "points":
          value =
            config.mode === "per-30"
              ? (a?.points ?? null)
              : (r.scoring?.points ?? null);
          break;
        case "foulsCommitted":
          value = r.foulsCommitted?.value ?? null;
          break;
        case "foulsReceived":
          value = r.foulsReceived?.value ?? null;
          break;
        case "plusMinus":
          value = a?.plusMinus ?? null;
          break;
        case "minutes":
          value = seconds === null ? null : seconds / 60;
          break;
        case "fieldGoalsMade":
          value = a?.fieldGoals.made ?? null;
          break;
        case "fieldGoalsAttempted":
          value = a?.fieldGoals.attempted ?? null;
          break;
        case "threePointersMade":
          value = a?.threePoints.made ?? null;
          break;
        case "threePointersAttempted":
          value = a?.threePoints.attempted ?? null;
          break;
        case "freeThrowsMade":
          value = a?.freeThrows.made ?? null;
          break;
        case "freeThrowsAttempted":
          value = a?.freeThrows.attempted ?? null;
          break;
        case "efficiency":
          value = a
            ? a.points +
              a.offensiveRebounds +
              a.defensiveRebounds +
              a.assists +
              a.steals +
              a.blocks -
              (a.fieldGoals.attempted - a.fieldGoals.made) -
              (a.freeThrows.attempted - a.freeThrows.made) -
              a.turnovers
            : null;
          break;
        case "rebounds":
        case "offensiveRebounds":
        case "defensiveRebounds":
        case "assists":
        case "turnovers":
        case "blocks":
        case "steals":
          value = a?.[metric] ?? null;
          break;
      }
      return value === null ? [] : [{ value, seconds }];
    });
  const metrics = Object.fromEntries(
    (Object.keys(STATISTICS_METRICS) as StatisticsMetric[]).map((metric) => {
      let cell: MetricCell;
      if (metric === "games") cell = available(played.length);
      else if (metric === "disqualifications") {
        const known = played.filter((r) => r.discipline !== null);
        cell = known.length
          ? available(
              known.filter((r) => r.discipline === "GD" || r.discipline === "D")
                .length,
            )
          : unavailable();
      } else if (
        metric === "plusMinus" &&
        advanced.some((a) => a.plusMinus === null)
      )
        cell = unavailable();
      else if (metric === "minutes" && config.mode === "per-30")
        cell = unavailable();
      else if (
        metric === "fieldGoalPercentage" ||
        metric === "threePointPercentage" ||
        metric === "freeThrowPercentage"
      ) {
        const key =
          metric === "fieldGoalPercentage"
            ? "fieldGoals"
            : metric === "threePointPercentage"
              ? "threePoints"
              : "freeThrows";
        cell = advanced.length
          ? available(
              percentage(
                advanced.reduce((sum, a) => sum + a[key].made, 0),
                advanced.reduce((sum, a) => sum + a[key].attempted, 0),
              ),
            )
          : unavailable();
      } else {
        let observed = observations(metric);
        if (config.mode === "per-30" && metric !== "plusMinus")
          observed = observed.filter((o) => o.seconds !== null);
        if (!observed.length) cell = unavailable();
        else {
          const total = observed.reduce((sum, o) => sum + o.value, 0);
          if (config.mode === "total") cell = available(total);
          else if (config.mode === "per-game" || metric === "plusMinus")
            cell = available(perGame(total, observed.length));
          else {
            const seconds = observed.reduce(
              (sum, o) => sum + (o.seconds ?? 0),
              0,
            );
            cell =
              seconds < config.minimumSeconds
                ? { status: "insufficient-sample", value: null }
                : available(
                    normalizePer30(total, seconds, config.minimumSeconds),
                  );
          }
        }
      }
      return [metric, cell];
    }),
  ) as Record<StatisticsMetric, MetricCell>;

  return {
    gamesPlayed: played.length,
    coverage: {
      scoringGames: played.filter((r) => r.scoring !== null).length,
      advancedGames: advanced.length,
      foulGames: played.filter((r) => r.foulsCommitted !== null).length,
      foulsReceivedGames: played.filter((r) => r.foulsReceived !== null).length,
      plusMinusGames: advanced.filter((a) => a.plusMinus !== null).length,
      disciplineGames: played.filter((r) => r.discipline !== null).length,
    },
    metrics,
  };
}
/** Public confirmed facts only. Coverage is retained separately for every domain. */
export function aggregateConfirmedStatistics(
  input: unknown,
  options: AggregationOptions = {
    mode: "per-game",
    minimumSeconds: MINIMUM_PER_30_SECONDS,
  },
): StatisticsRow[] {
  const rows = validatedFacts(input),
    config = aggregationOptionsSchema.parse(options);
  const groups = new Map<string, ConfirmedPlayerFact[]>();
  for (const row of rows) {
    const key = row.person.id + "/" + row.registration.registrationId;
    const related = groups.get(key) ?? [];
    related.push(row);
    groups.set(key, related);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, related]) => {
      const first = related[0];
      return {
        personId: first.person.id,
        registrationId: first.registration.registrationId,
        teamId: first.registration.team.id,
        names: unique(related.map((r) => r.person.name)),
        nicknames: unique(related.map((r) => r.person.nickname)),
        registrationNames: unique(related.map((r) => r.registration.name)),
        teamNames: unique(related.map((r) => r.registration.team.name)),
        jerseys: unique(related.map((r) => r.jersey)),

        ...observedMetrics(related, config),
      };
    });
}
export type ComparisonSummary = Pick<
  StatisticsRow,
  "personId" | "names" | "nicknames" | "gamesPlayed" | "coverage" | "metrics"
> & { registrationIds: string[] };
/** All selected registrations contribute to one explicitly labelled person summary. */
export function aggregateComparedStatistics(
  input: unknown,
  selectedIds: string[],
  options: AggregationOptions = {
    mode: "per-game",
    minimumSeconds: MINIMUM_PER_30_SECONDS,
  },
): ComparisonSummary[] {
  const rows = validatedFacts(input),
    config = aggregationOptionsSchema.parse(options);
  const ids = z
    .array(z.uuid().transform((s) => s.toLowerCase()))
    .max(2)
    .refine((v) => new Set(v).size === v.length)
    .parse(selectedIds);
  return ids.flatMap((id) => {
    const related = rows.filter((r) => r.person.id === id);
    return related.length
      ? [
          {
            personId: id,
            names: unique(related.map((r) => r.person.name)),
            nicknames: unique(related.map((r) => r.person.nickname)),
            registrationIds: unique(
              related.map((r) => r.registration.registrationId),
            ),
            ...observedMetrics(related, config),
          },
        ]
      : [];
  });
}
