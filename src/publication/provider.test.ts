import { it, expect, vi } from "vitest";
import { SupabasePublications } from "./provider";
import { publicationSheet, pubId } from "../../tests/fixtures/publication";
import { pdfPublicationFixture } from "../../tests/fixtures/pdf-publication";
const config = { url: "https://db.example.test", key: "fixture-publicable" },
  gameId = pubId(8),
  requestId = pubId(1),
  stamp = "2026-10-24T09:00:00Z";
const sheetCommand = () => ({
  requestId,
  gameId,
  gameVersion: 1,
  basePublicationVersion: 0,
  source: {
    kind: "sheet" as const,
    baseSheetVersion: 0,
    document: publicationSheet(),
  },
  reason: "",
  fallback: false,
});
const sheetAck = () => ({
  requestId,
  gameId,
  gameVersion: 2,
  version: 1,
  sourceVersion: 1,
  publishedAt: stamp,
});
it("saves a private preparation with correlated identity and never publishes while saving", async () => {
  const { review, supplement, authority } = await pdfPublicationFixture();
  const publication = {
    requestId,
    gameId: review.document.gameId!,
    gameVersion: 1,
    basePublicationVersion: 0,
    source: {
      kind: "pdf" as const,
      sourceId: review.source.id,
      sourceVersion: 2 as const,
      reviewVersion: 1,
    },
    supplement,
    authority,
    sheetVersion: null,
    reason: "",
    acceptDivergence: false,
  };
  const command = { commandId: gameId, expectedVersion: 0, publication };
  const send = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
    async () =>
      Response.json({ sourceId: review.source.id, requestId, version: 1 }),
  );
  const db = new SupabasePublications(config, send);
  expect((await db.savePreparation("fixture-jwt", command)).version).toBe(1);
  expect(send.mock.calls[0]?.[0]).toBe(
    config.url + "/rest/v1/rpc/save_pdf_publication_preparation",
  );
  send.mockImplementation(async () =>
    Response.json({ sourceId: gameId, requestId, version: 1 }),
  );
  await expect(
    db.savePreparation("fixture-jwt", command),
  ).rejects.toMatchObject({ status: 503 });
  send.mockImplementation(async () => Response.json(null));
  expect(await db.getPreparation("fixture-jwt", review.source.id)).toBeNull();
  send.mockImplementation(async () =>
    Response.json({
      sourceId: review.source.id,
      version: 1,
      savedAt: stamp,
      publication,
    }),
  );
  expect(
    (await db.getPreparation("fixture-jwt", review.source.id))?.publication
      .requestId,
  ).toBe(requestId);
  await expect(db.getPreparation("fixture-jwt", gameId)).rejects.toMatchObject({
    status: 503,
  });
});
it("fixes administrative RPCs and sends no user token for the public-only reader", async () => {
  const send = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () =>
        Response.json({
          gameId,
          version: 0,
          published: null,
          history: [],
          hasMore: false,
          requiresFallback: true,
        }),
    ),
    db = new SupabasePublications(config, send);
  expect((await db.getState("fixture-jwt", gameId, 20)).requiresFallback).toBe(
    true,
  );
  expect(send).toHaveBeenLastCalledWith(
    config.url + "/rest/v1/rpc/get_game_publication_state",
    expect.objectContaining({
      body: JSON.stringify({ p_game_id: gameId, p_offset: 20 }),
      headers: expect.objectContaining({ Authorization: "Bearer fixture-jwt" }),
    }),
  );
  send.mockImplementation(async () => Response.json(null));
  expect(await db.getPublic(gameId)).toBeNull();
  const headers = send.mock.calls.at(-1)![1].headers as Record<string, string>;
  expect(headers.apikey).toBe(config.key);
  expect(headers).not.toHaveProperty("Authorization");
  expect(send.mock.calls.at(-1)![0]).toBe(
    config.url + "/rest/v1/rpc/get_public_game",
  );
  await expect(db.getVersion("fixture-jwt", gameId, 1)).rejects.toMatchObject({
    status: 404,
  });
  expect(send.mock.calls.at(-1)![0]).toBe(
    config.url + "/rest/v1/rpc/get_game_publication_version",
  );
});
it("validates final manual input before RPC and correlates every acknowledgement", async () => {
  const send = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () => Response.json(sheetAck()),
    ),
    db = new SupabasePublications(config, send);
  expect(await db.publishSheet("jwt", sheetCommand())).toEqual(sheetAck());
  expect(send.mock.calls[0][0]).toBe(
    config.url + "/rest/v1/rpc/publish_sheet_game",
  );
  for (const patch of [
    { requestId: pubId(9) },
    { gameId: pubId(9) },
    { version: 2 },
    { gameVersion: 3 },
    { sourceVersion: 2 },
  ]) {
    send.mockImplementation(async () =>
      Response.json({ ...sheetAck(), ...patch }),
    );
    await expect(db.publishSheet("jwt", sheetCommand())).rejects.toMatchObject({
      status: 503,
    });
  }
  const bad = sheetCommand();
  bad.source.document.participants[0].starter = false;
  send.mockClear();
  await expect(db.publishSheet("jwt", bad)).rejects.toMatchObject({
    status: 400,
  });
  expect(send).not.toHaveBeenCalled();
});
it("submits only PDF references/decisions and correlates immutable source/review tokens", async () => {
  const f = await pdfPublicationFixture(),
    c = {
      requestId,
      gameId,
      gameVersion: 1,
      basePublicationVersion: 0,
      source: {
        kind: "pdf" as const,
        sourceId: pubId(100),
        sourceVersion: 2 as const,
        reviewVersion: 1,
      },
      supplement: f.supplement,
      authority: f.authority,
      sheetVersion: null,
      reason: "",
      acceptDivergence: false,
    };
  const ack = { ...sheetAck(), sourceVersion: 2, reviewVersion: 1 };
  const send = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () => Response.json(ack),
    ),
    db = new SupabasePublications(config, send);
  expect(await db.publishPdf("jwt", c)).toEqual(ack);
  expect(send.mock.calls[0][0]).toBe(
    config.url + "/rest/v1/rpc/publish_pdf_game",
  );
  expect(
    JSON.parse(send.mock.calls[0][1].body as string).p_command,
  ).not.toHaveProperty("parsed");
  send.mockImplementation(async () =>
    Response.json({ ...ack, reviewVersion: 2 }),
  );
  await expect(db.publishPdf("jwt", c)).rejects.toMatchObject({ status: 503 });
});
it("does not expose SQL details and preserves meaningful conflict/reason/session failures", async () => {
  for (const [status, message, code] of [
    [409, "idempotency_conflict", "idempotency_conflict"],
    [409, "publication_source_game_locked", "publication_source_game_locked"],
    [409, "unrecognized private", "version_conflict"],
    [400, "review_reason_required", "review_reason_required"],
    [400, "pdf_domain_unavailable", "pdf_domain_unavailable"],
    [400, "SQL private table", "invalid_input"],
    [401, "x", "invalid_session"],
    [403, "x", "not_authorized"],
    [500, "x", "access_unavailable"],
  ] as const) {
    const db = new SupabasePublications(config, async () =>
      Response.json({ message, details: "private internal value" }, { status }),
    );
    try {
      await db.getState("jwt", gameId, 0);
      expect.fail("expected failure");
    } catch (e) {
      expect(e).toMatchObject({ code });
      expect(JSON.stringify(e)).not.toContain("private internal value");
    }
  }
});
it("rejects invalid read bounds and any extra fields in public projections", async () => {
  const send = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () => Response.json({ secret: "private" }),
    ),
    db = new SupabasePublications(config, send);
  await expect(db.getState("jwt", gameId, -1)).rejects.toMatchObject({
    status: 400,
  });
  await expect(db.getVersion("jwt", gameId, 0)).rejects.toMatchObject({
    status: 400,
  });
  expect(send).not.toHaveBeenCalled();
  await expect(db.getPublic(gameId)).rejects.toMatchObject({ status: 503 });
});

it("treats anonymous reader configuration failures as unavailability without logging a user out", async () => {
  for (const status of [401, 403]) {
    const db = new SupabasePublications(config, async () =>
      Response.json({ message: "private provider failure" }, { status }),
    );
    await expect(db.getPublic(gameId)).rejects.toMatchObject({
      status: 503,
      code: "access_unavailable",
    });
  }
});
