import { aggregate, type Side } from "../domain/scoresheet";
import { toEngineSheet, type PersistedSheet } from "./sheet-contract";

type Action = Pick<
  PersistedSheet["events"][number],
  "side" | "period" | "target" | "code"
>;

/** Resolve the responsible person at the event's chronological position. */
export function authorAction(
  d: PersistedSheet,
  action: Action,
  editingId?: string | null,
  successorId?: string | null,
): PersistedSheet["events"][number] {
  const index = editingId
    ? d.events.findIndex((e) => e.id === editingId)
    : d.events.length;
  if (index < 0) throw Error("Ação não encontrada.");
  const existing = editingId ? d.events[index] : undefined;
  const event = { id: existing?.id ?? crypto.randomUUID(), ...action };
  if (d.formatVersion !== 2) return event;
  const prior = d.events.filter(
    (e, i) =>
      i !== index &&
      (e.period < action.period || (e.period === action.period && i < index)),
  );
  const { teams, errors } = aggregate(toEngineSheet({ ...d, events: prior }));
  if (errors.length) throw Error(errors[0]);
  const staffTarget = action.target === "C" || action.target === "AT";
  const actorId =
    action.target === "AT"
      ? d.staff[action.side as Side].assistantStaffEntryId
      : teams[action.side].activeCoachId;
  if (staffTarget && !actorId)
    throw Error("Indique o responsável antes de lançar a falta.");
  if (
    existing?.actorId &&
    (existing.actorId !== actorId ||
      !staffTarget ||
      existing.side !== action.side ||
      existing.target !== action.target)
  )
    throw Error(
      "O responsável por esta falta mudou após a correção. Exclua e registre novamente a ocorrência com autoria explícita.",
    );
  if (staffTarget && existing && !existing.actorId)
    throw Error(
      "Lançamento sem autoria não pode ser convertido automaticamente. Exclua e registre novamente.",
    );
  return {
    ...event,
    ...(staffTarget ? { actorId: actorId! } : {}),
    ...(successorId === undefined &&
    existing?.successorId &&
    existing.side === action.side &&
    existing.target === action.target
      ? { successorId: existing.successorId }
      : {}),
    ...(successorId ? { successorId } : {}),
  };
}
