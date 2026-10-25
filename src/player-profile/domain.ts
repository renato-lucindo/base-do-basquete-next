import { playerCareerSourceSchema } from "./career-source";
import { profileQuerySchema } from "./query-contract";
import {
  playerProfilePageSchema,
  type PlayerProfilePage,
} from "./page-contract";
import {
  aggregateCareerStatistics,
  validateCareerFacts,
} from "../statistics/aggregate";
import { scopesForStageKind } from "../../especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/app/modules/statistics/boxscore-statistics-contract";
const distinct = (v: string[]) => [...new Set(v)].sort();
const mostRecent = <T extends { stamp: string; key: string }>(a: T, b: T) =>
  Date.parse(b.stamp) - Date.parse(a.stamp) || b.key.localeCompare(a.key);
export function buildPlayerProfile(
  input: unknown,
  queryInput: unknown,
): PlayerProfilePage {
  const source = playerCareerSourceSchema.parse(input),
    q = profileQuerySchema.parse(queryInput);
  validateCareerFacts(
    source.participations.map((p) => p.fact),
    source.personId,
  );
  const appearances = [
    ...source.participations.map((p) => ({
      name: p.fact.person.name,
      nickname: p.fact.person.nickname,
      stamp: p.fact.publishedAt,
      key: p.fact.gameId,
      origin: {
        kind: "game" as const,
        id: p.fact.gameId,
        version: p.fact.publicationVersion,
        publishedAt: p.fact.publishedAt,
      },
    })),
    ...source.honors.map((h) => ({
      name: h.recipient.name,
      nickname: h.recipient.nickname,
      stamp: h.confirmedAt,
      key: h.honor.id,
      origin: {
        kind: "honor" as const,
        id: h.honor.id,
        version: h.version,
        publishedAt: h.confirmedAt,
      },
    })),
  ].sort(mostRecent);
  const profile = source.profile,
    latest = appearances[0];
  const identity = profile
    ? {
        name: profile.person.name,
        nickname: profile.person.nickname,
        metadata: profile.person,
        origin: {
          kind: "profile" as const,
          id: profile.personId,
          version: profile.version,
          publishedAt: profile.confirmedAt,
        },
      }
    : {
        name: latest.name,
        nickname: latest.nickname,
        metadata: null,
        origin: latest.origin,
      };
  const contextRecords = [
    ...source.participations.map((p) => ({
      disputeId: p.fact.disputeId,
      context: p.fact.context,
      stamp: p.fact.publishedAt,
      key: p.fact.gameId,
    })),
    ...source.honors.map((h) => ({
      disputeId: h.disputeId,
      context: h.context,
      stamp: h.confirmedAt,
      key: h.honor.id,
    })),
  ].sort(mostRecent);
  const seen = new Set<string>();
  const contexts = contextRecords
    .filter((r) => {
      if (seen.has(r.disputeId)) return false;
      seen.add(r.disputeId);
      return true;
    })
    .map(({ disputeId, context }) => ({ disputeId, context }));
  const inContext = (r: {
    disputeId: string;
    context: { championshipId: string; seasonId: string };
  }) =>
    (!q.championshipId || r.context.championshipId === q.championshipId) &&
    (!q.seasonId || r.context.seasonId === q.seasonId) &&
    (!q.disputeId || r.disputeId === q.disputeId);
  const selected = source.participations.filter((p) =>
    inContext({ disputeId: p.fact.disputeId, context: p.fact.context }),
  );
  const related = selected.filter((p) =>
    scopesForStageKind(p.fact.phase).includes(q.scope),
  );
  const minima = new Set(related.map((p) => p.minimumSeconds)),
    minimumSeconds = minima.size === 1 ? [...minima][0] : null;
  const status = !related.some((p) => p.fact.played)
    ? "no-played-games"
    : q.mode === "per-30" && minima.size > 1
      ? "mixed-minimums"
      : "available";
  // In total/per-game the minimum is unused; use an observed value only for the shared options contract.
  const summary =
    status === "available"
      ? aggregateCareerStatistics(
          related.map((p) => p.fact),
          source.personId,
          {
            mode: q.mode,
            minimumSeconds: minimumSeconds ?? related[0].minimumSeconds,
          },
        )
      : null;
  const groups = new Map<string, typeof selected>();
  for (const p of selected) {
    const key = p.fact.disputeId + "/" + p.fact.registration.registrationId,
      rows = groups.get(key) ?? [];
    rows.push(p);
    groups.set(key, rows);
  }
  const history = [...groups.values()]
    .map((rows) => {
      const ordered = [...rows].sort((a, b) =>
        mostRecent(
          { stamp: a.fact.publishedAt, key: a.fact.gameId },
          { stamp: b.fact.publishedAt, key: b.fact.gameId },
        ),
      );
      const first = ordered[0],
        dates = rows.flatMap((p) => (p.game.date ? [p.game.date] : [])).sort();
      return {
        disputeId: first.fact.disputeId,
        context: first.fact.context,
        registration: first.fact.registration,
        names: distinct(rows.map((p) => p.fact.person.name)),
        teamNames: distinct(rows.map((p) => p.fact.registration.team.name)),
        registrationNames: distinct(rows.map((p) => p.fact.registration.name)),
        jerseys: distinct(rows.map((p) => p.fact.jersey)),
        relatedGames: rows.length,
        playedGames: rows.filter((p) => p.fact.played).length,
        firstGameDate: dates[0] ?? null,
        lastGameDate: dates.at(-1) ?? null,
        unknownDates: dates.length < rows.length,
      };
    })
    .sort(
      (a, b) =>
        b.context.year - a.context.year ||
        a.registration.name.localeCompare(b.registration.name),
    );
  const sorted = [...related].sort((a, b) =>
    mostRecent(
      { stamp: a.fact.publishedAt, key: a.fact.gameId },
      { stamp: b.fact.publishedAt, key: b.fact.gameId },
    ),
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / 20)),
    page = Math.min(q.page, totalPages);
  return playerProfilePageSchema.parse({
    kind: "confirmed-player-profile-page-v1",
    personId: source.personId,
    query: { ...q, page },
    identity,
    contexts,
    statistics: {
      status,
      minimumSeconds,
      summary,
      relatedGames: related.length,
      phaseCoverage: {
        regularGames: selected.filter((p) => p.fact.phase === "round_robin")
          .length,
        playoffGames: selected.filter((p) => p.fact.phase === "knockout")
          .length,
        unknownGames: selected.filter((p) => p.fact.phase === null).length,
      },
    },
    honors: source.honors.filter(inContext),
    teamPlacements: source.teamPlacements.filter(inContext),
    games: {
      items: sorted.slice((page - 1) * 20, page * 20),
      page,
      pageSize: 20,
      total: sorted.length,
      totalPages,
    },
    history,
  });
}
