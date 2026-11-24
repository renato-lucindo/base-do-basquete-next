import type { PublicContext, CatalogGame } from "../public-ui/catalog-contract";
import type { PublicStandings } from "../regulation/public-contract";
import type { RecentResult } from "../regulation/recent-results";
import type { PublicAchievements } from "../achievements/publication-contract";
import {
  publicScheduleRows,
  type PublicGameRow,
} from "../public-ui/games-model";
export type TeamParticipation = {
  disputeId: string;
  registrationId: string;
  name: string;
  context: PublicContext;
  status: "planned" | "in_progress" | "completed" | "cancelled" | null;
  standings: PublicStandings | null;
  catalog: CatalogGame[];
  placement: number | null;
};
export type TeamHonor = {
  disputeId: string;
  registrationId: string;
  name: string;
  position: number;
} & PublicContext;
export type TeamProfile = {
  teamId: string;
  name: string;
  abbreviation: string | null;
  participations: TeamParticipation[];
  honors: TeamHonor[];
};
export type TeamGame = PublicGameRow & {
  context: PublicContext;
  registrationId: string;
  counted: boolean;
  homeAbbreviation?: string | null;
  awayAbbreviation?: string | null;
};
export function initialTeamYear(years: number[], current: number) {
  return years.includes(current)
    ? current
    : years.length
      ? Math.max(...years)
      : null;
}
export function selectTeamHonors<
  T extends { category: string; gender: string; position: number },
>(honors: T[], category: string, gender: string) {
  return honors.filter(
    (h) =>
      h.position <= 3 &&
      (!category || h.category === category) &&
      (!gender || h.gender === gender),
  );
}
export function chronologicalTeamGames<
  T extends { id: string; date: string | null; time: string | null },
>(games: T[]): T[] {
  return [...new Map(games.map((g) => [g.id, g])).values()].sort(
    (a, b) =>
      (b.date ?? "").localeCompare(a.date ?? "") ||
      (b.time ?? "").localeCompare(a.time ?? "") ||
      b.id.localeCompare(a.id),
  );
}
export function participationGames(p: TeamParticipation): TeamGame[] {
  const scheduled: TeamGame[] = [];
  const projectedIds = new Set(p.standings?.games.map((g) => g.id) ?? []);
  if (p.standings) {
    const byId = new Map(p.standings.games.map((g) => [g.id, g]));
    scheduled.push(
      ...publicScheduleRows(p.standings, p.catalog)
        .filter((g) => {
          const source = byId.get(g.id)!;
          return (
            [source.homeRegistrationId, source.awayRegistrationId].includes(
              p.registrationId,
            ) && source.state !== "excluded"
          );
        })
        .map((g) => ({
          ...g,
          homeAbbreviation: p.standings?.registrations.find(
            (r) => r.id === byId.get(g.id)!.homeRegistrationId,
          )?.team.abbreviation,
          awayAbbreviation: p.standings?.registrations.find(
            (r) => r.id === byId.get(g.id)!.awayRegistrationId,
          )?.team.abbreviation,
          context: p.context,
          registrationId: p.registrationId,
          counted: ["played", "awarded"].includes(byId.get(g.id)!.state),
        })),
    );
  }
  return [
    ...scheduled,
    ...p.catalog
      .filter(
        (g) =>
          g.disputeId === p.disputeId &&
          !projectedIds.has(g.id) &&
          [g.game.home.registrationId, g.game.away.registrationId].includes(
            p.registrationId,
          ),
      )
      .map((g) => ({
        id: g.id,
        disputeId: g.disputeId,
        number: g.game.number,
        home: g.game.home.name,
        away: g.game.away.name,
        homeAbbreviation: g.game.home.team.abbreviation,
        awayAbbreviation: g.game.away.team.abbreviation,
        homeProfile: {
          teamId: g.game.home.team.id,
          registrationId: g.game.home.registrationId,
        },
        awayProfile: {
          teamId: g.game.away.team.id,
          registrationId: g.game.away.registrationId,
        },
        published: true,
        date: g.game.date,
        time: g.game.time,
        venue: g.game.venue,
        score: g.score,
        phase: null,
        seriesGame: null,
        walkover: false,
        context: p.context,
        registrationId: p.registrationId,
        counted: g.score.home !== g.score.away,
      })),
  ];
}
/** Published results remain visible before their regulation is organized.
 * An explicit projection state always wins over the catalog for the same game. */
export function participationResults(
  p: TeamParticipation,
): (RecentResult["game"] & { winnerRegistrationId: string | null })[] {
  const projected = new Map(p.standings?.games.map((g) => [g.id, g]) ?? []);
  return participationGames(p)
    .filter((g) => g.counted)
    .map((g) => {
      const official = projected.get(g.id);
      if (official) return official;
      const homeRegistrationId = g.homeProfile!.registrationId;
      const awayRegistrationId = g.awayProfile!.registrationId;
      return {
        id: g.id,
        date: g.date,
        time: g.time,
        homeRegistrationId,
        awayRegistrationId,
        score: g.score
          ? { homePoints: g.score.home, awayPoints: g.score.away }
          : null,
        state: "played" as const,
        winnerRegistrationId: g.score
          ? g.score.home > g.score.away
            ? homeRegistrationId
            : awayRegistrationId
          : null,
      };
    });
}
export function participationCampaign(p: TeamParticipation) {
  const games = participationResults(p);
  if (!p.standings && !games.length) return null;
  const wins = games.filter(
    (g) => g.winnerRegistrationId === p.registrationId,
  ).length;
  const complete = games.every((g) => g.score !== null);
  const pointsFor =
    complete && games.length
      ? games.reduce(
          (n, g) =>
            n +
            (g.homeRegistrationId === p.registrationId
              ? g.score!.homePoints
              : g.score!.awayPoints),
          0,
        )
      : null;
  const pointsAgainst =
    complete && games.length
      ? games.reduce(
          (n, g) =>
            n +
            (g.homeRegistrationId === p.registrationId
              ? g.score!.awayPoints
              : g.score!.homePoints),
          0,
        )
      : null;
  return {
    games: games.length,
    wins,
    losses: games.length - wins,
    percentage: games.length ? (100 * wins) / games.length : null,
    pointsFor,
    pointsAgainst,
    difference:
      pointsFor !== null && pointsAgainst !== null
        ? pointsFor - pointsAgainst
        : null,
  };
}
export function participationPosition(p: TeamParticipation) {
  if (p.placement)
    return { label: `${p.placement}º lugar`, detail: "Colocação final" };
  if (!p.standings) return { label: "—", detail: "" };
  const s = p.standings;
  const series = [...s.projection.series]
    .reverse()
    .find((x) =>
      [x.home.registrationId, x.away.registrationId].includes(p.registrationId),
    );
  if (series) {
    const declared = s.definition.series.find((x) => x.id === series.id);
    return {
      label:
        s.definition.knockoutPhases.find((x) => x.id === declared?.phaseId)
          ?.name ?? "Eliminatórias",
      detail: "",
    };
  }
  for (const phase of [...s.projection.groupPhases].reverse())
    for (const group of phase.groups) {
      const row = group.standings.rows.find(
        (r) => r.registrationId === p.registrationId,
      );
      if (row) {
        const name =
          s.definition.groupPhases
            .find((x) => x.phaseId === phase.phaseId)
            ?.groups.find((x) => x.id === group.groupId)?.name ?? "";
        return { label: row.position ? `${row.position}º` : "—", detail: name };
      }
    }
  return { label: "—", detail: "" };
}
export function participationPlacement(
  awards: PublicAchievements | null,
  registrationId: string,
) {
  return (
    awards?.placements.find((p) =>
      p.registrations.some((r) => r.registrationId === registrationId),
    )?.position ?? null
  );
}
