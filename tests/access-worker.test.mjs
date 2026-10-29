import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, Response, convertV4MiniflareOptions } from "miniflare";
import { regulationFixture, regulationId } from "./fixtures/regulation.ts";
import { decisionBackend } from "./fixtures/decisions.mjs";
import { transferBackend } from "./fixtures/transfer-backend.mjs";
import { transferFixture, transferId } from "./fixtures/transfers.ts";
import { achievementBackendFixture } from "./fixtures/achievement-backend.ts";
import { achievementOutbound } from "./fixtures/achievement-outbound.mjs";
import { playerProfileOutbound } from "./fixtures/player-profile-outbound.mjs";
import { statisticsRpcBody } from "./fixtures/statistics-rpc.ts";
import { registrationRemovalOutbound } from "./fixtures/registration-removal-rpc.mjs";
import { officiatingOutbound } from "./fixtures/officiating-outbound.mjs";

const origin = "https://app.example.test";
const id = "10000000-0000-4000-8000-000000000001";

test("roster reuse routes reject anonymous reads, forged posts and invalid queries in workerd", async () => {
  const f = await fixture({});
  try {
    for (const path of [
      `/api/roster/reuse/sources?targetRegistrationId=${id}`,
      `/api/roster/reuse/context?sourceRegistrationId=${id}&targetRegistrationId=${id}`,
    ]) {
      const response = await f.mf.dispatchFetch(origin + path);
      assert.equal(response.status, 401);
    }
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    for (const path of [
      `/api/roster/reuse/sources?targetRegistrationId=${id}&offset=-1`,
      `/api/roster/reuse/sources?targetRegistrationId=${id}&offset=0&offset=20`,
      `/api/roster/reuse/context?sourceRegistrationId=invalid&targetRegistrationId=${id}`,
    ]) {
      const response = await f.mf.dispatchFetch(origin + path, {
        headers: { cookie },
      });
      assert.equal(response.status, 400);
    }
    const forged = await f.mf.dispatchFetch(`${origin}/api/roster/reuse`, {
      method: "POST",
      headers: {
        cookie,
        origin: "https://another.example.test",
        "content-type": "application/json",
      },
      body: JSON.stringify({ commandId: id }),
    });
    assert.equal(forged.status, 403);
  } finally {
    await f.mf.dispose();
  }
});

test("fresh parallel authority checks finish before data and still reject revocation in workerd", async () => {
  const options = { officiating: true };
  const f = await fixture(options);
  let releaseIdentity;
  let permissionStarted;
  const identityGate = new Promise((resolve) => {
    releaseIdentity = resolve;
  });
  const permissionGate = new Promise((resolve) => {
    permissionStarted = resolve;
  });
  try {
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    options.identityGate = identityGate;
    options.onAdminRead = permissionStarted;
    const before = f.calls.length;
    const response = f.mf.dispatchFetch(`${origin}/api/games/${id}/editor`, {
      headers: { cookie },
    });
    let timeout;
    try {
      const parallel = await Promise.race([
        permissionGate.then(() => true),
        new Promise((resolve) => {
          timeout = setTimeout(() => resolve(false), 1000);
        }),
      ]);
      assert.equal(parallel, true);
      assert.equal(
        f.calls.slice(before).some((p) => p.includes("/rpc/")),
        false,
      );
    } finally {
      clearTimeout(timeout);
      releaseIdentity();
    }
    assert.equal((await response).status, 200);
    options.denied = true;
    const denied = await f.mf.dispatchFetch(
      `${origin}/api/games/${id}/editor`,
      { headers: { cookie } },
    );
    assert.equal(denied.status, 403);
  } finally {
    releaseIdentity();
    await f.mf.dispose();
  }
});

test("paged public source discards mixed versions and bounds conflict retry in workerd", async () => {
  const seed = JSON.parse(
    await readFile("tests/fixtures/statistics-source.json", "utf8"),
  );
  const source = {
    ...seed,
    games: Array.from({ length: 201 }, (_, i) => {
      const g = structuredClone(seed.games[0]);
      g.snapshot.id = `f9500000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
      return g;
    }),
  };
  for (const mode of ["once-conflict", "always-conflict"]) {
    const f = await fixture({
      statistics: true,
      statisticsSource: source,
      statisticsMode: mode,
    });
    try {
      const response = await f.mf.dispatchFetch(
        origin + `/api/public/teams/${source.disputeId}?scope=all`,
      );
      assert.equal(response.status, mode === "once-conflict" ? 200 : 409);
      const body = await response.json();
      if (mode === "once-conflict") {
        assert.equal(body.version, source.version + 1);
        assert.ok(body.rows.every((r) => r.gamesPlayed === 2));
      } else {
        assert.equal(body.error.code, "source_changed");
        assert.equal("rows" in body, false);
      }
      assert.equal(
        f.calls.filter((p) => p.endsWith("get_public_statistics_head")).length,
        2,
      );
      assert.equal(
        f.calls.some((p) => p.includes("/auth/") || p.includes("admin_access")),
        false,
      );
    } finally {
      await f.mf.dispose();
    }
  }
});

test("public team list/detail use confirmed source and require explicit registration without session", async () => {
  const f = await fixture({ statistics: true }),
    source = JSON.parse(
      await readFile("tests/fixtures/statistics-source.json", "utf8"),
    ),
    team = source.games[0].snapshot.game.home,
    path = `/api/public/teams/${source.disputeId}`;
  try {
    const r = await f.mf.dispatchFetch(
      origin + path + "?mode=total&scope=all",
      { headers: { cookie: "__Host-bdb-session=invalid" } },
    );
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("set-cookie"), null);
    const p = await r.json();
    assert.equal(p.rows.length, 2);
    assert.equal(p.rows[0].gamesPlayed, 3);
    assert.equal("games" in p, false);
    const selection = await f.mf.dispatchFetch(
      origin + path + `/${team.team.id}`,
    );
    assert.equal(selection.status, 200);
    assert.equal((await selection.json()).kind, "confirmed-team-selection-v1");
    const detail = await f.mf.dispatchFetch(
      origin +
        path +
        `/${team.team.id}?registrationId=${team.registrationId}&mode=total&scope=all`,
    );
    assert.equal(detail.status, 200);
    const d = await detail.json();
    assert.equal(d.registrationId, team.registrationId);
    assert.equal(d.games.total, 3);
    assert.equal(d.identity.name, "Lobos");
    assert.equal(
      d.games.items.some((g) => "facts" in g),
      false,
    );
    assert.equal(
      f.calls.some((p) => p.includes("/auth/") || p.includes("admin_access")),
      false,
    );
    for (const tail of [
      "?x=bad",
      "?page=1&page=2",
      `/${team.team.id}?registrationId=bad`,
      `/${team.team.id}?registrationId=${id}`,
      `/${id}`,
    ])
      assert.equal(
        (await f.mf.dispatchFetch(origin + path + tail)).status,
        tail.includes(id) ? 404 : 400,
      );
    assert.equal(
      (await f.mf.dispatchFetch(origin + path + "?q=" + "x".repeat(8193)))
        .status,
      414,
    );
    assert.equal(
      (await f.mf.dispatchFetch(origin + path, { method: "POST", body: "{}" }))
        .status,
      405,
    );
    assert.equal(
      (await f.mf.dispatchFetch(origin + "/api/public/teams/bad")).status,
      400,
    );
    assert.equal(
      (await f.mf.dispatchFetch(origin + `/api/public/teams/${id}`)).status,
      404,
    );
  } finally {
    await f.mf.dispose();
  }
});

test("public player career route derives a page without app session, JWT or cookie", async () => {
  const f = await fixture({ playerProfiles: true });
  const source = JSON.parse(
      await readFile("tests/fixtures/player-career.json", "utf8"),
    ),
    path = `/api/public/players/${source.personId}`;
  try {
    const r = await f.mf.dispatchFetch(origin + path + "?scope=all", {
      headers: { cookie: "bdb_session=broken" },
    });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("set-cookie"), null);
    const page = await r.json();
    assert.equal(page.personId, source.personId);
    assert.equal(page.statistics.summary.gamesPlayed, 2);
    assert.equal("participations" in page, false);
    assert.equal(
      f.calls.some((p) => p.includes("/auth/") || p.includes("admin_access")),
      false,
    );
    assert.equal(
      (await f.mf.dispatchFetch(origin + path, { method: "POST", body: "{}" }))
        .status,
      405,
    );
    assert.equal(
      (await f.mf.dispatchFetch(origin + "/api/public/players/bad")).status,
      400,
    );
    assert.equal(
      (await f.mf.dispatchFetch(origin + `/api/public/players/${id}`)).status,
      404,
    );
    assert.equal(
      (await f.mf.dispatchFetch(origin + path + "?x=" + "x".repeat(8193)))
        .status,
      414,
    );
  } finally {
    await f.mf.dispose();
  }
});
test("private player profile routes authorize before body and preserve confirmation receipts", async () => {
  const options = { playerProfiles: true, loseProfileAck: true },
    f = await fixture(options),
    source = JSON.parse(
      await readFile("tests/fixtures/player-career.json", "utf8"),
    ),
    path = `/api/people/${source.personId}/profile`;
  try {
    assert.equal((await f.mf.dispatchFetch(origin + path)).status, 401);
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const send = (tail = "", method = "GET", body, extra = {}) =>
      f.mf.dispatchFetch(origin + path + tail, {
        method,
        headers: {
          cookie,
          origin,
          "content-type": "application/json",
          ...extra,
        },
        ...(body !== undefined
          ? { body: typeof body === "string" ? body : JSON.stringify(body) }
          : {}),
      });
    assert.equal((await send()).status, 200);
    const c = {
      commandId: "f9400000-0000-4000-8000-000000009900",
      personId: source.personId,
      expectedPersonVersion: 1,
      expectedPublicationVersion: 0,
      reason: "",
      acknowledgeImpact: true,
    };
    assert.equal(
      (await send("", "POST", c, { origin: "https://elsewhere.example.test" }))
        .status,
      403,
    );
    assert.equal(options.profileConfirmAttempts.length, 0);
    assert.equal((await send("", "POST", c)).status, 503);
    const retry = await send("", "POST", c);
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).version, 1);
    assert.equal(
      options.profileConfirmAttempts[0],
      options.profileConfirmAttempts[1],
    );
    options.profileFailRead = true;
    assert.equal((await send()).status, 503);
    options.profileFailRead = false;
    assert.equal((await send()).status, 200);
    assert.equal(options.profileConfirmAttempts.length, 2);
    assert.equal((await send("/versions/1")).status, 200);
    assert.equal((await send("", "POST", { ...c, personId: id })).status, 400);
    assert.equal(options.profileConfirmAttempts.length, 2);
    options.denied = true;
    assert.equal((await send("", "POST", "{bad")).status, 403);
    assert.equal(options.profileConfirmAttempts.length, 2);
  } finally {
    await f.mf.dispose();
  }
});

test("public statistics route derives scoped pages without app session or exposing source documents", async () => {
  const f = await fixture({ statistics: true });
  const source = JSON.parse(
    await readFile("tests/fixtures/statistics-source.json", "utf8"),
  );
  const path = `/api/public/statistics/${source.disputeId}`;
  try {
    const response = await f.mf.dispatchFetch(
      origin + path + "?scope=all&mode=total&page=2",
    );
    assert.equal(response.status, 200);
    const value = await response.json();
    assert.equal(value.total, 33);
    assert.equal(value.rows.length, 13);
    assert.equal(value.version, source.version);
    assert.equal(value.pageSize, 20);
    assert.equal("games" in value, false);
    assert.equal(
      f.calls.some((p) => p.includes("/auth/") || p.includes("admin_access")),
      false,
    );
    assert.equal((await f.mf.dispatchFetch(origin + path)).status, 200);
    assert.equal(
      (await f.mf.dispatchFetch(origin + path, { method: "POST", body: "{}" }))
        .status,
      405,
    );
    assert.equal(
      (await f.mf.dispatchFetch(origin + "/api/public/statistics/bad")).status,
      400,
    );
    assert.equal(
      (await f.mf.dispatchFetch(origin + `/api/public/statistics/${id}`))
        .status,
      404,
    );
    assert.equal(
      (await f.mf.dispatchFetch(origin + path + "?q=" + "x".repeat(8193)))
        .status,
      414,
    );
  } finally {
    await f.mf.dispose();
  }
});

async function fixture(options = {}) {
  const calls = [],
    publicationReceipts = new Map();
  let pdfSource,
    statisticsHeads = 0,
    statisticsPages = 0,
    originalBytes,
    reviewDocument,
    reviewVersion = 0;
  const regulation = regulationFixture(),
    regulationReceipts = new Map();
  const decisionResponse = decisionBackend(regulation, options);
  const transferResponse = transferBackend(options);
  const achievementResponse = achievementOutbound(options);
  const playerProfileResponse = playerProfileOutbound(options, id);
  const removalResponse = registrationRemovalOutbound(options);
  const officiatingResponse = officiatingOutbound(id);
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
        if (options.officiating) {
          const r = await officiatingResponse(request);
          if (r) return r;
        }
        const removal = await removalResponse(request);
        if (removal) return removal;
        if (options.playerProfiles) {
          const r = await playerProfileResponse(request);
          if (r) return r;
        }
        if (
          options.statistics &&
          /^\/rest\/v1\/rpc\/get_public_statistics_(?:head|page)$/u.test(
            url.pathname,
          )
        ) {
          assert.equal(request.headers.get("authorization"), null);
          assert.equal(request.headers.get("cookie"), null);
          let source =
            options.statisticsSource ??
            JSON.parse(
              await readFile("tests/fixtures/statistics-source.json", "utf8"),
            );
          if (url.pathname.endsWith("_head")) statisticsHeads++;
          else {
            statisticsPages++;
            if (
              options.statisticsMode === "always-conflict" ||
              (options.statisticsMode === "once-conflict" &&
                statisticsPages === 2)
            )
              return Response.json(
                { message: "fixture conflict" },
                { status: 409 },
              );
          }
          if (
            options.statisticsMode === "once-conflict" &&
            statisticsHeads >= 2
          )
            source = {
              ...source,
              version: source.version + 1,
              games: source.games.slice(0, 2),
            };
          const args = await request.json();
          assert.deepEqual(
            Object.keys(args),
            url.pathname.endsWith("_head")
              ? ["p_dispute_id"]
              : ["p_dispute_id", "p_version", "p_after"],
          );
          return Response.json(
            statisticsRpcBody(
              args.p_dispute_id === source.disputeId ? source : null,
              url.pathname,
              args,
            ),
          );
        }
        if (options.achievements) {
          const response = await achievementResponse(request);
          if (response) return response;
        }
        if (options.transfers) {
          const response = await transferResponse(request);
          if (response) return response;
        }
        if (options.decisions) {
          const response = await decisionResponse(request);
          if (response) return response;
        }
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
        if (url.pathname === "/auth/v1/user") {
          if (options.identityGate) await options.identityGate;
          return Response.json({ id, is_anonymous: false });
        }
        if (url.pathname === "/rest/v1/admin_access") {
          options.onAdminRead?.();
          if (
            options.decisions ||
            options.transfers ||
            options.achievements ||
            options.registrationRemovals
          )
            options.authorizationReads = (options.authorizationReads ?? 0) + 1;
          return Response.json(
            options.denied ||
              (options.denyAuthorizationAt &&
                options.authorizationReads >= options.denyAuthorizationAt)
              ? []
              : [{ user_id: id, enabled: true }],
          );
        }
        if (url.pathname === "/auth/v1/logout")
          return new Response(null, { status: 204 });
        if (
          options.regulation &&
          [
            "get_regulation_state",
            "get_regulation_version",
            "save_regulation",
          ].some((name) => url.pathname === `/rest/v1/rpc/${name}`)
        ) {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          const args = await request.json();
          if (url.pathname.endsWith("/get_regulation_state"))
            return Response.json({
              ...regulation,
              contextFingerprint: options.changedRegulationContext
                ? "b".repeat(64)
                : regulation.contextFingerprint,
            });
          if (url.pathname.endsWith("/get_regulation_version"))
            return Response.json(
              args.p_version === 1
                ? {
                    ...regulationFixture(),
                    definition: regulationFixture().definition,
                    context: regulationFixture().context,
                    version: 1,
                    actorId: id,
                    reason: "Regra anterior",
                    algorithmVersion: "organized-v1",
                    history: undefined,
                    hasMore: undefined,
                  }
                : null,
            );
          const c = args.p_command,
            existing = regulationReceipts.get(c.commandId);
          if (existing) {
            assert.deepEqual(c, existing.command);
            return Response.json(existing.ack);
          }
          if (c.expectedVersion !== regulation.version)
            return Response.json(
              { message: "version_conflict" },
              { status: 409 },
            );
          if (c.expectedContextFingerprint !== regulation.contextFingerprint)
            return Response.json(
              { message: "context_conflict" },
              { status: 409 },
            );
          const ack = {
            commandId: c.commandId,
            disputeId: c.disputeId,
            version: c.expectedVersion + 1,
            savedAt: regulation.savedAt,
            contextFingerprint: regulation.contextFingerprint,
          };
          regulation.version = ack.version;
          regulation.definition = c.definition;
          options.regulationCommits = (options.regulationCommits ?? 0) + 1;
          regulationReceipts.set(c.commandId, {
            command: structuredClone(c),
            ack,
          });
          if (options.loseRegulationAck) {
            options.loseRegulationAck = false;
            return Response.json(
              { message: "fixture-private-value" },
              { status: 503 },
            );
          }
          return Response.json(ack);
        }
        if (
          options.pdf &&
          (url.pathname.includes("pdf_source") ||
            url.pathname.includes("pdf_review") ||
            url.pathname.startsWith("/storage/v1/object/"))
        ) {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          if (url.pathname.startsWith("/storage/v1/object/")) {
            if (request.method === "POST") {
              assert.ok(pdfSource);
              assert.equal(request.headers.get("x-upsert"), "false");
              // Drain every upload, including duplicate attempts. The Node/workerd
              // service bridge must not leave the request body pending on a retry.
              const received = new Uint8Array(await request.arrayBuffer());
              if (originalBytes) {
                assert.deepEqual(received, originalBytes);
                return Response.json(
                  { code: "ResourceAlreadyExists" },
                  { status: 409 },
                );
              }
              originalBytes = received;
              options.originalBytes = originalBytes;
              return Response.json({
                Key: `boxscore-sources/sources/${pdfSource.id}.pdf`,
              });
            }
            return new Response(originalBytes, {
              headers: { "Content-Type": "application/pdf" },
            });
          }
          const args = await request.json();
          if (url.pathname.endsWith("/prepare_pdf_source")) {
            options.prepared ??= args.p_command;
            assert.deepEqual(args.p_command, options.prepared);
            pdfSource ??= {
              ...args.p_command.source,
              ready: false,
              version: 1,
              savedAt: "2026-10-24T03:00:00Z",
            };
            return Response.json({
              id: pdfSource.id,
              storagePath: `sources/${pdfSource.id}.pdf`,
              sha256: pdfSource.sha256,
              byteSize: pdfSource.byteSize,
              ready: false,
              duplicate: false,
            });
          }
          if (url.pathname.endsWith("/finish_pdf_source")) {
            assert.ok(originalBytes);
            if (options.failFinish) {
              options.failFinish = false;
              return Response.json(
                { message: "private provider value" },
                { status: 503 },
              );
            }
            pdfSource = { ...pdfSource, ready: true, version: 2 };
            return Response.json({ id: pdfSource.id, version: 2 });
          }
          if (url.pathname.endsWith("/get_pdf_source"))
            return Response.json(pdfSource ?? null);
          if (url.pathname.endsWith("/list_pdf_sources"))
            return Response.json({
              items: pdfSource ? [pdfSource] : [],
              hasMore: false,
            });
          if (url.pathname.endsWith("/save_pdf_review")) {
            reviewDocument = args.p_command.document;
            reviewVersion++;
            return Response.json({ id: pdfSource.id, version: reviewVersion });
          }
          if (url.pathname.endsWith("/get_pdf_review"))
            return Response.json(
              pdfSource
                ? {
                    source: pdfSource,
                    version: reviewVersion,
                    savedAt: reviewVersion ? "2026-10-24T03:01:00Z" : null,
                    document: reviewDocument ?? {
                      disputeId: pdfSource.disputeId,
                      gameId: null,
                      invertSides: false,
                      mappings: pdfSource.parsed.teams.flatMap((t, side) =>
                        t.players.map((p, index) => ({
                          sourceSide: side,
                          sourceIndex: index,
                          rosterEntryId: null,
                          jersey: p.jerseyNumber,
                        })),
                      ),
                      notes: "",
                    },
                  }
                : null,
            );
        }
        if (url.pathname === "/rest/v1/rpc/get_public_game") {
          assert.equal(request.headers.get("authorization"), null);
          assert.equal(request.headers.get("apikey"), "fixture-publishable");
          return Response.json(options.publicResult ?? null);
        }
        if (
          [
            "get_game_publication_state",
            "get_game_publication_version",
            "get_pdf_publication_preparation",
            "save_pdf_publication_preparation",
            "publish_sheet_game",
            "publish_pdf_game",
          ].some((n) => url.pathname === `/rest/v1/rpc/${n}`)
        ) {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          const args = await request.json();
          if (url.pathname.endsWith("/get_pdf_publication_preparation"))
            return Response.json(options.preparation ?? null);
          if (url.pathname.endsWith("/save_pdf_publication_preparation")) {
            const c = args.p_command;
            options.preparation = {
              sourceId: c.publication.source.sourceId,
              version: c.expectedVersion + 1,
              savedAt: "2026-10-24T14:00:00Z",
              publication: c.publication,
            };
            return Response.json({
              sourceId: options.preparation.sourceId,
              version: options.preparation.version,
              requestId: c.publication.requestId,
            });
          }
          if (url.pathname.endsWith("/get_game_publication_state"))
            return Response.json({
              gameId: args.p_game_id,
              version: 0,
              published: null,
              history: [],
              hasMore: false,
              requiresFallback: false,
            });
          if (url.pathname.endsWith("/get_game_publication_version"))
            return Response.json(options.publicationVersion ?? null);
          const c = args.p_command,
            prior = publicationReceipts.get(c.requestId),
            fingerprint = JSON.stringify(c);
          if (prior) {
            if (prior.fingerprint !== fingerprint)
              return Response.json(
                { message: "idempotency_conflict", details: "private" },
                { status: 409 },
              );
            return Response.json(prior.result);
          }
          const result = {
            requestId: c.requestId,
            gameId: c.gameId,
            version: c.basePublicationVersion + 1,
            gameVersion: c.gameVersion + 1,
            sourceVersion:
              c.source.kind === "sheet" ? c.source.baseSheetVersion + 1 : 2,
            ...(c.source.kind === "pdf"
              ? { reviewVersion: c.source.reviewVersion }
              : {}),
            publishedAt: "2026-10-24T09:00:00Z",
          };
          publicationReceipts.set(c.requestId, { fingerprint, result });
          options.publicationCommits = (options.publicationCommits ?? 0) + 1;
          if (options.failPublicationAfterCommit) {
            options.failPublicationAfterCommit = false;
            return Response.json(
              { message: "private response lost" },
              { status: 503 },
            );
          }
          return Response.json(result);
        }
        if (url.pathname === "/rest/v1/rpc/list_game_venues") {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          assert.deepEqual(await request.json(), {
            p_query: "Azul",
            p_offset: 20,
          });
          return Response.json({
            items: [{ name: "Ginásio Azul" }],
            hasMore: false,
          });
        }
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
        if (url.pathname === "/rest/v1/rpc/get_game_sheet_preparation") {
          assert.equal(
            request.headers.get("authorization"),
            "Bearer fixture-access",
          );
          const { p_game_id } = await request.json();
          return Response.json({
            gameId: p_game_id,
            gameVersion: 1,
            sides: {
              home: {
                registrationId: "10000000-0000-4000-8000-000000000002",
                roster: [],
                staff: [],
                previous: null,
                lastJerseys: {},
              },
              away: {
                registrationId: "10000000-0000-4000-8000-000000000003",
                roster: [],
                staff: [],
                previous: null,
                lastJerseys: {},
              },
            },
          });
        }
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

test("regulation routes authorize before source reads, compute previews and replay frozen writes after a lost ACK", async () => {
  const options = { regulation: true, loseRegulationAck: true },
    f = await fixture(options),
    did = regulationId(90),
    path = `/api/regulations/${did}`;
  try {
    assert.equal((await f.mf.dispatchFetch(origin + path)).status, 401);
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const send = (tail, method = "GET", body, extra = {}) =>
      f.mf.dispatchFetch(origin + path + tail, {
        method,
        headers: {
          cookie,
          origin,
          "content-type": "application/json",
          ...extra,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const view = await send("");
    assert.equal(view.status, 200);
    const value = await view.json();
    assert.equal(value.context, undefined);
    assert.equal(
      value.preview.groupPhases[0].groups[0].standings.rows[0].leaguePoints,
      2,
    );
    const definition = regulationFixture().definition;
    definition.groupPhases[0].rules.points = { win: 5, loss: 0 };
    const preview = {
      expectedVersion: 1,
      expectedContextFingerprint: "a".repeat(64),
      definition,
    };
    const p = await send("/preview", "POST", preview);
    assert.equal(p.status, 200);
    assert.equal(
      (await p.json()).after.groupPhases[0].groups[0].standings.rows[0]
        .leaguePoints,
      5,
    );
    assert.equal(options.regulationCommits, undefined);
    assert.equal((await send("?offset=0&offset=1")).status, 400);
    assert.equal((await send("?offset=-1")).status, 400);
    assert.equal(
      (
        await send("/preview", "POST", preview, {
          "content-type": "text/plain",
        })
      ).status,
      415,
    );
    const tooLarge = await f.mf.dispatchFetch(origin + path + "/preview", {
      method: "POST",
      headers: { cookie, origin, "content-type": "application/json" },
      body: new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array(1048577));
          c.close();
        },
      }),
      duplex: "half",
    });
    assert.equal(tooLarge.status, 413);
    await tooLarge.text();
    assert.equal(
      (await send("/preview", "POST", { ...preview, facts: [] })).status,
      400,
    );
    assert.equal(
      (await send("/preview", "POST", preview, { origin: "https://evil.test" }))
        .status,
      403,
    );
    options.changedRegulationContext = true;
    assert.equal((await send("/preview", "POST", preview)).status, 409);
    options.changedRegulationContext = false;
    const command = {
      ...preview,
      commandId: regulationId(600),
      disputeId: did,
      reason: "Conferido depois da prévia",
      acknowledgeImpact: true,
    };
    assert.equal(
      (await send("", "POST", { ...command, disputeId: regulationId(999) }))
        .status,
      400,
    );
    assert.equal((await send("", "POST", command)).status, 503);
    const retry = await send("", "POST", command);
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).version, 2);
    assert.equal(options.regulationCommits, 1);
    const history = await send("/versions/1");
    assert.equal(history.status, 200);
    assert.equal((await history.json()).context, undefined);
    assert.equal((await send("/versions/0")).status, 400);
    assert.ok(
      f.calls.lastIndexOf(
        "/rest/v1/admin_access?select=user_id,enabled&user_id=eq." + id,
      ) < f.calls.lastIndexOf("/rest/v1/rpc/get_regulation_version"),
    );
    options.denied = true;
    assert.equal((await send("/preview", "POST", preview)).status, 403);
    assert.ok(!JSON.stringify(value).includes("fixture-access"));
  } finally {
    await f.mf.dispose();
  }
});
test("publication routes enforce fresh sessions, correlate commands and recover a response lost after commit", async () => {
  const options = { failPublicationAfterCommit: true },
    f = await fixture(options);
  try {
    const root = `/api/games/${id}/publication`;
    assert.equal((await f.mf.dispatchFetch(origin + root)).status, 401);
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const participants = ["home", "away"].flatMap((side, n) =>
      Array.from({ length: 5 }, (_, i) => ({
        rosterEntryId: `10000000-0000-4000-8000-${String(10 + n * 10 + i).padStart(12, "0")}`,
        side,
        jersey: i === 1 ? "00" : String(i),
        played: true,
        starter: true,
      })),
    );
    const sideStaff = (side) => ({
      captainRosterEntryId: participants.find((p) => p.side === side)
        .rosterEntryId,
      coachStaffEntryId: null,
      assistantStaffEntryId: null,
    });
    const sheet = {
      requestId: id,
      gameId: id,
      gameVersion: 1,
      basePublicationVersion: 0,
      source: {
        kind: "sheet",
        baseSheetVersion: 0,
        document: {
          rulesVersion: "FIBA_2024",
          periods: 4,
          participants,
          staff: { home: sideStaff("home"), away: sideStaff("away") },
          events: [{ id, side: "home", period: 4, target: "0", code: "2" }],
        },
      },
      reason: "",
      fallback: false,
    };
    const send = (path, body, extra = {}) =>
      f.mf.dispatchFetch(origin + path, {
        method: "POST",
        headers: {
          cookie,
          origin,
          "content-type": "application/json",
          ...extra,
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
      });
    const state = await f.mf.dispatchFetch(origin + root, {
      headers: { cookie },
    });
    assert.equal(state.status, 200);
    assert.equal((await state.json()).gameId, id);
    assert.equal(
      (await send(root + "/sheet", sheet, { origin: "https://evil.test" }))
        .status,
      403,
    );
    assert.equal(
      (
        await send(root + "/sheet", {
          ...sheet,
          gameId: "10000000-0000-4000-8000-000000000002",
        })
      ).status,
      400,
    );
    assert.equal((await send(root + "/sheet", " ".repeat(524289))).status, 413);
    assert.equal((await send(root + "/sheet", sheet)).status, 503);
    const retried = await send(root + "/sheet", sheet);
    assert.equal(retried.status, 200, await retried.clone().text());
    assert.equal((await retried.json()).requestId, id);
    assert.equal(options.publicationCommits, 1);
    assert.equal(
      (await send(root + "/sheet", { ...sheet, reason: "different payload" }))
        .status,
      409,
    );
    const pdf = {
      requestId: "10000000-0000-4000-8000-000000000002",
      gameId: id,
      gameVersion: 2,
      basePublicationVersion: 1,
      source: { kind: "pdf", sourceId: id, sourceVersion: 2, reviewVersion: 1 },
      supplement: {
        rows: participants.map((p, i) => ({
          sourceSide: p.side === "home" ? 0 : 1,
          sourceIndex: i % 5,
          played: true,
          starter: true,
          captain: i % 5 === 0,
        })),
        staff: {
          home: { coachStaffEntryId: null, assistantStaffEntryId: null },
          away: { coachStaffEntryId: null, assistantStaffEntryId: null },
        },
      },
      authority: {
        scorePoints: "pdf",
        periodScores: "none",
        playerAdvanced: "pdf",
        foulsReceived: "none",
        teamAdvanced: "none",
        gameAdvanced: "none",
      },
      sheetVersion: null,
      reason: "Revisão com dados do PDF.",
      acceptDivergence: false,
    };
    const preparationPath = root + "/preparation/" + id;
    const getPreparation = () =>
      f.mf.dispatchFetch(origin + preparationPath, { headers: { cookie } });
    assert.equal(await (await getPreparation()).json(), null);
    const prep = { commandId: id, expectedVersion: 0, publication: pdf };
    assert.equal(
      (await send(preparationPath, prep, { origin: "https://evil.test" }))
        .status,
      403,
    );
    assert.equal((await send(preparationPath, " ".repeat(65537))).status, 413);
    assert.equal(
      (
        await send(preparationPath, {
          ...prep,
          publication: {
            ...pdf,
            gameId: "10000000-0000-4000-8000-000000000003",
          },
        })
      ).status,
      400,
    );
    assert.equal((await send(preparationPath, prep)).status, 200);
    assert.equal(
      (await (await getPreparation()).json()).publication.requestId,
      pdf.requestId,
    );
    const sourcePreparationPath = `/api/pdf-sources/${id}/preparation`;
    assert.equal(
      (await f.mf.dispatchFetch(origin + sourcePreparationPath)).status,
      401,
    );
    const fromSource = await f.mf.dispatchFetch(
      origin + sourcePreparationPath,
      { headers: { cookie } },
    );
    assert.equal(fromSource.status, 200);
    assert.equal(
      (await fromSource.json()).publication.requestId,
      pdf.requestId,
    );
    assert.equal(options.publicationCommits, 1);
    assert.equal((await send(root + "/pdf", " ".repeat(65537))).status, 413);
    assert.equal((await send(root + "/pdf", pdf)).status, 200);
    const before = f.calls.filter(
      (p) => p.includes("publication") || p.includes("publish_"),
    ).length;
    options.denied = true;
    assert.equal((await getPreparation()).status, 403);
    // Fresh denial discards the session; subsequent operations remain unauthenticated.
    assert.equal((await send(preparationPath, prep)).status, 401);
    assert.equal((await send(root + "/pdf", pdf)).status, 401);
    assert.equal(
      f.calls.filter((p) => p.includes("publication") || p.includes("publish_"))
        .length,
      before,
    );
    assert.ok(
      f.calls.indexOf(
        "/rest/v1/admin_access?select=user_id,enabled&user_id=eq." + id,
      ) < f.calls.indexOf("/rest/v1/rpc/publish_sheet_game"),
    );
  } finally {
    await f.mf.dispose();
  }
});
test("public result transport uses only the projection RPC without session cookies, admin JWT or draft metadata", async () => {
  const options = {},
    f = await fixture(options);
  try {
    const path = `/api/public/games/${id}`;
    const r = await f.mf.dispatchFetch(origin + path, {
      headers: { cookie: "bdb_session=invalid" },
    });
    assert.equal(r.status, 404);
    assert.equal(r.headers.get("set-cookie"), null);
    assert.deepEqual(f.calls, ["/rest/v1/rpc/get_public_game"]);
    assert.equal(
      (await f.mf.dispatchFetch(origin + path, { method: "POST", body: "{}" }))
        .status,
      405,
    );
    assert.equal(
      (await f.mf.dispatchFetch(origin + path + "?private=true")).status,
      400,
    );
    options.publicResult = { private: "not a public projection" };
    assert.equal((await f.mf.dispatchFetch(origin + path)).status, 503);
  } finally {
    await f.mf.dispose();
  }
});

test("PDF transport parses in the authorized DO, recovers an incomplete original without overwrite and resumes review", async () => {
  const options = { pdf: true, failFinish: true },
    f = await fixture(options);
  try {
    const params = new URLSearchParams({
        commandId: id,
        sourceId: id,
        disputeId: id,
        filename: "sample.pdf",
      }),
      path = `/api/pdf-sources?${params}`;
    const bytes = await readFile(
      "especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/docs/plan/referencias/modelos-boxscore/Boxscore-site.pdf",
    );
    assert.equal(
      (
        await f.mf.dispatchFetch(origin + path, {
          method: "POST",
          headers: { origin, "content-type": "application/pdf" },
          body: bytes,
        })
      ).status,
      401,
    );
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0],
      headers = { cookie, origin, "content-type": "application/pdf" };
    const initial = await f.mf.dispatchFetch(origin + path, {
      method: "POST",
      headers,
      body: bytes,
    });
    assert.equal(initial.status, 503, await initial.text());
    assert.deepEqual(Buffer.from(options.originalBytes), bytes);
    const retried = await f.mf.dispatchFetch(origin + path, {
      method: "POST",
      headers,
      body: bytes,
    });
    assert.equal(
      retried.status,
      200,
      JSON.stringify({
        response: await retried.clone().text(),
        calls: f.calls,
      }),
    );
    assert.deepEqual(await retried.json(), {
      id,
      version: 2,
      duplicate: false,
    });
    assert.equal(
      f.calls.filter((p) =>
        p.startsWith("/storage/v1/object/boxscore-sources/"),
      ).length,
      2,
    );
    assert.equal(
      f.calls.filter((p) => p.startsWith("/storage/v1/object/authenticated/"))
        .length,
      2,
    );
    const get = async (path) =>
      f.mf.dispatchFetch(origin + path, { headers: { cookie } });
    assert.equal((await get(`/api/pdf-sources?disputeId=${id}`)).status, 200);
    const source = await get(`/api/pdf-sources/${id}`);
    assert.equal(source.status, 200);
    assert.equal((await source.json()).parsed.format, "BASKETBALL_SITE");
    const review = await get(`/api/pdf-sources/${id}/review`),
      document = (await review.json()).document;
    const saved = await f.mf.dispatchFetch(
      `${origin}/api/pdf-sources/${id}/review`,
      {
        method: "POST",
        headers: { cookie, origin, "content-type": "application/json" },
        body: JSON.stringify({
          sourceId: id,
          commandId: id,
          expectedVersion: 0,
          document: { ...document, notes: "revisado" },
        }),
      },
    );
    assert.equal(saved.status, 200, await saved.clone().text());
    assert.deepEqual(await saved.json(), { id, version: 1 });
    assert.equal(
      (await (await get(`/api/pdf-sources/${id}/review`)).json()).document
        .notes,
      "revisado",
    );
    assert.ok(
      f.calls.indexOf(
        "/rest/v1/admin_access?select=user_id,enabled&user_id=eq." + id,
      ) < f.calls.indexOf("/rest/v1/rpc/prepare_pdf_source"),
    );
  } finally {
    await f.mf.dispose();
  }
});
test("PDF transport denies invalid origin, query, type, limits and revoked admin before extraction or Storage", async (t) => {
  const options = { pdf: true },
    f = await fixture(options);
  try {
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0],
      headers = { cookie, origin, "content-type": "application/pdf" };
    const path = `/api/pdf-sources?${new URLSearchParams({ commandId: id, sourceId: id, disputeId: id, filename: "sample.pdf" })}`;
    for (const [url, h, body, status] of [
      [path, { ...headers, origin: "https://evil.test" }, "%PDF-", 403],
      [path + "&sourceId=" + id, headers, "%PDF-", 400],
      [path, { ...headers, "content-type": "text/plain" }, "%PDF-", 415],
      [path.replace("sample.pdf", "..%2Fsecret.pdf"), headers, "%PDF-", 400],
      // Unknown length exercises the authorized streaming limit with real bytes.
      // An oversized Content-Length is checked without consuming the body in
      // upload.test.ts. Sending that rejected body over Miniflare's entry binding
      // hits workerd#7634 (early response resets the TCP upload).
      [
        path,
        headers,
        new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array(10485761));
            c.close();
          },
        }),
        413,
      ],
      [path, headers, "not PDF", 400],
    ]) {
      t.diagnostic(
        `PDF rejection: expected ${status}, ${typeof body === "string" ? body.length + " bytes" : "stream without Content-Length"}`,
      );
      const r = await f.mf.dispatchFetch(origin + url, {
        method: "POST",
        headers: h,
        body,
        duplex: "half",
      });
      assert.equal(r.status, status, await r.text());
    }
    assert.ok(
      !f.calls.some(
        (p) => p.includes("pdf_source") || p.startsWith("/storage/"),
      ),
    );
    options.denied = true;
    const denied = await f.mf.dispatchFetch(origin + path, {
      method: "POST",
      headers,
      body: "%PDF-",
    });
    assert.equal(denied.status, 403);
    assert.ok(
      !f.calls.some(
        (p) => p.includes("pdf_source") || p.startsWith("/storage/"),
      ),
    );
  } finally {
    await f.mf.dispose();
  }
});
test("sheet routes authorize and validate domain, path correlation, origin and limits before RPC", async () => {
  const f = await fixture();
  try {
    const path = `/api/games/${id}/sheet`;
    assert.equal((await f.mf.dispatchFetch(`${origin}${path}`)).status, 401);
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const prep = `${origin}${path}/preparation`;
    assert.equal((await f.mf.dispatchFetch(prep)).status, 401);
    const context = await f.mf.dispatchFetch(prep, { headers: { cookie } });
    assert.equal(context.status, 200);
    assert.equal((await context.json()).gameId, id);
    assert.equal(
      (
        await f.mf.dispatchFetch(prep + "?unexpected=1", {
          headers: { cookie },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await f.mf.dispatchFetch(prep, {
          method: "POST",
          headers: { cookie, origin },
        })
      ).status,
      405,
    );
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

test("officiating editor uses private RPCs and authorizes before mutation body", async () => {
  const options = { officiating: true },
    f = await fixture(options);
  try {
    const editor = `/api/games/${id}/editor`;
    for (const path of [editor, "/api/games/officials"])
      assert.equal((await f.mf.dispatchFetch(origin + path)).status, 401);
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const send = (method, path, body, headers = {}) =>
      f.mf.dispatchFetch(origin + path, {
        method,
        headers: {
          cookie,
          origin,
          "content-type": "application/json",
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const list = await send(
      "GET",
      "/api/games/officials?q=Jo%C3%A3o&offset=20",
    );
    assert.equal(list.status, 200);
    assert.equal((await list.json()).items[0].name, "João");
    const snapshot = await send("GET", editor);
    assert.equal(snapshot.status, 200);
    const initial = await snapshot.json();
    const command = {
      commandId: "fd700000-0000-4000-8000-000000000100",
      expectedVersion: 1,
      game: Object.fromEntries(
        [
          "id",
          "disputeId",
          "homeRegistrationId",
          "awayRegistrationId",
          "date",
          "time",
          "venue",
          "number",
        ].map((k) => [k, initial.game[k]]),
      ),
      officiating: initial.officiating,
    };
    const saved = await send("POST", editor, command);
    assert.equal(saved.status, 200);
    assert.deepEqual(await saved.json(), { id, version: 2 });
    assert.deepEqual(await (await send("POST", editor, command)).json(), {
      id,
      version: 2,
    });
    assert.equal(
      (await send("POST", editor, command, { origin: "https://evil.test" }))
        .status,
      403,
    );
    assert.equal(
      (
        await send("POST", editor, {
          ...command,
          game: { ...command.game, id: command.commandId },
        })
      ).status,
      400,
    );
    assert.equal(
      (await send("POST", editor, { ...command, extra: "x".repeat(8192) }))
        .status,
      413,
    );
    for (const path of [
      "/api/games/officials?q=a&q=b",
      "/api/games/officials?offset=-1",
      "/api/games/officials?unknown=x",
      "/api/games/officials?q=%00",
      `${editor}?x=1`,
    ])
      assert.equal((await send("GET", path)).status, 400, path);
    assert.equal((await send("POST", "/api/games/officials", {})).status, 405);
    assert.equal((await send("PUT", editor, command)).status, 405);
    const writes = f.calls.filter((p) =>
      p.endsWith("/save_game_editor"),
    ).length;
    options.denied = true;
    const denied = await f.mf.dispatchFetch(origin + editor, {
      method: "POST",
      headers: { cookie, origin, "content-type": "application/json" },
      body: "{",
    });
    assert.equal(denied.status, 403);
    assert.equal(
      f.calls.filter((p) => p.endsWith("/save_game_editor")).length,
      writes,
    );
  } finally {
    await f.mf.dispose();
  }
});

test("game routes enforce session, fixed RPCs, origin and contextual commands", async () => {
  const options = {},
    f = await fixture(options);
  try {
    for (const path of [
      `/api/games?disputeId=${id}`,
      `/api/games/${id}`,
      "/api/games/venues",
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
      (await send("GET", `/api/games?disputeId=${id}&q=Team&offset=20`)).status,
      200,
    );
    assert.equal((await send("GET", `/api/games/${id}`)).status, 404);
    const venues = await send("GET", "/api/games/venues?q=Azul&offset=20");
    assert.equal(venues.status, 200);
    assert.deepEqual(await venues.json(), {
      items: [{ name: "Ginásio Azul" }],
      hasMore: false,
    });
    assert.equal((await send("POST", "/api/games/venues", {})).status, 405);
    for (const path of [
      "/api/games/venues?q=a&q=b",
      "/api/games/venues?offset=-1",
      "/api/games/venues?unknown=x",
      `/api/games/venues?q=${"x".repeat(161)}`,
      "/api/games/venues?q=%00",
    ])
      assert.equal((await send("GET", path)).status, 400, path);
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
    options.denied = true;
    assert.equal(
      (await send("GET", "/api/games/venues?q=Azul&offset=20")).status,
      403,
    );
    assert.equal(
      f.calls.filter((c) => c === "/rest/v1/rpc/list_game_venues").length,
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

test("registration removal routes correlate context, freeze replay and authorize before body", async () => {
  const options = { registrationRemovals: true, removalLoseAck: true },
    f = await fixture(options);
  const path = `/api/registrations/${id}/removal`,
    query = `?disputeId=${id}`;
  try {
    assert.equal((await f.mf.dispatchFetch(origin + path + query)).status, 401);
    assert.equal(
      (
        await f.mf.dispatchFetch(origin + path, {
          method: "POST",
          body: "invalid-json",
        })
      ).status,
      401,
    );
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const send = (tail = "", method = "GET", body, extra = {}) =>
      f.mf.dispatchFetch(origin + path + tail, {
        method,
        headers: {
          cookie,
          origin,
          "content-type": "application/json",
          ...extra,
        },
        ...(body !== undefined
          ? { body: typeof body === "string" ? body : JSON.stringify(body) }
          : {}),
      });
    const context = await send(query);
    assert.equal(context.status, 200);
    assert.equal((await context.json()).state, "available");
    const command = {
      commandId: id,
      registrationId: id,
      disputeId: id,
      expectedVersion: 1,
    };
    assert.equal((await send("", "POST", command)).status, 503);
    const retry = await send("", "POST", command);
    assert.equal(retry.status, 200);
    const ack = await retry.json();
    assert.deepEqual(ack, {
      state: "removed",
      id,
      disputeId: id,
      deletedVersion: 1,
    });
    assert.deepEqual(await (await send(query)).json(), ack);
    assert.equal(
      (await send("", "POST", { ...command, expectedVersion: 2 })).status,
      409,
    );
    const other = id.replace(/1$/, "2");
    assert.equal(
      (await send("", "POST", { ...command, commandId: other })).status,
      409,
    );
    assert.equal(
      (await send("", "POST", { ...command, registrationId: other })).status,
      400,
    );
    assert.equal(
      (await send("", "POST", { ...command, canRemove: true })).status,
      400,
    );
    assert.equal(
      (await send("", "POST", command, { origin: "https://evil.test" })).status,
      403,
    );
    assert.equal((await send("", "POST", " ".repeat(8193))).status, 413);
    for (const tail of ["", query + "&extra=x", query + `&disputeId=${id}`])
      assert.equal((await send(tail)).status, 400);
    assert.equal((await send(query, "POST", command)).status, 400);
    assert.equal((await send("", "DELETE")).status, 405);
    options.denyAuthorizationAt = options.authorizationReads + 1;
    assert.equal((await send("", "POST", "not-json")).status, 403);
    delete options.denyAuthorizationAt;
    assert.equal(
      f.calls.filter((p) => p === "/rest/v1/rpc/remove_registration").length,
      4,
    );
    assert.equal(JSON.stringify(ack).includes("fixture-access"), false);
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

test("competitive decision routes preserve authorization, bounded bodies, previews and durable replay", async () => {
  const options = {
      regulation: true,
      decisions: true,
      loseOccurrenceAck: true,
      loseWithdrawalAck: true,
    },
    f = await fixture(options),
    gid = regulationId(100),
    rid = regulationId(1),
    did = regulationId(90),
    occPath = `/api/games/${gid}/occurrence`,
    wrPath = `/api/registrations/${rid}/withdrawal`;
  try {
    assert.equal((await f.mf.dispatchFetch(origin + occPath)).status, 401);
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const send = (path, method = "GET", body, extra = {}) =>
      f.mf.dispatchFetch(origin + path, {
        method,
        headers: {
          cookie,
          origin,
          "content-type": "application/json",
          ...extra,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    assert.equal((await send(occPath)).status, 200);
    const c = {
      commandId: regulationId(800),
      disputeId: did,
      gameId: gid,
      occurrenceId: regulationId(801),
      expectedVersion: 0,
      expectedGameVersion: 2,
      expectedPublicationVersion: 1,
      expectedRegulationVersion: 1,
      expectedContextFingerprint: "a".repeat(64),
      effect: { kind: "cancelled" },
      reason: "Cancelamento conferido",
      acknowledgeImpact: true,
    };
    const preview = await send(occPath + "/preview", "POST", c);
    assert.equal(preview.status, 200);
    assert.equal((await preview.json()).affected.after[0].state, "excluded");
    assert.equal(options.occurrenceCommits, undefined);
    assert.equal((await send(occPath + "?offset=0&offset=20")).status, 400);
    assert.equal(
      (await send(occPath + "/preview", "POST", { ...c, projection: [] }))
        .status,
      400,
    );
    assert.equal(
      (await send(occPath, "POST", { ...c, gameId: regulationId(999) })).status,
      400,
    );
    assert.equal(
      (await send(occPath, "POST", c, { origin: "https://evil.test" })).status,
      403,
    );
    assert.equal(
      (await send(occPath, "POST", c, { "content-type": "text/plain" })).status,
      415,
    );
    assert.equal((await send(occPath, "POST", c)).status, 503);
    const ack = await send(occPath, "POST", c);
    assert.equal(ack.status, 200);
    assert.equal((await ack.json()).version, 1);
    assert.equal(options.occurrenceCommits, 1);
    assert.equal((await send(occPath + "/versions/1")).status, 200);
    assert.equal((await send(occPath + "/versions/999")).status, 404);
    assert.equal((await send(occPath + "/versions/0")).status, 400);
    const state = await send(wrPath);
    assert.equal(state.status, 200);
    const s = await state.json();
    const w = {
      commandId: regulationId(810),
      disputeId: did,
      registrationId: rid,
      withdrawalId: regulationId(811),
      expectedVersion: 0,
      expectedRegulationVersion: 1,
      expectedContextFingerprint: s.contextFingerprint,
      policy: "exclude_results",
      previousGameIds: s.previousGameIds,
      reason: "Desistência conferida",
      acknowledgeImpact: true,
    };
    assert.equal((await send(wrPath + "/preview", "POST", w)).status, 200);
    assert.equal((await send(wrPath, "POST", w)).status, 503);
    assert.equal((await send(wrPath, "POST", w)).status, 200);
    assert.equal(options.withdrawalCommits, 1);
    assert.equal((await send(wrPath + "/versions/1")).status, 200);
    assert.equal((await send(occPath + "/preview", "POST", c)).status, 409);
    for (const [path, size] of [
      [occPath, 65537],
      [wrPath, 1048577],
    ]) {
      const r = await f.mf.dispatchFetch(origin + path, {
        method: "POST",
        headers: { cookie, origin, "content-type": "application/json" },
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(size));
            controller.close();
          },
        }),
        duplex: "half",
      });
      assert.equal(r.status, 413);
      await r.text();
    }
    options.denyAuthorizationAt = options.authorizationReads + 2;
    const dataCallsBeforeRevocation = f.calls.filter((p) =>
      /game_occurrence|registration_withdrawal|get_regulation_state/.test(p),
    ).length;
    assert.equal((await send(wrPath, "POST", w)).status, 403);
    assert.equal(
      f.calls.filter((p) =>
        /game_occurrence|registration_withdrawal|get_regulation_state/.test(p),
      ).length,
      dataCallsBeforeRevocation,
    );
    delete options.denyAuthorizationAt;
    const freshCookie = (await f.login()).headers
      .get("set-cookie")
      .split(";", 1)[0];
    options.denied = true;
    const sourceCalls = f.calls.filter((p) =>
      /game_occurrence|registration_withdrawal|get_regulation_state/.test(p),
    ).length;
    const revoked = await f.mf.dispatchFetch(origin + occPath, {
      method: "POST",
      headers: {
        cookie: freshCookie,
        origin,
        "content-type": "application/json",
      },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(65537));
          controller.close();
        },
      }),
      duplex: "half",
    });
    assert.equal(revoked.status, 403);
    await revoked.text();
    assert.equal(
      f.calls.filter((p) =>
        /game_occurrence|registration_withdrawal|get_regulation_state/.test(p),
      ).length,
      sourceCalls,
    );
  } finally {
    await f.mf.dispose();
  }
});

test("achievement routes authorize before body, derive suggestions and recover draft/confirmation receipts", async () => {
  const options = {
      achievements: true,
      loseAchievementSaveAck: true,
      loseAchievementConfirmAck: true,
    },
    f = await fixture(options),
    a = achievementBackendFixture(),
    path = `/api/achievements/${a.source.disputeId}`;
  try {
    assert.equal((await f.mf.dispatchFetch(origin + path)).status, 401);
    assert.equal(
      (
        await f.mf.dispatchFetch(
          origin + `/api/public/achievements/${a.source.disputeId}`,
        )
      ).status,
      404,
    );
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const send = (suffix = "", method = "GET", body, extra = {}) =>
      f.mf.dispatchFetch(origin + path + suffix, {
        method,
        headers: {
          cookie,
          origin,
          "content-type": "application/json",
          ...extra,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    assert.equal((await send()).status, 200);
    assert.equal((await send("?draftOffset=0&draftOffset=0")).status, 400);
    assert.equal((await send("?publicationOffset=-1")).status, 400);
    assert.equal((await send("/athletes?q=Atleta&offset=0")).status, 200);
    const suggestion = {
      disputeId: a.source.disputeId,
      expectedContextFingerprint: a.fp,
      source: a.request.source,
    };
    const preview = await send("/suggestion", "POST", suggestion);
    assert.equal(preview.status, 200);
    assert.equal((await preview.json()).suggestion.ready, true);
    assert.equal(
      (
        await send("/suggestion", "POST", {
          ...suggestion,
          eligibleAthletes: [],
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await send("/suggestion", "POST", {
          ...suggestion,
          disputeId: a.id(999),
        })
      ).status,
      400,
    );
    assert.equal(
      (await send("", "POST", a.draft, { origin: "https://evil.test" })).status,
      403,
    );
    assert.equal(
      (await send("", "POST", a.draft, { "content-type": "text/plain" }))
        .status,
      415,
    );
    assert.equal((await send("", "POST", a.draft)).status, 503);
    assert.equal((await send("", "POST", a.draft)).status, 200);
    assert.equal(options.achievementSaves, 1);
    assert.equal((await send("/drafts/1")).status, 200);
    assert.equal((await send("/drafts/0")).status, 400);
    assert.equal((await send("/drafts/99")).status, 404);
    assert.equal((await send("/confirm", "POST", a.confirmation)).status, 503);
    assert.equal((await send("/confirm", "POST", a.confirmation)).status, 200);
    assert.equal(options.achievementConfirmations, 1);
    assert.equal((await send("/confirmations/1")).status, 200);
    const publicValue = await f.mf.dispatchFetch(
      origin + `/api/public/achievements/${a.source.disputeId}`,
    );
    assert.equal(publicValue.status, 200);
    assert.ok(!(await publicValue.text()).includes("contextFingerprint"));
    const huge = () =>
        new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array(1048577));
            c.close();
          },
        }),
      calls = () => f.calls.filter((p) => /achievement/.test(p)).length;
    assert.equal(
      (
        await f.mf.dispatchFetch(origin + path, {
          method: "POST",
          headers: { cookie, origin, "content-type": "application/json" },
          body: huge(),
          duplex: "half",
        })
      ).status,
      413,
    );
    const before = calls();
    options.denyAuthorizationAt = options.authorizationReads + 2;
    assert.equal((await send("", "POST", a.draft)).status, 403);
    assert.equal(calls(), before);
    delete options.denyAuthorizationAt;
    const freshCookie = (await f.login()).headers
      .get("set-cookie")
      .split(";", 1)[0];
    options.denied = true;
    assert.equal(
      (
        await f.mf.dispatchFetch(origin + path, {
          method: "POST",
          headers: {
            cookie: freshCookie,
            origin,
            "content-type": "application/json",
          },
          body: huge(),
          duplex: "half",
        })
      ).status,
      403,
    );
    assert.equal(calls(), before);
  } finally {
    await f.mf.dispose();
  }
});

test("transfer routes authorize before body, derive previews and recover frozen commands after lost ACK", async () => {
  const options = { transfers: true, loseTransferAck: true },
    f = await fixture(options),
    { command } = transferFixture(),
    path = `/api/roster/${command.sourceEntryId}/transfer`,
    query = `?destinationRegistrationId=${command.destinationRegistrationId}`;
  try {
    assert.equal((await f.mf.dispatchFetch(origin + path + query)).status, 401);
    const cookie = (await f.login()).headers.get("set-cookie").split(";", 1)[0];
    const send = (suffix = "", method = "GET", body, extra = {}) =>
      f.mf.dispatchFetch(origin + path + suffix, {
        method,
        headers: {
          cookie,
          origin,
          "content-type": "application/json",
          ...extra,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    assert.equal((await send(query)).status, 200);
    assert.equal(
      (
        await send(
          query +
            "&destinationRegistrationId=" +
            command.destinationRegistrationId,
        )
      ).status,
      400,
    );
    const p = await send("/preview", "POST", command);
    assert.equal(p.status, 200);
    assert.equal((await p.json()).ready, true);
    assert.equal(options.transferCommits, undefined);
    for (const body of [
      { ...command, sourceEntryId: transferId(999) },
      { ...command, personId: transferId(999) },
    ])
      assert.equal((await send("/preview", "POST", body)).status, 400);
    assert.equal(
      (await send("/preview", "POST", command, { origin: "https://evil.test" }))
        .status,
      403,
    );
    assert.equal(
      (
        await send("/preview", "POST", command, {
          "content-type": "text/plain",
        })
      ).status,
      415,
    );
    assert.equal((await send("", "POST", command)).status, 400);
    const frozen = { ...command, acknowledgeImpact: true };
    assert.equal((await send("", "POST", frozen)).status, 503);
    const ack = await send("", "POST", frozen);
    assert.equal(ack.status, 200);
    assert.equal((await ack.json()).newEntryId, command.newEntryId);
    assert.equal(options.transferCommits, 1);
    const stale = await send("", "POST", {
      ...frozen,
      commandId: transferId(500),
      newEntryId: transferId(501),
    });
    assert.equal(stale.status, 409);
    assert.ok(!(await stale.text()).includes("private SQL"));
    const stream = () =>
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(16385));
          controller.close();
        },
      });
    const oversized = () =>
      f.mf.dispatchFetch(origin + path, {
        method: "POST",
        headers: { cookie, origin, "content-type": "application/json" },
        body: stream(),
        duplex: "half",
      });
    assert.equal((await oversized()).status, 413);
    const calls = () =>
      f.calls.filter((p) =>
        /get_transfer_context|transfer_roster_entry/.test(p),
      ).length;
    const before = calls();
    options.denyAuthorizationAt = options.authorizationReads + 2;
    assert.equal((await send("", "POST", frozen)).status, 403);
    assert.equal(calls(), before);
    delete options.denyAuthorizationAt;
    const freshCookie = (await f.login()).headers
      .get("set-cookie")
      .split(";", 1)[0];
    options.denied = true;
    const revoked = await f.mf.dispatchFetch(origin + path, {
      method: "POST",
      headers: {
        cookie: freshCookie,
        origin,
        "content-type": "application/json",
      },
      body: stream(),
      duplex: "half",
    });
    assert.equal(revoked.status, 403);
    assert.equal(calls(), before);
  } finally {
    await f.mf.dispose();
  }
});
