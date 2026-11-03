import { expect, it } from "vitest";
import { PublicCatalog } from "./catalog-provider";
import { publishedSheet } from "../../tests/fixtures/published-game";
import { pubId } from "../../tests/fixtures/publication";
import { publicRegulationFixture } from "../../tests/fixtures/public-regulation";
const config = { url: "https://public.example", key: "fixture-publishable" };
const r = publishedSheet();
const row = {
  id: r.id,
  disputeId: r.disputeId,
  context: r.context,
  game: r.game,
  home: 2,
  away: 0,
};
it("discovers an explicitly confirmed dispute even with no published result", async () => {
  const s = publicRegulationFixture();
  const dispute = {
    disputeId: s.disputeId,
    context: s.context,
    registrations: s.registrations,
  };
  const provider = new PublicCatalog(config, async (url, init) => {
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
    return Response.json(
      new URL(url).pathname.endsWith("/rpc/list_public_disputes")
        ? [dispute]
        : [],
    );
  });
  expect(await provider.page(null, null)).toEqual({
    games: [],
    next: null,
    disputes: [dispute],
  });
});
it("reads only the published projection with anonymous credentials and a stable cursor", async () => {
  const provider = new PublicCatalog(config, async (url, init) => {
    const u = new URL(url);
    expect(u.pathname).toBe("/rest/v1/published_games");
    expect(u.searchParams.get("select")).not.toContain("*");
    expect(u.searchParams.get("game_id")).toBe(`gt.${pubId(7)}`);
    expect(u.searchParams.get("dispute_id")).toBe(`eq.${r.disputeId}`);
    expect(new Headers(init.headers).get("Authorization")).toBeNull();
    expect(new Headers(init.headers).get("apikey")).toBe(config.key);
    return Response.json([row]);
  });
  expect(await provider.page(r.disputeId, pubId(7))).toEqual({
    games: [
      {
        id: r.id,
        disputeId: r.disputeId,
        context: r.context,
        game: r.game,
        score: { home: 2, away: 0 },
      },
    ],
    next: null,
  });
});
it("does not silently return partial, repeated or mixed public contexts", async () => {
  for (const rows of [
    [row, row],
    [{ ...row, disputeId: pubId(90) }],
    [{ ...row, privateNote: "secret" }],
    [{ ...row, home: null }],
  ]) {
    const provider = new PublicCatalog(config, async () => Response.json(rows));
    await expect(provider.page(r.disputeId, null)).rejects.toThrow();
  }
});
it("searches names from published participation and independent profiles", async () => {
  const calls: string[] = [];
  const person = r.facts.players[0].person;
  const provider = new PublicCatalog(config, async (url) => {
    const u = new URL(url);
    calls.push(u.pathname);
    expect(u.searchParams.get("or")).not.toContain("),");
    return Response.json(
      u.pathname.endsWith("published_player_games")
        ? [{ person, disputeId: r.disputeId }]
        : [person],
    );
  });
  const result = await provider.players("Atleta),*");
  expect(calls).toEqual([
    "/rest/v1/published_player_games",
    "/rest/v1/published_player_profiles",
  ]);
  expect(result.players).toEqual([
    { person, disputeId: r.disputeId },
    { person, disputeId: null },
  ]);
  expect(JSON.stringify(result)).not.toContain("birthDate");
});
it("sanitizes failures and refuses non-public schemas", async () => {
  const provider = new PublicCatalog(config, async () =>
    Response.json({ secret: "private" }, { status: 500 }),
  );
  await expect(provider.page(null, null)).rejects.not.toThrow("private");
});
