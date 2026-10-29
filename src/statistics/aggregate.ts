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
    presentation: z.literal("public-leaderboard").optional(),
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
function formatMetric(value: number | null, exact = false): MetricCell {
  if (value === null) return unavailable();
  if (!Number.isFinite(value)) throw Error("Resultado estatístico inválido.");
  const n = exact ? value : Math.round(value * 10) / 10;
  return { status: "available", value: Object.is(n, -0) ? 0 : n };
}
const unique = <T extends string | null>(values: T[]) =>
  [...new Set(values)].sort((a, b) =>
    a === b ? 0 : a === null ? -1 : b === null ? 1 : a < b ? -1 : 1,
  );
type Observation = { value: number; seconds: number | null };

function validatedFacts(input: unknown): ConfirmedPlayerFact[] {
  return validateParsedConfirmedFacts(
    z.array(confirmedPlayerFactSchema).parse(input),
  );
}
/** Cross-row guards for facts already constructed by the validated normalizer. */
export function validateParsedConfirmedFacts(
  rows: ConfirmedPlayerFact[],
): ConfirmedPlayerFact[] {
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
export { validatedFacts as validateConfirmedFacts };
function observedMetrics(
  related: ConfirmedPlayerFact[],
  config: AggregationOptions,
): Pick<StatisticsRow, "gamesPlayed" | "coverage" | "metrics"> {
  const isLeaderboard = config.presentation === "public-leaderboard";
  const available = (value: number | null) =>
    formatMetric(value, isLeaderboard);
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
        case "technicalFouls":
          value = r.technicalFouls ?? null;
          break;
        case "unsportsmanlikeFouls":
          value = r.unsportsmanlikeFouls ?? null;
          break;
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
      else if (metric === "pointsShare") {
        const scored = played.filter((r) => r.scoring !== null);
        const denominator = scored.reduce(
          (sum, r) => sum + (r.teamPoints ?? 0),
          0,
        );
        cell =
          scored.length === played.length &&
          scored.every((r) => r.teamPoints !== undefined) &&
          denominator > 0
            ? available(
                (100 * scored.reduce((sum, r) => sum + r.scoring!.points, 0)) /
                  denominator,
              )
            : unavailable();
      } else if (metric === "pointsPerGame") {
        const scoring = played.flatMap((r) =>
          r.scoring ? [r.scoring.points] : [],
        );
        cell = available(
          perGame(
            scoring.reduce((sum, n) => sum + n, 0),
            played.length === scoring.length ? played.length : 0,
          ),
        );
      } else if (metric === "fiveFouls") {
        const known = played.filter((r) => r.discipline !== null);
        cell =
          known.length === played.length
            ? available(known.filter((r) => r.discipline === "excluded").length)
            : unavailable();
      } else if (metric === "disqualifications") {
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
        if (
          !observed.length ||
          (["technicalFouls", "unsportsmanlikeFouls"].includes(metric) &&
            observed.length !== played.length)
        )
          cell = unavailable();
        else {
          const total = observed.reduce((sum, o) => sum + o.value, 0);
          if (
            config.mode === "total" ||
            (metric === "points" && config.mode === "per-game" && isLeaderboard)
          )
            cell = available(total);
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

/** Validates each dispute before pooling raw observations for one public identity. */
export function validateCareerFacts(
  input: unknown,
  personId: string,
): ConfirmedPlayerFact[] {
  const id = z
      .uuid()
      .transform((v) => v.toLowerCase())
      .parse(personId),
    rows = z.array(confirmedPlayerFactSchema).parse(input),
    contexts = new Map<string, ConfirmedPlayerFact[]>(),
    games = new Set<string>(),
    registrations = new Map<string, string>();
  for (const row of rows) {
    if (row.person.id !== id || games.has(row.gameId))
      throw Error("Identidade ou jogo repetido na carreira.");
    games.add(row.gameId);
    const reg = row.registration.registrationId,
      owner = row.disputeId + "/" + row.registration.team.id;
    if (registrations.has(reg) && registrations.get(reg) !== owner)
      throw Error("Inscrição e disputa inconsistentes na carreira.");
    registrations.set(reg, owner);
    const group = contexts.get(row.disputeId) ?? [];
    group.push(row);
    contexts.set(row.disputeId, group);
  }
  for (const group of contexts.values()) validatedFacts(group);
  return rows;
}
export function aggregateCareerStatistics(
  input: unknown,
  personId: string,
  options: AggregationOptions,
): ComparisonSummary | null {
  const rows = validateCareerFacts(input, personId),
    config = aggregationOptionsSchema.parse(options);
  return rows.length
    ? {
        personId: rows[0].person.id,
        names: unique(rows.map((r) => r.person.name)),
        nicknames: unique(rows.map((r) => r.person.nickname)),
        registrationIds: unique(rows.map((r) => r.registration.registrationId)),
        ...observedMetrics(rows, config),
      }
    : null;
}
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
