import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { api } from "./api";
afterEach(() => vi.unstubAllGlobals());
it("preserva código público de conflito para resolução explícita na UI", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json(
      {
        error: {
          code: "identity_confirmation_required",
          message: "Confirme a identidade.",
        },
      },
      { status: 409 },
    ),
  );
  await expect(api("/api/people", z.unknown())).rejects.toMatchObject({
    status: 409,
    code: "identity_confirmation_required",
  });
});
