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
    expired = false;
  const db = new SupabaseRegulations(
    { url: "https://db.example.test", key: "fixture" },
    async (url, init) => {
      const args = JSON.parse(String(init.body));
      if (url.endsWith("get_regulation_version"))
        return Response.json(versions.get(args.p_version) ?? null);
      return Response.json(s);
    },
  );
  await page.route(/\/api\/regulations\//, async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      tail = url.pathname.slice(("/api/regulations/" + tid(3)).length);
    try {
      if (req.method() === "GET")
        return route.fulfill({
          json: tail.startsWith("/versions/")
            ? await db.getVersionView(
                "fixture-jwt",
                tid(3),
                Number(tail.split("/")[2]),
              )
            : await db.getView("fixture-jwt", tid(3)),
        });
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
  return {
    ...f,
    attempts,
    getState: () => s,
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
