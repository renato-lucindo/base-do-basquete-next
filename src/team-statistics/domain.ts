import { statisticsSourceSchema } from "../statistics/source";
import { normalizeParsedConfirmedGame } from "../statistics/confirmed-facts";
import { validateParsedConfirmedFacts } from "../statistics/aggregate";
import { normalizeStatisticsSearch } from "../statistics/query-contract";
import { scopesForStageKind } from "../../especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/app/modules/statistics/boxscore-statistics-contract";
import { perGame } from "../../especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/app/modules/statistics/domain";
import { teamsQuerySchema, type TeamsQuery } from "./query-contract";
import { teamsPageSchema, type TeamsPage, type TeamRow } from "./contract";
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
  q: Pick<TeamsQuery, "mode" | "scope">,
): TeamRow[] {
  const { source } = checked;
  type Appearance = {
    snapshot: (typeof source.games)[number]["snapshot"];
    side: "home" | "away";
  };
  const groups = new Map<string, Appearance[]>();
  for (const { snapshot, phase } of source.games) {
    if (!scopesForStageKind(phase).includes(q.scope)) continue;
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
        : r.metrics[q.sort];
  filtered.sort((a, b) => {
    const av = value(a),
      bv = value(b);
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
    coverage,
    rows: filtered.slice((page - 1) * 20, page * 20),
    page,
    pageSize: 20,
    total: filtered.length,
    totalPages,
  });
}
