import { describe, expect, it } from "vitest";
import { z } from "zod";
import { HttpError, jsonResponse, readMutationJson } from "./http";

const origin = "https://app.example.test";
const options = { origin, maxBytes: 64 };
const schema = z.object({ name: z.string() }).strict();

function request(body: string, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/session`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body,
  });
}

describe("HTTP mutation boundary", () => {
  it("parses validated JSON from the configured origin", async () => {
    await expect(
      readMutationJson(request('{"name":"Ana"}'), schema, options),
    ).resolves.toEqual({ name: "Ana" });
  });

  it.each(["https://evil.test", "null", "", `${origin}.evil.test`])(
    "rejects an untrusted origin: %s",
    async (untrusted) => {
      await expect(
        readMutationJson(request("{}", { origin: untrusted }), schema, options),
      ).rejects.toMatchObject({ status: 403, code: "invalid_origin" });
    },
  );

  it("rejects absent Origin even if the URL and Referer match", async () => {
    const input = request("{}", { referer: origin });
    input.headers.delete("origin");
    await expect(
      readMutationJson(input, schema, options),
    ).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects cross-site fetch metadata and safe methods", async () => {
    await expect(
      readMutationJson(
        request("{}", { "sec-fetch-site": "cross-site" }),
        schema,
        options,
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      readMutationJson(new Request(origin), schema, options),
    ).rejects.toMatchObject({ status: 405 });
  });

  it("requires JSON and never echoes submitted values in errors", async () => {
    await expect(
      readMutationJson(
        request("private-value", { "content-type": "text/plain" }),
        schema,
        options,
      ),
    ).rejects.toMatchObject({ status: 415 });
    for (const input of [
      '{"name":',
      '{"name":42,"password":"private-value"}',
    ]) {
      const error = await readMutationJson(
        request(input),
        schema,
        options,
      ).catch((value: unknown) => value);
      expect(error).toBeInstanceOf(HttpError);
      expect(String(error)).not.toContain("private-value");
      expect(error).toMatchObject({ status: 400 });
    }
  });

  it("limits actual bytes when length is absent or falsely small", async () => {
    const lengths: Record<string, string>[] = [{}, { "content-length": "1" }];
    for (const headers of lengths) {
      await expect(
        readMutationJson(request("a".repeat(65), headers), schema, options),
      ).rejects.toMatchObject({ status: 413 });
    }
    await expect(
      readMutationJson(
        request('{"name":"Ana"}', { "content-length": "65" }),
        schema,
        options,
      ),
    ).rejects.toMatchObject({ status: 413 });
  });

  it("counts UTF-8 bytes and accepts the exact boundary", async () => {
    const body = '{"name":"á"}';
    const maxBytes = new TextEncoder().encode(body).length;
    await expect(
      readMutationJson(request(body), schema, { origin, maxBytes }),
    ).resolves.toEqual({ name: "á" });
    await expect(
      readMutationJson(request(body), schema, {
        origin,
        maxBytes: maxBytes - 1,
      }),
    ).rejects.toMatchObject({ status: 413 });
  });

  it("rejects invalid UTF-8 instead of replacing it", async () => {
    const input = new Request(origin, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: new Uint8Array([
        123, 34, 110, 97, 109, 101, 34, 58, 34, 255, 34, 125,
      ]),
    });
    await expect(
      readMutationJson(input, schema, options),
    ).rejects.toMatchObject({
      status: 400,
    });
  });

  it("cancels a streamed body immediately when it crosses the limit", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(65));
      },
      cancel() {
        cancelled = true;
      },
    });
    const input = new Request(origin, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit);
    await expect(
      readMutationJson(input, schema, options),
    ).rejects.toMatchObject({
      status: 413,
    });
    expect(cancelled).toBe(true);
  });

  it("does not cache or sniff JSON responses", async () => {
    const response = jsonResponse({ error: "invalid_input" }, 400);
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ error: "invalid_input" });
  });
});
