import type { Page } from "@playwright/test";
import { gamesFixture } from "./games";
import { tid } from "./text-import";
import { regulationFixture, regulationId } from "./regulation";
import { SupabaseRegulations } from "../../src/regulation/provider";
import { saveRegulationSchema } from "../../src/regulation/persistence-contract";
export async function regulationBrowserFixture(page: Page) {
  const f = await gamesFixture(page),
    raw = JSON.stringify(regulationFixture());
  let s = JSON.parse(
    raw
      .replaceAll(regulationId(90), tid(3))
      .replaceAll(regulationId(1), tid(5))
      .replaceAll(regulationId(2), tid(6))
      .replaceAll(regulationId(100), tid(8)),
  ) as ReturnType<typeof regulationFixture>;
  s = { ...s, version: 0, definition: null, savedAt: null, history: [] };
  f.games.set(tid(8), {
    id: tid(8),
    disputeId: tid(3),
    homeRegistrationId: tid(5),
    awayRegistrationId: tid(6),
    date: "2026-11-10",
    time: "18:00",
    venue: "Quadra",
    number: "1",
    state: "finished",
    version: 2,
    savedAt: "2026-10-24T20:00:00Z",
    timeZone: "America/Sao_Paulo",
    scheduledAt: "2026-11-10T18:00:00-03:00",
    home: f.registrations.get(tid(5))!,
    away: f.registrations.get(tid(6))!,
  });
  const attempts: string[] = [],
    receipts = new Map<string, unknown>(),
    versions = new Map<number, unknown>();
  let uncertain = false,
    expired = false,
    failReadAfterSave = false,
    readUnavailable = false;
  const reads: string[] = [];
  const db = new SupabaseRegulations(
    { url: "https://db.example.test", key: "fixture" },
    async (url, init) => {
      const args = JSON.parse(String(init.body));
      if (url.endsWith("get_regulation_version"))
        return Response.json(versions.get(args.p_version) ?? null);
      const offset = args.p_offset ?? 0;
      return Response.json({
        ...s,
        history: s.history.slice(offset, offset + 20),
        hasMore: s.history.length > offset + 20,
      });
    },
  );
  async function attach(target: Page) {
    await target.route(/\/api\/games\?/, async (route) => {
      const url = new URL(route.request().url());
      const query = (url.searchParams.get("q") ?? "").toLowerCase(),
        offset = Number(url.searchParams.get("offset") ?? 0);
      const items = [...f.games.values()].filter((g) =>
        (g.home.name + g.away.name + (g.number ?? ""))
          .toLowerCase()
          .includes(query),
      );
      await route.fulfill({
        json: {
          items: items.slice(offset, offset + 20),
          hasMore: items.length > offset + 20,
        },
      });
    });
    await target.route(/\/api\/regulations\//, async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        tail = url.pathname.slice(("/api/regulations/" + tid(3)).length);
      try {
        if (req.method() === "GET") {
          reads.push(url.pathname + url.search);
          if (readUnavailable) {
            readUnavailable = false;
            return route.fulfill({
              status: 503,
              json: {
                error: {
                  code: "access_unavailable",
                  message: "Leitura temporariamente indisponível.",
                },
              },
            });
          }
          return route.fulfill({
            json: tail.startsWith("/versions/")
              ? await db.getVersionView(
                  "fixture-jwt",
                  tid(3),
                  Number(tail.split("/")[2]),
                )
              : await db.getView(
                  "fixture-jwt",
                  tid(3),
                  Number(url.searchParams.get("offset") ?? 0),
                ),
          });
        }
        if (expired) {
          expired = false;
          return route.fulfill({
            status: 401,
            json: {
              error: { code: "invalid_session", message: "Entre novamente." },
            },
          });
        }
        if (tail === "/preview")
          return route.fulfill({
            json: await db.preview("fixture-jwt", tid(3), req.postDataJSON()),
          });
        const c = saveRegulationSchema.parse(req.postDataJSON()),
          body = req.postData()!;
        attempts.push(body);
        if (receipts.has(c.commandId))
          return route.fulfill({ json: receipts.get(c.commandId) });
        if (
          c.expectedVersion !== s.version ||
          c.expectedContextFingerprint !== s.contextFingerprint
        )
          return route.fulfill({
            status: 409,
            json: {
              error: {
                code: "version_conflict",
                message: "O contexto mudou. Confira uma nova prévia.",
              },
            },
          });
        s = {
          ...s,
          version: s.version + 1,
          definition: c.definition,
          savedAt: "2026-10-24T20:01:00Z",
          history: [
            {
              version: s.version + 1,
              savedAt: "2026-10-24T20:01:00Z",
              actorId: regulationId(500),
              reason: c.reason,
            },
            ...s.history,
          ],
        };
        const ack = {
          commandId: c.commandId,
          disputeId: tid(3),
          version: s.version,
          savedAt: s.savedAt,
          contextFingerprint: s.contextFingerprint,
        };
        receipts.set(c.commandId, ack);
        versions.set(s.version, {
          disputeId: tid(3),
          version: s.version,
          definition: structuredClone(s.definition),
          context: structuredClone(s.context),
          contextFingerprint: s.contextFingerprint,
          savedAt: s.savedAt,
          actorId: regulationId(500),
          reason: c.reason,
          algorithmVersion: "organized-v1",
        });
        if (failReadAfterSave) {
          failReadAfterSave = false;
          readUnavailable = true;
        }
        if (uncertain) {
          uncertain = false;
          return route.fulfill({
            status: 503,
            json: {
              error: {
                code: "access_unavailable",
                message: "Envio não confirmado.",
              },
            },
          });
        }
        return route.fulfill({ json: ack });
      } catch (error) {
        const e = error as { status?: number; code?: string; message?: string };
        return route.fulfill({
          status: e.status ?? 400,
          json: {
            error: {
              code: e.code ?? "invalid_input",
              message: e.message ?? "Confira os dados.",
            },
          },
        });
      }
    });
  }
  await attach(page);
  return {
    ...f,
    attempts,
    reads,
    getState: () => s,
    addTab: async (target: Page) => {
      await gamesFixture(target);
      await attach(target);
    },
    failReadAfterSave: () => {
      failReadAfterSave = true;
    },
    addGames: (count: number) => {
      const base = f.games.get(tid(8))!;
      for (let n = 2; n <= count; n++) {
        const game = {
          ...base,
          id: tid(1000 + n),
          number: String(n),
          state: "scheduled" as const,
        };
        f.games.set(game.id, game);
        s.context.games.push({
          id: game.id,
          version: game.version,
          disputeId: game.disputeId,
          homeRegistrationId: game.homeRegistrationId,
          awayRegistrationId: game.awayRegistrationId,
        });
      }
    },
    addHistory: (count: number) => {
      if (!s.definition)
        throw new Error("Save a definition before adding history.");
      const definition = structuredClone(s.definition);
      s.version = count;
      s.history = [];
      for (let n = count; n >= 1; n--) {
        const h = {
          version: n,
          savedAt: "2026-10-24T20:01:00Z",
          actorId: regulationId(500),
          reason: `Revisão ${n}`,
        };
        s.history.push(h);
        versions.set(n, {
          ...h,
          disputeId: tid(3),
          definition: structuredClone(definition),
          context: structuredClone(s.context),
          contextFingerprint: s.contextFingerprint,
          algorithmVersion: "organized-v1",
        });
      }
    },
    uncertain: () => {
      uncertain = true;
    },
    expireRegulation: () => {
      expired = true;
    },
    changeContext: () => {
      s.contextFingerprint = "b".repeat(64);
    },
  };
}
