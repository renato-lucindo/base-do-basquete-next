import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, Response, convertV4MiniflareOptions } from "miniflare";

const origin = "https://app.example.test";
const id = "10000000-0000-4000-8000-000000000001";

async function fixture(options = {}) {
  const calls = [];
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      name: "access-test",
      modules: true,
      scriptPath: ".worker-artifacts/worker.js",
      compatibilityDate: "2026-10-23",
      compatibilityFlags: ["nodejs_compat"],
      bindings: {
        APP_ORIGIN: origin,
        SUPABASE_URL: "https://auth.example.test",
        SUPABASE_PUBLISHABLE_KEY: "fixture-publishable",
        SESSION_ENCRYPTION_KEY: btoa("\0".repeat(32)),
      },
      durableObjects: {
        SESSIONS: { className: "SessionStore", useSQLite: true },
      },
      ratelimits: {
        LOGIN_LIMITER: {
          namespace_id: "1001",
          simple: { limit: 10, period: 60 },
        },
      },
      serviceBindings: {
        ASSETS: async (request) =>
          new URL(request.url).pathname === "/foundation.html"
            ? new Response(await readFile("dist-foundation/foundation.html"), {
                headers: { "Content-Type": "text/html; charset=utf-8" },
              })
            : new Response("Not found", { status: 404 }),
      },
      outboundService: async (request) => {
        const url = new URL(request.url);
        calls.push(url.pathname + url.search);
        if (url.pathname === "/auth/v1/token") {
          if (options.invalid)
            return Response.json(
              { message: "fixture-private-provider-value" },
              { status: 400 },
            );
          return Response.json({
            access_token: "fixture-access",
            refresh_token: "fixture-refresh",
            expires_in:
              options.forceRefresh &&
              url.searchParams.get("grant_type") === "password"
                ? 1
                : 900,
          });
        }
        if (url.pathname === "/auth/v1/user")
          return Response.json({ id, is_anonymous: false });
        if (url.pathname === "/rest/v1/admin_access")
          return Response.json(
            options.denied ? [] : [{ user_id: id, enabled: true }],
          );
        if (url.pathname === "/auth/v1/logout")
          return new Response(null, { status: 204 });
        throw new Error("Unexpected outbound endpoint");
      },
    }),
  );
  const send = (method, { cookie, body, headers = {} } = {}) =>
    mf.dispatchFetch(`${origin}/api/session`, {
      method,
      headers: {
        origin,
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const login = () =>
    send("POST", {
      body: { email: "admin@example.test", password: "fixture-password" },
    });
  return { mf, send, login, calls };
}

test("Worker and Durable Object implement private login, session, logout and cookie integrity", async () => {
  const f = await fixture({ forceRefresh: true });
  try {
    const home = await f.mf.dispatchFetch(`${origin}/`);
    assert.equal(home.status, 200);
    assert.ok(
      home.headers.get("content-security-policy").includes("script-src 'self'"),
    );
    assert.ok((await home.text()).includes('id="root"'));
    assert.equal((await f.mf.dispatchFetch(`${origin}/worker.js`)).status, 404);
    assert.equal((await f.send("GET")).status, 401);
    const login = await f.login();
    assert.equal(
      login.status,
      200,
      JSON.stringify({ body: await login.clone().json(), calls: f.calls }),
    );
    assert.deepEqual(await login.json(), { authenticated: true });
    const setCookie = login.headers.get("set-cookie");
    for (const flag of [
      "__Host-bdb-session=",
      "HttpOnly",
      "Secure",
      "SameSite=Strict",
      "Path=/",
    ])
      assert.ok(setCookie.includes(flag));
    assert.ok(!setCookie.includes("fixture-access"));
    const cookie = setCookie.split(";", 1)[0];
    const parallel = await Promise.all([
      f.send("GET", { cookie }),
      f.send("GET", { cookie }),
      f.send("GET", { cookie }),
    ]);
    assert.ok(parallel.every((response) => response.status === 200));
    for (const response of parallel) await response.arrayBuffer();
    assert.equal(
      f.calls.filter((path) => path.includes("grant_type=refresh_token"))
        .length,
      1,
    );
    assert.equal(
      (await f.send("GET", { cookie: cookie.slice(0, -4) + "AAAA" })).status,
      401,
    );
    assert.equal((await f.send("DELETE", { cookie, body: {} })).status, 204);
    assert.equal((await f.send("GET", { cookie })).status, 401);
  } finally {
    await f.mf.dispose();
  }
});

test("Worker denies CSRF, invalid credentials and unauthorized identities without a session cookie", async () => {
  for (const options of [{ invalid: true }, { denied: true }]) {
    const f = await fixture(options);
    try {
      const csrf = await f.send("POST", {
        body: {},
        headers: { origin: "https://evil.test" },
      });
      assert.equal(csrf.status, 403);
      assert.equal(f.calls.length, 0);
      const response = await f.login();
      assert.equal(
        response.status,
        options.invalid ? 401 : 403,
        JSON.stringify({ body: await response.clone().json(), calls: f.calls }),
      );
      assert.ok(!response.headers.get("set-cookie")?.includes("Max-Age=28800"));
      assert.ok(
        !(await response.text()).includes("fixture-private-provider-value"),
      );
    } finally {
      await f.mf.dispose();
    }
  }
});

test("Worker applies login rate limits before issuing additional Auth requests", async () => {
  const f = await fixture({ invalid: true });
  try {
    let limited = false;
    for (let i = 0; i < 14; i++) {
      const response = await f.login();
      await response.arrayBuffer();
      if (response.status === 429) {
        limited = true;
        break;
      }
    }
    assert.ok(limited);
    assert.ok(f.calls.length > 0);
    assert.ok(f.calls.length <= 10);
  } finally {
    await f.mf.dispose();
  }
});
