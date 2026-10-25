import { it, expect, vi } from "vitest";
import { SupabaseDecisions } from "./decision-provider";
import {
  regulationFixture,
  regulationId as id,
} from "../../tests/fixtures/regulation";
const config = { url: "https://db.example.test", key: "fixture-publishable" },
  hash = "a".repeat(64);
const occurrenceState = () => ({
  disputeId: id(90),
  gameId: id(100),
  gameVersion: 2,
  publicationVersion: 1,
  regulationVersion: 1,
  contextFingerprint: hash,
  head: null,
  history: [],
  hasMore: false,
});
const withdrawalState = () => ({
  disputeId: id(90),
  registrationId: id(1),
  regulationVersion: 1,
  contextFingerprint: hash,
  previousGameIds: [id(100)],
  head: null,
  history: [],
  hasMore: false,
});
const occurrence = () => ({
  commandId: id(500),
  disputeId: id(90),
  gameId: id(100),
  occurrenceId: id(600),
  expectedVersion: 0,
  expectedGameVersion: 2,
  expectedPublicationVersion: 1,
  expectedRegulationVersion: 1,
  expectedContextFingerprint: hash,
  effect: { kind: "cancelled" as const },
  reason: "Conferência do cancelamento",
  acknowledgeImpact: true,
});
const withdrawal = () => ({
  commandId: id(501),
  disputeId: id(90),
  registrationId: id(1),
  withdrawalId: id(601),
  expectedVersion: 0,
  expectedRegulationVersion: 1,
  expectedContextFingerprint: hash,
  policy: "exclude_results" as const,
  previousGameIds: [id(100)],
  reason: "Desistência conferida",
  acknowledgeImpact: true,
});
const fixture = () => {
  const regulation = regulationFixture();
  const send = vi.fn(async (url: string) =>
    Response.json(
      url.endsWith("get_game_occurrence_state")
        ? occurrenceState()
        : url.endsWith("get_registration_withdrawal_state")
          ? withdrawalState()
          : regulation,
    ),
  );
  return { regulation, send, provider: new SupabaseDecisions(config, send) };
};
it("reads specific private state RPCs and refuses mismatched target responses", async () => {
  const f = fixture();
  expect((await f.provider.getOccurrence("jwt", id(100))).gameId).toBe(id(100));
  expect((await f.provider.getWithdrawal("jwt", id(1))).registrationId).toBe(
    id(1),
  );
  f.send.mockImplementation(async () =>
    Response.json({ ...occurrenceState(), gameId: id(999) }),
  );
  await expect(f.provider.getOccurrence("jwt", id(100))).rejects.toMatchObject({
    status: 503,
  });
});
it("computes a cancellation impact from current official sources without persisting a projection", async () => {
  const f = fixture();
  const before = JSON.stringify(f.regulation);
  const p = await f.provider.previewOccurrence("jwt", occurrence());
  expect(p).toMatchObject({
    kind: "game_occurrence",
    targetId: id(100),
    baseVersion: 0,
    requiresImpact: true,
  });
  expect(
    p.before?.groupPhases[0].groups[0].standings.rows.find(
      (r) => r.registrationId === id(1),
    )?.leaguePoints,
  ).toBe(2);
  expect(p.after?.groupPhases[0].groups[0].excludedGameIds).toEqual([id(100)]);
  expect(p.affected.after[0]).toMatchObject({
    state: "excluded",
    outcome: null,
  });
  expect(JSON.stringify(f.regulation)).toBe(before);
  expect(f.send.mock.calls.map((c) => c[0].split("/").at(-1))).toEqual([
    "get_game_occurrence_state",
    "get_regulation_state",
  ]);
  expect(JSON.stringify(p)).not.toContain('"context":');
});
it("uses explicit withdrawal lists and never removes the original published fact", async () => {
  const f = fixture(),
    p = await f.provider.previewWithdrawal("jwt", withdrawal());
  expect(p.affected.before[0]).toMatchObject({
    state: "played",
    outcome: {
      kind: "played",
      publication: { homePoints: 80, awayPoints: 70 },
    },
  });
  expect(p.affected.after[0]).toMatchObject({
    state: "excluded",
    outcome: null,
  });
  expect(f.regulation.context.publishedGames[0].homePoints).toBe(80);
  await expect(
    f.provider.previewWithdrawal("jwt", {
      ...withdrawal(),
      previousGameIds: [],
    }),
  ).rejects.toMatchObject({ status: 400 });
});
it("rejects stale commands and a source changed between the two reads before any write", async () => {
  const f = fixture();
  await expect(
    f.provider.previewOccurrence("jwt", {
      ...occurrence(),
      expectedVersion: 1,
    }),
  ).rejects.toMatchObject({ status: 409 });
  f.send.mockClear();
  f.regulation.contextFingerprint = "b".repeat(64);
  await expect(
    f.provider.previewOccurrence("jwt", occurrence()),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    f.provider.previewWithdrawal("jwt", withdrawal()),
  ).rejects.toMatchObject({ status: 409 });
  expect(f.send.mock.calls.some((c) => c[0].includes("save_"))).toBe(false);
});
it("does not approve a new WO without an actual rule and does not fabricate unknown administrative scores", async () => {
  const f = fixture();
  await expect(
    f.provider.previewOccurrence("jwt", {
      ...occurrence(),
      effect: { kind: "wo", winnerRegistrationId: id(2) },
    }),
  ).rejects.toMatchObject({ status: 400 });
  const p = await f.provider.previewOccurrence("jwt", {
    ...occurrence(),
    effect: {
      kind: "administrative",
      decision: {
        kind: "award",
        winnerRegistrationId: id(2),
        homeLeaguePoints: -1,
        awayLeaguePoints: 2,
        score: null,
      },
    },
  });
  expect(p.affected.after[0]).toMatchObject({
    state: "awarded",
    outcome: {
      kind: "awarded",
      award: { winnerRegistrationId: id(2), score: null },
    },
  });
  expect(
    p.after?.groupPhases[0].groups[0].standings.rows.find(
      (r) => r.registrationId === id(2),
    ),
  ).toMatchObject({
    awardedGames: 1,
    playedGames: 0,
    leaguePoints: 2,
    pointsFor: null,
  });
});
it("sends frozen saves directly to durable receipts and correlates all identities and source tokens", async () => {
  for (const kind of ["occurrence", "withdrawal"] as const) {
    const c = kind === "occurrence" ? occurrence() : withdrawal();
    const ack = {
      commandId: c.commandId,
      disputeId: c.disputeId,
      version: 1,
      savedAt: "2026-10-25T01:00:00Z",
      contextFingerprint: hash,
      ...(kind === "occurrence"
        ? { gameId: id(100), occurrenceId: id(600) }
        : { registrationId: id(1), withdrawalId: id(601) }),
    };
    const send = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
        async () => Response.json(ack),
      ),
      provider = new SupabaseDecisions(config, send);
    if (kind === "occurrence")
      await provider.saveOccurrence("jwt", occurrence());
    else await provider.saveWithdrawal("jwt", withdrawal());
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toBe(
      config.url +
        "/rest/v1/rpc/save_" +
        (kind === "occurrence" ? "game_occurrence" : "registration_withdrawal"),
    );
    send.mockImplementation(async () => Response.json({ ...ack, version: 2 }));
    if (kind === "occurrence")
      await expect(
        provider.saveOccurrence("jwt", occurrence()),
      ).rejects.toMatchObject({ status: 503 });
    else
      await expect(
        provider.saveWithdrawal("jwt", withdrawal()),
      ).rejects.toMatchObject({ status: 503 });
  }
});
it("maps upstream errors without exposing raw provider messages or secrets", async () => {
  for (const status of [400, 401, 403, 404, 409, 413, 503]) {
    const provider = new SupabaseDecisions(config, async () =>
      Response.json({ message: "fixture-private-provider-value" }, { status }),
    );
    try {
      await provider.getOccurrence("jwt", id(100));
      throw Error("must reject");
    } catch (e) {
      expect(e).toMatchObject({ status });
      expect(String(e)).not.toContain("fixture-private-provider-value");
    }
  }
});

it("refuses a head/context disagreement instead of previewing a replacement identity", async () => {
  const f = fixture();
  f.regulation.context.occurrences.push({
    id: id(700),
    version: 1,
    gameId: id(100),
    gameVersion: 2,
    publicationVersion: 1,
    effect: { kind: "cancelled" },
    reason: "Existing decision",
  });
  await expect(
    f.provider.previewOccurrence("jwt", occurrence()),
  ).rejects.toMatchObject({ status: 503 });
  f.regulation.context.occurrences = [];
  f.regulation.context.withdrawals.push({
    id: id(701),
    version: 1,
    registrationId: id(1),
    policy: "keep_results",
    previousGameIds: [id(100)],
    reason: "Existing withdrawal",
  });
  await expect(
    f.provider.previewWithdrawal("jwt", withdrawal()),
  ).rejects.toMatchObject({ status: 503 });
});
