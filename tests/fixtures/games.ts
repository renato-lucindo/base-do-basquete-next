import type { Page } from "@playwright/test";
import { textImportFixture, tid } from "./text-import";
import { saveGameSchema, type GameSnapshot } from "../../src/games/contract";
import { saveRegistrationSchema } from "../../src/teams/contract";
export async function gamesFixture(page: Page) {
  await textImportFixture(page);
  const savedAt = "2026-10-23T19:00:00Z",
    games = new Map<string, GameSnapshot>(),
    receipts = new Map<string, unknown>();
  let uncertain = false,
    conflict = false,
    expired = false;
  const attempts: string[] = [];
  const team = {
    id: tid(4),
    name: "Lobos Clube",
    abbreviation: "LOB",
    version: 1,
    savedAt,
  };
  const registrations = new Map(
    [5, 6].map((n) => [
      tid(n),
      {
        id: tid(n),
        name: n === 5 ? "Lobos" : "Lobos B",
        teamId: team.id,
        team,
        disputeId: tid(3),
        version: 1,
        savedAt,
      },
    ]),
  );
  const registration = (id: string) => registrations.get(id)!;
  await page.route(/\/api\/registrations(\?|\/|$)/, async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      id = url.pathname.split("/")[3];
    if (request.method() === "POST") {
      const command = saveRegistrationSchema.parse(request.postDataJSON());
      const r = {
        ...command.registration,
        team,
        version: command.expectedVersion + 1,
        savedAt,
      };
      registrations.set(r.id, r);
      return route.fulfill({ json: { id: r.id, version: r.version } });
    }
    if (id) return route.fulfill({ json: registrations.get(id) });
    const query = (url.searchParams.get("q") ?? "").toLowerCase(),
      offset = Number(url.searchParams.get("offset") ?? 0);
    const rows = [...registrations.values()].filter((r) =>
      r.name.toLowerCase().includes(query),
    );
    return route.fulfill({
      json: {
        items: rows.slice(offset, offset + 20),
        hasMore: rows.length > offset + 20,
      },
    });
  });
  await page.route(/\/api\/games(\?|\/|$)/, async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      id = url.pathname.split("/")[3];
    if (expired && request.method() === "POST") {
      expired = false;
      return route.fulfill({
        status: 401,
        json: {
          error: { code: "invalid_session", message: "Entre novamente." },
        },
      });
    }
    if (request.method() === "GET") {
      if (id)
        return route.fulfill({
          status: games.has(id) ? 200 : 404,
          json: games.get(id) ?? {
            error: {
              code: "context_not_found",
              message: "Jogo não encontrado.",
            },
          },
        });
      const query = url.searchParams.get("q") ?? "";
      return route.fulfill({
        json: {
          items: [...games.values()].filter((g) =>
            (g.home.name + g.away.name + (g.venue ?? "")).includes(query),
          ),
          hasMore: false,
        },
      });
    }
    const command = saveGameSchema.parse(request.postDataJSON());
    attempts.push(command.commandId);
    if (receipts.has(command.commandId))
      return route.fulfill({ json: receipts.get(command.commandId) });
    const old = games.get(command.game.id);
    if (conflict && old) {
      conflict = false;
      old.version++;
      old.venue = "Servidor atualizado";
      return route.fulfill({
        status: 409,
        json: {
          error: {
            code: "version_conflict",
            message: "O jogo foi alterado. Recarregue.",
          },
        },
      });
    }
    const g = command.game,
      snapshot: GameSnapshot = {
        ...g,
        version: command.expectedVersion + 1,
        savedAt,
        state: "scheduled",
        timeZone: "America/Sao_Paulo",
        scheduledAt: g.date && g.time ? `${g.date}T${g.time}:00-03:00` : null,
        home: registration(g.homeRegistrationId),
        away: registration(g.awayRegistrationId),
      };
    games.set(g.id, snapshot);
    const result = { id: g.id, version: snapshot.version };
    receipts.set(command.commandId, result);
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
    return route.fulfill({ json: result });
  });
  return {
    games,
    registrations,
    attempts,
    expire: () => {
      expired = true;
    },
    uncertain: () => {
      uncertain = true;
      attempts.length = 0;
    },
    conflict: () => {
      conflict = true;
    },
  };
}
