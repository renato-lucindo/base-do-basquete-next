import { describe, expect, it, vi } from "vitest";
import { SupabasePeople } from "./provider";
const id = "90000000-0000-4000-8000-000000000001";
describe("adapter de pessoas e vínculos", () => {
  it("limita RPCs e conserva JWT no servidor", async () => {
    const send = vi.fn(async () =>
      Response.json({ items: [], hasMore: false }),
    );
    const db = new SupabasePeople(
      { url: "https://db.example.test", key: "fixture" },
      send,
    );
    expect(await db.listRoster("fixture-jwt", id, true, 20)).toEqual({
      items: [],
      hasMore: false,
    });
    expect(send).toHaveBeenCalledWith(
      "https://db.example.test/rest/v1/rpc/list_roster",
      expect.objectContaining({
        body: JSON.stringify({
          p_registration_id: id,
          p_active_only: true,
          p_offset: 20,
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer fixture-jwt",
        }),
      }),
    );
  });
  it("distingue confirmação de homônimo, versão e idempotência sem expor SQL", async () => {
    for (const code of [
      "identity_confirmation_required",
      "version_conflict",
      "idempotency_conflict",
    ]) {
      const db = new SupabasePeople(
        { url: "https://db.example.test", key: "fixture" },
        async () =>
          Response.json({ message: code, details: "private" }, { status: 409 }),
      );
      await expect(db.getPerson("fixture", id)).rejects.toMatchObject({
        code,
        status: 409,
      });
    }
  });
  it("recusa ausentes, schemas inválidos e respostas de acesso indevido", async () => {
    for (const [status, body, code] of [
      [200, null, "context_not_found"],
      [200, { private: true }, "access_unavailable"],
      [403, {}, "not_authorized"],
    ] as const) {
      const db = new SupabasePeople(
        { url: "https://db.example.test", key: "fixture" },
        async () => Response.json(body, { status }),
      );
      await expect(db.getPerson("fixture", id)).rejects.toMatchObject({ code });
    }
  });
});
