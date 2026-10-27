import assert from "node:assert/strict";

// HTTP contract fixture only; actual SQL/FKs/locks are proved separately.
export function registrationRemovalOutbound(options) {
  const receipts = new Map(),
    removed = new Map();
  return async (request) => {
    const path = new URL(request.url).pathname;
    if (
      ![
        "/rest/v1/rpc/get_registration_removal_context",
        "/rest/v1/rpc/remove_registration",
      ].includes(path)
    )
      return;
    assert.equal(request.headers.get("authorization"), "Bearer fixture-access");
    const args = await request.json();
    if (path.endsWith("get_registration_removal_context"))
      return Response.json(
        removed.get(args.p_registration_id) ?? {
          state: "available",
          registration: {
            id: args.p_registration_id,
            disputeId: args.p_dispute_id,
            teamId: args.p_registration_id,
            name: "Reserva",
            teamName: "Clube",
            version: 1,
          },
          blockers: [],
        },
      );
    const c = args.p_command,
      fingerprint = JSON.stringify(c),
      previous = receipts.get(c.commandId);
    if (previous)
      return previous.fingerprint === fingerprint
        ? Response.json(previous.result)
        : Response.json(
            { message: "idempotency_conflict", details: "private SQL" },
            { status: 409 },
          );
    if (removed.has(c.registrationId))
      return Response.json(
        { message: "registration_removed" },
        { status: 409 },
      );
    const result = {
      state: "removed",
      id: c.registrationId,
      disputeId: c.disputeId,
      deletedVersion: c.expectedVersion,
    };
    receipts.set(c.commandId, { fingerprint, result });
    removed.set(c.registrationId, result);
    if (options.removalLoseAck) {
      options.removalLoseAck = false;
      return Response.json({ message: "fixture lost ACK" }, { status: 503 });
    }
    return Response.json(result);
  };
}
