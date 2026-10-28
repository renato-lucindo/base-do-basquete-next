import { z } from "zod";
const jersey = z.string().regex(/^(00|0|[1-9][0-9]?)$/u);
const person = z
  .object({
    id: z.uuid(),
    name: z.string().min(1).max(120),
    nickname: z.string().max(120).nullable(),
  })
  .strict();
export const preparationCandidateSchema = z
  .object({
    id: z.uuid(),
    registrationId: z.uuid(),
    personId: z.uuid(),
    jersey: jersey.nullable(),
    person,
  })
  .strict()
  .refine((r) => r.person.id === r.personId);
const previous = z
  .object({
    gameId: z.uuid(),
    version: z.number().int().positive(),
    date: z.iso.date().nullable(),
    time: z.string().nullable(),
    savedAt: z.iso.datetime({ offset: true }),
    players: z
      .array(
        z.object({ personId: z.uuid(), jersey, starter: z.boolean() }).strict(),
      )
      .max(12),
    captainPersonId: z.uuid().nullable(),
    coachPersonId: z.uuid().nullable(),
    assistantPersonId: z.uuid().nullable(),
  })
  .strict();
const side = z
  .object({
    registrationId: z.uuid(),
    roster: z.array(preparationCandidateSchema).max(2000),
    staff: z
      .array(
        z
          .object({
            id: z.uuid(),
            personId: z.uuid(),
            role: z.enum(["head", "assistant"]),
            person,
          })
          .strict(),
      )
      .max(200),
    previous: previous.nullable(),
    lastJerseys: z.record(z.uuid(), jersey),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (
      new Set(s.roster.map((r) => r.id)).size !== s.roster.length ||
      new Set(s.roster.map((r) => r.personId)).size !== s.roster.length ||
      s.roster.some((r) => r.registrationId !== s.registrationId) ||
      s.staff.some((r) => r.person.id !== r.personId) ||
      Object.keys(s.lastJerseys).some(
        (id) => !s.roster.some((r) => r.id === id),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Contexto de preparação inconsistente.",
      });
  });
export const preparationContextSchema = z
  .object({
    gameId: z.uuid(),
    gameVersion: z.number().int().positive(),
    sides: z.object({ home: side, away: side }).strict(),
  })
  .strict()
  .refine((c) => c.sides.home.registrationId !== c.sides.away.registrationId);
export type PreparationContext = z.infer<typeof preparationContextSchema>;
export type PreparationCandidate = z.infer<typeof preparationCandidateSchema>;
