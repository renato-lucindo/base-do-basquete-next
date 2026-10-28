import assert from "node:assert/strict";
import { Response } from "miniflare";
import { transferFixture } from "./transfers.ts";

// Controlled outbound proves transport only; SQL atomicity has its own real proofs.
export function transferBackend(options) {
  const { context } = transferFixture(),
    receipts = new Map();
  return async (request) => {
    const path = new URL(request.url).pathname;
    if (
      ![
        "/rest/v1/rpc/get_transfer_context",
        "/rest/v1/rpc/transfer_roster_entry",
      ].includes(path)
    )
      return null;
    assert.equal(request.headers.get("authorization"), "Bearer fixture-access");
    const args = await request.json();
    if (path.endsWith("/get_transfer_context")) return Response.json(context);
    const c = args.p_command,
      receipt = receipts.get(c.commandId);
    if (receipt) {
      assert.deepEqual(c, receipt.command);
      return Response.json(receipt.ack);
    }
    if (c.expectedContextFingerprint !== context.contextFingerprint)
      return Response.json(
        { message: "transfer_context_conflict", details: "private SQL" },
        { status: 409 },
      );
    const source = context.memberships.find((m) => m.id === c.sourceEntryId);
    const ack = {
      commandId: c.commandId,
      disputeId: c.disputeId,
      personId: context.personId,
      sourceEntryId: source.id,
      sourceVersion: source.version + 1,
      newEntryId: c.newEntryId,
      newEntryVersion: 1,
      destinationRegistrationId: c.destinationRegistrationId,
      effectiveAt: context.effectiveAt,
      kind: "transfer",
    };
    source.endedAt = context.effectiveAt;
    source.version++;
    context.memberships.push({
      id: c.newEntryId,
      personId: context.personId,
      disputeId: c.disputeId,
      registrationId: c.destinationRegistrationId,
      jersey: c.jersey,
      startedAt: context.effectiveAt,
      endedAt: null,
      version: 1,
    });
    context.contextFingerprint = "b".repeat(64);
    options.transferCommits = (options.transferCommits ?? 0) + 1;
    receipts.set(c.commandId, { command: structuredClone(c), ack });
    if (options.loseTransferAck) {
      options.loseTransferAck = false;
      return Response.json({ details: "private SQL" }, { status: 503 });
    }
    return Response.json(ack);
  };
}
