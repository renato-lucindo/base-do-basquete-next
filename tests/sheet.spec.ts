import { test, expect, type Page } from "@playwright/test";
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
  let snapshot: SheetSnapshot | null = null,
    uncertain = false,
    expired = false,
    conflict = false;
  const receipts = new Map<string, unknown>(),
    attempts: string[] = [];
  await page.route(`**/api/games/${tid(80)}/sheet`, async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: snapshot });
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
  for (const summary of await page
    .getByText("Selecionar atletas do elenco", { exact: true })
    .all())
    await summary.click();
  await page.getByLabel("Relacionar Atleta home 1", { exact: true }).check();
  await page.getByLabel("Relacionar Atleta away 1", { exact: true }).check();
}
test("relaciona pessoas reais, lança por teclado e retoma rascunho sem publicar", async ({
  page,
}, testInfo) => {
  const f = await fixture(page);
  await open(page);
  await relate(page);
  await page
    .getByRole("button", {
      name: "Concluir preparação e lançar ações",
      exact: true,
    })
    .click();
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
  await page.locator(".sheet-preparation").screenshot({
    path: `.preview-artifacts/sumula-relacionados-${testInfo.project.name}.png`,
  });
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".sheet-input").screenshot({
    path: `.preview-artifacts/sumula-input-320-${testInfo.project.name}.png`,
  });
  await page.locator(".sheet-actions").screenshot({
    path: `.preview-artifacts/sumula-acoes-320-${testInfo.project.name}.png`,
  });
});

test("ordena camisas, exige escolha dos titulares e condiciona assistente ao técnico próprio", async ({
  page,
}) => {
  const f = await fixture(page);
  f.members[0].jersey = "0";
  f.members[1].jersey = "00";
  await open(page);
  await page
    .getByText("Selecionar atletas do elenco", { exact: true })
    .first()
    .click();
  for (let i = 5; i >= 0; i--)
    await page
      .getByLabel(`Relacionar Atleta home ${i}`, { exact: true })
      .check();
  const names = await page
    .locator(".sheet-roster")
    .first()
    .locator("li strong")
    .allTextContents();
  expect(names.map((n) => n.split(" · ")[0])).toEqual([
    "#0",
    "#00",
    "#22",
    "#32",
    "#42",
    "#52",
  ]);
  await expect(page.getByLabel("Capitão A", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Ass. Técnico A", { exact: true })).toHaveCount(
    0,
  );
  for (let i = 0; i < 5; i++)
    await page.getByLabel(`Titular Atleta home ${i}`, { exact: true }).check();
  await page.getByLabel("Titular Atleta home 5", { exact: true }).click();
  await expect(
    page.getByLabel("Titular Atleta home 5", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Capitão A", { exact: true }).selectOption(tid(100));
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
  await page.getByLabel("Ação", { exact: true }).fill("1");
  await page.keyboard.press("Enter");
  await expect(page.locator(".sheet-actions li").last()).toContainText(
    "12 · 1",
  );
  await page
    .getByRole("button", { name: "Excluir ação 2", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Excluir esta ação?", exact: true }),
  ).toBeFocused();
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
  await page
    .getByText("Selecionar atletas do elenco", { exact: true })
    .first()
    .click();
  await expect(
    page.getByLabel("Relacionar Atleta home 1", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Titular Atleta home 1", { exact: true }),
  ).toBeVisible();
});

test("recupera envio incerto, conflito e reautenticação sem substituir o documento local", async ({
  page,
}) => {
  const f = await fixture(page);
  await open(page);
  await relate(page);
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
  await page.getByLabel("Titular Atleta home 1", { exact: true }).check();
  f.conflict();
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await expect(
    page.getByLabel("Titular Atleta home 1", { exact: true }),
  ).toBeChecked();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Recarregar súmula", exact: true })
    .click();
  await expect(
    page.getByLabel("Titular Atleta home 1", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Titular Atleta home 1", { exact: true }).check();
  f.expire();
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByLabel("Titular Atleta home 1", { exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Repetir envio da súmula", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Rascunho da súmula salvo" }),
  ).toBeVisible();
});
