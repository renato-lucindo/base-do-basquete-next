import { it, expect, vi } from "vitest";
import { SupabasePdfSources } from "./provider";
const id = "f8000000-0000-4000-8000-000000000001";
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
