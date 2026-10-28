import { z } from "zod";
import { gameSnapshotSchema, saveGameSchema } from "./contract";

export const officialRoles = [
  "referee",
  "umpire1",
  "umpire2",
  "scorer",
  "timer",
  "shotClock",
] as const;
export const officialNameSchema = z
  .string()
  .max(160)
  .regex(/^[^\u0000-\u001f\u007f]*$/u)
  .transform((name) => name.trim().replace(/\s+/gu, " "))
  .pipe(z.string().min(1).max(160));
export const officialSelectionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("existing"), id: z.uuid() }).strict(),
  z
    .object({
      kind: z.literal("new"),
      id: z.uuid(),
      name: officialNameSchema,
      confirmHomonym: z.boolean(),
    })
    .strict(),
]);
export type OfficialRole = (typeof officialRoles)[number];
export type OfficialSelection = z.infer<typeof officialSelectionSchema>;
export function emptyOfficiating() {
  return {
    referee: null,
    umpire1: null,
    umpire2: null,
    scorer: null,
    timer: null,
    shotClock: null,
  };
}
export const officiatingSchema = z
  .object({
    referee: officialSelectionSchema.nullable(),
    umpire1: officialSelectionSchema.nullable(),
    umpire2: officialSelectionSchema.nullable(),
    scorer: officialSelectionSchema.nullable(),
    timer: officialSelectionSchema.nullable(),
    shotClock: officialSelectionSchema.nullable(),
  })
  .strict()
  .refine(
    (slots) => {
      if (
        (slots.umpire1 && !slots.referee) ||
        (slots.umpire2 && !slots.umpire1) ||
        (slots.timer && !slots.scorer) ||
        (slots.shotClock && !slots.timer)
      )
        return false;
      const ids = officialRoles.flatMap((role) =>
        slots[role] ? [slots[role].id.toLowerCase()] : [],
      );
      return new Set(ids).size === ids.length;
    },
    {
      message:
        "Preencha as funções em sequência, sem repetir uma pessoa no jogo.",
    },
  );
export type Officiating = z.infer<typeof officiatingSchema>;
export const saveGameEditorSchema = saveGameSchema
  .extend({ officiating: officiatingSchema })
  .strict();
export type SaveGameEditor = z.infer<typeof saveGameEditorSchema>;
const officialSnapshot = z
  .object({ id: z.uuid(), name: officialNameSchema })
  .strict()
  .nullable();
export const officiatingSnapshotSchema = z
  .object({
    referee: officialSnapshot,
    umpire1: officialSnapshot,
    umpire2: officialSnapshot,
    scorer: officialSnapshot,
    timer: officialSnapshot,
    shotClock: officialSnapshot,
  })
  .strict();
export const gameEditorSnapshotSchema = z
  .object({ game: gameSnapshotSchema, officiating: officiatingSnapshotSchema })
  .strict();
export const officialListingSchema = z
  .object({
    items: z
      .array(z.object({ id: z.uuid(), name: officialNameSchema }).strict())
      .max(20),
    hasMore: z.boolean(),
  })
  .strict();
