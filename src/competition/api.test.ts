import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { api } from "./api";
afterEach(() => vi.unstubAllGlobals());
it("sends a PDF Blob unchanged with only same-origin session cookies", async () => {
  const bytes = new Uint8Array([37, 80, 68, 70, 45, 0, 255]),
    file = new Blob([bytes], { type: "application/pdf" });
  const send = vi.fn(async () => Response.json({ ok: true }));
  vi.stubGlobal("fetch", send);
  await api("/api/pdf-sources", z.object({ ok: z.boolean() }), file);
  expect(send).toHaveBeenCalledWith(
    "/api/pdf-sources",
    expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/pdf" },
      body: file,
    }),
  );
});
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

it("solicita avisos etários somente nas operações de elenco que optam pelo retorno", async () => {
  const send = vi.fn(async () => Response.json({ ok: true }));
  vi.stubGlobal("fetch", send);
  await api("/api/roster", z.unknown(), { entry: {} }, undefined, {
    ageWarnings: true,
  });
  expect(send).toHaveBeenCalledWith(
    "/api/roster",
    expect.objectContaining({
      headers: { "Content-Type": "application/json", "X-BB-Age-Warnings": "1" },
    }),
  );
});
