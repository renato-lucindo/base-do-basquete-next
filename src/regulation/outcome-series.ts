import { z } from "zod";
import { seriesFormatSchema } from "./series";
import {
  outcomeGameSchema,
  outcomeLineage,
  outcomeScore,
  outcomeWinner,
} from "./outcome";
const uuid = z.uuid().transform((v) => v.toLowerCase());
const maximums = {
  single: 1,
  two_leg: 2,
  best_of_3: 3,
  best_of_5: 5,
  best_of_7: 7,
};
export const outcomeSeriesInputSchema = z
  .object({
    disputeId: uuid,
    homeRegistrationId: uuid,
    awayRegistrationId: uuid,
    format: seriesFormatSchema,
    games: z
      .array(
        z
          .object({
            slot: z.number().int().min(1).max(7),
            game: outcomeGameSchema,
          })
          .strict(),
      )
      .max(7),
  })
  .strict()
  .superRefine((s, c) => {
    const pair = new Set([s.homeRegistrationId, s.awayRegistrationId]);
    if (
      pair.size !== 2 ||
      new Set(s.games.map((g) => g.slot)).size !== s.games.length ||
      new Set(s.games.map((g) => g.game.gameId)).size !== s.games.length ||
      s.games.some(
        ({ slot, game }) =>
          slot > maximums[s.format] ||
          game.disputeId !== s.disputeId ||
          !pair.has(game.homeRegistrationId) ||
          !pair.has(game.awayRegistrationId),
      )
    )
      c.addIssue({
        code: "custom",
        message:
          "Confira slots, efeitos únicos e adversários da série nesta disputa.",
      });
  });
export function resolveOutcomeSeries(input: unknown) {
  const s = outcomeSeriesInputSchema.parse(input),
    games = [...s.games].sort((a, b) => a.slot - b.slot),
    maximum = maximums[s.format],
    target = s.format === "two_leg" ? null : Math.floor(maximum / 2) + 1;
  let homeWins = 0,
    awayWins = 0,
    homePoints = 0,
    awayPoints = 0,
    covered = 0,
    playedGames = 0,
    expected = 1,
    contiguous = true,
    winnerRegistrationId: string | null = null;
  for (const { slot, game } of games) {
    if (winnerRegistrationId)
      throw Error(
        "Há jogo após a vitória decisiva. Revise a atribuição sem apagar fatos.",
      );
    if (slot !== expected) contiguous = false;
    expected = slot + 1;
    if (outcomeWinner(game) === s.homeRegistrationId) homeWins++;
    else awayWins++;
    if (game.outcome.kind === "played") playedGames++;
    const score = outcomeScore(game);
    if (score) {
      covered++;
      const forward = game.homeRegistrationId === s.homeRegistrationId;
      homePoints += forward ? score.homePoints : score.awayPoints;
      awayPoints += forward ? score.awayPoints : score.homePoints;
    }
    if (target && contiguous) {
      if (homeWins >= target) winnerRegistrationId = s.homeRegistrationId;
      else if (awayWins >= target) winnerRegistrationId = s.awayRegistrationId;
    }
  }
  const allScores = games.length > 0 && covered === games.length,
    aggregateComplete =
      s.format === "two_leg" && games.length === 2 && contiguous;
  if (aggregateComplete && allScores && homePoints !== awayPoints)
    winnerRegistrationId =
      homePoints > awayPoints ? s.homeRegistrationId : s.awayRegistrationId;
  const status = winnerRegistrationId
      ? ("complete" as const)
      : aggregateComplete && allScores
        ? ("tied" as const)
        : ("pending" as const),
    missingScore = aggregateComplete && !allScores,
    slots = new Set(games.map((g) => g.slot));
  return {
    algorithmVersion: "outcome-series-v1" as const,
    status,
    winnerRegistrationId,
    homeWins,
    awayWins,
    gamesPlayed: playedGames,
    playedGames,
    awardedGames: games.length - playedGames,
    outcomesCounted: games.length,
    scoreGamesCovered: covered,
    totals: allScores ? { homePoints, awayPoints } : null,
    nextSlot:
      status === "pending"
        ? (Array.from({ length: maximum }, (_, i) => i + 1).find(
            (n) => !slots.has(n),
          ) ?? null)
        : null,
    needs: missingScore
      ? ("score_or_decision" as const)
      : status === "tied"
        ? ("decision" as const)
        : status === "pending"
          ? ("games" as const)
          : null,
    lineage: games.map(({ slot, game }) => ({ slot, ...outcomeLineage(game) })),
  };
}
