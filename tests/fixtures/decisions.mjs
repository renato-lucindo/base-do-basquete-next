import assert from "node:assert/strict";
import { Response } from "miniflare";
export function decisionBackend(regulation, options) {
  const occurrences = new Map(),
    withdrawals = new Map(),
    receipts = new Map();
  const occurrenceHistory = new Map(),
    withdrawalHistory = new Map();
  const names = new Set([
    "get_game_occurrence_state",
    "get_game_occurrence_version",
    "save_game_occurrence",
    "get_registration_withdrawal_state",
    "get_registration_withdrawal_version",
    "save_registration_withdrawal",
  ]);
  const stamp = "2026-10-25T01:00:00Z",
    actor = "10000000-0000-4000-8000-000000000001";
  return async (request) => {
    const rpc = new URL(request.url).pathname.split("/").at(-1);
    if (!names.has(rpc)) return;
    assert.equal(request.headers.get("authorization"), "Bearer fixture-access");
    const args = await request.json(),
      occurrence = rpc.includes("game_occurrence"),
      heads = occurrence ? occurrences : withdrawals,
      history = occurrence ? occurrenceHistory : withdrawalHistory,
      target = occurrence ? args.p_game_id : args.p_registration_id;
    if (rpc.startsWith("get_")) {
      if (rpc.endsWith("_version"))
        return Response.json(
          history.get(target)?.find((h) => h.version === args.p_version) ??
            null,
        );
      const head = heads.get(target) ?? null,
        rows = history.get(target) ?? [],
        start = args.p_offset ?? 0;
      const common = {
        disputeId: regulation.disputeId,
        regulationVersion: regulation.version,
        contextFingerprint: regulation.contextFingerprint,
        head,
        history: rows.slice(start, start + 20).map((h) => ({
          id: h.id,
          version: h.version,
          reason: h.reason,
          actorId: h.actorId,
          savedAt: h.savedAt,
          active: occurrence ? h.effect !== null : h.policy !== null,
        })),
        hasMore: rows.length > start + 20,
      };
      if (occurrence) {
        const game = regulation.context.games.find((g) => g.id === target);
        if (!game)
          return Response.json({ message: "game_not_found" }, { status: 404 });
        return Response.json({
          ...common,
          gameId: target,
          gameVersion: game.version,
          publicationVersion:
            regulation.context.publishedGames.find((g) => g.gameId === target)
              ?.publicationVersion ?? 0,
        });
      }
      return Response.json({
        ...common,
        registrationId: target,
        previousGameIds: regulation.context.publishedGames
          .filter((g) =>
            [g.homeRegistrationId, g.awayRegistrationId].includes(target),
          )
          .map((g) => g.gameId)
          .sort(),
      });
    }
    const c = args.p_command,
      key = occurrence ? c.gameId : c.registrationId,
      old = heads.get(key),
      receipt = receipts.get(c.commandId);
    if (receipt) {
      assert.deepEqual(c, receipt.command);
      return Response.json(receipt.ack);
    }
    if (c.expectedVersion !== (old?.version ?? 0))
      return Response.json({ message: "version_conflict" }, { status: 409 });
    if (c.expectedContextFingerprint !== regulation.contextFingerprint)
      return Response.json({ message: "context_conflict" }, { status: 409 });
    const next = {
      id: occurrence ? c.occurrenceId : c.withdrawalId,
      disputeId: c.disputeId,
      version: c.expectedVersion + 1,
      regulationVersion: c.expectedRegulationVersion,
      contextFingerprint: c.expectedContextFingerprint,
      reason: c.reason,
      actorId: actor,
      savedAt: stamp,
      ...(occurrence
        ? {
            gameId: c.gameId,
            gameVersion: c.expectedGameVersion,
            publicationVersion: c.expectedPublicationVersion,
            effect: c.effect,
          }
        : {
            registrationId: c.registrationId,
            policy: c.policy,
            previousGameIds: c.previousGameIds,
          }),
    };
    heads.set(key, next);
    history.set(key, [next, ...(history.get(key) ?? [])]);
    if (occurrence) {
      regulation.context.occurrences = regulation.context.occurrences.filter(
        (o) => o.gameId !== key,
      );
      if (c.effect)
        regulation.context.occurrences.push({
          id: next.id,
          version: next.version,
          gameId: c.gameId,
          gameVersion: c.expectedGameVersion,
          publicationVersion: c.expectedPublicationVersion,
          effect: c.effect,
          reason: c.reason,
        });
      options.occurrenceCommits = (options.occurrenceCommits ?? 0) + 1;
    } else {
      regulation.context.withdrawals = regulation.context.withdrawals.filter(
        (w) => w.registrationId !== key,
      );
      if (c.policy)
        regulation.context.withdrawals.push({
          id: next.id,
          version: next.version,
          registrationId: key,
          policy: c.policy,
          previousGameIds: c.previousGameIds,
          reason: c.reason,
        });
      options.withdrawalCommits = (options.withdrawalCommits ?? 0) + 1;
    }
    const ack = {
      commandId: c.commandId,
      disputeId: c.disputeId,
      version: next.version,
      savedAt: stamp,
      contextFingerprint: c.expectedContextFingerprint,
      ...(occurrence
        ? { gameId: c.gameId, occurrenceId: c.occurrenceId }
        : { registrationId: c.registrationId, withdrawalId: c.withdrawalId }),
    };
    receipts.set(c.commandId, { command: structuredClone(c), ack });
    regulation.context.decisionVersion =
      (options.occurrenceCommits ?? 0) + (options.withdrawalCommits ?? 0);
    regulation.contextFingerprint = regulation.context.decisionVersion
      .toString(16)
      .padStart(64, "0");
    const lose = occurrence ? "loseOccurrenceAck" : "loseWithdrawalAck";
    if (options[lose]) {
      options[lose] = false;
      return Response.json(
        { message: "fixture-private-provider-value" },
        { status: 503 },
      );
    }
    return Response.json(ack);
  };
}
