import { it, expect, vi } from "vitest";
import { SupabasePdfOriginals } from "./storage";
const id = "f8100000-0000-4000-8000-000000000001",
  path = `sources/${id}.pdf`;
const bytes = new TextEncoder().encode("%PDF-original\r\n\0bytes"),
  url = "https://db.example.test";
async function intent() {
  return {
    id,
    storagePath: path,
    sha256: Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).toString(
      "hex",
    ),
    byteSize: bytes.length,
    ready: false,
    duplicate: false,
  };
}
it("preserves original bytes, never upserts and verifies private retrieval before completion", async () => {
  const send = vi.fn(async (_url: string, init: RequestInit) =>
    init.method === "POST"
      ? Response.json({ Key: `boxscore-sources/${path}` })
      : new Response(bytes, { headers: { "Content-Type": "application/pdf" } }),
  );
  const store = new SupabasePdfOriginals({ url, key: "fixture-key" }, send);
  await store.put("fixture-jwt", await intent(), bytes);
  expect(send).toHaveBeenCalledTimes(2);
  expect(send).toHaveBeenNthCalledWith(
    1,
    `${url}/storage/v1/object/boxscore-sources/${path}`,
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        "x-upsert": "false",
        "Content-Type": "application/pdf",
        Authorization: "Bearer fixture-jwt",
      }),
    }),
  );
  const init = send.mock.calls[0][1];
  expect(new Uint8Array(init.body as ArrayBuffer)).toEqual(bytes);
  expect(send).toHaveBeenNthCalledWith(
    2,
    `${url}/storage/v1/object/authenticated/boxscore-sources/${path}`,
    expect.objectContaining({ method: "GET" }),
  );
});
it("recovers both current and legacy already-exists responses by checking bytes without overwrite", async () => {
  for (const [status, body] of [
    [409, { code: "ResourceAlreadyExists" }],
    [409, { code: "KeyAlreadyExists" }],
    [400, { error: "Duplicate", message: "The resource already exists" }],
  ] as const) {
    const send = vi.fn(async (_url: string, init: RequestInit) =>
      init.method === "POST"
        ? Response.json(body, { status })
        : new Response(bytes, {
            headers: { "Content-Type": "application/pdf" },
          }),
    );
    await new SupabasePdfOriginals({ url, key: "fixture" }, send).put(
      "jwt",
      await intent(),
      bytes,
    );
    expect(
      send.mock.calls.every(
        ([, init]) => init.method !== "PUT" && init.method !== "DELETE",
      ),
    ).toBe(true);
  }
});
it("rejects wrong bytes, path, MIME, size and unexpected Storage failures without finalizing", async () => {
  for (const response of [
    () =>
      new Response(new Uint8Array(bytes.length), {
        headers: { "Content-Type": "application/pdf" },
      }),
    () => new Response(bytes, { headers: { "Content-Type": "text/html" } }),
    () =>
      new Response(new Uint8Array(bytes.length + 1), {
        headers: { "Content-Type": "application/pdf" },
      }),
  ]) {
    const send = vi.fn(async (_url: string, init: RequestInit) =>
      init.method === "POST" ? Response.json({}) : response(),
    );
    await expect(
      new SupabasePdfOriginals({ url, key: "fixture" }, send).put(
        "jwt",
        await intent(),
        bytes,
      ),
    ).rejects.toMatchObject({ status: 503 });
  }
  const send = vi.fn(async () =>
      Response.json({ message: "private value" }, { status: 500 }),
    ),
    store = new SupabasePdfOriginals({ url, key: "fixture" }, send);
  await expect(
    store.put("jwt", { ...(await intent()), storagePath: "../other" }, bytes),
  ).rejects.toMatchObject({ status: 400 });
  expect(send).not.toHaveBeenCalled();
  await expect(
    store.put("jwt", await intent(), new Uint8Array(bytes.length)),
  ).rejects.toMatchObject({ status: 400 });
  expect(send).not.toHaveBeenCalled();
  await expect(store.put("jwt", await intent(), bytes)).rejects.toMatchObject({
    status: 503,
  });
  expect(send).toHaveBeenCalledTimes(1);
});
it("cancels an overlong download stream and does not accept misleading duplicate errors", async () => {
  const cancelled = vi.fn();
  const send = vi.fn(async (_url: string, init: RequestInit) =>
    init.method === "POST"
      ? Response.json({})
      : new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(new Uint8Array(bytes.length + 1));
            },
            cancel: cancelled,
          }),
          { headers: { "Content-Type": "application/pdf" } },
        ),
  );
  await expect(
    new SupabasePdfOriginals({ url, key: "fixture" }, send).put(
      "jwt",
      await intent(),
      bytes,
    ),
  ).rejects.toMatchObject({ status: 503 });
  expect(cancelled).toHaveBeenCalled();
  const bad = vi.fn(async () =>
    Response.json(
      { code: "AccessDenied", details: "duplicate exists secret" },
      { status: 400 },
    ),
  );
  await expect(
    new SupabasePdfOriginals({ url, key: "fixture" }, bad).put(
      "jwt",
      await intent(),
      bytes,
    ),
  ).rejects.toMatchObject({ status: 503 });
  expect(bad).toHaveBeenCalledTimes(1);
});
