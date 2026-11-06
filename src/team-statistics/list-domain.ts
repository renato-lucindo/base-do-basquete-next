import { validatedTeamSource, teamRows } from "./domain";
import { aggregateTeamStatistics, type TeamAppearance } from "./aggregate";
import { normalizeStatisticsSearch } from "../statistics/query-contract";
import { scopesForStageKind } from "../../especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/app/modules/statistics/boxscore-statistics-contract";
import { rankSortedRows } from "../statistics/ranking";
import { LIST_SHEET_COLUMNS, teamsListQuerySchema } from "./list-query";

import { teamsListPageSchema, type TeamsListPage } from "./list-contract";
import { aggregateBenchPoints } from "./list-aggregate";
export function buildTeamsList(
  input: unknown,
  queryInput: unknown,
): TeamsListPage {
  const checked = validatedTeamSource(input),
    { source, coverage } = checked,
    q = teamsListQuerySchema.parse(queryInput);
  const hasBoxscore = source.games.some(
      (g) => g.snapshot.source.kind === "pdf",
    ),
    scoresheet = !hasBoxscore;
  if (scoresheet) q.columns = [...LIST_SHEET_COLUMNS];
  const identities = teamRows(checked, { mode: "total", scope: "all" });
  const options = identities
    .map((r) => ({ registrationId: r.registrationId, name: r.name }))
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "pt-BR") ||
        a.registrationId.localeCompare(b.registrationId),
    );
  const byId = new Map(identities.map((r) => [r.registrationId, r]));
  const rows = teamRows(checked, { ...q, mode: "total" }).map((r) => {
    const appearances: TeamAppearance[] = source.games
      .filter(
        ({ snapshot: g, phase }) =>
          scopesForStageKind(phase).includes(q.scope) &&
          (q.dataset !== "boxscore" ||
            (g.source.kind === "pdf" &&
              "origins" in g.facts &&
              !!g.facts.origins.playerAdvanced)),
      )
      .flatMap(({ snapshot }) =>
        (["home", "away"] as const)
          .filter(
            (side) => snapshot.game[side].registrationId === r.registrationId,
          )
          .map((side) => ({ snapshot, side })),
      );
    const aggregated = aggregateTeamStatistics(
        appearances,
        q.mode,
        scoresheet,
        true,
      ),
      pb = aggregateBenchPoints(appearances, q.mode);
    return {
      ...r,
      name: byId.get(r.registrationId)!.name,
      teamName: byId.get(r.registrationId)!.teamName,
      names: byId.get(r.registrationId)!.names,
      teamNames: byId.get(r.registrationId)!.teamNames,
      origin: byId.get(r.registrationId)!.origin,
      ...aggregated,
      metrics: {
        pointsFor: aggregated.statistics.points.value!,
        pointsAgainst: aggregated.statistics.pointsAgainst.value!,
        difference: aggregated.statistics.difference.value!,
      },
      statistics: {
        ...aggregated.statistics,
        benchPoints: pb.benchPoints,
        benchPointsShare: pb.benchPointsShare,
      },
      metricCoverage: {
        ...aggregated.metricCoverage,
        benchPoints: pb.covered,
        benchPointsShare: pb.covered,
      },
    };
  });
  const search = normalizeStatisticsSearch(q.search),
    selected = new Set(q.registrationIds);
  const filtered = rows.filter(
    (r) =>
      q.selection !== "none" &&
      (q.selection !== "custom" || selected.has(r.registrationId)) &&
      (!search ||
        normalizeStatisticsSearch(
          [...r.names, ...r.teamNames].join(" "),
        ).includes(search)),
  );
  const value = (r: (typeof rows)[number]) =>
    q.sort === "name"
      ? r.name
      : q.sort === "pointsFor"
        ? r.metrics.pointsFor
        : r.statistics[q.sort].value;
  filtered.sort((a, b) => {
    const av = value(a),
      bv = value(b);
    if (av === null)
      return bv === null ? a.registrationId.localeCompare(b.registrationId) : 1;
    if (bv === null) return -1;
    const order =
      typeof av === "string" && typeof bv === "string"
        ? av.localeCompare(bv, "pt-BR")
        : Number(av) - Number(bv);
    return (
      (q.direction === "desc" ? -order : order) ||
      a.registrationId.localeCompare(b.registrationId)
    );
  });
  return teamsListPageSchema.parse({
    kind: "confirmed-teams-list-v2",
    disputeId: source.disputeId,
    version: source.version,
    confirmedAt: source.confirmedAt,
    context:
      [...source.games].sort(
        (a, b) =>
          Date.parse(b.snapshot.publishedAt) -
            Date.parse(a.snapshot.publishedAt) ||
          b.snapshot.id.localeCompare(a.snapshot.id),
      )[0]?.snapshot.context ?? null,
    query: q,
    scoresheet,
    hasBoxscore,
    coverage,
    options,
    rows: rankSortedRows(filtered, (r) =>
      q.sort === "name" ? null : value(r),
    ),
    total: filtered.length,
    pageSize: "all",
  });
}
