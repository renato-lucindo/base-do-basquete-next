import assert from "node:assert/strict";

const uuid = (n) => `f3100000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export function rosterReuseFixture(options) {
  const shared = {
    teamId: uuid(1),
    seasonId: uuid(2),
    championshipId: uuid(3),
    name: "Equipe sintética",
    category: "Sub-16",
    gender: "masculino",
    year: 2026,
    division: null,
    version: 1,
  };
  const source = { ...shared, id: uuid(4), disputeId: uuid(5) };
  const target = { ...shared, id: uuid(6), disputeId: uuid(7) };
  const candidates = [0, 1].map((index) => ({
    sourceEntryId: uuid(10 + index),
    sourceVersion: 1,
    person: {
      id: uuid(20 + index),
      name: `Atleta sintético ${index + 1}`,
      nickname: null,
    },
    jersey: index ? "00" : "0",
    eligibility: "eligible",
  }));
  const targetRoster = [
    { id: uuid(30), personId: uuid(31), jersey: "12", version: 1 },
  ];
  const fingerprint = "a".repeat(64);
  const receipts = new Map();
  const initialTarget = structuredClone(targetRoster);
  const initialCandidates = structuredClone(candidates);

  const handler = async (request) => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/rest/v1/rpc/")) return null;
    const name = url.pathname.split("/").at(-1);
    if (
      ![
        "list_roster_reuse_sources",
        "get_roster_reuse_context",
        "apply_roster_reuse",
      ].includes(name)
    )
      return null;
    assert.equal(request.headers.get("authorization"), "Bearer fixture-access");
    assert.equal(request.headers.get("apikey"), "fixture-publishable");
    const args = await request.json();
    if (name === "list_roster_reuse_sources") {
      assert.deepEqual(args, {
        p_target_registration_id: target.id,
        p_offset: 0,
      });
      return Response.json({
        items: [
          { ...source, athleteCount: 2, savedAt: "2026-10-29T20:00:00Z" },
        ],
        hasMore: false,
      });
    }
    if (name === "get_roster_reuse_context") {
      assert.deepEqual(args, {
        p_source_registration_id: source.id,
        p_target_registration_id: target.id,
      });
      return Response.json({
        source,
        target,
        targetRoster,
        candidates,
        contextFingerprint: options.staleReuseContext
          ? "b".repeat(64)
          : fingerprint,
      });
    }
    const command = args.p_command;
    const saved = receipts.get(command.commandId);
    if (saved) {
      if (JSON.stringify(saved.command) !== JSON.stringify(command))
        return Response.json(
          { message: "idempotency_conflict" },
          { status: 409 },
        );
      return Response.json(saved.receipt);
    }
    if (
      options.staleReuseContext ||
      command.expectedContextFingerprint !== fingerprint
    )
      return Response.json(
        { message: "reuse_context_conflict" },
        { status: 409 },
      );
    assert.equal(command.sourceRegistrationId, source.id);
    assert.equal(command.targetRegistrationId, target.id);
    assert.equal(command.confirmed, true);
    const receipt = {
      commandId: command.commandId,
      sourceRegistrationId: source.id,
      targetRegistrationId: target.id,
      items: command.items.map((item) => ({
        sourceEntryId: item.sourceEntryId,
        personId: candidates.find((c) => c.sourceEntryId === item.sourceEntryId)
          .person.id,
        newEntryId: item.newEntryId,
        version: 1,
      })),
    };
    for (const item of command.items) {
      targetRoster.push({
        id: item.newEntryId,
        personId: candidates.find((c) => c.sourceEntryId === item.sourceEntryId)
          .person.id,
        jersey: item.jersey,
        version: 1,
      });
    }
    receipts.set(command.commandId, {
      command: structuredClone(command),
      receipt,
    });
    options.reuseCommits = (options.reuseCommits ?? 0) + 1;
    if (options.loseReuseAck) {
      options.loseReuseAck = false;
      return Response.json(
        { message: "transient outbound failure" },
        { status: 503 },
      );
    }
    return Response.json(receipt);
  };

  return {
    source,
    target,
    candidates,
    fingerprint,
    targetRoster,
    initialTarget,
    initialCandidates,
    handler,
    uuid,
  };
}
