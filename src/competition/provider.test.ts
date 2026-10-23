import { describe, expect, it, vi } from "vitest";
import { SupabaseCompetitions } from "./provider";

const id = "20000000-0000-4000-8000-000000000001";
describe("server competition adapter", () => {
  it("uses user JWTs and fixed RPCs without returning transport credentials", async () => {
    const send = vi.fn(async () =>
      Response.json({ items: [], recents: [], hasMore: false }),
    );
    const db = new SupabaseCompetitions(
      { url: "https://db.example.test", key: "fixture-publishable" },
      send,
    );
    expect(await db.list("fixture-user-jwt", "Adulto", 20)).toEqual({
      items: [],
      recents: [],
      hasMore: false,
    });
    expect(send).toHaveBeenCalledWith(
      "https://db.example.test/rest/v1/rpc/list_competitions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ p_query: "Adulto", p_offset: 20 }),
        headers: expect.objectContaining({
          Authorization: "Bearer fixture-user-jwt",
          apikey: "fixture-publishable",
        }),
      }),
    );
  });
  it("sanitizes conflicts and provider failures and distinguishes missing context", async () => {
    for (const [status, body, expected] of [
      [
        409,
        { message: "idempotency_conflict", details: "private" },
        "idempotency_conflict",
      ],
      [409, { message: "private SQL" }, "version_conflict"],
      [503, { message: "private SQL" }, "access_unavailable"],
      [200, { unexpected: "private" }, "access_unavailable"],
      [200, null, "context_not_found"],
    ] as const) {
      const db = new SupabaseCompetitions(
        { url: "https://db.example.test", key: "fixture" },
        async () => Response.json(body, { status }),
      );
      await expect(db.get("fixture", id)).rejects.toMatchObject({
        code: expected,
      });
    }
  });
  it("refuses unbounded/malformed upstream bodies and inaccessible accounts", async () => {
    for (const response of [
      new Response(" ".repeat(1048577)),
      new Response("not-json"),
      Response.json({}, { status: 403 }),
    ]) {
      const db = new SupabaseCompetitions(
        { url: "https://db.example.test", key: "fixture" },
        async () => response,
      );
      await expect(db.list("fixture", "", 0)).rejects.toMatchObject({
        status: response.status === 403 ? 403 : 503,
      });
    }
  });
});
