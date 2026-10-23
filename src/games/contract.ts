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
  venue: label(160),
  number: label(40),
};
const valid = (g: {
  homeRegistrationId: string;
  awayRegistrationId: string;
  date: string | null;
  time: string | null;
}) =>
  g.homeRegistrationId !== g.awayRegistrationId &&
  (g.time === null || g.date !== null);
export const gameSchema = z.object(gameFields).strict().refine(valid, {
  message:
    "Escolha duas inscrições distintas e informe a data antes do horário.",
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
    state: z.literal("scheduled"),
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
