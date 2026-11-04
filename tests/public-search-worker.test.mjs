import { test } from "node:test";
import assert from "node:assert/strict";
import { Miniflare, Response, convertV4MiniflareOptions } from "miniflare";
test("global public discovery uses one bounded anonymous RPC and rejects unsafe input or contaminated results", async () => {
  const origin = "https://app.example.test",
    calls = [];
  let bad = false,
    fail = false;
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
      serviceBindings: { ASSETS: async () => new Response("asset") },
      outboundService: async (request) => {
        const u = new URL(request.url);
        assert.equal(u.pathname, "/rest/v1/rpc/search_public_entities");
        assert.equal(request.method, "POST");
        assert.equal(request.headers.get("Authorization"), null);
        assert.equal(request.headers.get("cookie"), null);
        assert.equal(request.headers.get("apikey"), "fixture-publishable");
        const args = await request.json();
        calls.push(args);
        if (fail)
          return new Response("private provider diagnostics", { status: 500 });
        const body = {
          query: args.p_query,
          type: args.p_type,
          entityId: args.p_entity_id,
          page: 1,
          totalPages: 1,
          counts: { players: 1, teams: 0, competitions: 0 },
          results: [
            {
              kind: "players",
              id: "f9200000-0000-4000-8000-000000170001",
              name: "João",
              nickname: null,
              disputeId: null,
            },
          ],
        };
        if (bad) body.results[0].birthDate = "1997-01-01";
        return Response.json(body);
      },
    }),
  );
  try {
    for (const path of [
      "?q=a",
      "?q=ab&q=cd",
      "?q=ab&type=private",
      "?q=ab&page=-1",
      "?q=ab&page=1e2",
      "?q=ab&page=1.0",
      "?q=ab&entityId=bad",
      "?q=ab&offset=1",
      "?q=%00ab",
    ]) {
      assert.equal(
        (await mf.dispatchFetch(origin + "/api/public/discovery" + path))
          .status,
        400,
        path,
      );
    }
    assert.equal(calls.length, 0);
    assert.equal(
      (
        await mf.dispatchFetch(origin + "/api/public/discovery?q=ab", {
          method: "POST",
        })
      ).status,
      405,
    );
    assert.equal(calls.length, 0);
    const response = await mf.dispatchFetch(
      origin + "/api/public/discovery?q=Jo%C3%A3o&type=players",
      {
        headers: {
          Cookie: "admin=not-forwarded",
          Authorization: "Bearer not-forwarded",
        },
      },
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal((await response.json()).results[0].name, "João");
    assert.deepEqual(calls, [
      { p_query: "João", p_type: "players", p_page: 1, p_entity_id: null },
    ]);
    bad = true;
    assert.equal(
      (
        await mf.dispatchFetch(
          origin + "/api/public/discovery?q=Jo%C3%A3o&type=players",
        )
      ).status,
      503,
    );
    bad = false;
    fail = true;
    const failed = await mf.dispatchFetch(
      origin + "/api/public/discovery?q=Jo%C3%A3o&type=players",
    );
    assert.equal(failed.status, 503);
    assert.doesNotMatch(await failed.text(), /private provider diagnostics/u);
  } finally {
    await mf.dispose();
  }
});
