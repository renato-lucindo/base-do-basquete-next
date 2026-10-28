import type { Page } from "@playwright/test";
import { textImportFixture, tid } from "./text-import";
import { saveGameSchema, type GameSnapshot } from "../../src/games/contract";
import { saveRegistrationSchema } from "../../src/teams/contract";
import {
  emptyOfficiating,
  officiatingSchema,
  officialRoles,
  saveGameEditorSchema,
  type GameEditorSnapshot,
} from "../../src/games/officiating-contract";
export async function gamesFixture(page: Page) {
  await textImportFixture(page);
  const savedAt = "2026-10-23T19:00:00Z",
    games = new Map<string, GameSnapshot>(),
    receipts = new Map<string, unknown>();
  const officials = new Map<string, { id: string; name: string }>(),
    scales = new Map<string, GameEditorSnapshot["officiating"]>();
  let uncertain = false,
    conflict = false,
    expired = false,
    failEditorRead = false;
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
      if (url.pathname.endsWith("/editor") && failEditorRead) {
        failEditorRead = false;
        return route.fulfill({
          status: 503,
          json: {
            error: {
              code: "access_unavailable",
              message: "Leitura indisponível depois do ACK.",
            },
          },
        });
      }
      if (id === "officials") {
        const fold = (s: string) =>
          s
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/gu, "")
            .toLowerCase();
        const query = fold(url.searchParams.get("q") ?? ""),
          offset = Number(url.searchParams.get("offset") ?? 0);
        const items = [...officials.values()]
          .filter((o) => fold(o.name).includes(query))
          .sort(
            (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
          );
        return route.fulfill({
          json: {
            items: items.slice(offset, offset + 20),
            hasMore: items.length > offset + 20,
          },
        });
      }
      if (id === "venues") {
        const query = (url.searchParams.get("q") ?? "").toLowerCase();
        const offset = Number(url.searchParams.get("offset") ?? "0");
        const names = [
          ...new Set(
            [...games.values()]
              .map((g) => g.venue)
              .filter((v): v is string => !!v),
          ),
        ]
          .filter((name) => name.toLowerCase().includes(query))
          .sort();
        return route.fulfill({
          json: {
            items: names.slice(offset, offset + 20).map((name) => ({ name })),
            hasMore: names.length > offset + 20,
          },
        });
      }
      if (id)
        return route.fulfill({
          status: games.has(id) ? 200 : 404,
          json: (games.has(id)
            ? url.pathname.endsWith("/editor")
              ? {
                  game: games.get(id),
                  officiating: scales.get(id) ?? emptyOfficiating(),
                }
              : games.get(id)
            : null) ?? {
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
    const command = url.pathname.endsWith("/editor")
      ? saveGameEditorSchema.parse(request.postDataJSON())
      : saveGameSchema.parse(request.postDataJSON());
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
    if ("officiating" in command) {
      const incoming = officiatingSchema.parse(command.officiating);
      for (const selection of Object.values(incoming)) {
        if (
          selection?.kind === "new" &&
          !selection.confirmHomonym &&
          [...officials.values()].some(
            (o) => o.name.toLowerCase() === selection.name.toLowerCase(),
          )
        )
          return route.fulfill({
            status: 409,
            json: {
              error: {
                code: "official_homonym_confirmation_required",
                message:
                  "Há um oficial com esse nome. Confirme se é outra pessoa.",
              },
            },
          });
      }
      const scale: GameEditorSnapshot["officiating"] = {
        ...emptyOfficiating(),
      };
      for (const role of officialRoles) {
        const selection = incoming[role];
        if (!selection) continue;
        if (selection.kind === "new")
          officials.set(selection.id, {
            id: selection.id,
            name: selection.name,
          });
        scale[role] = officials.get(selection.id)!;
      }
      scales.set(g.id, scale);
    }
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
    officials,
    scales,
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
    failNextEditorRead: () => {
      failEditorRead = true;
    },
  };
}
