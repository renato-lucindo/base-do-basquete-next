import { z } from "zod";
import { competitiveFactSchema, type CompetitiveFact } from "./contract";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  version = z.number().int().min(1).max(2147483647),
  scoreValue = z.number().int().min(0).max(2147483647),
  leaguePoints = z.number().int().min(-1000000).max(1000000),
  reason = z.string().trim().min(3).max(2000);
export const administrativeScoreSchema = z
  .object({ homePoints: scoreValue, awayPoints: scoreValue })
  .strict();
export const occurrenceRulesSchema = z
  .object({
    wo: z
      .object({
        winnerLeaguePoints: leaguePoints,
        loserLeaguePoints: leaguePoints,
        score: z
          .object({ winner: scoreValue, loser: scoreValue })
          .strict()
          .nullable(),
      })
      .strict()
      .refine(
        (r) => !r.score || r.score.winner > r.score.loser,
        "Placar administrativo deve corresponder ao vencedor.",
      )
      .nullable(),
  })
  .strict();
const administrativeDecisionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("exclude") }).strict(),
  z
    .object({
      kind: z.literal("award"),
      winnerRegistrationId: uuid,
      homeLeaguePoints: leaguePoints,
      awayLeaguePoints: leaguePoints,
      score: administrativeScoreSchema.nullable(),
    })
    .strict(),
]);
export const occurrenceEffectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("postponed") }).strict(),
  z.object({ kind: z.literal("interrupted") }).strict(),
  z.object({ kind: z.literal("cancelled") }).strict(),
  z.object({ kind: z.literal("wo"), winnerRegistrationId: uuid }).strict(),
  z
    .object({
      kind: z.literal("administrative"),
      decision: administrativeDecisionSchema,
    })
    .strict(),
]);
export const gameOccurrenceSchema = z
  .object({
    id: uuid,
    version,
    gameId: uuid,
    gameVersion: version,
    publicationVersion: z.number().int().min(0).max(2147483647),
    reason,
    effect: occurrenceEffectSchema,
  })
  .strict();
const gameSchema = z
  .object({
    id: uuid,
    version,
    disputeId: uuid,
    homeRegistrationId: uuid,
    awayRegistrationId: uuid,
  })
  .strict();
const withdrawalSchema = z
  .object({
    id: uuid,
    version,
    registrationId: uuid,
    reason,
    policy: z.enum(["keep_results", "exclude_results"]),
    previousGameIds: z.array(uuid).max(10000),
  })
  .strict();
const isAward = (e: z.infer<typeof occurrenceEffectSchema>) =>
  e.kind === "wo" ||
  (e.kind === "administrative" && e.decision.kind === "award");
export const occurrencesInputSchema = z
  .object({
    disputeId: uuid,
    regulationVersion: version,
    registrationIds: z.array(uuid).max(1000),
    rules: occurrenceRulesSchema,
    games: z.array(gameSchema).max(10000),
    publishedGames: z.array(competitiveFactSchema).max(10000),
    occurrences: z.array(gameOccurrenceSchema).max(10000),
    withdrawals: z.array(withdrawalSchema).max(1000),
  })
  .strict()
  .superRefine((s, c) => {
    const registrations = new Set(s.registrationIds),
      games = new Map(s.games.map((g) => [g.id, g])),
      publications = new Map(s.publishedGames.map((g) => [g.gameId, g])),
      occurrences = new Map(s.occurrences.map((o) => [o.gameId, o]));
    const issue = () =>
      c.addIssue({
        code: "custom",
        message:
          "Confira contexto, motivo, versões e efeitos explícitos de cada ocorrência/desistência.",
      });
    if (
      registrations.size !== s.registrationIds.length ||
      games.size !== s.games.length ||
      publications.size !== s.publishedGames.length ||
      occurrences.size !== s.occurrences.length ||
      new Set(s.occurrences.map((o) => o.id)).size !== s.occurrences.length ||
      new Set(s.withdrawals.map((w) => w.id)).size !== s.withdrawals.length ||
      new Set(s.withdrawals.map((w) => w.registrationId)).size !==
        s.withdrawals.length ||
      s.withdrawals.reduce((n, w) => n + w.previousGameIds.length, 0) > 20000
    )
      issue();
    for (const g of s.games)
      if (
        g.disputeId !== s.disputeId ||
        g.homeRegistrationId === g.awayRegistrationId ||
        !registrations.has(g.homeRegistrationId) ||
        !registrations.has(g.awayRegistrationId)
      )
        issue();
    for (const p of s.publishedGames) {
      const game = games.get(p.gameId);
      if (
        !game ||
        p.disputeId !== s.disputeId ||
        p.homeRegistrationId !== game.homeRegistrationId ||
        p.awayRegistrationId !== game.awayRegistrationId
      )
        issue();
    }
    for (const o of s.occurrences) {
      const game = games.get(o.gameId),
        e = o.effect;
      if (
        !game ||
        o.gameVersion !== game.version ||
        o.publicationVersion !==
          (publications.get(o.gameId)?.publicationVersion ?? 0)
      ) {
        issue();
        continue;
      }
      if (e.kind === "wo" && !s.rules.wo) issue();
      const award =
        e.kind === "wo"
          ? e
          : e.kind === "administrative" && e.decision.kind === "award"
            ? e.decision
            : null;
      if (
        award &&
        ![game.homeRegistrationId, game.awayRegistrationId].includes(
          award.winnerRegistrationId,
        )
      )
        issue();
      if (
        e.kind === "administrative" &&
        e.decision.kind === "award" &&
        e.decision.score
      ) {
        const score = e.decision.score,
          homeWon = e.decision.winnerRegistrationId === game.homeRegistrationId;
        if (
          score.homePoints === score.awayPoints ||
          homeWon !== score.homePoints > score.awayPoints
        )
          issue();
      }
    }
    for (const w of s.withdrawals) {
      if (
        !registrations.has(w.registrationId) ||
        new Set(w.previousGameIds).size !== w.previousGameIds.length
      )
        issue();
      for (const id of w.previousGameIds) {
        const g = games.get(id),
          effect = occurrences.get(id)?.effect;
        if (
          !g ||
          ![g.homeRegistrationId, g.awayRegistrationId].includes(
            w.registrationId,
          ) ||
          (!publications.has(id) && (!effect || !isAward(effect)))
        )
          issue();
      }
    }
  });
export type OccurrencesInput = z.infer<typeof occurrencesInputSchema>;
export type GameOccurrence = z.infer<typeof gameOccurrenceSchema>;
export const competitiveAwardSchema = z
  .object({
    kind: z.enum(["wo", "administrative"]),
    occurrenceId: uuid,
    version,
    winnerRegistrationId: uuid,
    homeLeaguePoints: leaguePoints,
    awayLeaguePoints: leaguePoints,
    score: administrativeScoreSchema.nullable(),
  })
  .strict();
export type CompetitiveAward = z.infer<typeof competitiveAwardSchema>;
export type CompetitiveOutcome =
  | { kind: "played"; publication: CompetitiveFact }
  | { kind: "awarded"; award: CompetitiveAward };
type PreviewGame = {
  gameId: string;
  homeRegistrationId: string;
  awayRegistrationId: string;
  state: "played" | "awarded" | "pending" | "excluded" | "conflict";
  needs:
    | "result"
    | "postponed"
    | "interrupted"
    | "withdrawal_decision"
    | "withdrawal_review"
    | null;
  publication: CompetitiveFact | null;
  occurrence: GameOccurrence | null;
  withdrawals: z.infer<typeof withdrawalSchema>[];
  outcome: CompetitiveOutcome | null;
};
/** Competitive preview, never a writer or a source of fabricated athlete facts. */
export function previewOccurrences(input: unknown) {
  const s = occurrencesInputSchema.parse(input),
    facts = new Map(s.publishedGames.map((g) => [g.gameId, g])),
    occurrences = new Map(s.occurrences.map((o) => [o.gameId, o])),
    withdrawals = new Map(
      s.withdrawals.map((w) => [
        w.registrationId,
        { record: w, prior: new Set(w.previousGameIds) },
      ]),
    );
  const games = [...s.games]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((g): PreviewGame => {
      const publication = facts.get(g.id) ?? null,
        occurrence = occurrences.get(g.id) ?? null,
        affected = [
          withdrawals.get(g.homeRegistrationId),
          withdrawals.get(g.awayRegistrationId),
        ]
          .filter((w) => w !== undefined)
          .sort((a, b) => a.record.id.localeCompare(b.record.id));
      const item: PreviewGame = {
        gameId: g.id,
        homeRegistrationId: g.homeRegistrationId,
        awayRegistrationId: g.awayRegistrationId,
        state: publication ? "played" : "pending",
        needs: publication ? null : "result",
        publication,
        occurrence,
        withdrawals: affected.map((w) => w.record),
        outcome: publication ? { kind: "played", publication } : null,
      };
      if (occurrence) {
        const e = occurrence.effect;
        if (e.kind === "postponed" || e.kind === "interrupted") {
          item.state = "pending";
          item.needs = e.kind;
          item.outcome = null;
        } else if (
          e.kind === "cancelled" ||
          (e.kind === "administrative" && e.decision.kind === "exclude")
        ) {
          item.state = "excluded";
          item.needs = null;
          item.outcome = null;
        } else {
          let award: CompetitiveAward;
          if (e.kind === "wo") {
            const rule = s.rules.wo!,
              homeWon = e.winnerRegistrationId === g.homeRegistrationId;
            award = {
              kind: "wo",
              occurrenceId: occurrence.id,
              version: occurrence.version,
              winnerRegistrationId: e.winnerRegistrationId,
              homeLeaguePoints: homeWon
                ? rule.winnerLeaguePoints
                : rule.loserLeaguePoints,
              awayLeaguePoints: homeWon
                ? rule.loserLeaguePoints
                : rule.winnerLeaguePoints,
              score: rule.score
                ? {
                    homePoints: homeWon ? rule.score.winner : rule.score.loser,
                    awayPoints: homeWon ? rule.score.loser : rule.score.winner,
                  }
                : null,
            };
          } else {
            // Remaining effect is an explicit administrative award.
            if (e.kind !== "administrative" || e.decision.kind !== "award")
              throw Error("Efeito administrativo inválido.");
            const d = e.decision;
            award = {
              kind: "administrative",
              occurrenceId: occurrence.id,
              version: occurrence.version,
              winnerRegistrationId: d.winnerRegistrationId,
              homeLeaguePoints: d.homeLeaguePoints,
              awayLeaguePoints: d.awayLeaguePoints,
              score: d.score,
            };
          }
          item.state = "awarded";
          item.needs = null;
          item.outcome = { kind: "awarded", award };
        }
      }
      if (
        affected.some(
          (w) => w.prior.has(g.id) && w.record.policy === "exclude_results",
        )
      ) {
        item.state = "excluded";
        item.needs = null;
        item.outcome = null;
      } else if (
        affected.some((w) => !w.prior.has(g.id)) &&
        item.state !== "awarded" &&
        item.state !== "excluded"
      ) {
        item.state = publication ? "conflict" : "pending";
        item.needs = publication ? "withdrawal_review" : "withdrawal_decision";
        item.outcome = null;
      }
      return item;
    });
  const gameVersions = new Map(s.games.map((g) => [g.id, g.version]));
  return {
    algorithmVersion: "occurrences-v1" as const,
    status: "preview" as const,
    disputeId: s.disputeId,
    regulationVersion: s.regulationVersion,
    games,
    lineage: games.map((g) => ({
      gameId: g.gameId,
      gameVersion: gameVersions.get(g.gameId)!,
      publicationVersion: g.publication?.publicationVersion ?? 0,
      occurrenceVersion: g.occurrence?.version ?? 0,
      withdrawalVersions: g.withdrawals.map((w) => ({
        id: w.id,
        version: w.version,
      })),
    })),
  };
}
