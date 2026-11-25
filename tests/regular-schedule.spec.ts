import { test, expect } from "@playwright/test";
import { competitionSetupFixture } from "./fixtures/competition-setup";
import { scanAccessibility } from "./fixtures/accessibility";
import { tid } from "./fixtures/text-import";
import { gamesFixture } from "./fixtures/games";
const origin = process.env.BB_TEST_FOUNDATION_ORIGIN ?? "http://127.0.0.1:5174";
const path = `${origin}/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`;

test("gera ida e volta e troca mando somente em Editar jogo", async ({
  page,
  isMobile,
}, info) => {
  const f = await competitionSetupFixture(page, { emptyGames: true });
  await page.goto(path);
  await page
    .getByRole("combobox", { name: "Turnos", exact: true })
    .selectOption("2");
  await page
    .getByRole("checkbox", {
      name: "Gerar confrontos da fase regular automaticamente",
    })
    .check();
  await expect(
    page.getByLabel("Quantidade de equipes", { exact: true }),
  ).toHaveValue("2");
  await page
    .getByRole("button", { name: "Gerar confrontos", exact: true })
    .click();
  const preview = page.getByRole("region", { name: "Confrontos gerados" });
  await expect(
    preview.getByRole("button", { name: /Trocar mando/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Salvar confrontos", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await scanAccessibility(page, info, "regular-schedule-preview");
  await page
    .getByRole("button", { name: "Salvar confrontos", exact: true })
    .click();
  await expect(
    page.getByText("2 confrontos salvos", { exact: true }),
  ).toBeVisible();
  expect(f.games.size).toBe(2);
  await page
    .getByRole("button", { name: "Gerar confrontos", exact: true })
    .click();
  await expect(
    page.getByText("Todos os confrontos deste formato já estão cadastrados.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(f.games.size).toBe(2);
  await page.getByRole("button", { name: "Jogos", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar jogo Lobos × Lobos B", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Editar jogo", exact: true });
  await dialog
    .getByRole("button", { name: "Trocar mando", exact: true })
    .click();
  await expect(
    dialog.getByRole("combobox", { name: "Inscrição mandante", exact: true }),
  ).toHaveValue("Lobos B");
  await expect(
    dialog.getByRole("combobox", { name: "Inscrição visitante", exact: true }),
  ).toHaveValue("Lobos");
  await dialog.getByLabel("Número do jogo", { exact: true }).fill("42");
  await dialog.getByLabel("Data do jogo", { exact: true }).fill("2026-12-12");
  await dialog.getByLabel("Hora de início", { exact: true }).fill("19:30");
  await dialog
    .getByRole("combobox", { name: "Local", exact: true })
    .fill("Ginásio Central");
  await dialog
    .getByRole("combobox", { name: "Local", exact: true })
    .press("Escape");
  await scanAccessibility(page, info, "regular-schedule-edit-game");
  for (const width of isMobile ? [320, 390] : [1366, 1920]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    await page.screenshot({
      path: `.preview-artifacts/regular-schedule-editor-${width}.png`,
    });
  }
  await dialog
    .getByRole("button", { name: "Salvar jogo", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }).first(),
  ).toBeVisible();
  expect([...f.games.values()].find((g) => g.number === "42")).toMatchObject({
    homeRegistrationId: tid(6),
    awayRegistrationId: tid(5),
    date: "2026-12-12",
    time: "19:30",
    venue: "Ginásio Central",
    round: 1,
    stageKind: "round_robin",
  });
});

test("troca de mando não aparece no cadastro e respeita jogo encerrado", async ({
  page,
}) => {
  const f = await gamesFixture(page),
    home = f.registrations.get(tid(5))!,
    away = f.registrations.get(tid(6))!;
  f.games.set(tid(50), {
    id: tid(50),
    disputeId: tid(3),
    homeRegistrationId: home.id,
    awayRegistrationId: away.id,
    home,
    away,
    date: null,
    time: null,
    venue: null,
    number: "50",
    version: 1,
    savedAt: "2026-11-25T16:00:00Z",
    state: "finished",
    timeZone: "America/Sao_Paulo",
    scheduledAt: null,
  });
  await page.goto(path.replace("/regulamento", "/jogos"));
  await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Trocar mando", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Descartar alterações", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar jogo Lobos × Lobos B", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Trocar mando", exact: true }),
  ).toBeDisabled();
  expect(f.attempts).toHaveLength(0);
});

test("conserva comandos após resposta perdida e não repete itens já confirmados", async ({
  page,
}) => {
  const f = await competitionSetupFixture(page, { emptyGames: true });
  const attempts: unknown[] = [];
  await page.route("**/api/games", async (route) => {
    if (route.request().method() === "POST") {
      attempts.push(route.request().postDataJSON());
      if (attempts.length === 2) f.uncertain();
    }
    return route.fallback();
  });
  await page.goto(path);
  await page
    .getByRole("combobox", { name: "Turnos", exact: true })
    .selectOption("2");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByText("Configuração salva", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: "Gerar confrontos da fase regular automaticamente",
    })
    .check();
  await page
    .getByRole("button", { name: "Gerar confrontos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar confrontos", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Repetir envio dos confrontos",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("1 de 2 confrontos salvos", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Repetir envio dos confrontos", exact: true })
    .click();
  await expect(
    page.getByText("2 confrontos salvos", { exact: true }),
  ).toBeVisible();
  expect(attempts).toHaveLength(3);
  expect(attempts[1]).toEqual(attempts[2]);
  expect(f.games.size).toBe(2);
});

test("valida quantidade e distribuição e protege a prévia ao sair", async ({
  page,
}) => {
  const f = await competitionSetupFixture(page, { emptyGames: true });
  await page.goto(path);
  await page
    .getByRole("checkbox", {
      name: "Gerar confrontos da fase regular automaticamente",
    })
    .check();
  await page.getByLabel("Quantidade de equipes", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Gerar confrontos", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Informe uma quantidade" }),
  ).toBeVisible();
  await page.getByLabel("Quantidade de equipes", { exact: true }).fill("3");
  await page
    .getByRole("button", { name: "Gerar confrontos", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "equipes inscritas" }),
  ).toBeVisible();
  await page.getByLabel("Quantidade de equipes", { exact: true }).fill("2");
  await page
    .getByRole("combobox", { name: "Organização", exact: true })
    .selectOption("2");
  await page
    .getByRole("button", { name: "Gerar confrontos", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Distribua todas" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Organização", exact: true })
    .selectOption("1");
  await page
    .getByRole("button", { name: "Gerar confrontos", exact: true })
    .click();
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("confrontos");
    await dialog.dismiss();
  });
  await page
    .getByRole("checkbox", {
      name: "Gerar confrontos da fase regular automaticamente",
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Confrontos gerados" }),
  ).toBeVisible();
  expect(f.games.size).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
