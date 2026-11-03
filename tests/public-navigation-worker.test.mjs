import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, Response, convertV4MiniflareOptions } from "miniflare";

test("public discovery uses anonymous published tables, validates transport and keeps the admin entry", async () => {
  const origin = "https://app.example.test";
  const source = JSON.parse(
    await readFile("tests/fixtures/statistics-source.json", "utf8"),
  );
  const g = source.games[0].snapshot,
    calls = [];
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      scriptPath: ".worker-artifacts/worker.js",
      compatibilityDate: "2026-10-23",
      compatibilityFlags: ["nodejs_compat"],
      bindings: {
        APP_ORIGIN: origin,
        SUPABASE_URL: "https://public.example.test",
        SUPABASE_PUBLISHABLE_KEY: "fixture-publishable",
      },
      durableObjects: {
        SESSIONS: { className: "SessionStore", useSQLite: true },
      },
      serviceBindings: {
        ASSETS: async (request) => new Response(new URL(request.url).pathname),
      },
      outboundService: async (request) => {
        const u = new URL(request.url);
        calls.push(u);
        assert.equal(request.headers.get("Authorization"), null);
        assert.equal(request.headers.get("apikey"), "fixture-publishable");
        assert.equal(u.hostname, "public.example.test");
        if (u.pathname === "/rest/v1/published_games")
          return Response.json([
            {
              id: g.id,
              disputeId: g.disputeId,
              context: g.context,
              game: g.game,
              home: g.facts.teams.home.points,
              away: g.facts.teams.away.points,
            },
          ]);
        if (u.pathname === "/rest/v1/published_player_games")
          return Response.json([
            { person: g.facts.players[0].person, disputeId: g.disputeId },
          ]);
        if (u.pathname === "/rest/v1/published_player_profiles")
          return Response.json([]);
        if (u.pathname === "/rest/v1/rpc/list_public_disputes")
          return Response.json([]);
        if (u.pathname === "/rest/v1/rpc/get_public_standings")
          return Response.json(null);
        assert.fail(`Unexpected outbound: ${u.pathname}`);
      },
    }),
  );
  try {
    // Ordinary assets stay in the same protected Worker. No session read or public admin lookup.
    assert.equal(
      await (await mf.dispatchFetch(origin + "/")).text(),
      "/publico.html",
    );
    assert.equal(
      await (await mf.dispatchFetch(origin + "/foundation.html")).text(),
      "/foundation.html",
    );
    for (const path of [
      "/api/public/catalog?disputeId=bad",
      "/api/public/catalog?after=bad",
      "/api/public/catalog?offset=1",
      "/api/public/search?q=a",
      "/api/public/search?q=ab&q=cd",
      "/api/public/catalog?disputeId=x&disputeId=x",
      "/api/public/standings/bad",
      `/api/public/standings/${g.disputeId}?extra=1`,
    ]) {
      const r = await mf.dispatchFetch(origin + path);
      assert.equal(r.status, 400);
    }
    assert.equal(
      (
        await mf.dispatchFetch(origin + "/api/public/catalog", {
          method: "POST",
        })
      ).status,
      405,
    );
    assert.equal(calls.length, 0);
    assert.equal(
      (
        await mf.dispatchFetch(
          origin + `/api/regulations/${g.disputeId}/publication`,
        )
      ).status,
      401,
    );
    const standings = await mf.dispatchFetch(
      origin + `/api/public/standings/${g.disputeId}`,
    );
    assert.equal(standings.status, 200);
    assert.equal(await standings.json(), null);
    const response = await mf.dispatchFetch(
      origin + `/api/public/catalog?disputeId=${g.disputeId}`,
    );
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.ok(
      response.headers
        .get("content-security-policy")
        .includes("connect-src 'self'"),
    );
    const page = await response.json();
    assert.equal(page.games[0].disputeId, g.disputeId);
    assert.equal(calls[1].searchParams.get("dispute_id"), `eq.${g.disputeId}`);
    const search = await mf.dispatchFetch(
      origin + "/api/public/search?q=Atleta",
    );
    assert.equal(search.status, 200, await search.clone().text());
    assert.equal(
      (await search.json()).players[0].person.id,
      g.facts.players[0].person.id,
    );
    assert.equal(calls.length, 5);
  } finally {
    await mf.dispose();
  }
});
