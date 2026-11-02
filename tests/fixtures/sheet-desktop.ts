import type { Page } from "@playwright/test";
import { gamesFixture } from "./games";
import { tid } from "./text-import";
import type { PreparationContext } from "../../src/games/preparation-contract";
import { gameSnapshotSchema } from "../../src/games/contract";
import {
  saveSheetSchema,
  type SaveSheet,
  type SheetSnapshot,
} from "../../src/games/sheet-contract";
export async function desktopSheetFixture(
  page: Page,
  count = 11,
  withStaff = false,
) {
  const f = await gamesFixture(page),
    savedAt = "2026-10-26T18:00:00Z",
    home = f.registrations.get(tid(5))!,
    away = f.registrations.get(tid(6))!;
  const game = {
    id: tid(80),
    disputeId: tid(3),
    homeRegistrationId: home.id,
    awayRegistrationId: away.id,
    home,
    away,
    date: "2026-10-26",
    time: null,
    venue: null,
    number: null,
    state: "scheduled" as const,
    timeZone: "America/Sao_Paulo" as const,
    scheduledAt: null,
    version: 1,
    savedAt,
  };
  f.games.set(game.id, gameSnapshotSchema.parse(game));
  const side = (which: 0 | 1) => ({
    registrationId: which ? away.id : home.id,
    previous: null,
    lastJerseys: {},
    staff: withStaff
      ? Array.from({ length: 3 }, (_, i) => {
          const personId = tid(600 + which * 10 + (i === 2 ? 0 : i));
          return {
            id: tid(300 + which * 10 + i),
            personId,
            role: (i === 1 ? "head" : "assistant") as "head" | "assistant",
            person: {
              id: personId,
              name: `Treinador ${which ? "B" : "A"} ${i === 2 ? 1 : i + 1}`,
              nickname: null,
            },
          };
        })
      : [],
    roster: Array.from({ length: count }, (_, i) => ({
      id: tid(100 + which * 100 + i),
      registrationId: which ? away.id : home.id,
      personId: tid(400 + which * 100 + i),
      jersey: String(i + 1),
      person: {
        id: tid(400 + which * 100 + i),
        name: `Jogador ${which ? "B" : "A"} ${i + 1}`,
        nickname: null,
      },
    })),
  });
  const context: PreparationContext = {
    gameId: game.id,
    gameVersion: 1,
    sides: { home: side(0), away: side(1) },
  };
  let snapshot: SheetSnapshot | null = null;
  const commands: unknown[] = [];
  const attempts: SaveSheet[] = [],
    receipts = new Map<
      string,
      {
        payload: string;
        result: { requestId: string; version: number; confirmed: boolean };
      }
    >();
  let loseAck = false,
    conflict = false;
  await page.route(`**/api/games/${game.id}/sheet/preparation`, (r) =>
    r.fulfill({ json: context }),
  );
  await page.route(`**/api/games/${game.id}/sheet`, (r) => {
    if (r.request().method() === "GET")
      return r.fulfill({
        json: snapshot
          ? { ...snapshot, gameVersion: f.games.get(game.id)!.version }
          : null,
      });
    const c = saveSheetSchema.parse(r.request().postDataJSON());
    attempts.push(c);
    const prior = receipts.get(c.requestId);
    if (prior)
      return r.fulfill({
        status: prior.payload === JSON.stringify(c) ? 200 : 409,
        json: prior.result,
      });
    if (conflict && snapshot) {
      conflict = false;
      snapshot = { ...snapshot, version: snapshot.version + 1 };
    }
    if (
      c.baseVersion !== (snapshot?.version ?? 0) ||
      c.gameVersion !== f.games.get(game.id)!.version
    )
      return r.fulfill({
        status: 409,
        json: {
          error: {
            code: "version_conflict",
            message: "A súmula mudou no servidor. Recarregue para conferir.",
          },
        },
      });
    commands.push(c);
    const candidates = [
      ...context.sides.home.roster,
      ...context.sides.away.roster,
    ];
    snapshot = {
      gameId: game.id,
      gameVersion: f.games.get(game.id)!.version,
      version: c.baseVersion + 1,
      savedAt,
      confirmed: snapshot?.confirmed ?? false,
      document: c.document,
      participants: c.document.participants.map((p) => {
        const m = candidates.find((r) => r.id === p.rosterEntryId)!;
        return {
          rosterEntryId: m.id,
          registrationId: m.registrationId,
          side: p.side,
          person: m.person,
        };
      }),
      staff: Object.fromEntries(
        (["home", "away"] as const).map((s) => {
          const selected = c.document.staff[s];
          const roster = context.sides[s].roster;
          const staff = context.sides[s].staff;
          return [
            s,
            {
              captain:
                roster.find((r) => r.id === selected.captainRosterEntryId)
                  ?.person ?? null,
              coach:
                staff.find((r) => r.id === selected.coachStaffEntryId)
                  ?.person ?? null,
              assistant:
                staff.find((r) => r.id === selected.assistantStaffEntryId)
                  ?.person ?? null,
            },
          ];
        }),
      ) as SheetSnapshot["staff"],
    };
    const result = {
      requestId: c.requestId,
      version: snapshot.version,
      confirmed: snapshot.confirmed,
    };
    receipts.set(c.requestId, { payload: JSON.stringify(c), result });
    if (loseAck) {
      loseAck = false;
      return r.fulfill({
        status: 503,
        json: {
          error: {
            code: "access_unavailable",
            message: "Resposta perdida após gravação.",
          },
        },
      });
    }
    return r.fulfill({ json: result });
  });
  await page.route(/\/api\/roster(\?|$)/, (r) => {
    const reg = new URL(r.request().url()).searchParams.get("registrationId");
    return r.fulfill({
      json: {
        items: [...context.sides.home.roster, ...context.sides.away.roster]
          .filter((x) => x.registrationId === reg)
          .map((x) => ({
            ...x,
            disputeId: tid(3),
            active: true,
            version: 1,
            savedAt,
            startedAt: savedAt,
            endedAt: null,
            person: { ...x.person, publicBirthYear: null },
          })),
        hasMore: false,
      },
    });
  });
  await page.route(/\/api\/staff(\?|$)/, (r) =>
    r.fulfill({ json: { items: [], hasMore: false } }),
  );
  return {
    ...f,
    context,
    commands,
    sheetAttempts: attempts,
    snapshot: () => snapshot,
    setSnapshot: (s: SheetSnapshot) => {
      snapshot = s;
    },
    loseNextSheetAck: () => {
      loseAck = true;
    },
    conflictNextSheetSave: () => {
      conflict = true;
    },
  };
}
export async function openDesktopSheet(page: Page) {
  await page.goto(
    `http://127.0.0.1:${process.env.SHEET_TEST_PORT ?? "5174"}/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page
    .getByRole("button", { name: "Abrir jogo Lobos × Lobos B", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Preparar súmula", exact: true })
    .click();
}
export async function chooseFive(page: Page) {
  for (const s of ["A", "B"]) {
    for (let n = 1; n <= 5; n++)
      await page
        .getByLabel(`Titular Jogador ${s} ${n}`, { exact: true })
        .check();
    await page.getByLabel(`Capitão Jogador ${s} 1`, { exact: true }).check();
  }
}
