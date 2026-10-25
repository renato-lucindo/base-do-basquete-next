export const transferId = (n: number) =>
  `f3100000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export function transferFixture() {
  const id = transferId,
    disputeId = id(90),
    personId = id(1);
  const registration = (n: number) => ({
    id: id(n),
    disputeId,
    teamId: id(80),
    name: `Lobos ${n}`,
    version: 2,
  });
  const member = (n: number, r: number, p = 1, jersey = "12") => ({
    id: id(n),
    personId: id(p),
    disputeId,
    registrationId: id(r),
    jersey: jersey as string | null,
    version: 3,
    startedAt: "2026-10-23T12:00:00.000000Z",
    endedAt: null as string | null,
  });
  return {
    context: {
      disputeId,
      personId,
      regulation: {
        version: 5,
        transfers: "allowed" as "allowed" | "forbidden" | null,
      },
      contextFingerprint: "a".repeat(64),
      effectiveAt: "2026-10-25T02:30:00.123456Z",
      registrations: [registration(10), registration(11)],
      memberships: [member(20, 10), member(21, 11, 2, "0")],
    },
    command: {
      commandId: id(100),
      disputeId,
      sourceEntryId: id(20),
      expectedSourceVersion: 3,
      destinationRegistrationId: id(11),
      expectedDestinationVersion: 2,
      expectedRegulationVersion: 5,
      expectedContextFingerprint: "a".repeat(64),
      newEntryId: id(30),
      jersey: "00" as string | null,
      reason: "Transferência conforme o regulamento da disputa",
      acknowledgeImpact: false,
    },
  };
}
