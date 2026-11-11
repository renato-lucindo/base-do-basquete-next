import { test, expect } from "@playwright/test";
import { playerPublicFixture } from "./fixtures/player-public-browser";
import { teamPublicFixture } from "./fixtures/team-public-browser";
import AxeBuilder from "@axe-core/playwright";

test("página de jogos normaliza URL acima do limite antes de voltar uma página", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { long: true });
  await page.goto(f.url + "?secao=jogos&page=500");
  const games = page.getByRole("table", {
    name: "Jogos confirmados",
    exact: true,
  });
  await expect(
    page.getByText("Página 2 de 2 · 25 jogos", { exact: true }),
  ).toBeVisible();
  await expect(games.locator("tbody tr")).toHaveCount(5);
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await expect(games.locator("tbody tr")).toHaveCount(20);
  await expect(
    page.getByText("Página 1 de 2 · 25 jogos", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Anterior", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(games.locator("tbody tr")).toHaveCount(5);
  await expect(
    page.getByRole("button", { name: "Próxima", exact: true }),
  ).toBeDisabled();
});

test("perfil aprovado: cinco recentes, recordes alinhados e expansão independente sem repetir o melhor", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { long: true });
  await page.goto(f.url);
  await expect(
    page
      .getByRole("table", { name: "Cinco últimos jogos", exact: true })
      .locator("tbody tr"),
  ).toHaveCount(5);
  const records = page.getByRole("table", {
    name: "Recordes da carreira",
    exact: true,
  });
  await expect(records.locator(".player-record-main")).toHaveCount(4);
  const rows = page
    .getByRole("table", { name: "Resumo de temporada e carreira", exact: true })
    .locator("tbody tr");
  for (const row of await rows.all())
    expect(
      await row.evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe("rgb(255, 255, 255)");
  await expect(rows.first()).not.toContainText("Mais recente");
  expect(
    await records
      .locator(".player-record-value")
      .first()
      .evaluate((el) => getComputedStyle(el).color),
  ).toBe("rgb(21, 87, 164)");
  await expect(
    records.getByRole("columnheader", { name: "Marca", exact: true }),
  ).toHaveAttribute("colspan", "2");
  await records
    .getByRole("button", { name: "Ver top 5 de PTS", exact: true })
    .click();
  await expect(
    records.locator('[data-metric="points"] [data-game]'),
  ).toHaveCount(5);
  expect(
    await records
      .locator(".player-record-ranking")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(245, 248, 252)");
  expect(
    new Set(
      await records
        .locator('[data-metric="points"] [data-game]')
        .evaluateAll((els) => els.map((e) => e.getAttribute("data-game"))),
    ).size,
  ).toBe(5);
  await records
    .getByRole("button", { name: "Ver top 5 de LL", exact: true })
    .click();
  await records
    .getByRole("button", { name: "Recolher top 5 de PTS", exact: true })
    .click();
  await expect(
    records.locator('[data-metric="freeMade"] [data-game]'),
  ).toHaveCount(5);
  await expect(
    records.locator('[data-metric="points"] [data-game]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Filtrar e ajustar", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await page
    .getByRole("link", { name: "Ver todos os jogos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Jogos de AP", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", {
      name: "Resumo de temporada e carreira",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("table", { name: "Jogos confirmados", exact: true })
      .locator("tbody tr"),
  ).toHaveCount(20);
  await page
    .getByRole("link", { name: "Voltar ao perfil", exact: true })
    .click();
  await expect(records).toBeVisible();
});

test("links reais: recorde abre jogo e nome abre equipe, com retorno ao perfil e filtros", async ({
  page,
}) => {
  await teamPublicFixture(page);
  const f = await playerPublicFixture(page);
  await page.goto(f.url + "?anoPerfil=2026");
  const known = f.source.participations[0];
  await page
    .locator(
      `.player-recent a[href*="resultado.html"][href*="${known.fact.gameId}"]`,
    )
    .click();
  await expect(
    page.getByRole("region", { name: "Parciais e placar final", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Voltar à origem", exact: true })
    .click();
  await expect(page.locator(".player-records")).toBeVisible();
  expect(page.url()).toContain("anoPerfil=2026");
  const team = page
    .locator(
      `.player-recent a[href*="equipe.html"][href*="registrationId=${known.game.home.registrationId}"]`,
    )
    .first();
  await team.click();
  await expect(page.locator(".team-public-page").first()).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Voltar à origem", exact: true })
    .click();
  await expect(page.locator(".player-records")).toBeVisible();
  expect(page.url()).toContain("anoPerfil=2026");
  const mark = page
    .locator(`.player-record-value a[href*="${known.fact.gameId}"]`)
    .first();
  if (!(await mark.count()))
    await page
      .getByRole("button", { name: "Ver top 5 de PTS", exact: true })
      .click();
  await mark.click();
  await expect(
    page.getByRole("region", { name: "Parciais e placar final", exact: true }),
  ).toBeVisible();
});

test("conquistas agrupadas lado a lado, identificação e navegação sem sublinhado", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(f.url);
  await expect(page.locator(".player-current-team a")).toHaveAttribute(
    "href",
    /equipe\.html/,
  );
  await expect(page.locator(".player-medal")).toHaveText("🥇");
  const collective = await page.locator(".player-collective").boundingBox(),
    individual = await page.locator(".player-individual").boundingBox();
  expect(individual!.x).toBeGreaterThan(collective!.x);
  expect(Math.abs(individual!.y - collective!.y)).toBeLessThan(1);
  await expect(page.locator(".player-honors details")).toHaveCount(2);
  await page.locator(".player-collective summary").click();
  await expect(page.locator(".player-collective details")).toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator(".player-individual details")).not.toHaveAttribute(
    "open",
    "",
  );
  await page.getByText("Ver histórico de equipes", { exact: true }).click();
  await expect(page.locator(".player-trajectory")).not.toContainText(
    f.source.participations[0].fact.context.name,
  );
  for (const link of await page
    .locator(".player-current-team a,.player-recent a")
    .all())
    expect(
      await link.evaluate((el) => getComputedStyle(el).textDecorationLine),
    ).toBe("none");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const width of [320, 390, 1366, 1920])
  test(`recordes: centros compartilhados, nomes longos e expansão em ${width}px`, async ({
    page,
  }, info) => {
    const f = await playerPublicFixture(page, { long: true });
    f.source.profile!.person.name = "Ana de Albuquerque e Vasconcelos da Silva";
    f.source.participations[0].game.home.name =
      "Associação Esportiva e Cultural de São José do Vale e Região Metropolitana";
    f.source.participations[0].fact.registration.name =
      f.source.participations[0].game.home.name;
    await page.setViewportSize({ width, height: width < 700 ? 844 : 768 });
    await page.goto(f.url);
    const table = page.getByRole("table", {
      name: "Recordes da carreira",
      exact: true,
    });
    await expect(table).toBeVisible();
    for (const expanded of [false, true]) {
      if (expanded)
        for (const label of ["PTS", "2P", "3P", "LL"])
          await table
            .getByRole("button", { name: `Ver top 5 de ${label}`, exact: true })
            .click();
      const geometry = await table.evaluate((el) => ({
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
        head: [...el.querySelectorAll("thead th")].map((c) =>
          c.getBoundingClientRect().toJSON(),
        ),
        rows: [...el.querySelectorAll("tbody tr")].map((r) =>
          [...r.children].map((c) => c.getBoundingClientRect().toJSON()),
        ),
      }));
      expect(geometry.scroll).toBeLessThanOrEqual(geometry.width);
      for (const row of geometry.rows) {
        expect(Math.abs(row[0].left - geometry.head[0].left)).toBeLessThan(1);
        expect(Math.abs(row[1].right - geometry.head[0].right)).toBeLessThan(1);
        expect(Math.abs(row[3].left - geometry.head[2].left)).toBeLessThan(1);
        expect(Math.abs(row[3].right - geometry.head[2].right)).toBeLessThan(1);
        expect(Math.abs(row[4].left - geometry.head[3].left)).toBeLessThan(1);
      }
    }
    if (info.project.name === "desktop") {
      await page.screenshot({
        path: `.preview-artifacts/perfil-aprovado-${width}.png`,
        fullPage: true,
      });
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(result.violations).toEqual([]);
    }
    await page
      .getByRole("link", { name: "Ver todos os jogos", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Jogos de AP", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
