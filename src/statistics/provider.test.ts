import { expect, it, vi } from "vitest";
import { SupabaseStatistics } from "./provider";
import { confirmedManualFixture } from "../../tests/fixtures/statistics-publications";
import { pubId } from "../../tests/fixtures/publication";
const config = { url: "https://db.example.test", key: "fixture-publishable" };
function source() {
  return {
    kind: "confirmed-statistics-v1",
    disputeId: pubId(801),
    version: 1,
    minimumSeconds: 600,
    confirmedAt: "2026-10-25T16:00:00Z",
    games: [{ phase: null, snapshot: confirmedManualFixture() }],
  };
}
it("consulta é derivada no servidor, sem JWT/cookie e só envia UUID canônico à RPC", async () => {
  const send = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () => Response.json(source()),
    ),
    db = new SupabaseStatistics(config, send);
  const result = await db.getPage(
    pubId(801).toUpperCase(),
    new URLSearchParams("scope=all&mode=total"),
  );
  expect(
    result?.rows.find((r) => r.personId === pubId(1))?.metrics.points.value,
  ).toBe(2);
  expect(send).toHaveBeenCalledTimes(1);
  const [url, init] = send.mock.calls[0];
  expect(url).toBe(`${config.url}/rest/v1/rpc/get_public_statistics_source`);
  expect(JSON.parse(init.body as string)).toEqual({ p_dispute_id: pubId(801) });
  const headers = new Headers(init.headers);
  expect(headers.get("apikey")).toBe(config.key);
  expect(headers.has("authorization")).toBe(false);
  expect(headers.has("cookie")).toBe(false);
});
it("contexto não publicado é null; contexto trocado e dados extras não são aceitos", async () => {
  expect(
    await new SupabaseStatistics(config, async () =>
      Response.json(null),
    ).getPage(pubId(801), new URLSearchParams()),
  ).toBeNull();
  for (const value of [
    { ...source(), disputeId: pubId(999) },
    { ...source(), actorId: pubId(1) },
    { ...source(), minimumSeconds: 0 },
    {},
  ])
    await expect(
      new SupabaseStatistics(config, async () => Response.json(value)).getPage(
        pubId(801),
        new URLSearchParams(),
      ),
    ).rejects.toMatchObject({ status: 503 });
});
it("erros, JSON malformado e resposta sem tamanho declarado são limitados e sanitizados", async () => {
  for (const status of [400, 401, 403, 404, 500]) {
    const send = async () =>
      Response.json(
        { message: "private SQL and provider details" },
        { status },
      );
    await expect(
      new SupabaseStatistics(config, send).getPage(
        pubId(801),
        new URLSearchParams(),
      ),
    ).rejects.toMatchObject({ status: 503 });
  }
  await expect(
    new SupabaseStatistics(config, async () => new Response("{bad")).getPage(
      pubId(801),
      new URLSearchParams(),
    ),
  ).rejects.toMatchObject({ status: 503 });
  await expect(
    new SupabaseStatistics(config, async () => {
      throw Error("private network details");
    }).getPage(pubId(801), new URLSearchParams()),
  ).rejects.toMatchObject({ status: 503 });
  let cancelled = false;
  const large = () =>
    new Response(
      new ReadableStream<Uint8Array>({
        pull(c) {
          c.enqueue(new Uint8Array(1024 * 1024));
        },
        cancel() {
          cancelled = true;
        },
      }),
    );
  await expect(
    new SupabaseStatistics(config, async () => large()).getPage(
      pubId(801),
      new URLSearchParams(),
    ),
  ).rejects.toMatchObject({ status: 503 });
  expect(cancelled).toBe(true);
});
it("ID inválido não consulta e limitação do provedor não vira ausência de dados", async () => {
  const send = vi.fn(async () => Response.json(null, { status: 429 })),
    db = new SupabaseStatistics(config, send);
  await expect(
    db.getPage("invalid", new URLSearchParams()),
  ).rejects.toMatchObject({ status: 400 });
  expect(send).not.toHaveBeenCalled();
  await expect(
    db.getPage(pubId(801), new URLSearchParams()),
  ).rejects.toMatchObject({ status: 429 });
});
