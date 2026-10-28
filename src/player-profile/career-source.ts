import { z } from "zod";
import { publicPlayerProfileSchema } from "./contract";
import { confirmedPlayerGameSchema } from "./participation-contract";
import { publicAchievementsSchema } from "../achievements/publication-contract";

const uuid = z.uuid().transform((v) => v.toLowerCase()),
  version = z.number().int().min(1).max(2147483647);
const awardContext = z
  .object({
    disputeId: uuid,
    version,
    confirmedAt: z.iso.datetime({ offset: true }),
    context: publicAchievementsSchema.shape.context,
  })
  .strict();
export const playerHonorSchema = awardContext
  .extend({
    honor: publicAchievementsSchema.shape.honors.element.pick({
      id: true,
      title: true,
    }),
    recipient:
      publicAchievementsSchema.shape.honors.element.shape.athletes.element,
  })
  .strict();
export const playerTeamPlacementSchema = awardContext
  .extend({
    position: publicAchievementsSchema.shape.placements.element.shape.position,
    registration:
      publicAchievementsSchema.shape.placements.element.shape.registrations
        .element,
  })
  .strict();

export const playerCareerSourceSchema = z
  .object({
    kind: z.literal("confirmed-player-career-v1"),
    personId: uuid,
    profile: publicPlayerProfileSchema.nullable(),
    participations: z.array(confirmedPlayerGameSchema).max(10000),
    honors: z.array(playerHonorSchema).max(10000),
    teamPlacements: z.array(playerTeamPlacementSchema).max(10000),
  })
  .strict()
  .refine((s) => {
    if (s.profile?.personId !== undefined && s.profile.personId !== s.personId)
      return false;
    if (!s.profile && !s.participations.length && !s.honors.length)
      return false;
    const games = new Set<string>(),
      registrations = new Set<string>(),
      awards = new Set<string>(),
      placements = new Set<string>();
    for (const p of s.participations) {
      if (p.fact.person.id !== s.personId || games.has(p.fact.gameId))
        return false;
      games.add(p.fact.gameId);
      registrations.add(
        `${p.fact.disputeId}|${p.fact.registration.registrationId}|${p.fact.registration.team.id}`,
      );
    }
    for (const h of s.honors) {
      const key = `${h.disputeId}|${h.honor.id}`;
      if (h.recipient.personId !== s.personId || awards.has(key)) return false;
      awards.add(key);
    }
    for (const p of s.teamPlacements) {
      const key = `${p.disputeId}|${p.registration.registrationId}|${p.registration.teamId}`;
      if (!registrations.has(key) || placements.has(key)) return false;
      placements.add(key);
    }
    return true;
  }, "Fonte confirmada do atleta inconsistente.");
export type PlayerCareerSource = z.infer<typeof playerCareerSourceSchema>;
