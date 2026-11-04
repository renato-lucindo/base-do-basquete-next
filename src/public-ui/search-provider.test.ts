import { expect, it } from "vitest";
import { PublicSearch } from "./search-provider";
import { discoveryQuerySchema, discoveryPageSchema } from "./search-contract";
import { pubId } from "../../tests/fixtures/publication";
const config = { url: "https://fixture.example", key: "fixture-publishable" };
const query = discoveryQuerySchema.parse({ q: " João ", type: "players" });
const body = {
  query: "João",
  type: "players",
  entityId: null,
  page: 1,
  totalPages: 1,
  counts: { players: 1, teams: 0, competitions: 0 },
  results: [
    {
      kind: "players",
      id: pubId(1),
      name: "João",
      nickname: null,
      disputeId: null,
    },
  ],
};
it("faz uma RPC anônima parametrizada e valida correlação/DTO sem sessão administrativa", async () => {
  const request = new AbortController();
  const client = new PublicSearch(config, async (url, init) => {
    expect(url).toBe(config.url + "/rest/v1/rpc/search_public_entities");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Authorization")).toBeNull();
    expect(new Headers(init.headers).get("cookie")).toBeNull();
    expect(new Headers(init.headers).get("apikey")).toBe(config.key);
    expect(JSON.parse(String(init.body))).toEqual({
      p_query: "João",
      p_type: "players",
      p_page: 1,
      p_entity_id: null,
    });
    expect(init.signal).toBeDefined();
    return Response.json(body);
  });
  expect(await client.search(query, request.signal)).toEqual(body);
});
it("descarta DTO contaminado, contagens incoerentes e resposta de outra consulta antes de mostrar resultados", async () => {
  for (const response of [
    { ...body, query: "Outra" },
    { ...body, type: "all" },
    { ...body, entityId: pubId(2) },
    { ...body, actorId: pubId(3) },
    { ...body, counts: { ...body.counts, players: 2 } },
    { ...body, results: [{ ...body.results[0], birthDate: "1997-01-01" }] },
  ]) {
    await expect(
      new PublicSearch(config, async () => Response.json(response)).search(
        query,
      ),
    ).rejects.toThrow();
  }
  expect(
    discoveryPageSchema.safeParse({
      ...body,
      results: [body.results[0], body.results[0]],
      counts: { players: 2, teams: 0, competitions: 0 },
    }).success,
  ).toBe(false);
});
it("recusa limites inválidos e não ecoa erros/respostas do provedor", async () => {
  for (const q of [
    { q: "á" },
    { q: "a".repeat(121) },
    { q: "ab\ncd" },
    { q: "ab", page: 0 },
    { q: "ab", entityId: pubId(1) },
  ])
    expect(discoveryQuerySchema.safeParse(q).success).toBe(false);
  for (const status of [400, 401, 403, 500]) {
    await expect(
      new PublicSearch(
        config,
        async () => new Response("private db diagnostics", { status }),
      ).search(query),
    ).rejects.not.toThrow("private db diagnostics");
  }
  const aborted = new AbortController();
  aborted.abort();
  await expect(
    new PublicSearch(config, async (_url, init) => {
      init.signal?.throwIfAborted();
      return Response.json(body);
    }).search(query, aborted.signal),
  ).rejects.toThrow();
});
