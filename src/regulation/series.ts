import { z } from "zod";
import { competitiveFactSchema } from "./contract";
const uuid = z.uuid().transform((v) => v.toLowerCase());
export const seriesFormatSchema = z.enum([
  "single",
  "two_leg",
  "best_of_3",
  "best_of_5",
  "best_of_7",
]);
const lengths = {
  single: 1,
  two_leg: 2,
  best_of_3: 3,
  best_of_5: 5,
  best_of_7: 7,
};
export const seriesInputSchema = z
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
            game: competitiveFactSchema,
          })
          .strict(),
      )
      .max(7),
  })
  .strict()
  .superRefine((s, c) => {
    const members = new Set([s.homeRegistrationId, s.awayRegistrationId]),
      ids = new Set(s.games.map((g) => g.game.gameId)),
      slots = new Set(s.games.map((g) => g.slot));
    if (
      members.size !== 2 ||
      ids.size !== s.games.length ||
      slots.size !== s.games.length ||
      s.games.some(
        (g) =>
          g.slot > lengths[s.format] ||
          g.game.disputeId !== s.disputeId ||
          !members.has(g.game.homeRegistrationId) ||
          !members.has(g.game.awayRegistrationId),
      )
    )
      c.addIssue({
        code: "custom",
        message:
          "Confira as duas inscrições, os slots explícitos e uma única versão de cada partida desta disputa.",
      });
  });
export type SeriesInput = z.infer<typeof seriesInputSchema>;
export function resolveSeries(input: unknown) {
  const s = seriesInputSchema.parse(input),
    games = [...s.games].sort((a, b) => a.slot - b.slot),
    maximum = lengths[s.format],
    target = s.format === "two_leg" ? null : Math.floor(maximum / 2) + 1;
  let homeWins = 0,
    awayWins = 0,
    homePoints = 0,
    awayPoints = 0,
    winnerRegistrationId: string | null = null,
    expected = 1,
    contiguous = true;
  for (const { slot, game } of games) {
    if (winnerRegistrationId)
      throw Error(
        "Há partida publicada depois de a série estar decidida. Revise a atribuição, sem apagar os fatos do jogo.",
      );
    if (slot !== expected) contiguous = false;
    expected = slot + 1;
    const home =
        game.homeRegistrationId === s.homeRegistrationId
          ? game.homePoints
          : game.awayPoints,
      away =
        game.homeRegistrationId === s.homeRegistrationId
          ? game.awayPoints
          : game.homePoints;
    homePoints += home;
    awayPoints += away;
    if (home > away) homeWins++;
    else awayWins++;
    if (target && contiguous) {
      if (homeWins >= target) winnerRegistrationId = s.homeRegistrationId;
      else if (awayWins >= target) winnerRegistrationId = s.awayRegistrationId;
    }
  }
  const aggregateComplete =
    s.format === "two_leg" && games.length === 2 && contiguous;
  if (aggregateComplete && homePoints !== awayPoints)
    winnerRegistrationId =
      homePoints > awayPoints ? s.homeRegistrationId : s.awayRegistrationId;
  const status = winnerRegistrationId
    ? ("complete" as const)
    : aggregateComplete
      ? ("tied" as const)
      : ("pending" as const);
  const slots = new Set(games.map((g) => g.slot));
  return {
    algorithmVersion: "series-v1" as const,
    status,
    winnerRegistrationId,
    gamesPlayed: games.length,
    homeWins,
    awayWins,
    totals: games.length ? { homePoints, awayPoints } : null,
    nextSlot:
      status === "pending"
        ? (Array.from({ length: maximum }, (_, i) => i + 1).find(
            (slot) => !slots.has(slot),
          ) ?? null)
        : null,
    needs:
      status === "tied"
        ? ("decision" as const)
        : status === "pending"
          ? ("games" as const)
          : null,
    lineage: games.map(({ slot, game }) => ({
      slot,
      gameId: game.gameId,
      publicationVersion: game.publicationVersion,
      pointsSource: game.pointsSource,
    })),
  };
}
