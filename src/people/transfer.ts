import { membershipMicros } from "./membership-time";
import {
  saveTransferSchema,
  transferContextSchema,
  transferPreviewSchema,
  type TransferPreview,
} from "./transfer-contract";

/** Read-only plan. Context, completeness and clock must come from the authorized server. */
export function previewTransfer(
  commandInput: unknown,
  contextInput: unknown,
): TransferPreview {
  const command = saveTransferSchema.parse(commandInput),
    context = transferContextSchema.parse(contextInput),
    source = context.memberships.find(
      (m) => m.id === command.sourceEntryId && m.personId === context.personId,
    ),
    destination = context.registrations.find(
      (r) => r.id === command.destinationRegistrationId,
    ),
    history = context.memberships.filter(
      (m) => m.personId === context.personId,
    ),
    active = history.find((m) => m.endedAt === null),
    now = membershipMicros(context.effectiveAt)!;
  const base = {
    algorithmVersion: "roster-transfer-v1" as const,
    status: "preview" as const,
    disputeId: context.disputeId,
    personId: context.personId,
    sourceEntryId: command.sourceEntryId,
    destinationRegistrationId: command.destinationRegistrationId,
    regulationVersion: context.regulation.version,
    contextFingerprint: context.contextFingerprint,
    effectiveAt: context.effectiveAt,
  };
  const blocked = (needs: NonNullable<TransferPreview["needs"]>) =>
    transferPreviewSchema.parse({
      ...base,
      ready: false,
      needs,
      kind: null,
      plan: null,
    });
  if (
    command.disputeId !== context.disputeId ||
    command.expectedContextFingerprint !== context.contextFingerprint
  )
    return blocked("context_changed");
  if (command.expectedRegulationVersion !== context.regulation.version)
    return blocked("regulation_changed");
  if (
    !source ||
    source.version !== command.expectedSourceVersion ||
    (active && active.id !== source.id) ||
    (!active &&
      history.some(
        (m) =>
          m.endedAt !== null &&
          membershipMicros(m.endedAt)! > membershipMicros(source.endedAt!)!,
      ))
  )
    return blocked("source_changed");
  if (
    !destination ||
    destination.version !== command.expectedDestinationVersion
  )
    return blocked("destination_changed");
  if (context.regulation.transfers === null) return blocked("rule_required");
  if (context.regulation.transfers === "forbidden")
    return blocked("transfer_forbidden");
  if (context.memberships.some((m) => m.id === command.newEntryId))
    return blocked("entry_id_used");
  if (active?.registrationId === destination.id)
    return blocked("same_registration");
  if (
    history.some(
      (m) =>
        membershipMicros(m.startedAt)! > now ||
        (m.endedAt !== null && membershipMicros(m.endedAt)! > now),
    )
  )
    return blocked("invalid_effective_time");
  if (
    command.jersey !== null &&
    context.memberships.some(
      (m) =>
        m.registrationId === destination.id &&
        m.endedAt === null &&
        m.jersey === command.jersey,
    )
  )
    return blocked("jersey_in_use");
  return transferPreviewSchema.parse({
    ...base,
    ready: true,
    needs: null,
    kind: history.some((m) => m.registrationId === destination.id)
      ? "return"
      : "transfer",
    plan: {
      close: active
        ? {
            id: active.id,
            expectedVersion: active.version,
            endedAt: context.effectiveAt,
          }
        : null,
      open: {
        id: command.newEntryId,
        personId: context.personId,
        disputeId: context.disputeId,
        registrationId: destination.id,
        jersey: command.jersey,
        version: 1,
        startedAt: context.effectiveAt,
        endedAt: null,
      },
    },
  });
}
