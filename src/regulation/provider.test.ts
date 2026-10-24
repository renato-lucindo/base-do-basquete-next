import { it, expect, vi } from "vitest";
import { SupabaseRegulations } from "./provider";
import type { RegulationState, SaveRegulation } from "./persistence-contract";
const id = (n: number) =>
  `f2200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1),
  B = id(2),
  did = id(90),
  stamp = "2026-10-24T20:00:00Z",
  hash = "a".repeat(64),
  config = { url: "https://db.example.test", key: "fixture-publishable" };
const state = (): RegulationState => ({
  disputeId: did,
  version: 1,
  savedAt: stamp,
  contextFingerprint: hash,
  definition: {
    registrationIds: [A, B],
    occurrenceRules: { wo: null },
    groupPhases: [
      {
        phaseId: id(10),
        name: "Fase regular",
        rules: {
          format: "round_robin",
          points: { win: 2, loss: 1 },
          tieBreakers: [],
        },
        groups: [
          {
            id: id(11),
            name: "Grupo único",
            registrationIds: [A, B],
            gameIds: [id(100)],
          },
        ],
      },
    ],
    knockoutPhases: [],
    series: [],
  },
  context: {
    registrationIds: [A, B],
    games: [
      {
        id: id(100),
        version: 2,
        disputeId: did,
        homeRegistrationId: A,
        awayRegistrationId: B,
      },
    ],
    publishedGames: [
      {
        gameId: id(100),
        publicationVersion: 1,
        disputeId: did,
        homeRegistrationId: A,
        awayRegistrationId: B,
        homePoints: 80,
        awayPoints: 70,
        status: "played",
        pointsSource: { kind: "sheet", version: 1 },
      },
    ],
    occurrences: [],
    withdrawals: [],
  },
  history: [
    { version: 1, savedAt: stamp, actorId: id(500), reason: "Regra anterior" },
  ],
  hasMore: false,
});
const command = (): SaveRegulation => ({
  commandId: id(600),
  disputeId: did,
  expectedVersion: 1,
  expectedContextFingerprint: hash,
  definition: state().definition!,
  reason: "Alteração conferida",
  acknowledgeImpact: true,
});
it("reads only the fixed state RPC with actor token and correlates the requested dispute", async () => {
  const send = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () => Response.json(state()),
    ),
    db = new SupabaseRegulations(config, send);
  expect((await db.getState("fixture-jwt", did, 20)).version).toBe(1);
  expect(send).toHaveBeenCalledWith(
    config.url + "/rest/v1/rpc/get_regulation_state",
    expect.objectContaining({
      body: JSON.stringify({ p_dispute_id: did, p_offset: 20 }),
      headers: expect.objectContaining({ Authorization: "Bearer fixture-jwt" }),
    }),
  );
  send.mockImplementation(async () =>
    Response.json({ ...state(), disputeId: id(999) }),
  );
  await expect(db.getState("fixture-jwt", did)).rejects.toMatchObject({
    status: 503,
  });
});
it("returns a computed administrative view without the raw authoritative context", async () => {
  const db = new SupabaseRegulations(config, async () =>
      Response.json(state()),
    ),
    view = await db.getView("fixture-jwt", did);
  expect(view).not.toHaveProperty("context");
  expect(view).toMatchObject({
    disputeId: did,
    version: 1,
    hasPublishedResults: true,
  });
  expect(
    view.preview?.groupPhases[0].groups[0].standings.rows[0],
  ).toMatchObject({ registrationId: A, leaguePoints: 2 });
});
it("normalizes valid UUID casing before correlating authoritative identities", async () => {
  const db = new SupabaseRegulations(config, async () =>
    Response.json(state()),
  );
  expect((await db.getState("fixture-jwt", did.toUpperCase())).disputeId).toBe(
    did,
  );
});
it("serializes played and awarded series projections with the same closed view contract", async () => {
  for (const awarded of [false, true]) {
    const s = state();
    s.definition!.groupPhases = [];
    s.definition!.knockoutPhases = [{ id: id(20), name: "Final" }];
    s.definition!.series = [
      {
        id: id(30),
        phaseId: id(20),
        name: "Confronto final",
        format: "single",
        home: { kind: "registration", registrationId: A },
        away: { kind: "registration", registrationId: B },
        games: [{ slot: 1, gameId: id(100) }],
      },
    ];
    if (awarded) {
      s.definition!.occurrenceRules.wo = {
        winnerLeaguePoints: 2,
        loserLeaguePoints: 0,
        score: null,
      };
      s.context.occurrences = [
        {
          id: id(700),
          version: 1,
          gameId: id(100),
          gameVersion: 2,
          publicationVersion: 1,
          reason: "W.O. conforme decisão",
          effect: { kind: "wo", winnerRegistrationId: A },
        },
      ];
    }
    const db = new SupabaseRegulations(config, async () => Response.json(s)),
      view = await db.getView("fixture-jwt", did);
    expect(view.preview?.series[0]).toMatchObject({
      status: "complete",
      result: {
        winnerRegistrationId: A,
        playedGames: awarded ? 0 : 1,
        awardedGames: awarded ? 1 : 0,
      },
    });
  }
});
it("computes before/after from database facts, validates snapshot tokens and never persists the preview", async () => {
  const send = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () => Response.json(state()),
    ),
    db = new SupabaseRegulations(config, send),
    d = state().definition!;
  d.groupPhases[0].rules.points = { win: 5, loss: 0 };
  const result = await db.preview("fixture-jwt", did, {
    expectedVersion: 1,
    expectedContextFingerprint: hash,
    definition: d,
  });
  expect(
    result.before?.groupPhases[0].groups[0].standings.rows[0].leaguePoints,
  ).toBe(2);
  expect(
    result.after.groupPhases[0].groups[0].standings.rows[0].leaguePoints,
  ).toBe(5);
  expect(send.mock.calls.length).toBe(1);
  await expect(
    db.preview("fixture-jwt", did, {
      expectedVersion: 0,
      expectedContextFingerprint: hash,
      definition: d,
    }),
  ).rejects.toMatchObject({ status: 409, code: "version_conflict" });
  await expect(
    db.preview("fixture-jwt", did, {
      expectedVersion: 1,
      expectedContextFingerprint: "b".repeat(64),
      definition: d,
    }),
  ).rejects.toMatchObject({ status: 409, code: "context_conflict" });
  const before = send.mock.calls.length;
  await expect(
    db.preview("fixture-jwt", did, {
      expectedVersion: 1,
      expectedContextFingerprint: hash,
      definition: d,
      points: 999,
    }),
  ).rejects.toMatchObject({ status: 400 });
  expect(send.mock.calls.length).toBe(before);
});
it("writes a frozen command directly to the receipt-aware RPC and rejects every mismatched ACK", async () => {
  const c = command(),
    ack = {
      commandId: c.commandId,
      disputeId: did,
      version: 2,
      savedAt: stamp,
      contextFingerprint: hash,
    },
    send = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () => Response.json(ack),
    ),
    db = new SupabaseRegulations(config, send);
  await db.save("fixture-jwt", c);
  await db.save("fixture-jwt", c);
  expect(send.mock.calls.length).toBe(2);
  expect(
    send.mock.calls.every(
      (args) => args[0] === config.url + "/rest/v1/rpc/save_regulation",
    ),
  ).toBe(true);
  expect(send.mock.calls[0][1].body).toBe(send.mock.calls[1][1].body);
  for (const bad of [
    { ...ack, commandId: id(999) },
    { ...ack, disputeId: id(999) },
    { ...ack, version: 3 },
    { ...ack, contextFingerprint: "b".repeat(64) },
  ]) {
    send.mockImplementation(async () => Response.json(bad));
    await expect(db.save("fixture-jwt", c)).rejects.toMatchObject({
      status: 503,
    });
  }
});
it("reads an exact historical version and reports a missing version without creating data", async () => {
  const s = state(),
    v = {
      disputeId: did,
      version: 1,
      definition: s.definition,
      context: s.context,
      contextFingerprint: hash,
      savedAt: stamp,
      actorId: id(500),
      reason: "Regra anterior",
      algorithmVersion: "organized-v1",
    },
    send = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () => Response.json(v),
    ),
    db = new SupabaseRegulations(config, send);
  expect((await db.getVersion("fixture-jwt", did, 1)).version).toBe(1);
  send.mockImplementation(async () => Response.json({ ...v, version: 2 }));
  await expect(db.getVersion("fixture-jwt", did, 1)).rejects.toMatchObject({
    status: 503,
  });
  send.mockImplementation(async () => Response.json(null));
  await expect(db.getVersion("fixture-jwt", did, 1)).rejects.toMatchObject({
    status: 404,
  });
});
it("maps context/version conflicts and impact requirements with fixed messages, keeping provider details private", async () => {
  const send = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () =>
        Response.json({ message: "context_conflict" }, { status: 409 }),
    ),
    db = new SupabaseRegulations(config, send);
  await expect(db.save("fixture-jwt", command())).rejects.toMatchObject({
    status: 409,
    code: "context_conflict",
  });
  send.mockImplementation(async () =>
    Response.json({ message: "regulation_impact_required" }, { status: 400 }),
  );
  await expect(db.save("fixture-jwt", command())).rejects.toMatchObject({
    status: 400,
    code: "regulation_impact_required",
  });
  send.mockImplementation(async () =>
    Response.json({ message: "fixture-private-value" }, { status: 500 }),
  );
  await expect(db.getState("fixture-jwt", did)).rejects.toMatchObject({
    status: 503,
    message: expect.not.stringContaining("fixture-private-value"),
  });
  for (const status of [401, 403, 404, 413]) {
    send.mockImplementation(async () =>
      Response.json({ message: "fixture-private-value" }, { status }),
    );
    await expect(db.getState("fixture-jwt", did)).rejects.toMatchObject({
      status,
    });
  }
});
