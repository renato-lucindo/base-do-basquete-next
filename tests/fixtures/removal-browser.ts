import type { Page } from "@playwright/test";
import { textImportFixture, tid } from "./text-import";
import type { RegistrationSnapshot } from "../../src/teams/contract";
import type { RemovalResult } from "../../src/teams/removal-contract";

export function removalBrowserState() {
  return {
    records: new Map<string, RegistrationSnapshot>(),
    removed: new Map<string, RemovalResult>(),
    receipts: new Map<string, { body: string; result: RemovalResult }>(),
    versions: new Map<string, number>(),
    lists: [] as RegistrationSnapshot[][],
    attempts: [] as string[],
    reads: 0,
    loseAck: false,
    failReads: 0,
    expireWrite: false,
    authenticated: true,
  };
}
export async function removalBrowserFixture(
  page: Page,
  state = removalBrowserState(),
) {
  const base = await textImportFixture(page);
  if (!state.lists.length)
    for (const r of base.registrations) state.records.set(r.id, r);
  state.lists.push(base.registrations);
  const sync = () => {
    for (const list of state.lists)
      for (let i = list.length - 1; i >= 0; i--)
        if (!state.records.has(list[i].id)) list.splice(i, 1);
  };
  sync();
  await page.route("**/api/session", async (route) => {
    if (route.request().method() === "POST") state.authenticated = true;
    if (route.request().method() === "GET" && !state.authenticated)
      return route.fulfill({
        status: 401,
        json: { error: { code: "invalid_session" } },
      });
    return route.fallback();
  });
  await page.route(
    /\/api\/registrations\/[^/]+\/removal(?:\?|$)/u,
    async (route) => {
      const url = new URL(route.request().url()),
        id = url.pathname.split("/")[3];
      const error = (status: number, code: string) =>
        route.fulfill({
          status,
          json: {
            error: {
              code,
              message:
                code === "version_conflict"
                  ? "A inscrição foi alterada. Atualize a conferência."
                  : "Não foi possível confirmar a operação.",
            },
          },
        });
      if (route.request().method() === "GET") {
        state.reads++;
        if (!state.authenticated) return error(401, "invalid_session");
        if (state.failReads) {
          state.failReads--;
          return error(503, "access_unavailable");
        }
        const done = state.removed.get(id);
        if (done) return route.fulfill({ json: done });
        const r = state.records.get(id);
        if (!r) return error(404, "context_not_found");
        const blocked = [...base.members.values()].some(
          (m) => m.registrationId === id,
        );
        return route.fulfill({
          json: {
            state: blocked ? "blocked" : "available",
            registration: {
              id,
              disputeId: r.disputeId,
              teamId: r.teamId,
              name: r.name,
              teamName: r.team.name,
              version: state.versions.get(id) ?? r.version,
            },
            blockers: blocked ? ["roster"] : [],
          },
        });
      }
      const body = route.request().postData()!;
      state.attempts.push(body);
      if (state.expireWrite) {
        state.expireWrite = false;
        state.authenticated = false;
        return error(401, "invalid_session");
      }
      if (!state.authenticated) return error(401, "invalid_session");
      const c = route.request().postDataJSON(),
        previous = state.receipts.get(c.commandId);
      if (previous)
        return previous.body === body
          ? route.fulfill({ json: previous.result })
          : error(409, "idempotency_conflict");
      const r = state.records.get(id);
      if (!r) return error(409, "registration_removed");
      if (c.expectedVersion !== (state.versions.get(id) ?? r.version))
        return error(409, "version_conflict");
      if ([...base.members.values()].some((m) => m.registrationId === id))
        return error(409, "registration_in_use");
      const result: RemovalResult = {
        state: "removed",
        id,
        disputeId: r.disputeId,
        deletedVersion: c.expectedVersion,
      };
      state.records.delete(id);
      state.removed.set(id, result);
      state.receipts.set(c.commandId, { body, result });
      sync();
      if (state.loseAck) {
        state.loseAck = false;
        return error(503, "access_unavailable");
      }
      return route.fulfill({ json: result });
    },
  );
  return { base, state };
}
export async function openRemovalTeams(page: Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/equipes`,
  );
}
