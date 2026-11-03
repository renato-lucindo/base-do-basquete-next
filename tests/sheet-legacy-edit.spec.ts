import { test, expect } from "@playwright/test";
import {
  desktopSheetFixture,
  openDesktopSheet,
  chooseFive,
} from "./fixtures/sheet-desktop";
import {
  emptyPersistedSheet,
  type SheetSnapshot,
} from "../src/games/sheet-contract";
import { tid } from "./fixtures/text-import";
import AxeBuilder from "@axe-core/playwright";

async function seed(
  page: Parameters<typeof desktopSheetFixture>[0],
  version?: 2,
  confirmed = false,
  withStaff = false,
) {
  const f = await desktopSheetFixture(page, 11, withStaff);
  const d = emptyPersistedSheet(version);
  d.participants = (["home", "away"] as const).flatMap((side) =>
    f.context.sides[side].roster.map((r, i) => ({
      rosterEntryId: r.id,
      side,
      jersey: i === 0 ? "0" : i === 1 ? "00" : String(i + 1),
      played: i < 5,
      starter: i < 5,
    })),
  );
  d.staff.home.captainRosterEntryId = tid(100);
  d.staff.away.captainRosterEntryId = tid(200);
  d.events = [
    { id: tid(850), side: "home", period: 1, target: "0", code: "2" },
    { id: tid(851), side: "home", period: 1, target: "00", code: "3" },
    { id: tid(852), side: "away", period: 1, target: "0", code: "2" },
  ];
  const s: SheetSnapshot = {
    gameId: tid(80),
    gameVersion: confirmed ? 2 : 1,
    version: 1,
    savedAt: "2026-10-26T18:00:00Z",
    confirmed,
    document: d,
    participants: (["home", "away"] as const).flatMap((side) =>
      f.context.sides[side].roster.map((r) => ({
        rosterEntryId: r.id,
        registrationId: r.registrationId,
        side,
        person: r.person,
      })),
    ),
    staff: {
      home: {
        captain: f.context.sides.home.roster[0].person,
        coach: null,
        assistant: null,
      },
      away: {
        captain: f.context.sides.away.roster[0].person,
        coach: null,
        assistant: null,
      },
    },
  };
  f.setSnapshot(s);
  if (confirmed)
    f.games.set(tid(80), {
      ...f.games.get(tid(80))!,
      state: "finished",
      version: 2,
    });
  return f;
}

for (const version of [undefined, 2] as const)
  test(`staff choices respect format ${version ?? 1} and persist after reload`, async ({
    page,
  }) => {
    const f = await seed(page, version, false, true);
    await openDesktopSheet(page);
    await page.getByRole("button", { name: "Revisar preparação" }).click();
    const coach = page.getByLabel("Técnico A", { exact: true });
    await expect(coach.locator(`option[value="${tid(300)}"]`)).toHaveCount(
      version ? 1 : 0,
    );
    await coach.selectOption(version ? tid(300) : tid(301));
    const assistant = page.getByLabel("Ass. Técnico A", { exact: true });
    await expect(assistant.locator(`option[value="${tid(301)}"]`)).toHaveCount(
      version ? 1 : 0,
    );
    await assistant.selectOption(version ? tid(301) : tid(300));
    await page
      .getByRole("button", { name: "Concluir preparação e lançar ações" })
      .click();
    await page
      .getByRole("button", { name: "Salvar rascunho da súmula" })
      .click();
    await expect(
      page.getByText("Rascunho da súmula salvo", { exact: true }),
    ).toBeVisible();
    expect(f.snapshot()!.document.formatVersion).toBe(version);
    expect(f.snapshot()!.document.staff.home).toMatchObject({
      coachStaffEntryId: version ? tid(300) : tid(301),
      assistantStaffEntryId: version ? tid(301) : tid(300),
    });
    expect(
      f.snapshot()!.document.events.map((e) => [e.id, e.target, e.code]),
    ).toEqual([
      [tid(850), "0", "2"],
      [tid(851), "00", "3"],
      [tid(852), "0", "2"],
    ]);
    await page.reload();
    await page
      .getByRole("button", { name: "Abrir jogo Lobos × Lobos B" })
      .click();
    await page.getByRole("button", { name: "Preparar súmula" }).click();
    await page.getByRole("button", { name: "Revisar preparação" }).click();
    await expect(coach).toHaveValue(version ? tid(300) : tid(301));
    await expect(assistant).toHaveValue(version ? tid(301) : tid(300));
  });

test("a jersey remains editable after scoring and its previous actions follow the player", async ({
  page,
}) => {
  await desktopSheetFixture(page);
  await openDesktopSheet(page);
  await chooseFive(page);
  await page
    .getByRole("button", { name: "Concluir preparação e lançar ações" })
    .click();
  await page.getByLabel("Camisa ou alvo", { exact: true }).fill("1");
  await page.keyboard.press("Enter");
  await page.getByLabel("Ação", { exact: true }).fill("2");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /Revisar preparação/ }).click();
  await expect(
    page.getByLabel("Camisa de Jogador A 1", { exact: true }),
  ).toBeEnabled();
});

for (const version of [undefined, 2] as const)
  test(`legacy format ${version ?? 1}: jersey, timeout, reload, retry and conflict preserve player identity`, async ({
    page,
  }, info) => {
    const f = await seed(page, version);
    await openDesktopSheet(page);
    if (!version)
      await expect(
        page.getByLabel("Tempos debitados da equipe A"),
      ).toContainText("Não informados");
    await page.getByRole("button", { name: "Revisar preparação" }).click();
    const shirt = page.getByLabel("Camisa de Jogador A 1", { exact: true });
    await shirt.fill("17");
    await shirt.press("Enter");
    await shirt.fill("00");
    await shirt.press("Tab");
    await expect(page.getByRole("alert")).toContainText("já está ocupada");
    await expect(shirt).toHaveValue("17");
    await shirt.fill("18");
    await shirt.press("Escape");
    await expect(shirt).toHaveValue("17");
    await page
      .getByRole("button", { name: "Concluir preparação e lançar ações" })
      .click();
    const points = page.getByRole("region", {
      name: "Ações de pontos",
      exact: true,
    });
    await expect(points).toContainText("#17");
    await expect(points).toContainText("#00");
    await page.getByLabel("Camisa ou alvo", { exact: true }).fill("17");
    await page.keyboard.press("Enter");
    await page.getByLabel("Ação", { exact: true }).fill("3");
    await page.keyboard.press("Enter");
    await page.getByLabel("Camisa ou alvo", { exact: true }).fill("TO");
    await page.keyboard.press("Enter");
    await page.getByLabel(/Minuto decorrido/).fill("3");
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Tempos debitados da equipe A")).toContainText(
      "Q1: 3′",
    );
    f.loseNextSheetAck();
    await page
      .getByRole("button", { name: "Salvar rascunho da súmula" })
      .click();
    await page.getByRole("button", { name: "Repetir envio da súmula" }).click();
    await expect(
      page.getByText("Rascunho da súmula salvo", { exact: true }),
    ).toBeVisible();
    expect(f.sheetAttempts.at(-1)).toEqual(f.sheetAttempts.at(-2));
    expect(
      f
        .snapshot()!
        .document.events.filter((e) => e.target === "17")
        .map((e) => e.playerRosterEntryId),
    ).toEqual([tid(100), tid(100)]);
    expect(f.snapshot()!.document.events[1]).toMatchObject({
      target: "00",
      playerRosterEntryId: tid(101),
    });
    await page.reload();
    await page
      .getByRole("button", { name: "Abrir jogo Lobos × Lobos B" })
      .click();
    await page.getByRole("button", { name: "Preparar súmula" }).click();
    await expect(points).toContainText("#17");
    await expect(page.getByLabel("Tempos debitados da equipe A")).toContainText(
      "Q1: 3′",
    );
    await page.getByRole("button", { name: "Revisar preparação" }).click();
    await shirt.fill("18");
    await shirt.press("Enter");
    f.conflictNextSheetSave();
    await page
      .getByRole("button", { name: "Concluir preparação e lançar ações" })
      .click();
    await expect(page.getByRole("alert")).toContainText("mudou no servidor");
    await expect(shirt).toBeDisabled();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Recarregar súmula" }).click();
    await page.getByRole("button", { name: "Revisar preparação" }).click();
    await expect(shirt).toHaveValue("17");
    await shirt.fill("19");
    await shirt.press("Enter");
    await page
      .getByRole("button", { name: "Concluir preparação e lançar ações" })
      .click();
    await expect(points).toContainText("#19");
    expect(
      f
        .snapshot()!
        .document.events.filter((e) => e.playerRosterEntryId === tid(100))
        .map((e) => e.target),
    ).toEqual(["19", "19"]);
    const viewports =
      info.project.name === "desktop"
        ? [
            { width: 1366, height: 768 },
            { width: 1920, height: 1080 },
          ]
        : [{ width: 390, height: 844 }];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `.preview-artifacts/legacy-sheet-v${version ?? 1}-after-${viewport.width}.png`,
        fullPage: true,
      });
    }
  });

test("confirmed v1 game: actual times and officiating can be saved; jersey correction requires a reason", async ({
  page,
}, info) => {
  const f = await seed(page, undefined, true);
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page
    .getByRole("button", { name: "Abrir jogo Lobos × Lobos B" })
    .click();
  await expect(
    page.getByLabel("Inscrição mandante", { exact: true }),
  ).toBeDisabled();
  await expect(page.locator('input[type="datetime-local"]')).toHaveCount(0);
  await expect(page.locator('input[type="date"]')).toHaveCount(1);
  await expect(page.locator('input[type="time"]')).toHaveCount(2);
  await expect(
    page.getByLabel("Data dos horários reais", { exact: true }),
  ).toHaveValue("2026-10-26");
  await expect(page.getByLabel("Hora de início", { exact: true })).toHaveValue(
    "",
  );
  await page
    .getByLabel("Data dos horários reais", { exact: true })
    .fill("2026-10-30");
  await page.getByLabel("Hora de início", { exact: true }).fill("23:15");
  await page.getByLabel("Hora de fim", { exact: true }).fill("00:47");
  await expect(
    page.getByLabel("Termina no dia seguinte", { exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("status").filter({ hasText: "Duração total" }),
  ).toContainText("92 min");
  await page.locator(".game-officiating summary").click();
  await page
    .getByRole("combobox", { name: "Árbitro", exact: true })
    .fill("Árbitro legado");
  await page
    .getByRole("option", {
      name: "Usar novo oficial: Árbitro legado",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(page.getByLabel("Hora de fim", { exact: true })).toHaveValue(
    "00:47",
  );
  expect(f.games.get(tid(80))).toMatchObject({
    state: "finished",
    date: "2026-10-26",
    time: null,
    startAt: "2026-10-30T23:15",
    endAt: "2026-10-31T00:47",
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Abrir jogo Lobos × Lobos B" })
    .click();
  await expect(
    page.getByLabel("Data dos horários reais", { exact: true }),
  ).toHaveValue("2026-10-30");
  await expect(page.getByLabel("Hora de início", { exact: true })).toHaveValue(
    "23:15",
  );
  await expect(page.getByLabel("Hora de fim", { exact: true })).toHaveValue(
    "00:47",
  );
  await expect(
    page.getByLabel("Termina no dia seguinte", { exact: true }),
  ).toBeChecked();
  await page.locator(".game-officiating summary").click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  if (info.project.name === "mobile") {
    const court = await page
      .getByRole("group", { name: "Oficiais de Quadra", exact: true })
      .boundingBox();
    const table = await page
      .getByRole("group", { name: "Oficiais de Mesa", exact: true })
      .boundingBox();
    expect(table!.y).toBeGreaterThanOrEqual(court!.y + court!.height);
  }
  await page.screenshot({
    path: `.preview-artifacts/legacy-game-times-after-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Preparar súmula" }).click();
  await page.getByRole("button", { name: "Revisar preparação" }).click();
  const shirt = page.getByLabel("Camisa de Jogador A 1", { exact: true });
  await shirt.fill("17");
  await shirt.press("Enter");
  await page.getByRole("button", { name: "Salvar rascunho da súmula" }).click();
  await expect(page.getByRole("alert")).toContainText("motivo");
  await page
    .getByLabel("Motivo da revisão da súmula")
    .fill("Correção da camisa conferida no original.");
  await page
    .getByRole("button", { name: "Concluir preparação e lançar ações" })
    .click();
  await expect(
    page.getByRole("region", { name: "Ações de pontos", exact: true }),
  ).toContainText("#17");
  expect(f.snapshot()!.confirmed).toBe(true);
});

test("finished game: separate date and range preserve drafts, same-day times and retry identity", async ({
  page,
}, info) => {
  const f = await seed(page, undefined, true);
  const originalGame = { ...f.games.get(tid(80))! };
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page
    .getByRole("button", { name: "Abrir jogo Lobos × Lobos B" })
    .click();
  const date = page.getByLabel("Data dos horários reais", { exact: true });
  const start = page.getByLabel("Hora de início", { exact: true });
  const end = page.getByLabel("Hora de fim", { exact: true });
  const nextDay = page.getByLabel("Termina no dia seguinte", { exact: true });
  await date.fill("2026-11-01");
  await start.fill("20:12");
  await end.fill("21:45");
  await expect(nextDay).not.toBeChecked();
  await expect(
    page.getByRole("status").filter({ hasText: "Duração total" }),
  ).toContainText("93 min");
  await start.fill("");
  await expect(end).toHaveValue("21:45");
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("hora de início");
  expect(f.attempts).toHaveLength(0);
  await start.fill("20:12");
  await nextDay.check();
  await expect(page.locator("#actual-time-error")).toContainText("24 horas");
  await nextDay.uncheck();
  await expect(page.locator("#actual-time-error")).toBeEmpty();
  const sizes =
    info.project.name === "desktop"
      ? [
          { width: 1366, height: 768 },
          { width: 1920, height: 1080 },
        ]
      : [{ width: 390, height: 844 }];
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    await date.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const dateBox = await date.boundingBox(),
      startBox = await start.boundingBox(),
      endBox = await end.boundingBox();
    if (viewport.width >= 1000) {
      expect(Math.abs(dateBox!.y - startBox!.y)).toBeLessThan(2);
      expect(Math.abs(startBox!.y - endBox!.y)).toBeLessThan(2);
    }
    await page.screenshot({
      path: `.preview-artifacts/actual-time-range-after-${viewport.width}.png`,
    });
  }
  f.uncertain();
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(start).toBeDisabled();
  await expect(end).toHaveValue("21:45");
  await page.getByRole("button", { name: "Repetir o mesmo envio" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(2);
  expect(f.attempts[0]).toBe(f.attempts[1]);
  expect(f.games.get(tid(80))).toMatchObject({
    id: originalGame.id,
    disputeId: originalGame.disputeId,
    homeRegistrationId: originalGame.homeRegistrationId,
    awayRegistrationId: originalGame.awayRegistrationId,
    date: originalGame.date,
    time: originalGame.time,
    state: originalGame.state,
    venue: originalGame.venue,
    number: originalGame.number,
    version: originalGame.version + 1,
    startAt: "2026-11-01T20:12",
    endAt: "2026-11-01T21:45",
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Abrir jogo Lobos × Lobos B" })
    .click();
  await expect(date).toHaveValue("2026-11-01");
  await expect(start).toHaveValue("20:12");
  await expect(end).toHaveValue("21:45");
  await expect(nextDay).not.toBeChecked();
  await end.fill("22:00");
  f.conflict();
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Recarregue");
  await expect(end).toHaveValue("22:00");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Recarregar jogo", exact: true })
    .click();
  await expect(end).toHaveValue("21:45");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
