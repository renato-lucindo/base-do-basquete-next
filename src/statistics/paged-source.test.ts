import { expect, it, vi } from "vitest";
import { readPublicStatisticsSource } from "./source-provider";
import { statisticsSourceSchema } from "./source";
import { teamStatisticsFixture } from "../../tests/fixtures/team-statistics";
import { statisticsRpcBody } from "../../tests/fixtures/statistics-rpc";
import { pubId } from "../../tests/fixtures/publication";
const config = { url: "https://db.example.test", key: "fixture-publishable" };
function fixture(count = 201) {
  const s = teamStatisticsFixture(),
    seed = s.games[0];
  return {
    ...s,
    games: Array.from({ length: count }, (_, i) => {
      const g = structuredClone(seed);
      g.snapshot.id = pubId(70000 + i);
      return g;
    }),
  };
}
it("monta todas as páginas antes de devolver uma fonte fechada, sem cookies/JWT", async () => {
  const source = fixture();
  const send = vi.fn(async (url: string, init: RequestInit) =>
    Response.json(
      statisticsRpcBody(source, url, JSON.parse(init.body as string)),
    ),
  );
  const actual = statisticsSourceSchema.parse(
    await readPublicStatisticsSource(config, send, source.disputeId),
  );
  expect(actual).toEqual(source);
  expect(send).toHaveBeenCalledTimes(4);
  expect(send.mock.calls.map(([u]) => u.split("/").at(-1))).toEqual([
    "get_public_statistics_head",
    ...Array(3).fill("get_public_statistics_page"),
  ]);
  for (const [, init] of send.mock.calls) {
    const h = new Headers(init.headers);
    expect(h.get("apikey")).toBe(config.key);
    expect(h.has("authorization") || h.has("cookie")).toBe(false);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  }
  expect(JSON.parse(send.mock.calls[2][1].body as string)).toEqual({
    p_dispute_id: source.disputeId,
    p_version: source.version,
    p_after: pubId(70099),
  });
});
it("conflito intercalado descarta páginas antigas e reinicia somente GET uma vez", async () => {
  const old = fixture(),
    current = { ...old, version: old.version + 1 };
  current.games = old.games.slice(0, 2);
  let heads = 0,
    pages = 0;
  const send = vi.fn(async (url: string, init: RequestInit) => {
    if (url.endsWith("_head")) heads++;
    else if (++pages === 2)
      return Response.json({ message: "private details" }, { status: 409 });
    return Response.json(
      statisticsRpcBody(
        heads === 1 ? old : current,
        url,
        JSON.parse(init.body as string),
      ),
    );
  });
  expect(await readPublicStatisticsSource(config, send, old.disputeId)).toEqual(
    current,
  );
  expect(heads).toBe(2);
  expect(pages).toBe(3);
  expect(send).toHaveBeenCalledTimes(5);
});
it("conflito repetido é409 explícito e não vira total parcial ou tentativas ilimitadas", async () => {
  const s = fixture();
  const send = vi.fn(async (url: string, init: RequestInit) =>
    url.endsWith("_head")
      ? Response.json(
          statisticsRpcBody(s, url, JSON.parse(init.body as string)),
        )
      : Response.json({ message: "private details" }, { status: 409 }),
  );
  await expect(
    readPublicStatisticsSource(config, send, s.disputeId),
  ).rejects.toMatchObject({ status: 409, code: "source_changed" });
  expect(send).toHaveBeenCalledTimes(4);
});
it("ausência énull; head vazio éfonte vazia válida sem consultar página", async () => {
  for (const s of [null, fixture(0)]) {
    const send = vi.fn(async (url: string, init: RequestInit) =>
      Response.json(statisticsRpcBody(s, url, JSON.parse(init.body as string))),
    );
    const r = await readPublicStatisticsSource(config, send, pubId(801));
    expect(r).toEqual(s);
    expect(send).toHaveBeenCalledTimes(1);
  }
});
it.each([
  "context",
  "version",
  "after",
  "next",
  "order",
  "duplicate",
  "count",
  "private",
])("recusa página %s sem calcular fonte parcial", async (kind) => {
  const s = fixture(2);
  let calls = 0;
  const send = async (url: string, init: RequestInit) => {
    calls++;
    const result = statisticsRpcBody(s, url, JSON.parse(init.body as string));
    if (url.endsWith("_head")) return Response.json(result);
    const p = result as {
      disputeId: string;
      version: number;
      after: string | null;
      next: string | null;
      games: typeof s.games;
      reason?: string;
    };
    if (kind === "context") p.disputeId = pubId(999);
    if (kind === "version") p.version++;
    if (kind === "after") p.after = pubId(70000);
    if (kind === "next") p.next = pubId(70000);
    if (kind === "order") p.games.reverse();
    if (kind === "duplicate") p.games[1] = p.games[0];
    if (kind === "count") p.games.pop();
    if (kind === "private") p.reason = "private";
    return Response.json(p);
  };
  await expect(
    readPublicStatisticsSource(config, send, s.disputeId),
  ).rejects.toMatchObject({ status: 503 });
  expect(calls).toBe(2);
});
it("não aceita head de outro contexto, campos privados ou capacidade excedida", async () => {
  const s = fixture(0),
    head = statisticsRpcBody(s, "/get_public_statistics_head", {}) as object;
  for (const value of [
    { ...head, disputeId: pubId(999) },
    { ...head, reason: "private" },
    { ...head, gameCount: 10001 },
  ])
    await expect(
      readPublicStatisticsSource(
        config,
        async () => Response.json(value),
        s.disputeId,
      ),
    ).rejects.toMatchObject({ status: 503 });
});
it("não mistura raízes entre páginas mesmo com a mesma disputa declarada", async () => {
  const s = fixture(101);
  s.games[100].snapshot.context.seasonId = pubId(999);
  const send = async (url: string, init: RequestInit) =>
    Response.json(statisticsRpcBody(s, url, JSON.parse(init.body as string)));
  await expect(
    readPublicStatisticsSource(config, send, s.disputeId),
  ).rejects.toMatchObject({ status: 503 });
});
it("limita bytes reais acumulados incluindo whitespace, sem confiar em ContentLength", async () => {
  const s = fixture(1101);
  let calls = 0;
  const send = async (url: string, init: RequestInit) => {
    calls++;
    const body = JSON.stringify(
      statisticsRpcBody(s, url, JSON.parse(init.body as string)),
    );
    return new Response(
      (url.endsWith("_head") ? "" : " ".repeat(2 * 1024 * 1024)) + body,
    );
  };
  await expect(
    readPublicStatisticsSource(config, send, s.disputeId),
  ).rejects.toMatchObject({ status: 413, code: "source_capacity" });
  expect(calls).toBeLessThan(12);
});
it("encerra paginação excessiva em vez de consultar indefinidamente", async () => {
  const s = fixture(121);
  let calls = 0;
  const send = async (url: string, init: RequestInit) => {
    calls++;
    const args = JSON.parse(init.body as string);
    if (url.endsWith("_head"))
      return Response.json(statisticsRpcBody(s, url, args));
    const index = args.p_after
      ? s.games.findIndex((g) => g.snapshot.id === args.p_after) + 1
      : 0;
    return Response.json({
      kind: "confirmed-statistics-page-v1",
      disputeId: s.disputeId,
      version: s.version,
      after: args.p_after,
      next: index === 120 ? null : s.games[index].snapshot.id,
      games: [s.games[index]],
    });
  };
  await expect(
    readPublicStatisticsSource(config, send, s.disputeId),
  ).rejects.toMatchObject({ status: 413 });
  expect(calls).toBe(121);
});
