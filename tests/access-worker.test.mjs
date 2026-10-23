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
        if (url.pathname === "/rest/v1/rpc/list_games") {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          return Response.json({ items: [], hasMore: false });
        }
        if (url.pathname === "/rest/v1/rpc/get_game")
          return Response.json(null);
        if (url.pathname === "/rest/v1/rpc/get_game_sheet")
          return Response.json(null);
        if (url.pathname === "/rest/v1/rpc/save_game_sheet") {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          const { p_command } = await request.json();
          return Response.json({
            requestId: p_command.requestId,
            version: p_command.baseVersion + 1,
            confirmed: false,
          });
        }
        if (url.pathname === "/rest/v1/rpc/save_game") {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          const { p_command } = await request.json();
          return Response.json({
            id: p_command.game.id,
            version: p_command.expectedVersion + 1,
          });
        }
        if (
          [
            "list_text_reviews",
            "get_text_review",
            "get_import_person",
            "save_text_review",
            "prepare_text_target",
            "confirm_text_row",
            "match_import_players",
            "match_import_players_new_target",
          ].some((name) => url.pathname === `/rest/v1/rpc/${name}`)
        ) {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          const args = await request.json();
          if (url.pathname.endsWith("/list_text_reviews"))
            return Response.json({ items: [], hasMore: false });
          if (
            url.pathname.endsWith("/get_text_review") ||
            url.pathname.endsWith("/get_import_person")
          )
            return Response.json(null);
          if (url.pathname.endsWith("/save_text_review"))
            return Response.json({
              id: args.p_command.review.id,
              version: args.p_command.expectedVersion + 1,
            });
          if (url.pathname.endsWith("/prepare_text_target"))
            return Response.json({
              id: args.p_command.reviewId,
              version: args.p_command.expectedVersion,
              registrationId: id,
              registrationVersion: 1,
            });
          if (url.pathname.endsWith("/confirm_text_row"))
            return Response.json({
              id: args.p_command.reviewId,
              version: args.p_command.expectedVersion + 1,
              result: {
                rowId: args.p_command.rowId,
                entityId: id,
                entityVersion: 1,
              },
            });
          return Response.json({
            items: args.p_players.map((p) => ({
              rowId: p.rowId,
              status: "new",
              candidates: [],
              hasMore: false,
            })),
          });
        }
        if (
          ["list_persons", "list_roster", "list_staff"].some(
            (name) => url.pathname === `/rest/v1/rpc/${name}`,
          )
        ) {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          return Response.json({ items: [], hasMore: false });
        }
        if (
          ["get_person", "get_roster_entry", "get_staff_entry"].some(
            (name) => url.pathname === `/rest/v1/rpc/${name}`,
          )
        )
          return Response.json(null);
        if (
          ["save_person", "save_roster_entry", "save_staff_entry"].some(
            (name) => url.pathname === `/rest/v1/rpc/${name}`,
          )
        ) {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          const { p_command: command } = await request.json();
          return Response.json({
            id: (command.person ?? command.entry).id,
            version: 1,
          });
        }
        if (
          [
            "/rest/v1/rpc/list_teams",
            "/rest/v1/rpc/list_registrations",
          ].includes(url.pathname)
        ) {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          return Response.json({ items: [], hasMore: false });
        }
        if (
          ["/rest/v1/rpc/save_team", "/rest/v1/rpc/save_registration"].includes(
            url.pathname,
          )
        ) {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          const { p_command: command } = await request.json();
          return Response.json({
            id: (command.team ?? command.registration).id,
            version: 1,
          });
        }
        if (
          ["/rest/v1/rpc/get_team", "/rest/v1/rpc/get_registration"].includes(
            url.pathname,
          )
        )
          return Response.json(null);
        if (url.pathname === "/rest/v1/rpc/list_competitions") {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          return Response.json({ items: [], recents: [], hasMore: false });
        }
        if (url.pathname === "/rest/v1/rpc/save_competition") {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          const body = await request.json();
          return Response.json({
            id: body.p_command.competition.id,
            version: 1,
          });
        }
        if (url.pathname === "/rest/v1/rpc/get_competition")
          return Response.json(null);
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

test("sheet routes authorize and validate domain, path correlation, origin and limits before RPC", async () => {
  const f = await fixture();
  try {
    const path = `/api/games/${id}/sheet`;
    assert.equal((await f.mf.dispatchFetch(`${origin}${path}`)).status, 401);
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const send = (method, body, extra = {}, suffix = "") =>
      f.mf.dispatchFetch(`${origin}${path}${suffix}`, {
        method,
        headers: {
          cookie,
          origin,
          "content-type": "application/json",
          ...extra,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const r = await send("GET");
    assert.equal(r.status, 200);
    assert.equal(await r.json(), null);
    const command = {
      requestId: id,
      gameId: id,
      gameVersion: 1,
      baseVersion: 0,
      confirm: false,
      reason: "",
      document: {
        rulesVersion: "FIBA_2024",
        periods: 4,
        participants: [],
        staff: {
          home: {
            captainRosterEntryId: null,
            coachStaffEntryId: null,
            assistantStaffEntryId: null,
          },
          away: {
            captainRosterEntryId: null,
            coachStaffEntryId: null,
            assistantStaffEntryId: null,
          },
        },
        events: [],
      },
    };
    const save = await send("POST", command);
    assert.equal(save.status, 200);
    assert.deepEqual(await save.json(), {
      requestId: id,
      version: 1,
      confirmed: false,
    });
    assert.equal(
      (
        await send("POST", {
          ...command,
          gameId: "10000000-0000-4000-8000-000000000002",
        })
      ).status,
      400,
    );
    assert.equal(
      (await send("POST", { ...command, confirm: true })).status,
      400,
    );
    assert.equal(
      (await send("POST", command, { origin: "https://evil.test" })).status,
      403,
    );
    assert.equal((await send("GET", undefined, {}, "?unknown=x")).status, 405);
    assert.equal(
      (await send("POST", { ...command, padding: "x".repeat(524288) })).status,
      413,
    );
    const invalid = structuredClone(command);
    invalid.document.participants = [
      {
        rosterEntryId: id,
        side: "home",
        jersey: "12",
        played: false,
        starter: false,
      },
      {
        rosterEntryId: "10000000-0000-4000-8000-000000000002",
        side: "away",
        jersey: "77",
        played: true,
        starter: false,
      },
    ];
    invalid.document.events = [
      { id, side: "home", period: 1, target: "12", code: "2" },
    ];
    assert.equal((await send("POST", invalid)).status, 400);
    assert.equal(
      f.calls.filter((c) => c === "/rest/v1/rpc/save_game_sheet").length,
      1,
    );
  } finally {
    await f.mf.dispose();
  }
});

test("game routes enforce session, fixed RPCs, origin and contextual commands", async () => {
  const f = await fixture();
  try {
    for (const path of [`/api/games?disputeId=${id}`, `/api/games/${id}`])
      assert.equal((await f.mf.dispatchFetch(`${origin}${path}`)).status, 401);
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const send = (method, path, body, headers = {}) =>
      f.mf.dispatchFetch(`${origin}${path}`, {
        method,
        headers: {
          cookie,
          origin,
          "content-type": "application/json",
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    assert.equal(
      (await send("GET", `/api/games?disputeId=${id}&q=Team&offset=20`)).status,
      200,
    );
    assert.equal((await send("GET", `/api/games/${id}`)).status, 404);
    const command = {
      commandId: id,
      expectedVersion: 0,
      game: {
        id,
        disputeId: id,
        homeRegistrationId: id,
        awayRegistrationId: "10000000-0000-4000-8000-000000000002",
        date: null,
        time: null,
        venue: null,
        number: null,
      },
    };
    const result = await send("POST", "/api/games", command);
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { id, version: 1 });
    assert.equal(
      (
        await send("POST", "/api/games", command, {
          origin: "https://evil.test",
        })
      ).status,
      403,
    );
    assert.equal(
      (await send("POST", "/api/games", { ...command, actorId: id })).status,
      400,
    );
    assert.equal(
      (
        await send("POST", "/api/games", {
          ...command,
          game: { ...command.game, awayRegistrationId: id },
        })
      ).status,
      400,
    );
    for (const path of [
      "/api/games",
      `/api/games?disputeId=${id}&disputeId=${id}`,
      `/api/games?disputeId=${id}&offset=-1`,
      `/api/games?disputeId=${id}&unknown=x`,
      `/api/games/invalid`,
    ])
      assert.equal((await send("GET", path)).status, 400, path);
    assert.equal(
      (
        await send("POST", "/api/games", {
          ...command,
          padding: "x".repeat(8192),
        })
      ).status,
      413,
    );
    assert.equal(
      f.calls.filter((c) => c === "/rest/v1/rpc/save_game").length,
      1,
    );
  } finally {
    await f.mf.dispose();
  }
});

test("text import routes enforce session, origin, bounds and fixed private operations", async () => {
  const f = await fixture();
  try {
    for (const path of [
      `/api/text-import?disputeId=${id}`,
      `/api/text-import/${id}`,
      `/api/text-import/people/${id}?disputeId=${id}`,
    ])
      assert.equal((await f.mf.dispatchFetch(`${origin}${path}`)).status, 401);
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const send = (method, path, body, headers = {}) =>
      f.mf.dispatchFetch(`${origin}${path}`, {
        method,
        headers: {
          cookie,
          origin,
          "content-type": "application/json",
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    assert.equal(
      (await send("GET", `/api/text-import?disputeId=${id}`)).status,
      200,
    );
    assert.equal((await send("GET", `/api/text-import/${id}`)).status, 404);
    assert.equal(
      (await send("GET", `/api/text-import/people/${id}?disputeId=${id}`))
        .status,
      404,
    );
    const review = {
      id,
      disputeId: id,
      text: "Ana",
      teamName: null,
      target: { kind: "registration", registrationId: id, version: 1 },
      ignoredLines: [],
      issues: [],
      rows: [
        {
          id,
          line: 1,
          source: "Ana",
          selected: true,
          rosterId: id,
          rosterVersion: 0,
          decision: null,
          issues: [],
          provided: ["name"],
          data: {
            name: "Ana",
            jersey: null,
            nickname: null,
            birthDate: null,
            birthYear: null,
            positions: [],
            heightCm: null,
            weightKg: null,
            dominantHand: "right",
            federationRegistration: null,
          },
        },
      ],
    };
    const save = { commandId: id, expectedVersion: 0, review };
    const matching = {
      disputeId: id,
      registrationId: null,
      players: [
        {
          rowId: id,
          name: "Ana",
          nickname: null,
          birthDate: null,
          birthYear: null,
          federationRegistration: null,
        },
      ],
    };
    for (const [path, command] of [
      ["/api/text-import", save],
      ["/api/text-import/match", matching],
      ["/api/text-import/match", { ...matching, registrationId: id }],
      [
        "/api/text-import/prepare",
        { commandId: id, reviewId: id, expectedVersion: 1 },
      ],
      [
        "/api/text-import/confirm",
        { commandId: id, reviewId: id, rowId: id, expectedVersion: 1 },
      ],
    ]) {
      const r = await send("POST", path, command);
      assert.equal(r.status, 200);
      assert.ok(!(await r.text()).includes("fixture-access"));
    }
    const before = f.calls.length;
    assert.equal(
      (
        await send("POST", "/api/text-import", save, {
          origin: "https://outside.example.test",
        })
      ).status,
      403,
    );
    assert.equal(
      (await send("POST", "/api/text-import", { ...save, actorId: id })).status,
      400,
    );
    assert.equal(
      (
        await send("POST", "/api/text-import", {
          ...save,
          review: { ...review, text: "a".repeat(262144) },
        })
      ).status,
      413,
    );
    assert.equal(
      (await send("GET", `/api/text-import?disputeId=${id}&disputeId=${id}`))
        .status,
      400,
    );
    assert.equal(
      (await send("GET", `/api/text-import?disputeId=${id}&offset=-1`)).status,
      400,
    );
    assert.equal(
      (
        await send(
          "GET",
          `/api/text-import/people/${id}?disputeId=${id}&token=x`,
        )
      ).status,
      400,
    );
    assert.equal(f.calls.length, before);
  } finally {
    await f.mf.dispose();
  }
});

test("people, roster and staff routes validate private session, commands and contextual reads", async () => {
  const f = await fixture();
  try {
    const targets = [
      "/api/people",
      `/api/roster?registrationId=${id}`,
      `/api/staff?registrationId=${id}`,
    ];
    for (const path of targets)
      assert.equal((await f.mf.dispatchFetch(`${origin}${path}`)).status, 401);
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const send = (method, path, body, headers = {}) =>
      f.mf.dispatchFetch(`${origin}${path}`, {
        method,
        headers: {
          cookie,
          origin,
          "content-type": "application/json",
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    for (const path of targets) {
      const r = await send("GET", path);
      assert.equal(r.status, 200);
      assert.deepEqual(await r.json(), { items: [], hasMore: false });
    }
    const person = {
      id,
      name: "Pessoa",
      nickname: null,
      publicBirthYear: null,
      heightCm: null,
      weightKg: null,
      position: null,
      dominantHand: null,
      originCity: null,
      originState: null,
      biography: null,
      athlete: null,
      coach: true,
    };
    for (const [path, command] of [
      [
        "/api/people",
        {
          commandId: id,
          expectedVersion: 0,
          disputeId: null,
          confirmHomonym: false,
          person,
        },
      ],
      [
        "/api/roster",
        {
          commandId: id,
          expectedVersion: 0,
          entry: {
            id,
            registrationId: id,
            personId: id,
            jersey: "00",
            active: true,
          },
        },
      ],
      [
        "/api/staff",
        {
          commandId: id,
          expectedVersion: 0,
          entry: {
            id,
            registrationId: id,
            personId: id,
            role: "head",
            active: true,
          },
        },
      ],
    ]) {
      const r = await send("POST", path, command);
      assert.equal(r.status, 200);
      assert.deepEqual(await r.json(), { id, version: 1 });
      assert.equal(
        (await send("POST", path, command, { origin: "https://evil.test" }))
          .status,
        403,
      );
      assert.equal(
        (await send("POST", path, { ...command, actorId: id })).status,
        400,
      );
      assert.equal((await send("GET", `${path}/${id}`)).status, 404);
      assert.equal((await send("GET", `${path}/invalid`)).status, 400);
    }
    for (const path of [
      "/api/people?kind=invalid",
      "/api/people?q=a&q=b",
      "/api/people?offset=-1",
      "/api/roster",
      "/api/staff?registrationId=invalid",
      `/api/roster?registrationId=${id}&activeOnly=yes`,
    ])
      assert.equal((await send("GET", path)).status, 400, path);
    assert.equal(
      f.calls.filter((c) => c === "/rest/v1/rpc/save_person").length,
      1,
    );
  } finally {
    await f.mf.dispose();
  }
});

test("team and registration routes enforce session, context, origin and strict commands", async () => {
  const f = await fixture();
  try {
    for (const path of ["/api/teams", `/api/registrations?disputeId=${id}`])
      assert.equal((await f.mf.dispatchFetch(`${origin}${path}`)).status, 401);
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const send = (method, path, body, headers = {}) =>
      f.mf.dispatchFetch(`${origin}${path}`, {
        method,
        headers: {
          cookie,
          origin,
          "content-type": "application/json",
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    for (const path of [
      "/api/teams?q=Lobos&offset=20",
      `/api/registrations?disputeId=${id}`,
    ]) {
      const r = await send("GET", path);
      assert.equal(r.status, 200);
      assert.deepEqual(await r.json(), { items: [], hasMore: false });
    }
    const team = {
      commandId: id,
      expectedVersion: 0,
      team: { id, name: "Lobos", abbreviation: null },
    };
    const registration = {
      commandId: id,
      expectedVersion: 0,
      registration: { id, teamId: id, disputeId: id, name: "Lobos B" },
    };
    for (const [path, command] of [
      ["/api/teams", team],
      ["/api/registrations", registration],
    ]) {
      const r = await send("POST", path, command);
      assert.equal(r.status, 200);
      assert.deepEqual(await r.json(), { id, version: 1 });
      assert.equal(
        (await send("POST", path, command, { origin: "https://evil.test" }))
          .status,
        403,
      );
      assert.equal(
        (await send("POST", path, { ...command, actorId: id })).status,
        400,
      );
      assert.equal((await send("GET", `${path}/${id}`)).status, 404);
      assert.equal((await send("GET", `${path}/invalid`)).status, 400);
    }
    for (const path of [
      "/api/registrations",
      "/api/registrations?disputeId=invalid",
      `/api/registrations?disputeId=${id}&disputeId=${id}`,
      "/api/teams?offset=-1",
      "/api/teams?q=a&q=b",
      "/api/teams?unknown=x",
    ])
      assert.equal((await send("GET", path)).status, 400, path);
    assert.equal(
      f.calls.filter((c) => c === "/rest/v1/rpc/save_team").length,
      1,
    );
    assert.equal(
      f.calls.filter((c) => c === "/rest/v1/rpc/save_registration").length,
      1,
    );
  } finally {
    await f.mf.dispose();
  }
});

test("competition HTTP operations require session and origin, use fixed RPCs and return no token", async () => {
  const f = await fixture();
  const command = {
    commandId: "20000000-0000-4000-8000-000000000001",
    expectedVersion: 0,
    competition: {
      id: "20000000-0000-4000-8000-000000000002",
      name: "Liga",
      seasons: [
        {
          id: "20000000-0000-4000-8000-000000000003",
          year: 2026,
          disputes: [
            {
              id: "20000000-0000-4000-8000-000000000004",
              gender: "feminino",
              category: "Adulto",
              division: null,
            },
          ],
        },
      ],
    },
  };
  try {
    assert.equal(
      (await f.mf.dispatchFetch(`${origin}/api/competitions`)).status,
      401,
    );
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const send = (method, path, body, extra = {}) =>
      f.mf.dispatchFetch(`${origin}${path}`, {
        method,
        headers: {
          cookie,
          origin,
          "content-type": "application/json",
          ...extra,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const list = await send("GET", "/api/competitions?q=Adulto&offset=20");
    assert.equal(list.status, 200);
    assert.deepEqual(await list.json(), {
      items: [],
      recents: [],
      hasMore: false,
    });
    const saved = await send("POST", "/api/competitions", command);
    assert.equal(saved.status, 200);
    assert.deepEqual(await saved.json(), {
      id: command.competition.id,
      version: 1,
    });
    assert.equal(
      (
        await send("POST", "/api/competitions", command, {
          origin: "https://evil.example",
        })
      ).status,
      403,
    );
    assert.equal(
      (await send("POST", "/api/competitions", { ...command, actorId: id }))
        .status,
      400,
    );
    assert.equal(
      (await send("GET", "/api/competitions/not-an-id")).status,
      400,
    );
    assert.equal(
      (await send("GET", `/api/competitions/${command.competition.id}`)).status,
      404,
    );
    assert.equal(
      (await send("GET", "/api/competitions?offset=-1")).status,
      400,
    );
    assert.equal((await send("GET", "/api/competitions?q=a&q=b")).status, 400);
    assert.equal(
      f.calls.filter((c) => c === "/rest/v1/rpc/save_competition").length,
      1,
    );
  } finally {
    await f.mf.dispose();
  }
});

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
