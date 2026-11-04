import { z } from "zod";
import { registrationSnapshotSchema } from "../teams/contract";
const label = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(/^[^\u0000-\u001f\u007f]*$/u)
    .transform((v) => v.replace(/\s+/gu, " ") || null)
    .nullable();
// Wall-clock timestamps entered in the game's time zone (America/Sao_Paulo).
// This is actual elapsed time, including intervals, not the scheduled start.
const actualClock = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/u)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(`${v}:00Z`)) &&
      new Date(`${v}:00Z`).toISOString().slice(0, 16) === v,
  )
  .nullable();
export function durationMinutes(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
): number | null {
  if (!startAt || !endAt) return null;
  const minutes =
    (Date.parse(`${endAt}:00Z`) - Date.parse(`${startAt}:00Z`)) / 60000;
  return Number.isFinite(minutes) && minutes > 0 && minutes <= 1440
    ? minutes
    : null;
}
const gameFields = {
  id: z.uuid(),
  disputeId: z.uuid(),
  homeRegistrationId: z.uuid(),
  awayRegistrationId: z.uuid(),
  date: z.iso
    .date()
    .refine((v) => Number(v.slice(0, 4)) >= 1)
    .nullable(),
  time: z
    .string()
    .regex(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/u)
    .nullable(),
  startAt: actualClock.optional(),
  endAt: actualClock.optional(),
  venue: label(160),
  number: label(40),
  stageKind: z.enum(["round_robin", "knockout"]).optional(),
  round: z.number().int().min(1).max(2147483647).nullable().optional(),
  knockoutStage: z
    .string()
    .regex(/^[^\u0000-\u001f\u007f]*$/u)
    .nullable()
    .pipe(label(100))
    .optional(),
};
const valid = (g: {
  homeRegistrationId: string;
  awayRegistrationId: string;
  date: string | null;
  time: string | null;
  startAt?: string | null;
  endAt?: string | null;
  stageKind?: "round_robin" | "knockout";
  knockoutStage?: string | null;
}) =>
  g.homeRegistrationId !== g.awayRegistrationId &&
  (g.time === null || g.date !== null) &&
  (g.endAt == null || durationMinutes(g.startAt, g.endAt) !== null) &&
  (g.knockoutStage == null || g.stageKind === "knockout");
export const gameSchema = z.object(gameFields).strict().refine(valid, {
  message:
    "Escolha inscrições distintas, informe a data da agenda e confira os horários reais de início e término.",
});
export const saveGameSchema = z
  .object({
    commandId: z.uuid(),
    expectedVersion: z.number().int().min(0).max(2147483646),
    game: gameSchema,
  })
  .strict();
export const gameSnapshotSchema = z
  .object({
    ...gameFields,
    version: z.number().int().positive(),
    savedAt: z.iso.datetime({ offset: true }),
    state: z.enum(["scheduled", "finished"]),
    timeZone: z.literal("America/Sao_Paulo"),
    scheduledAt: z.iso.datetime({ offset: true }).nullable(),
    home: registrationSnapshotSchema,
    away: registrationSnapshotSchema,
  })
  .strict()
  .refine(
    (g) =>
      valid(g) &&
      g.home.id === g.homeRegistrationId &&
      g.away.id === g.awayRegistrationId &&
      g.home.disputeId === g.disputeId &&
      g.away.disputeId === g.disputeId &&
      (g.scheduledAt !== null) === (g.date !== null && g.time !== null),
  );
export const gameListingSchema = z
  .object({ items: z.array(gameSnapshotSchema).max(20), hasMore: z.boolean() })
  .strict();
export type GameSnapshot = z.infer<typeof gameSnapshotSchema>;
export type SaveGame = z.infer<typeof saveGameSchema>;
export const roundListingSchema = z
  .object({
    items: z
      .array(
        z
          .object({ round: z.number().int().positive().max(2147483647) })
          .strict(),
      )
      .max(20),
    hasMore: z.boolean(),
  })
  .strict();
export const venueListingSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            name: z
              .string()
              .min(1)
              .max(160)
              .regex(/^[^\u0000-\u001f\u007f]*$/u),
          })
          .strict(),
      )
      .max(20),
    hasMore: z.boolean(),
  })
  .strict();

export const gameOrderSchema = z
  .object({
    column: z.enum(["number", "matchup", "date", "time", "venue", "state"]),
    direction: z.enum(["asc", "desc"]),
  })
  .strict();
export type GameOrder = z.infer<typeof gameOrderSchema>;
