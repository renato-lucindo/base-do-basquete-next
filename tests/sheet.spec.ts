import { publishedSheet } from "./fixtures/published-game";
import { publicationSheetResultSchema } from "../src/publication/data-contract";
import { publishSheetSchema } from "../src/publication/contract";
import { test, expect, type Page } from "@playwright/test";
test.skip(
  ({ isMobile }) => isMobile,
  "Desktop-only scoresheet MVP; mobile follows after MVP.",
);
import { scanAccessibility as scan } from "./fixtures/accessibility";
import { gamesFixture } from "./fixtures/games";
import { tid } from "./fixtures/text-import";
import type { RosterSnapshot } from "../src/people/roster-contract";
import {
  saveSheetSchema,
  type SheetSnapshot,
} from "../src/games/sheet-contract";
async function fixture(page: Page) {
  const f = await gamesFixture(page),
    savedAt = "2026-10-23T22:00:00Z";
  const home = f.registrations.get(tid(5))!,
    away = f.registrations.get(tid(6))!;
  f.games.set(tid(80), {
    id: tid(80),
    disputeId: tid(3),
    homeRegistrationId: home.id,
    awayRegistrationId: away.id,
    date: null,
    time: null,
    venue: null,
    number: null,
    state: "scheduled",
    timeZone: "America/Sao_Paulo",
    scheduledAt: null,
    version: 1,
    savedAt,
    home,
    away,
  });
  const members: RosterSnapshot[] = ["home", "away"].flatMap((side, i) =>
    Array.from({ length: 6 }, (_, j) => ({
      id: tid(100 + i * 10 + j),
      registrationId: i ? away.id : home.id,
      disputeId: tid(3),
      personId: tid(200 + i * 10 + j),
      jersey: j === 0 ? "00" : String(j * 10 + 2),
      active: true,
      version: 1,
      savedAt,
      startedAt: savedAt,
      endedAt: null,
      person: {
        id: tid(200 + i * 10 + j),
        name: `Atleta ${side} ${j}`,
        nickname: null,
        publicBirthYear: null,
      },
    })),
  );
  await page.route(/\/api\/roster(\?|$)/, (route) => {
    const u = new URL(route.request().url());
    return route.fulfill({
      json: {
        items: members.filter(
          (m) =>
            m.registrationId === u.searchParams.get("registrationId") &&
            (m.active || u.searchParams.get("activeOnly") === "0"),
        ),
        hasMore: false,
      },
    });
  });
  const staff = (["head", "assistant"] as const).map((role, i) => ({
    id: tid(300 + i),
    registrationId: home.id,
    personId: tid(310 + i),
    role,
    active: true,
    version: 1,
    savedAt,
    startedAt: savedAt,
    endedAt: null,
    person: {
      id: tid(310 + i),
      name: role === "head" ? "Técnica Ana" : "Assistente Bia",
      nickname: null,
      publicBirthYear: null,
    },
  }));
  await page.route(/\/api\/staff(\?|$)/, (route) => {
    const u = new URL(route.request().url());
    return route.fulfill({
      json: {
        items: staff.filter(
          (s) => s.registrationId === u.searchParams.get("registrationId"),
        ),
        hasMore: false,
      },
    });
  });
  await page.route(`**/api/games/${tid(80)}/sheet/preparation`, (route) =>
    route.fulfill({
      json: {
        gameId: tid(80),
        gameVersion: 1,
        sides: Object.fromEntries(
          (["home", "away"] as const).map((side) => {
            const reg = side === "home" ? home : away;
            return [
              side,
              {
                registrationId: reg.id,
                previous: null,
                lastJerseys: {},
                roster: members
                  .filter((m) => m.registrationId === reg.id && m.active)
                  .map((m) => ({
                    id: m.id,
                    registrationId: m.registrationId,
                    personId: m.personId,
                    jersey: m.jersey,
                    person: {
                      id: m.person.id,
                      name: m.person.name,
                      nickname: m.person.nickname,
                    },
                  })),
                staff: staff
                  .filter((m) => m.registrationId === reg.id && m.active)
                  .map((m) => ({
                    id: m.id,
                    personId: m.personId,
                    role: m.role,
                    person: {
                      id: m.person.id,
                      name: m.person.name,
                      nickname: m.person.nickname,
                    },
                  })),
              },
            ];
          }),
        ),
      },
    }),
  );
  let snapshot: SheetSnapshot | null = null,
    uncertain = false,
    expired = false,
    conflict = false;
  const receipts = new Map<string, unknown>(),
    attempts: string[] = [];
  await page.route(`**/api/games/${tid(80)}/sheet`, async (route) => {
    if (route.request().method() === "GET") {
      // Exercise the loading boundary instead of assuming a synchronous fixture.
      await new Promise((resolve) => setTimeout(resolve, 120));
      return route.fulfill({ json: snapshot });
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
    const c = saveSheetSchema.parse(route.request().postDataJSON());
    attempts.push(c.requestId);
    if (receipts.has(c.requestId))
      return route.fulfill({ json: receipts.get(c.requestId) });
    if (conflict) {
      conflict = false;
      return route.fulfill({
        status: 409,
        json: {
          error: { code: "version_conflict", message: "Recarregue a súmula." },
        },
      });
    }
    snapshot = {
      gameId: c.gameId,
      gameVersion: 1,
      version: c.baseVersion + 1,
      savedAt,
      confirmed: false,
      document: c.document,
      participants: c.document.participants.map((p) => {
        const m = members.find((m) => m.id === p.rosterEntryId)!;
        return {
          rosterEntryId: m.id,
          registrationId: m.registrationId,
          side: p.side,
          person: { id: m.person.id, name: m.person.name, nickname: null },
        };
      }),
      staff: {
        home: { captain: null, coach: null, assistant: null },
        away: { captain: null, coach: null, assistant: null },
      },
    };
    const result = {
      requestId: c.requestId,
      version: snapshot.version,
      confirmed: false,
    };
    receipts.set(c.requestId, result);
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
    ...f,
    members,
    staff,
    attempts,
    snapshot: () => snapshot,
    uncertain: () => {
      uncertain = true;
      attempts.length = 0;
    },
    expire: () => {
      expired = true;
    },
    conflict: () => {
      conflict = true;
    },
  };
}
async function open(page: Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page
    .getByRole("button", { name: "Abrir jogo Lobos × Lobos B", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Preparar súmula", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Relacionados e súmula", exact: true }),
  ).toBeVisible();
}
async function relate(page: Page) {
  for (const side of ["home", "away"]) {
    for (let n = 0; n < 5; n++)
      await page
        .getByLabel(`Titular Atleta ${side} ${n}`, { exact: true })
        .check();
    await page.getByLabel(`Capitão Atleta ${side} 0`, { exact: true }).check();
  }
  await page
    .getByRole("button", {
      name: "Concluir preparação e lançar ações",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Camisa ou alvo", { exact: true }),
  ).toBeFocused();
}

test("axe súmula na preparação e lançamento por teclado", async ({
  page,
}, info) => {
  await fixture(page);
  await open(page);
  await scan(page, info, "admin-sheet-preparation");
  await relate(page);
  const jersey = page.getByLabel("Camisa ou alvo", { exact: true });
  await expect(jersey).toBeFocused();
  await jersey.fill("12");
  await jersey.press("Enter");
  const action = page.getByLabel("Ação", { exact: true });
  await expect(action).toBeFocused();
  await action.fill("2");
  await action.press("Enter");
  await expect(jersey).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Editar ação 1", exact: true }),
  ).toBeVisible();
  await scan(page, info, "admin-sheet-action");
});

test("axe conferência e publicação manual", async ({ page }, info) => {
  await publicationFixture(page);
  await open(page);
  await page
    .getByRole("button", { name: "Confirmar e publicar", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Placar a publicar", exact: true }),
  ).toContainText("2 × 0");
  await scan(page, info, "admin-publication-confirm");
});

test("relaciona pessoas reais, lança por teclado e retoma rascunho sem publicar", async ({
  page,
}, testInfo) => {
  const f = await fixture(page);
  await open(page);
  await relate(page);
  await expect(
    page.getByLabel("Camisa ou alvo", { exact: true }),
  ).toBeFocused();
  await page.getByLabel("Camisa ou alvo", { exact: true }).fill("12");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Ação", { exact: true })).toBeFocused();
  await page.keyboard.type("2");
  await page.keyboard.press("Enter");
  await expect(
    page.getByLabel("Camisa ou alvo", { exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Alt+b");
  await page.keyboard.press("Alt+2");
  await page.keyboard.type("12");
  await page.keyboard.press("Enter");
  await page.keyboard.type("3");
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Rascunho da súmula salvo" }),
  ).toBeVisible();
  expect(
    f.snapshot()?.document.events.map((e) => [e.side, e.period, e.code]),
  ).toEqual([
    ["home", 1, "2"],
    ["away", 2, "3"],
  ]);
  expect(f.snapshot()?.confirmed).toBe(false);
  await page.reload();
  await page.getByRole("button", { name: /Abrir jogo Lobos/ }).click();
  await page
    .getByRole("button", { name: "Preparar súmula", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Editar ação 2", exact: true }),
  ).toBeVisible();
  await page.locator(".sheet-input").screenshot({
    path: `.preview-artifacts/sumula-input-${testInfo.project.name}.png`,
  });
  await page
    .locator(".sheet-desktop-teams")
    .last()
    .screenshot({ path: ".preview-artifacts/sumula-relacionados-desktop.png" });
});

test("ordena camisas, exige escolha dos titulares e condiciona assistente ao técnico próprio", async ({
  page,
}) => {
  const f = await fixture(page);
  f.members[0].jersey = "0";
  f.members[1].jersey = "00";
  await open(page);
  const table = page.getByRole("table", {
    name: "Preparação equipe A",
    exact: true,
  });
  await expect(table.getByRole("combobox")).toHaveCount(12);
  await expect(
    page.getByLabel("Camisa de Atleta home 0", { exact: true }),
  ).toHaveValue("0");
  await expect(
    page.getByLabel("Camisa de Atleta home 1", { exact: true }),
  ).toHaveValue("00");
  await expect(
    page.getByLabel("Capitão Atleta home 0", { exact: true }),
  ).not.toBeChecked();
  for (let i = 0; i < 5; i++)
    await page.getByLabel(`Titular Atleta home ${i}`, { exact: true }).check();
  await page.getByLabel("Titular Atleta home 5", { exact: true }).click();
  await expect(
    page.getByLabel("Titular Atleta home 5", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Capitão Atleta home 0", { exact: true }).check();
  await page
    .getByLabel("Técnico A", { exact: true })
    .selectOption(f.staff[0].id);
  await page
    .getByLabel("Ass. Técnico A", { exact: true })
    .selectOption(f.staff[1].id);
  await page.getByLabel("Técnico A", { exact: true }).selectOption("");
  await expect(page.getByLabel("Ass. Técnico A", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Rascunho da súmula salvo" }),
  ).toBeVisible();
  expect(f.snapshot()?.document.staff.home).toEqual({
    captainRosterEntryId: tid(100),
    coachStaffEntryId: null,
    assistantStaffEntryId: null,
  });
  expect(
    f.snapshot()?.document.participants.filter((p) => p.starter),
  ).toHaveLength(5);
});

test("edita e exclui ação individual, ordena por quarto, desfaz e preserva guarda", async ({
  page,
}) => {
  await fixture(page);
  await open(page);
  await relate(page);
  const add = async (period: number, code: string) => {
    await page
      .getByLabel("Quarto ou prorrogação", { exact: true })
      .selectOption(String(period));
    await page.getByLabel("Camisa ou alvo", { exact: true }).fill("12");
    await page.keyboard.press("Enter");
    await page.keyboard.type(code);
    await page.keyboard.press("Enter");
  };
  await add(3, "2");
  await add(1, "3");
  await page
    .getByLabel("Ordem das ações", { exact: true })
    .selectOption("period");
  await expect(page.locator(".sheet-actions li").first()).toContainText("Q1");
  await expect(page.locator(".sheet-actions li").first()).toHaveClass(
    /sheet-period-red/,
  );
  await page
    .getByRole("button", { name: "Editar ação 1", exact: true })
    .click();
  const editDialog = page.getByRole("dialog", {
    name: "Editar ação da súmula",
    exact: true,
  });
  await expect(editDialog).toBeVisible();
  await expect(editDialog).toContainText("rascunho até salvar");
  await page.getByLabel("Ação", { exact: true }).fill("1");
  await page.keyboard.press("Enter");
  await expect(editDialog).toBeHidden();
  await expect(page.locator(".sheet-actions li").last()).toContainText(
    "#12 - 1p",
  );
  await page
    .getByRole("button", { name: "Excluir ação 2", exact: true })
    .click();
  const deleteDialog = page.getByRole("dialog", {
    name: "Excluir esta ação?",
    exact: true,
  });
  await expect(deleteDialog).toBeVisible();
  await expect(deleteDialog).toContainText("A participação do atleta");
  await page.keyboard.press("Escape");
  await expect(deleteDialog).toBeHidden();
  await expect(page.locator(".sheet-actions li")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Excluir ação 2", exact: true })
    .click();
  await expect(deleteDialog).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar exclusão da ação", exact: true })
    .click();
  await expect(page.locator(".sheet-actions li")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Desfazer ação ou ajuste", exact: true })
    .click();
  await expect(page.locator(".sheet-actions li")).toHaveCount(2);
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Voltar aos dados do jogo", exact: true })
    .click();
  await expect(page.getByLabel("Ação", { exact: true })).toBeVisible();
});
test("retorna do elenco ao ponto de origem e não oferece vínculo recém-inativado", async ({
  page,
}) => {
  const f = await fixture(page);
  await open(page);
  await relate(page);
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Rascunho da súmula salvo" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Revisar preparação", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar elenco A aqui", exact: true })
    .click();
  f.members[1].active = false;
  f.members[1].endedAt = "2026-10-23T23:00:00Z";
  await page
    .getByRole("button", { name: "Voltar à súmula", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Editar elenco A aqui", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByLabel("Titular Atleta home 1", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Atleta A vaga 1", { exact: true }).click();
  await expect(
    page.getByRole("option", { name: "Atleta home 1", exact: true }),
  ).toHaveCount(0);
});

test("recupera envio incerto, conflito e reautenticação sem substituir o documento local", async ({
  page,
}) => {
  const f = await fixture(page);
  await open(page);
  await relate(page);
  await page
    .getByRole("button", { name: "Revisar preparação", exact: true })
    .click();
  f.uncertain();
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Repetir envio da súmula", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Rascunho da súmula salvo" }),
  ).toBeVisible();
  expect(f.attempts[0]).toBe(f.attempts[1]);
  await page.getByLabel("Titular Atleta home 0", { exact: true }).uncheck();
  await page.getByLabel("Titular Atleta home 5", { exact: true }).check();
  f.conflict();
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await expect(
    page.getByLabel("Titular Atleta home 5", { exact: true }),
  ).toBeChecked();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Recarregar súmula", exact: true })
    .click();
  await expect(
    page.getByLabel("Titular Atleta home 5", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Titular Atleta home 0", { exact: true }).uncheck();
  await page.getByLabel("Titular Atleta home 5", { exact: true }).check();
  f.expire();
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByLabel("Titular Atleta home 5", { exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Repetir envio da súmula", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Rascunho da súmula salvo" }),
  ).toBeVisible();
});

async function publicationFixture(page: Page) {
  const f = await fixture(page),
    game = f.games.get(tid(80))!,
    stamp = "2026-10-24T09:00:00Z";
  const participants = f.members
    .filter((m) => m.registrationId === game.home.id || m.id !== tid(115))
    .map((m) => ({
      rosterEntryId: m.id,
      side:
        m.registrationId === game.home.id
          ? ("home" as const)
          : ("away" as const),
      jersey: m.jersey!,
      played: m.id !== tid(105),
      starter: m.id !== tid(105),
    }));
  const document = {
    rulesVersion: "FIBA_2024" as const,
    periods: 4,
    participants,
    staff: {
      home: {
        captainRosterEntryId: tid(100),
        coachStaffEntryId: null,
        assistantStaffEntryId: null,
      },
      away: {
        captainRosterEntryId: tid(110),
        coachStaffEntryId: null,
        assistantStaffEntryId: null,
      },
    },
    events: [
      {
        id: tid(900),
        side: "home" as const,
        period: 4,
        target: "00",
        code: "2",
      },
    ],
  };
  let source: SheetSnapshot = {
    gameId: game.id,
    gameVersion: 1,
    version: 1,
    savedAt: stamp,
    confirmed: false,
    document,
    participants: participants.map((p) => {
      const m = f.members.find((m) => m.id === p.rosterEntryId)!;
      return {
        rosterEntryId: m.id,
        registrationId: m.registrationId,
        side: p.side,
        person: { id: m.personId, name: m.person.name, nickname: null },
      };
    }),
    staff: {
      home: { captain: null, coach: null, assistant: null },
      away: { captain: null, coach: null, assistant: null },
    },
  };
  let publicVersion = 0,
    fallback = false,
    lost = false,
    readFailure = false,
    publicationExpired = false;
  const receipts = new Map<string, unknown>(),
    attempts: string[] = [],
    commands: string[] = [];
  async function attach(targetPage: Page) {
    if (targetPage !== page) await fixture(targetPage);
    await targetPage.route(`**/api/games/${game.id}`, (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ json: f.games.get(game.id) })
        : route.fallback(),
    );
    await targetPage.route(`**/api/games/${game.id}/sheet`, async (route) => {
      if (route.request().method() === "GET") {
        if (readFailure) {
          readFailure = false;
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
        return route.fulfill({ json: source });
      }
      const c = saveSheetSchema.parse(route.request().postDataJSON());
      source = { ...source, document: c.document, version: source.version + 1 };
      return route.fulfill({
        json: {
          requestId: c.requestId,
          version: source.version,
          confirmed: source.confirmed,
        },
      });
    });
    await targetPage.route(`**/api/games/${game.id}/publication`, (route) =>
      route.fulfill({
        json: {
          gameId: game.id,
          version: publicVersion,
          published: publicVersion
            ? publishedSheet(
                source.document,
                game.id,
                game.home.id,
                game.away.id,
                publicVersion,
                source.version,
                source.gameVersion,
              )
            : null,
          history: [],
          hasMore: false,
          requiresFallback: fallback,
        },
      }),
    );
    await targetPage.route(
      `**/api/games/${game.id}/publication/sheet`,
      async (route) => {
        const c = publishSheetSchema.parse(route.request().postDataJSON());
        attempts.push(c.requestId);
        commands.push(route.request().postData()!);
        if (publicationExpired) {
          publicationExpired = false;
          return route.fulfill({
            status: 401,
            json: {
              error: { code: "invalid_session", message: "Entre novamente." },
            },
          });
        }
        if (receipts.has(c.requestId))
          return route.fulfill({ json: receipts.get(c.requestId) });
        if (
          c.basePublicationVersion !== publicVersion ||
          c.source.baseSheetVersion !== source.version ||
          c.gameVersion !== source.gameVersion
        )
          return route.fulfill({
            status: 409,
            json: {
              error: {
                code: "version_conflict",
                message: "Outra aba publicou este jogo. Recarregue a súmula.",
              },
            },
          });
        publicVersion++;
        source = {
          ...source,
          document: c.source.document,
          version: c.source.baseSheetVersion + 1,
          gameVersion: c.gameVersion + 1,
          confirmed: true,
        };
        f.games.set(game.id, {
          ...game,
          version: source.gameVersion,
          state: "finished",
        });
        const ack = publicationSheetResultSchema.parse({
          requestId: c.requestId,
          gameId: game.id,
          version: publicVersion,
          sourceVersion: source.version,
          gameVersion: source.gameVersion,
          publishedAt: stamp,
        });
        receipts.set(c.requestId, ack);
        if (lost) {
          lost = false;
          return route.fulfill({
            status: 503,
            json: {
              error: {
                code: "access_unavailable",
                message: "Resposta não confirmada.",
              },
            },
          });
        }
        return route.fulfill({ json: ack });
      },
    );
  }
  await attach(page);
  return {
    ...f,
    attempts,
    commands,
    attach,
    expirePublication: () => {
      publicationExpired = true;
    },
    source: () => source,
    fallback: () => {
      fallback = true;
    },
    lose: () => {
      lost = true;
    },
    failRead: () => {
      readFailure = true;
    },
  };
}
test("manual publication confirms identities, keeps participation editable and republishes with a reason", async ({
  page,
}) => {
  const f = await publicationFixture(page);
  await open(page);
  await page
    .getByRole("button", { name: "Confirmar e publicar", exact: true })
    .click();
  await expect(
    page.getByLabel("Placar a publicar", { exact: true }),
  ).toContainText("2 × 0");

  await page
    .getByRole("region", { name: "Publicação deste jogo", exact: true })
    .screenshot({
      path: `.preview-artifacts/manual-publication-320-${test.info().project.name}.png`,
    });
  await page
    .getByRole("button", { name: "Publicar este jogo", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Resultado publicado" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Revisar preparação", exact: true })
    .click();
  await expect(
    page.getByLabel("Camisa de Atleta home 0", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Atleta A vaga 1", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", {
      name: "Concluir preparação e lançar ações",
      exact: true,
    })
    .click();
  await page.getByLabel("Entrou Atleta home 5", { exact: true }).check();
  await page
    .getByLabel("Motivo da revisão da súmula", { exact: true })
    .fill("Atleta também participou sem ações.");
  await page
    .getByRole("button", { name: "Salvar e republicar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Republicar este jogo", exact: true })
    .click();
  await expect.poll(() => f.source().version).toBe(3);
  expect(
    f.source().document.participants.find((p) => p.rosterEntryId === tid(105))
      ?.played,
  ).toBe(true);
  await expect(
    page.getByRole("link", { name: "Ver resultado publicado", exact: true }),
  ).toHaveAttribute("target", "_blank");
});
test("manual fallback requires an explicit decision and uncertain publication repeats the frozen command", async ({
  page,
}) => {
  const f = await publicationFixture(page);
  f.fallback();
  f.lose();
  await open(page);
  await page
    .getByRole("button", { name: "Confirmar e publicar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Publicar este jogo", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Usar súmula manual em vez do PDF", { exact: true })
    .check();
  await page
    .getByLabel("Motivo da publicação", { exact: true })
    .fill("Súmula oficial revisada pelo responsável.");
  await page
    .getByRole("button", { name: "Publicar este jogo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Repetir publicação", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Revisar preparação", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir publicação", exact: true })
    .click();
  await expect.poll(() => f.attempts.length).toBe(2);
  expect(f.attempts[0]).toBe(f.attempts[1]);
  await expect(
    page.getByRole("link", { name: "Ver resultado publicado", exact: true }),
  ).toBeVisible();
});
test("known publication with failed source retrieval retries only the read", async ({
  page,
}) => {
  const f = await publicationFixture(page);
  await open(page);
  await page
    .getByRole("button", { name: "Confirmar e publicar", exact: true })
    .click();
  f.failRead();
  await page
    .getByRole("button", { name: "Publicar este jogo", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Recarregar súmula publicada",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver resultado publicado", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Recarregar súmula publicada", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Ver resultado publicado", exact: true }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(1);
});

test("two tabs keep a stale publication draft until explicit reload", async ({
  page,
  context,
}) => {
  const f = await publicationFixture(page),
    second = await context.newPage();
  await f.attach(second);
  await open(page);
  await open(second);
  await second.getByLabel("Entrou Atleta home 5", { exact: true }).check();
  for (const tab of [page, second])
    await tab
      .getByRole("button", { name: "Confirmar e publicar", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Publicar este jogo", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Resultado publicado" }),
  ).toBeVisible();
  await second
    .getByRole("button", { name: "Publicar este jogo", exact: true })
    .click();
  await expect(
    second.getByRole("alert").filter({ hasText: "Outra aba publicou" }),
  ).toBeVisible();
  await expect(
    second.getByLabel("Entrou Atleta home 5", { exact: true }),
  ).toBeChecked();
  await expect(
    second.getByRole("button", { name: "Publicar este jogo", exact: true }),
  ).toBeDisabled();
  expect(f.source().version).toBe(2);
  second.once("dialog", (d) => d.accept());
  await second
    .getByRole("button", { name: "Recarregar súmula", exact: true })
    .click();
  await expect(
    second.getByLabel("Entrou Atleta home 5", { exact: true }),
  ).not.toBeChecked();
  await second
    .getByRole("button", { name: "Revisar preparação", exact: true })
    .click();
  await expect(
    second.getByLabel("Atleta A vaga 1", { exact: true }),
  ).toBeDisabled();
  expect(f.attempts).toHaveLength(2);
});

test("expired publication session preserves the frozen command and protects leaving a clean sheet", async ({
  page,
}) => {
  const f = await publicationFixture(page);
  await open(page);
  await page
    .getByRole("button", { name: "Confirmar e publicar", exact: true })
    .click();
  f.expirePublication();
  await page
    .getByRole("button", { name: "Publicar este jogo", exact: true })
    .click();
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(true);
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Repetir publicação", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Resultado publicado" }),
  ).toBeVisible();
  expect(f.commands).toHaveLength(2);
  expect(f.commands[1]).toBe(f.commands[0]);
});

async function historyFixture(page: Page, wrongGame = false) {
  const f = await publicationFixture(page),
    id = tid(80),
    stamp = "2026-10-24T14:20:00Z",
    doc = f.source().document;
  const header = (version: number) => ({
    version,
    sourceKind: "sheet",
    sourceVersion: version + 1,
    reason: `Conferência histórica ${version}`,
    actorId: tid(999),
    publishedAt: stamp,
  });
  const version = (v: number) => {
    const document = {
      ...doc,
      events: doc.events.map((e) => ({ ...e, code: v === 1 ? "2" : "3" })),
    };
    const snapshot = publishedSheet(
      document,
      wrongGame ? tid(81) : id,
      tid(5),
      tid(6),
      v,
      v + 1,
      v + 1,
    );
    return { ...header(v), gameId: snapshot.id, snapshot, document };
  };
  const reads: string[] = [];
  await page.route(
    new RegExp(`/api/games/${id}/publication(?:\\?.*)?$`),
    (route) => {
      const u = new URL(route.request().url()),
        offset = Number(u.searchParams.get("offset") ?? 0);
      reads.push(u.pathname + u.search);
      return route.fulfill({
        json: {
          gameId: id,
          version: 21,
          published: { ...version(21).snapshot, id },
          history: Array.from({ length: 21 }, (_, i) => header(21 - i)).slice(
            offset,
            offset + 20,
          ),
          hasMore: offset === 0,
          requiresFallback: false,
        },
      });
    },
  );
  await page.route(
    new RegExp(`/api/games/${id}/publication/versions/[0-9]+$`),
    async (route) => {
      const v = Number(route.request().url().split("/").at(-1));
      if (v === 2) await new Promise((resolve) => setTimeout(resolve, 200));
      return route.fulfill({ json: version(v) });
    },
  );
  return { ...f, reads };
}
test("administrative publication history pages through immutable versions without changing the draft", async ({
  page,
}) => {
  const f = await historyFixture(page);
  await open(page);
  await page.getByLabel("Entrou Atleta home 5", { exact: true }).check();
  const trigger = page.getByRole("button", {
    name: "Ver histórico deste jogo",
    exact: true,
  });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const region = page.getByRole("region", {
    name: "Histórico administrativo de publicação",
    exact: true,
  });
  await region
    .getByRole("button", { name: "Versões anteriores", exact: true })
    .click();
  await region
    .getByRole("button", { name: "Ver versão 1", exact: true })
    .click();
  await expect(
    region.getByRole("heading", { name: "Versão publicada 1", exact: true }),
  ).toBeVisible();
  await expect(
    region.getByRole("heading", { name: /Lobos 2 × 0/ }),
  ).toBeVisible();

  expect(f.reads.some((u) => u.endsWith("offset=20"))).toBe(true);
  await region
    .getByRole("button", { name: "Fechar histórico", exact: true })
    .click();
  await expect(
    page.getByLabel("Entrou Atleta home 5", { exact: true }),
  ).toBeChecked();
  expect(f.attempts).toHaveLength(0);
});
test("historical responses from another game are rejected", async ({
  page,
}) => {
  await historyFixture(page, true);
  await open(page);
  await page
    .getByRole("button", { name: "Ver histórico deste jogo", exact: true })
    .click();
  const region = page.getByRole("region", {
    name: "Histórico administrativo de publicação",
    exact: true,
  });
  await region
    .getByRole("button", { name: "Ver versão 21", exact: true })
    .click();
  await expect(region.getByRole("alert")).toBeVisible();
  await expect(region.locator(".public-game")).toHaveCount(0);
});
test("a late historical response cannot replace the selected newer version", async ({
  page,
}) => {
  await historyFixture(page);
  await open(page);
  await page
    .getByRole("button", { name: "Ver histórico deste jogo", exact: true })
    .click();
  const region = page.getByRole("region", {
    name: "Histórico administrativo de publicação",
    exact: true,
  });
  await region
    .getByRole("button", { name: "Ver versão 2", exact: true })
    .click();
  await region
    .getByRole("button", { name: "Ver versão 21", exact: true })
    .click();
  await expect(
    region.getByRole("heading", { name: "Versão publicada 21", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(250);
  await expect(
    region.getByRole("heading", { name: "Versão publicada 2", exact: true }),
  ).toHaveCount(0);
  await region
    .getByRole("button", { name: "Ver versão 2", exact: true })
    .click();
  await region
    .getByRole("button", { name: "Fechar histórico", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ver histórico deste jogo", exact: true })
    .click();
  await expect(
    region.getByRole("button", { name: "Ver versão 21", exact: true }),
  ).toBeVisible();
  await expect(
    region
      .getByRole("status")
      .filter({ hasText: "Carregando versão selecionada" }),
  ).toHaveCount(0);
});
