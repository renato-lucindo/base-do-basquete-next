import { it, expect, vi, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { extractSupportedPdf } from "./extract";
import {
  parsedBoxscoreSchema,
  type PreparePdfSource,
  type SavePdfReview,
} from "./source-contract";
import { SupabasePdfSources } from "./provider";
const id = "f8000000-0000-4000-8000-000000000001";
const other = "f8000000-0000-4000-8000-000000000002";
let command: PreparePdfSource;
beforeAll(async () => {
  const bytes = new Uint8Array(
    await readFile(
      "especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/docs/plan/referencias/modelos-boxscore/Boxscore-site.pdf",
    ),
  );
  const p = await extractSupportedPdf(bytes, "sample.pdf", "application/pdf");
  command = {
    commandId: id,
    source: {
      id,
      disputeId: id,
      filename: p.filename,
      sha256: p.sha256,
      byteSize: bytes.length,
      pageCount: p.pageCount,
      parsed: parsedBoxscoreSchema.parse(p.parsed),
    },
  };
});
it("uses only fixed source/review RPCs and keeps credentials in server headers", async () => {
  const send = vi.fn(async () => Response.json(null)),
    db = new SupabasePdfSources(
      { url: "https://db.example.test", key: "fixture-key" },
      send,
    );
  await expect(db.source("fixture-jwt", id)).rejects.toMatchObject({
    status: 404,
  });
  expect(send).toHaveBeenLastCalledWith(
    "https://db.example.test/rest/v1/rpc/get_pdf_source",
    expect.objectContaining({
      body: JSON.stringify({ p_id: id }),
      headers: expect.objectContaining({ Authorization: "Bearer fixture-jwt" }),
    }),
  );
  await expect(db.review("fixture-jwt", id)).rejects.toMatchObject({
    status: 404,
  });
  expect(send).toHaveBeenLastCalledWith(
    "https://db.example.test/rest/v1/rpc/get_pdf_review",
    expect.objectContaining({ body: JSON.stringify({ p_source_id: id }) }),
  );
});
it("correlates source prepare acknowledgements including explicit duplicates and generated paths", async () => {
  const ack = {
    id,
    storagePath: `sources/${id}.pdf`,
    sha256: command.source.sha256,
    byteSize: command.source.byteSize,
    ready: false,
    duplicate: false,
  };
  let response: unknown = ack;
  const send = vi.fn(async () => Response.json(response)),
    db = new SupabasePdfSources(
      { url: "https://db.example.test", key: "fixture" },
      send,
    );
  expect(await db.prepare("jwt", command)).toEqual(ack);
  expect(send).toHaveBeenLastCalledWith(
    "https://db.example.test/rest/v1/rpc/prepare_pdf_source",
    expect.objectContaining({ body: JSON.stringify({ p_command: command }) }),
  );
  for (const bad of [
    { id: other },
    { storagePath: `sources/${other}.pdf` },
    { sha256: "a".repeat(64) },
    { byteSize: 1 },
  ]) {
    response = { ...ack, ...bad };
    await expect(db.prepare("jwt", command)).rejects.toMatchObject({
      status: 503,
    });
  }
  response = {
    ...ack,
    id: other,
    storagePath: `sources/${other}.pdf`,
    duplicate: true,
    ready: true,
  };
  expect(await db.prepare("jwt", command)).toEqual(response);
});
it("correlates finish and review save and validates input before sending", async () => {
  let response: unknown = { id, version: 2 };
  const send = vi.fn(async () => Response.json(response)),
    db = new SupabasePdfSources(
      { url: "https://db.example.test", key: "fixture" },
      send,
    );
  const finish = { commandId: id, sourceId: id };
  expect(await db.finish("jwt", finish)).toEqual(response);
  expect(send).toHaveBeenLastCalledWith(
    "https://db.example.test/rest/v1/rpc/finish_pdf_source",
    expect.objectContaining({ body: JSON.stringify({ p_command: finish }) }),
  );
  response = { id: other, version: 2 };
  await expect(db.finish("jwt", finish)).rejects.toMatchObject({ status: 503 });
  response = { id, version: 3 };
  await expect(db.finish("jwt", finish)).rejects.toMatchObject({ status: 503 });
  const review: SavePdfReview = {
    commandId: id,
    sourceId: id,
    expectedVersion: 0,
    document: {
      disputeId: id,
      gameId: null,
      invertSides: false,
      mappings: [],
      notes: "",
    },
  };
  response = { id, version: 1 };
  expect(await db.saveReview("jwt", review)).toEqual(response);
  response = { id, version: 2 };
  await expect(db.saveReview("jwt", review)).rejects.toMatchObject({
    status: 503,
  });
  send.mockClear();
  await expect(
    db.saveReview("jwt", { ...review, expectedVersion: -1 }),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    db.prepare("jwt", {
      ...command,
      source: { ...command.source, filename: "../secret.pdf" },
    }),
  ).rejects.toMatchObject({ status: 400 });
  expect(send).not.toHaveBeenCalled();
});
it("lists current review context while retaining original source context", async () => {
  const source = {
    ...command.source,
    ready: true,
    version: 2,
    savedAt: "2026-10-24T03:00:00Z",
  };
  const send = vi.fn(async () =>
      Response.json({ items: [source], hasMore: false }),
    ),
    db = new SupabasePdfSources(
      { url: "https://db.example.test", key: "fixture" },
      send,
    );
  expect((await db.list("jwt", other, 20)).items[0].disputeId).toBe(id);
  expect(send).toHaveBeenLastCalledWith(
    "https://db.example.test/rest/v1/rpc/list_pdf_sources",
    expect.objectContaining({
      body: JSON.stringify({ p_dispute_id: other, p_offset: 20 }),
    }),
  );
});
it("preserves explicit recoverable conflicts without leaking database details", async () => {
  for (const code of [
    "version_conflict",
    "idempotency_conflict",
    "source_upload_incomplete",
  ]) {
    const db = new SupabasePdfSources(
      { url: "https://db.example.test", key: "fixture" },
      async () =>
        Response.json(
          { message: code, details: "private value" },
          { status: 409 },
        ),
    );
    await expect(
      db.finish("jwt", { commandId: id, sourceId: id }),
    ).rejects.toMatchObject({ status: 409, code });
  }
});
it("rejects malformed responses and sanitizes provider details", async () => {
  for (const [status, body, code] of [
    [200, { secret: "private provider value" }, "access_unavailable"],
    [
      409,
      {
        message: "source_upload_incomplete",
        details: "private provider value",
      },
      "source_upload_incomplete",
    ],
    [403, { message: "private" }, "not_authorized"],
    [401, { message: "private" }, "invalid_session"],
  ] as const) {
    const db = new SupabasePdfSources(
      { url: "https://db.example.test", key: "fixture" },
      async () => Response.json(body, { status }),
    );
    await expect(db.review("fixture-jwt", id)).rejects.toMatchObject({ code });
    try {
      await db.review("fixture-jwt", id);
    } catch (e) {
      expect(String(e)).not.toContain("private provider value");
    }
  }
});
