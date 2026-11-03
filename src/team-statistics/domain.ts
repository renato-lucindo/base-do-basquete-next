import { statisticsSourceSchema } from "../statistics/source";
import { normalizeParsedConfirmedGame } from "../statistics/confirmed-facts";
import { validateParsedConfirmedFacts } from "../statistics/aggregate";
import { normalizeStatisticsSearch } from "../statistics/query-contract";
import { scopesForStageKind } from "../../especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/app/modules/statistics/boxscore-statistics-contract";
import { perGame } from "../../especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/app/modules/statistics/domain";
import { teamsQuerySchema, type TeamsQuery } from "./query-contract";
import { teamsPageSchema, type TeamsPage, type TeamRow } from "./contract";
import { aggregateTeamStatistics, type TeamAppearance } from "./aggregate";
import { SHEET_TEAM_COLUMNS, TEAM_COLUMN_PRESETS } from "./metrics";
import { rankSortedRows } from "../statistics/ranking";
export class TeamCapacityError extends Error {
  constructor() {
    super(
      "A consulta excede a capacidade de equipes ou identidades deste contexto.",
    );
  }
}
const distinct = (a: string[]) => [...new Set(a)].sort();
export function validatedTeamSource(input: unknown) {
  const source = statisticsSourceSchema.parse(input);
  const registrations = new Set(
    source.games.flatMap(({ snapshot: g }) => [
      g.game.home.registrationId,
      g.game.away.registrationId,
    ]),
  );
  if (registrations.size > 1000) throw new TeamCapacityError();
  const facts = source.games.flatMap(({ snapshot, phase }) =>
    normalizeParsedConfirmedGame(snapshot).map((f) => ({ ...f, phase })),
  );
  if (new Set(facts.map((f) => f.person.id)).size > 10000)
    throw new TeamCapacityError();
  validateParsedConfirmedFacts(facts);
  return {
    source,
    facts,
    coverage: {
      regularGames: source.games.filter((g) => g.phase === "round_robin")
        .length,
      playoffGames: source.games.filter((g) => g.phase === "knockout").length,
      unknownGames: source.games.filter((g) => g.phase === null).length,
    },
  };
}
export function teamRows(
  checked: ReturnType<typeof validatedTeamSource>,
  q: Pick<TeamsQuery, "mode" | "scope"> & { dataset?: TeamsQuery["dataset"] },
): TeamRow[] {
  const { source } = checked;
  const sheetOnly =
    q.dataset !== "boxscore" &&
    source.games.length > 0 &&
    source.games.every((g) => g.snapshot.source.kind === "sheet");
  const groups = new Map<string, TeamAppearance[]>();
  for (const { snapshot, phase } of source.games) {
    if (!scopesForStageKind(phase).includes(q.scope)) continue;
    if (
      q.dataset === "boxscore" &&
      (snapshot.source.kind !== "pdf" ||
        !("origins" in snapshot.facts) ||
        !snapshot.facts.origins.playerAdvanced)
    )
      continue;
    for (const side of ["home", "away"] as const) {
      const id = snapshot.game[side].registrationId,
        rows = groups.get(id) ?? [];
      rows.push({ snapshot, side });
      groups.set(id, rows);
    }
  }
  const rows: TeamRow[] = [...groups.values()].map((g) => {
    const ordered = [...g].sort(
        (a, b) =>
          Date.parse(b.snapshot.publishedAt) -
            Date.parse(a.snapshot.publishedAt) ||
          b.snapshot.id.localeCompare(a.snapshot.id),
      ),
      latest = ordered[0],
      r = latest.snapshot.game[latest.side];
    const pointsFor = g.reduce(
        (n, a) => n + a.snapshot.facts.teams[a.side].points,
        0,
      ),
      pointsAgainst = g.reduce(
        (n, a) =>
          n +
          a.snapshot.facts.teams[a.side === "home" ? "away" : "home"].points,
        0,
      );
    const value = (n: number) => {
      const v = q.mode === "total" ? n : perGame(n, g.length)!;
      return Object.is(v, -0) ? 0 : v;
    };
    return {
      registrationId: r.registrationId,
      teamId: r.team.id,
      name: r.name,
      teamName: r.team.name,
      names: distinct(g.map((a) => a.snapshot.game[a.side].name)),
      teamNames: distinct(g.map((a) => a.snapshot.game[a.side].team.name)),
      gamesPlayed: g.length,
      rank: null,
      ...aggregateTeamStatistics(g, q.mode, sheetOnly),
      origin: {
        gameId: latest.snapshot.id,
        publicationVersion: latest.snapshot.version,
        publishedAt: latest.snapshot.publishedAt,
      },
      metrics: {
        pointsFor: value(pointsFor),
        pointsAgainst: value(pointsAgainst),
        difference: value(pointsFor - pointsAgainst),
      },
    };
  });
  return rows;
}
export function buildTeamsPage(input: unknown, queryInput: unknown): TeamsPage {
  const checked = validatedTeamSource(input),
    { source, coverage } = checked,
    q = teamsQuerySchema.parse(queryInput),
    rows = teamRows(checked, q);
  const scoresheet =
    q.dataset !== "boxscore" &&
    source.games.length > 0 &&
    source.games.every((g) => g.snapshot.source.kind === "sheet");
  if (
    scoresheet &&
    q.preset === "essentials" &&
    q.columns.join() === TEAM_COLUMN_PRESETS.essentials.join()
  )
    q.columns = [...SHEET_TEAM_COLUMNS];
  const search = normalizeStatisticsSearch(q.search),
    filtered = rows.filter(
      (r) =>
        !search ||
        normalizeStatisticsSearch(
          [...r.names, ...r.teamNames].join(" "),
        ).includes(search),
    );
  const value = (r: TeamRow) =>
    q.sort === "name"
      ? r.name
      : q.sort === "games"
        ? r.gamesPlayed
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
  const totalPages = Math.max(1, Math.ceil(filtered.length / 20)),
    page = Math.min(q.page, totalPages);
  const ranked = rankSortedRows(filtered, (r) =>
    q.sort === "name" ? null : value(r),
  );
  return teamsPageSchema.parse({
    kind: "confirmed-teams-page-v1",
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
    query: { ...q, page },
    scoresheet,
    coverage,
    rows: ranked.slice((page - 1) * 20, page * 20),
    page,
    pageSize: 20,
    total: filtered.length,
    totalPages,
  });
}
