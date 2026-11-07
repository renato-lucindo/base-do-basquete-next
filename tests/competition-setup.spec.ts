import { test, expect } from "@playwright/test";
import { competitionSetupFixture } from "./fixtures/competition-setup";
import { scanAccessibility } from "./fixtures/accessibility";
import { tid } from "./fixtures/text-import";
const path = `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`;
test("configura três grupos, vagas extras e séries por fase com um único salvamento", async ({
  page,
}) => {
  const f = await competitionSetupFixture(page);
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: "Como fica a disputa" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Conferir impacto", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Organização", exact: true })
    .selectOption("3");
  await page
    .getByRole("combobox", { name: "Começar em", exact: true })
    .selectOption("8");
  await expect(
    page.getByLabel("Classificados por grupo", { exact: true }),
  ).toHaveValue("2");
  await expect(page.getByLabel("Vagas extras", { exact: true })).toHaveValue(
    "2",
  );
  await expect(
    page.getByText("2 melhores terceiros", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Formato das séries", exact: true })
    .selectOption("best_of_5");
  await page
    .getByRole("button", { name: "Definir por fase", exact: true })
    .click();
  await page
    .getByLabel("Formato: Final", { exact: true })
    .selectOption("best_of_7");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByText("Configuração salva", { exact: true }),
  ).toBeVisible();
  expect(f.setupAttempts).toHaveLength(1);
  expect(f.getDocument()).toMatchObject({
    groupCount: 3,
    directPerGroup: 2,
    extras: [{ position: 3, count: 2 }],
    knockoutSize: 8,
    seriesFormat: "best_of_5",
    roundFormats: { "2": "best_of_7" },
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("repete o mesmo comando quando a resposta se perde", async ({ page }) => {
  const f = await competitionSetupFixture(page);
  await page.goto(path);
  await page
    .getByRole("combobox", { name: "Turnos", exact: true })
    .selectOption("2");
  f.loseAck();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Repetir envio", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Repetir envio", exact: true })
    .click();
  await expect(
    page.getByText("Configuração salva", { exact: true }),
  ).toBeVisible();
  expect(f.setupAttempts).toHaveLength(2);
  expect(f.setupAttempts[0]).toEqual(f.setupAttempts[1]);
});

test("campo numérico vazio não vira zero nem é salvo", async ({ page }) => {
  const f = await competitionSetupFixture(page);
  await page.goto(path);
  await page
    .locator("summary")
    .filter({ hasText: /^Opções avançadas$/ })
    .click();
  await page
    .getByText("Regras de classificação", { exact: false })
    .first()
    .click();
  const points = page.getByRole("spinbutton", {
    name: "Pontos por vitória",
    exact: true,
  });
  await points.fill("");
  await page
    .getByRole("combobox", { name: "Turnos", exact: true })
    .selectOption("2");
  await expect(points).toHaveValue("");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  expect(f.setupAttempts).toHaveLength(0);
});

test("formato e opções manuais têm leitura e foco nos tamanhos de aceite", async ({
  page,
  isMobile,
}, info) => {
  await competitionSetupFixture(page);
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: "Como fica a disputa" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Organização", exact: true })
    .selectOption("3");
  await page
    .getByRole("combobox", { name: "Começar em", exact: true })
    .selectOption("8");
  if (!isMobile) {
    for (const width of [1366, 1920]) {
      await page.setViewportSize({
        width,
        height: width === 1366 ? 768 : 1080,
      });
      await scanAccessibility(page, info, `competition-setup-${width}`);
    }
  } else await scanAccessibility(page, info, "competition-setup-mobile");
  await page
    .locator("summary")
    .filter({ hasText: /^Opções avançadas$/ })
    .click();
  await page
    .getByText("Classificados e cruzamentos manuais", { exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Escolher classificados manualmente" })
    .check();
  await page
    .getByRole("combobox", { name: "Classificado 1", exact: true })
    .selectOption(tid(5));
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByText("Configuração salva", { exact: true }),
  ).toBeVisible();
  await scanAccessibility(page, info, "competition-setup-manual");
});

for (const fail of [false, true])
  test(`associação opcional não bloqueia o cadastro do jogo; falha ${fail}`, async ({
    page,
  }) => {
    const { selectGameRegistration } = await import("./fixtures/games");
    const f = await competitionSetupFixture(page);
    let failed = false;
    if (fail)
      await page.route("**/api/competition-setups/**", async (route) => {
        if (route.request().method() === "POST" && !failed) {
          failed = true;
          return route.fulfill({
            status: 503,
            json: {
              error: {
                code: "access_unavailable",
                message: "Associação indisponível.",
              },
            },
          });
        }
        await route.fallback();
      });
    await page.goto(path.replace("/regulamento", "/jogos"));
    await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
    await selectGameRegistration(page, "mandante", "Lobos");
    await selectGameRegistration(page, "visitante", "Lobos B");
    await page
      .getByText("Grupo ou confronto · opcional", { exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Associar ao formato", exact: true })
      .selectOption("none");
    await page
      .getByRole("button", { name: "Salvar jogo", exact: true })
      .click();
    await expect.poll(() => f.games.size).toBe(1);
    if (fail) {
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "A associação ao formato não foi confirmada" })
          .first(),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Repetir associação", exact: true })
        .click();
    }
    await expect.poll(() => f.getDocument()?.assignments.length).toBe(1);
    expect(f.getDocument()?.assignments[0].kind).toBe("unassigned");
    expect(f.games.size).toBe(1);
  });
