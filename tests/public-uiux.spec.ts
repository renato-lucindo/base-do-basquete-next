import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { statisticsBrowserFixture } from "./fixtures/statistics-browser";
import { teamPublicFixture } from "./fixtures/team-public-browser";
import { publicNavigationFixture } from "./fixtures/public-navigation";
import { publicRegulationFixture } from "./fixtures/public-regulation";
import { buildPublicStandings } from "../src/regulation/public";
import { pubId } from "./fixtures/publication";

test("busca visível no cabeçalho de outra rota abre resultados públicos", async ({
  page,
}) => {
  const catalog = await publicNavigationFixture(page);
  const team = await teamPublicFixture(page);
  await page.goto(team.listUrl);
  const search = page.getByRole("combobox", { name: /Buscar competições/ });
  await expect(search).toBeVisible();
  await search.fill(
    catalog.source.games[0].snapshot.facts.players[0].person.name,
  );
  await search.press("Enter");
  await expect(page).toHaveURL(/\/publico.html#\?q=/u);
  await expect(
    page.locator('.public-search-entity-list a[href^="/atleta.html"]').first(),
  ).toBeVisible();
});

for (const width of [1366, 1920])
  test(`tabelas reais mantêm colunas à esquerda e fonte legível em ${width}px`, async ({
    page,
  }, info) => {
    const f = await statisticsBrowserFixture(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(f.url + "&preset=custom&columns=games,points,twoMade");
    const table = page.getByRole("table", {
      name: "Estatísticas dos atletas",
      exact: true,
    });
    await expect(table.locator("tbody tr")).toHaveCount(30);
    const geometry = await table.evaluate((el) => {
      const region = el.closest(".statistics-table-wrap")!;
      const player = el.querySelector("tbody .reference-player")!;
      const cells = [
        ...el.querySelectorAll("tbody tr:first-child td[data-public-metric]"),
      ];
      return {
        spare: region.clientWidth - el.getBoundingClientRect().width,
        center: Math.abs(
          (region.getBoundingClientRect().left +
            region.getBoundingClientRect().right) /
            2 -
            (el.closest(".statistics")!.getBoundingClientRect().left +
              el.closest(".statistics")!.getBoundingClientRect().right) /
              2,
        ),
        player: player.getBoundingClientRect().width,
        fonts: cells.map((c) => parseFloat(getComputedStyle(c).fontSize)),
        align: cells.map((c) => getComputedStyle(c).textAlign),
      };
    });
    expect(Math.abs(geometry.spare)).toBeLessThanOrEqual(2);
    expect(geometry.center).toBeLessThanOrEqual(1);
    expect(geometry.player).toBeLessThanOrEqual(360);
    expect(geometry.fonts.every((n) => n >= 14)).toBe(true);
    expect(geometry.align.every((a) => a === "right")).toBe(true);
    await page.screenshot({
      path: `.preview-artifacts/public-compact-players-${width}-${info.project.name}.png`,
      fullPage: true,
    });
    const teams = await teamPublicFixture(page);
    await page.goto(teams.listUrl + "?preset=custom&columns=games,points");
    const teamTable = page.getByRole("table", {
      name: "Estatísticas das equipes",
      exact: true,
    });
    await expect(teamTable.locator("tbody tr")).toHaveCount(2);
    expect(
      await teamTable
        .locator('th[data-team-metric="name"] button')
        .evaluate((el) => getComputedStyle(el).justifyContent),
    ).toBe("flex-start");
    expect(
      await teamTable
        .locator("tbody .rank")
        .first()
        .evaluate((el) => getComputedStyle(el).textAlign),
    ).toBe("right");
    expect(
      await teamTable.evaluate(
        (el) =>
          el.closest(".statistics-table-wrap")!.getBoundingClientRect().right -
          el.getBoundingClientRect().right,
      ),
    ).toBeLessThanOrEqual(2);
    await expect(
      page.getByText(/Fonte do nome|Fonte confirmada v|Resultado v/u),
    ).toHaveCount(0);
    await page.screenshot({
      path: `.preview-artifacts/public-compact-teams-${width}-${info.project.name}.png`,
      fullPage: true,
    });
  });

test("agenda pública lista todos os jogos e filtra sem fabricar placares", async ({
  page,
}, info) => {
  await publicNavigationFixture(page);
  const source = publicRegulationFixture(),
    seed = source.games[0];
  source.publishedGames = [];
  source.games = Array.from({ length: 25 }, (_, i) => ({
    ...structuredClone(seed),
    id: pubId(870000 + i),
    date: `2026-10-${String(i + 1).padStart(2, "0")}`,
    time: null,
    venue: null,
  }));
  source.definition.groupPhases[0].groups[0].gameIds = source.games.map(
    (g) => g.id,
  );
  await page.route("**/api/public/standings/**", (route) =>
    route.fulfill({ json: buildPublicStandings(source) }),
  );
  await page.goto(
    `http://127.0.0.1:5174/publico.html#${source.disputeId}?secao=jogos&paginaJogos=2`,
  );
  const list = page.getByRole("list", { name: "Jogos por data", exact: true });
  await expect(list.getByRole("listitem")).toHaveCount(25);
  await expect(list.getByRole("link")).toHaveCount(0);
  await expect(list.getByLabel("Sem placar publicado")).toHaveCount(25);
  await expect(
    page.getByRole("button", { name: "Próximos jogos", exact: true }),
  ).toHaveCount(0);
  await expect(page).not.toHaveURL(/paginaJogos=/);
  const search = page.getByRole("searchbox", {
    name: "Buscar jogo",
    exact: true,
  });
  await search.fill("Sem correspondência");
  await expect(
    page.getByText("Nenhum jogo encontrado.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpar busca", exact: true }).click();
  await expect(search).toBeFocused();
  await expect(list.getByRole("listitem")).toHaveCount(25);
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.screenshot({
    path: `.preview-artifacts/public-schedule-after-${info.project.name}.png`,
    fullPage: true,
  });
});

test("retorno do perfil preserva página e rolagem interna da tabela", async ({
  page,
}) => {
  await publicNavigationFixture(page);
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url);
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  await expect(table.locator("tbody tr")).toHaveCount(30);
  const region = page.getByRole("region", {
    name: "Tabela estatística rolável",
    exact: true,
  });
  await region.evaluate((el) => {
    el.scrollLeft = 150;
    el.scrollTop = 100;
  });
  const link = table.locator('a[href^="/atleta.html"]').last();
  await link.scrollIntoViewIfNeeded();
  const before = await region.evaluate((el) => ({
    top: el.scrollTop,
    left: el.scrollLeft,
    page: window.scrollY,
  }));
  await link.click();
  await expect(
    page.getByRole("table", {
      name: "Resumo de temporada e carreira",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Voltar à origem", exact: true })
    .click();
  await expect(table.locator("tbody tr")).toHaveCount(30);
  await expect
    .poll(() =>
      region.evaluate((el) => ({
        top: el.scrollTop,
        left: el.scrollLeft,
        page: window.scrollY,
      })),
    )
    .toEqual(before);
});

test("perfil retorna à última página de30 preservando a consulta", async ({
  page,
}) => {
  await publicNavigationFixture(page);
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url + "&page=2&sort=player&dir=asc");
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  await expect(table.locator("tbody tr")).toHaveCount(3);
  const origin = page.url();
  await table.locator('a[href^="/atleta.html"]').last().click();
  await expect(
    page.getByRole("table", {
      name: "Resumo de temporada e carreira",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Voltar à origem", exact: true })
    .click();
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await expect(page).toHaveURL(origin);
});
