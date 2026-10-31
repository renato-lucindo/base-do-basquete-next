import { z } from "zod";
import {
  eventSchema,
  validateSheet,
  type Sheet,
  type Side,
} from "../domain/scoresheet";
import { assertStartingFive } from "../scoresheet/lineup";
import { assertStaffReady } from "../scoresheet/staff";

export const participantSchema = z
  .object({
    rosterEntryId: z.uuid(),
    side: z.enum(["home", "away"]),
    jersey: z.string().regex(/^(00|0|[1-9][0-9]?)$/u),
    played: z.boolean(),
    starter: z.boolean(),
  })
  .strict();
const staffSchema = z
  .object({
    captainRosterEntryId: z.uuid().nullable(),
    coachStaffEntryId: z.uuid().nullable(),
    assistantStaffEntryId: z.uuid().nullable(),
  })
  .strict();
export const persistedSheetSchema = z
  .object({
    formatVersion: z.literal(2).optional(),
    rulesVersion: z.literal("FIBA_2024"),
    periods: z.number().int().min(4).max(12),
    participants: z.array(participantSchema).max(24),
    staff: z.object({ home: staffSchema, away: staffSchema }).strict(),
    events: z
      .array(
        eventSchema
          .extend({ code: z.string().trim().toUpperCase().max(3) })
          .strict(),
      )
      .max(2000),
  })
  .strict()
  .superRefine((d, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    for (const event of d.events) {
      if (
        (!d.formatVersion &&
          (event.target === "TO" || event.actorId || event.successorId)) ||
        (d.formatVersion === 2 &&
          event.actorId &&
          event.target !== "C" &&
          event.target !== "AT")
      )
        fail("Autoria de comissão técnica incompatível com o lançamento.");
    }
    if (
      new Set(d.participants.map((p) => p.rosterEntryId)).size !==
      d.participants.length
    )
      fail("Atleta duplicado.");
    if (new Set(d.events.map((e) => e.id)).size !== d.events.length)
      fail("Lançamento duplicado.");
    for (const side of ["home", "away"] as const) {
      const rows = d.participants.filter((p) => p.side === side),
        staff = d.staff[side];
      if (
        rows.length > 12 ||
        new Set(rows.map((p) => p.jersey)).size !== rows.length
      )
        fail("Revise relacionados e camisas da equipe.");
      if (
        rows.filter((p) => p.starter).length > 5 ||
        rows.some((p) => p.starter && !p.played)
      )
        fail("Revise os cinco titulares e a participação.");
      if (
        staff.captainRosterEntryId &&
        !rows.some((p) => p.rosterEntryId === staff.captainRosterEntryId)
      )
        fail("O capitão deve estar relacionado à própria equipe.");
      if (
        staff.assistantStaffEntryId &&
        (!staff.coachStaffEntryId ||
          staff.assistantStaffEntryId === staff.coachStaffEntryId)
      )
        fail("Assistente exige técnico próprio distinto.");
    }
  });
export type PersistedSheet = z.infer<typeof persistedSheetSchema>;
export const saveSheetSchema = z
  .object({
    requestId: z.uuid(),
    gameId: z.uuid(),
    gameVersion: z.number().int().positive().max(2147483646),
    baseVersion: z.number().int().min(0).max(2147483646),
    document: persistedSheetSchema,
    confirm: z.literal(false),
    reason: z.string().trim().max(500),
  })
  .strict();
export type SaveSheet = z.infer<typeof saveSheetSchema>;
export const sheetSaveResultSchema = z
  .object({
    requestId: z.uuid(),
    version: z.number().int().positive(),
    confirmed: z.boolean(),
  })
  .strict();
const person = z
  .object({
    id: z.uuid(),
    name: z.string().min(1).max(120),
    nickname: z.string().max(120).nullable(),
  })
  .strict();
const staffSnapshot = z
  .object({
    captain: person.nullable(),
    coach: person.nullable(),
    assistant: person.nullable(),
  })
  .strict();
export const sheetSnapshotSchema = z
  .object({
    gameId: z.uuid(),
    gameVersion: z.number().int().positive(),
    version: z.number().int().positive(),
    savedAt: z.iso.datetime({ offset: true }),
    confirmed: z.boolean(),
    document: persistedSheetSchema,
    participants: z
      .array(
        z
          .object({
            rosterEntryId: z.uuid(),
            registrationId: z.uuid(),
            side: z.enum(["home", "away"]),
            person,
          })
          .strict(),
      )
      .max(24),
    staff: z.object({ home: staffSnapshot, away: staffSnapshot }).strict(),
  })
  .strict()
  .refine(
    (s) =>
      s.participants.length === s.document.participants.length &&
      s.document.participants.every(
        (p) =>
          s.participants.filter(
            (r) => r.rosterEntryId === p.rosterEntryId && r.side === p.side,
          ).length === 1,
      ) &&
      new Set(s.participants.map((p) => p.person.id)).size ===
        s.participants.length,
  );
export type SheetSnapshot = z.infer<typeof sheetSnapshotSchema>;
export function emptyPersistedSheet(formatVersion?: 2): PersistedSheet {
  const staff = () => ({
    captainRosterEntryId: null,
    coachStaffEntryId: null,
    assistantStaffEntryId: null,
  });
  return {
    ...(formatVersion ? { formatVersion } : {}),
    rulesVersion: "FIBA_2024",
    periods: 4,
    participants: [],
    staff: { home: staff(), away: staff() },
    events: [],
  };
}
export function toEngineSheet(d: PersistedSheet): Sheet {
  const captain = (side: Side) => {
    const i = d.participants.findIndex(
      (p) =>
        p.side === side &&
        p.rosterEntryId === d.staff[side].captainRosterEntryId,
    );
    return i < 0 ? null : i + 1;
  };
  const staff = (side: Side) => ({
    captainId: captain(side),
    captainIsCoach: !d.staff[side].coachStaffEntryId,
    // The engine only needs a nonempty indicator; names are resolved by SQL.
    coachName: d.staff[side].coachStaffEntryId ?? "",
    assistantName: d.staff[side].assistantStaffEntryId ?? "",
  });
  return {
    ...(d.formatVersion ? { formatVersion: d.formatVersion } : {}),
    rulesVersion: d.rulesVersion,
    periods: d.periods,
    roster: d.participants.map((p, i) => ({
      rosterEntryId: i + 1,
      actorId: p.rosterEntryId,
      registrationId: p.side === "home" ? 1 : 2,
      side: p.side,
      jersey: p.jersey,
      played: p.played,
      starter: p.starter,
    })),
    staff: { home: staff("home"), away: staff("away") },
    coachPlayer: {
      home: d.staff.home.coachStaffEntryId ? null : captain("home"),
      away: d.staff.away.coachStaffEntryId ? null : captain("away"),
    },
    events: d.events,
  };
}
export function validatePersistedSheet(
  input: unknown,
  final = false,
): PersistedSheet {
  const d = persistedSheetSchema.parse(input),
    complete = ["home", "away"].every((s) =>
      d.participants.some((p) => p.side === s),
    );
  if (!complete) {
    if (final || d.events.length)
      throw Error("Relacione atletas das duas equipes antes de lançar ações.");
    return d;
  }
  const engine = validateSheet(toEngineSheet(d), final);
  if (final) {
    if (
      !d.staff.home.captainRosterEntryId ||
      !d.staff.away.captainRosterEntryId
    )
      throw Error("Selecione o capitão das duas equipes.");
    assertStaffReady(engine);
    assertStartingFive(engine);
  }
  return d;
}
