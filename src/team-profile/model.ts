import type { PublicContext, CatalogGame } from "../public-ui/catalog-contract";
import type { PublicStandings } from "../regulation/public-contract";
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
  if (p.standings) {
    const byId = new Map(p.standings.games.map((g) => [g.id, g]));
    return publicScheduleRows(p.standings, p.catalog)
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
        context: p.context,
        registrationId: p.registrationId,
        counted: ["played", "awarded"].includes(byId.get(g.id)!.state),
      }));
  }
  return p.catalog
    .filter((g) =>
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
      counted: false,
    }));
}
export function participationCampaign(p: TeamParticipation) {
  if (!p.standings) return null;
  const games = p.standings.games.filter(
    (g) =>
      [g.homeRegistrationId, g.awayRegistrationId].includes(p.registrationId) &&
      ["played", "awarded"].includes(g.state),
  );
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
