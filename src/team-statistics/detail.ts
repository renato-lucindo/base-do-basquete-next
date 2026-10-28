import { z } from "zod";
import { teamRows, validatedTeamSource } from "./domain";
import { teamDetailQuerySchema } from "./detail-query";
import {
  teamDetailPageSchema,
  type TeamDetailPage,
  type ConfirmedTeamGame,
} from "./detail-contract";
import { teamIdentitySchema, type TeamRow } from "./contract";
import { aggregateConfirmedStatistics } from "../statistics/aggregate";
import { scopesForStageKind } from "../../especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/app/modules/statistics/boxscore-statistics-contract";
const uuid = (v: string) => z.uuid().parse(v).toLowerCase();
const identity = (row: TeamRow) => {
  const { gamesPlayed, metrics, ...v } = row;
  void gamesPlayed;
  void metrics;
  return teamIdentitySchema.parse(v);
};
const distinct = <T extends string | null>(v: T[]) => [...new Set(v)].sort();
function paginate<T>(items: T[], requested: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / 20)),
    page = Math.min(requested, totalPages);
  return {
    items: items.slice((page - 1) * 20, page * 20),
    page,
    pageSize: 20,
    total: items.length,
    totalPages,
  };
}
export function buildTeamDetail(
  input: unknown,
  teamId: string,
  registrationId: string | null,
  queryInput: unknown,
): TeamDetailPage | null {
  teamId = uuid(teamId);
  if (registrationId !== null) registrationId = uuid(registrationId);
  const checked = validatedTeamSource(input),
    { source, facts, coverage } = checked,
    q = teamDetailQuerySchema.parse(queryInput),
    registrations = teamRows(checked, { mode: q.mode, scope: "all" })
      .filter((r) => r.teamId === teamId)
      .map(identity)
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name, "pt-BR") ||
          a.registrationId.localeCompare(b.registrationId),
      );
  if (!registrations.length) return null;
  const context = [...source.games].sort(
      (a, b) =>
        Date.parse(b.snapshot.publishedAt) -
          Date.parse(a.snapshot.publishedAt) ||
        b.snapshot.id.localeCompare(a.snapshot.id),
    )[0].snapshot.context,
    base = {
      disputeId: source.disputeId,
      teamId,
      version: source.version,
      confirmedAt: source.confirmedAt,
      context,
      query: q,
      coverage,
    };
  if (registrationId === null && registrations.length > 1)
    return teamDetailPageSchema.parse({
      ...base,
      kind: "confirmed-team-selection-v1",
      registrations,
    });
  const selected =
    registrationId === null
      ? registrations[0]
      : registrations.find((r) => r.registrationId === registrationId);
  if (!selected) return null;
  registrationId = selected.registrationId;
  const scoped = facts.filter(
      (f) =>
        f.registration.registrationId === registrationId &&
        scopesForStageKind(f.phase).includes(q.scope),
    ),
    statistics =
      teamRows(checked, q).find((r) => r.registrationId === registrationId) ??
      null,
    rows = aggregateConfirmedStatistics(scoped, {
      mode: q.mode,
      minimumSeconds: source.minimumSeconds,
    }),
    byPerson = new Map(rows.map((r) => [r.personId, r])),
    groups = new Map<string, typeof scoped>(),
    datesByGame = new Map(
      source.games.map((g) => [g.snapshot.id, g.snapshot.game.date]),
    );
  for (const f of scoped) {
    const a = groups.get(f.person.id) ?? [];
    a.push(f);
    groups.set(f.person.id, a);
  }
  const rosterRows = [...groups.entries()]
    .map(([personId, appearances]) => {
      const statistics = byPerson.get(personId);
      const dates = appearances
        .flatMap((f) => {
          const d = datesByGame.get(f.gameId);
          return d ? [d] : [];
        })
        .sort();
      return {
        personId,
        names: distinct(appearances.map((f) => f.person.name)),
        nicknames: distinct(appearances.map((f) => f.person.nickname)),
        jerseys: distinct(appearances.map((f) => f.jersey)),
        relatedGames: appearances.length,
        playedGames: appearances.filter((f) => f.played).length,
        statistics:
          statistics && statistics.gamesPlayed > 0 ? statistics : null,
        firstGameDate: dates[0] ?? null,
        lastGameDate: dates.at(-1) ?? null,
        unknownDates: dates.length < appearances.length,
      };
    })
    .sort(
      (a, b) =>
        Math.min(...a.jerseys.map(Number)) -
          Math.min(...b.jerseys.map(Number)) ||
        a.jerseys.join("/").length - b.jerseys.join("/").length ||
        a.names.join("/").localeCompare(b.names.join("/"), "pt-BR") ||
        a.personId.localeCompare(b.personId),
    );
  const gameRows: ConfirmedTeamGame[] = source.games
    .flatMap<ConfirmedTeamGame>(({ snapshot: g, phase }) => {
      if (!scopesForStageKind(phase).includes(q.scope)) return [];
      const side =
        g.game.home.registrationId === registrationId
          ? "home"
          : g.game.away.registrationId === registrationId
            ? "away"
            : null;
      if (!side) return [];
      const own = g.facts.teams[side];
      return [
        {
          gameId: g.id,
          publicationVersion: g.version,
          publishedAt: g.publishedAt,
          phase,
          side,
          game: g.game,
          context: g.context,
          score: {
            home: g.facts.teams.home.points,
            away: g.facts.teams.away.points,
          },
          source: g.source,
          collective: "advanced" in own ? own.advanced : null,
          collectiveOrigin:
            "origins" in g.facts ? g.facts.origins.teamAdvanced : null,
        },
      ];
    })
    .sort(
      (a, b) =>
        Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
        b.gameId.localeCompare(a.gameId),
    );
  const roster = paginate(rosterRows, q.rosterPage),
    games = paginate(gameRows, q.page);
  return teamDetailPageSchema.parse({
    ...base,
    kind: "confirmed-team-detail-v1",
    registrationId,
    identity: selected,
    statistics,
    query: { ...q, page: games.page, rosterPage: roster.page },
    roster,
    games,
  });
}
