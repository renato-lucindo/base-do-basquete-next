import type { PublicStandings } from "./public-contract";

export type RecentResult = {
  game: PublicStandings["games"][number];
  won: boolean;
  opponentId: string;
};

export function recentGroupResults(
  games: PublicStandings["games"],
  countedGameIds: readonly string[],
): Map<string, RecentResult[]> {
  const counted = new Set(countedGameIds);
  const ordered = games
    .filter(
      (g) =>
        counted.has(g.id) &&
        (g.state === "played" || g.state === "awarded") &&
        g.winnerRegistrationId !== null,
    )
    .sort(
      (a, b) =>
        (a.date ?? "").localeCompare(b.date ?? "") ||
        (a.time ?? "").localeCompare(b.time ?? "") ||
        a.id.localeCompare(b.id),
    );
  const byRegistration = new Map<string, RecentResult[]>();
  for (const game of ordered) {
    for (const [registrationId, opponentId] of [
      [game.homeRegistrationId, game.awayRegistrationId],
      [game.awayRegistrationId, game.homeRegistrationId],
    ]) {
      const recent = byRegistration.get(registrationId) ?? [];
      recent.push({
        game,
        won: game.winnerRegistrationId === registrationId,
        opponentId,
      });
      if (recent.length > 5) recent.shift();
      byRegistration.set(registrationId, recent);
    }
  }
  return byRegistration;
}
