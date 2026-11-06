import type { StatisticsSource } from "../statistics/source";

/** Presentation only: retain frozen facts and all search aliases. */
export function publishedRegistrationLabels(games: StatisticsSource["games"]) {
  const labels = new Map<
    string,
    {
      name: string;
      teamId: string;
      publishedAt: string;
      gameId: string;
      aliases: string[];
    }
  >();
  for (const { snapshot } of games) {
    for (const side of ["home", "away"] as const) {
      const registration = snapshot.game[side];
      const current = labels.get(registration.registrationId);
      const aliases = [
        ...new Set([
          ...(current?.aliases ?? []),
          registration.name,
          registration.team.name,
        ]),
      ].sort();
      if (
        !current ||
        Date.parse(snapshot.publishedAt) > Date.parse(current.publishedAt) ||
        (Date.parse(snapshot.publishedAt) === Date.parse(current.publishedAt) &&
          snapshot.id > current.gameId)
      ) {
        labels.set(registration.registrationId, {
          name: registration.name,
          teamId: registration.team.id,
          publishedAt: snapshot.publishedAt,
          gameId: snapshot.id,
          aliases,
        });
      } else current.aliases = aliases;
    }
  }
  return labels;
}
