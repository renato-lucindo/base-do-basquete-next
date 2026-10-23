import { describe, it, expect, vi } from "vitest";
import { SupabaseTextImport } from "./provider";
const id = "d1000000-0000-4000-8000-000000000001";
const probe = {
  rowId: id,
  name: "Ana",
  nickname: null,
  birthDate: null,
  birthYear: null,
  federationRegistration: null,
};
describe("private text import adapter", () => {
  it("uses fixed RPC and private JWT with complete correlated matching results", async () => {
    const send = vi.fn(async () =>
      Response.json({
        items: [{ rowId: id, status: "new", candidates: [], hasMore: false }],
      }),
    );
    const db = new SupabaseTextImport(
      { url: "https://db.example.test", key: "fixture" },
      send,
    );
    await expect(
      db.match("fixture-access", {
        disputeId: id,
        registrationId: null,
        players: [probe],
      }),
    ).resolves.toMatchObject({ items: [{ rowId: id, status: "new" }] });
    expect(send).toHaveBeenCalledWith(
      "https://db.example.test/rest/v1/rpc/match_import_players_new_target",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer fixture-access",
        }),
        body: JSON.stringify({
          p_dispute_id: id,
          p_players: [probe],
        }),
      }),
    );
  });
  it("rejects incomplete matching and wrong context instead of suggesting silent creation", async () => {
    const db = new SupabaseTextImport(
      { url: "https://db.example.test", key: "fixture" },
      async () => Response.json({ items: [] }),
    );
    await expect(
      db.match("fixture-access", {
        disputeId: id,
        registrationId: null,
        players: [probe],
      }),
    ).rejects.toMatchObject({ status: 503 });
  });
  it("sanitizes internal errors and preserves actionable conflicts", async () => {
    for (const [status, body, code] of [
      [
        400,
        { message: "birth_conflict", details: "private SQL" },
        "birth_conflict",
      ],
      [
        409,
        { message: "identity_confirmation_required", details: "private SQL" },
        "identity_confirmation_required",
      ],
      [409, { message: "row_already_applied" }, "row_already_applied"],
      [403, {}, "not_authorized"],
      [200, null, "context_not_found"],
    ] as const) {
      const db = new SupabaseTextImport(
        { url: "https://db.example.test", key: "fixture" },
        async () => Response.json(body, { status }),
      );
      try {
        await db.get("fixture", id);
        throw Error("expected failure");
      } catch (error) {
        expect(error).toMatchObject({ code });
        expect(String(error)).not.toContain("private SQL");
      }
    }
  });
});
