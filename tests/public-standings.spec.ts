import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  publicSearchFixture,
  searchFixtureHits,
} from "./fixtures/public-search";
import { publicNavigationFixture } from "./fixtures/public-navigation";
import {
  publicRegulationFixture,
  publicKnockoutFixture,
} from "./fixtures/public-regulation";
import { buildPublicStandings } from "../src/regulation/public";

const origin = "http://127.0.0.1:5174";
test("aproveitamento de vitórias não se confunde com pontuação do campeonato", async ({
  page,
}, info) => {
  await publicNavigationFixture(page);
  const s = publicRegulationFixture();
  s.definition.groupPhases[0].rules.points = { win: 5, loss: 2 };
  const standings = buildPublicStandings(s);
  expect(
    standings.projection.groupPhases[0].groups[0].standings.rows.find(
      (r) => r.wins === 1,
    )?.leaguePoints,
  ).toBe(5);
  await page.route("**/api/public/standings/**", (route) =>
    route.fulfill({ json: standings }),
  );
  await page.goto(`${origin}/publico.html#${s.disputeId}?secao=classificacao`);
  const table = page.getByRole("table", {
    name: "Classificação por resultados confirmados",
  });
  const winner = table.locator("tbody tr").filter({ hasText: "Lobos" });
  await expect(winner.getByRole("cell").nth(4)).toHaveText("100%");
  await expect(table.getByRole("columnheader")).toHaveText([
    "Pos.",
    "Equipe",
    "J",
    "V",
    "D",
    "Aprov.",
    "PP",
    "PC",
    "SLD",
  ]);
  await page.screenshot({
    path: `.preview-artifacts/standings-columns-after-${info.project.name}.png`,
    fullPage: true,
  });
});
test("disputa confirmada sem resultados aparece no catálogo, tabela J=0, agenda e equipes", async ({
  page,
}, info) => {
  const f = await publicNavigationFixture(page),
    s = publicRegulationFixture();
  s.publishedGames = [];
  await page.route("**/api/public/catalog?*", (route) => {
    const id = new URL(route.request().url()).searchParams.get("disputeId");
    return route.fulfill({
      json: {
        games: f.games.filter((g) => !id || g.disputeId === id),
        next: null,
        disputes:
          !id || id === s.disputeId
            ? [
                {
                  disputeId: s.disputeId,
                  context: s.context,
                  registrations: s.registrations,
                },
              ]
            : [],
      },
    });
  });
  await page.route("**/api/public/standings/**", (route) =>
    route.fulfill({ json: buildPublicStandings(s) }),
  );
  await page.route(`**/api/public/teams/${s.disputeId}?*`, (route) =>
    route.fulfill({
      status: 404,
      json: { error: { message: "Sem estatísticas publicadas." } },
    }),
  );
  await publicSearchFixture(page, () =>
    searchFixtureHits(
      f.games,
      [
        {
          disputeId: s.disputeId,
          context: s.context,
          registrations: s.registrations,
        },
      ],
      [],
    ),
  );
  await page.goto(origin + "/publico.html");
  await page
    .getByRole("combobox", { name: /Buscar competições/ })
    .fill(s.context.name);
  await page
    .getByRole("button", { name: "Buscar na base", exact: true })
    .click();
  await page
    .locator(
      `.public-search-entity a[href="/publico.html#${s.disputeId}?secao=classificacao"]`,
    )
    .click();
  await expect(
    page.getByText(/Sem resultados aplicados. Equipes confirmadas/),
  ).toBeVisible();
  const table = page.getByRole("table", {
    name: "Classificação por resultados confirmados",
  });
  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(table.getByRole("columnheader")).toHaveText([
    "Pos.",
    "Equipe",
    "J",
    "V",
    "D",
    "Aprov.",
    "PP",
    "PC",
    "SLD",
  ]);
  await expect(
    table.getByRole("row").nth(1).getByRole("cell").nth(4),
  ).toHaveText("—");
  await expect(table.getByRole("link")).toHaveCount(0);
  for (const r of s.registrations)
    await expect(
      table
        .getByRole("row")
        .filter({ hasText: r.name })
        .getByRole("cell")
        .first(),
    ).toHaveText("—");
  await expect(
    table.getByRole("row").nth(1).getByRole("cell").nth(1),
  ).toHaveText("0");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `.preview-artifacts/public-standings-zero-after-${info.project.name}.png`,
    fullPage: true,
  });
  const nav = page.getByRole("navigation", { name: "Seções da disputa" });
  await nav.getByRole("link", { name: "Jogos", exact: true }).click();
  await expect(
    page.getByText("Aguardando resultado", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Horário a definir", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".public-games a")).toHaveCount(0);
  await page.screenshot({
    path: `.preview-artifacts/public-standings-agenda-after-${info.project.name}.png`,
    fullPage: true,
  });
  await nav.getByRole("link", { name: "Equipes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Participantes confirmados" }),
  ).toBeVisible();
  await expect(
    page.getByText("Nenhum resultado estatístico publicado nesta disputa."),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("correção publicada altera a tabela e fases mantêm confrontos em revisão", async ({
  page,
}, info) => {
  await publicNavigationFixture(page);
  const s = publicKnockoutFixture();
  await page.route("**/api/public/standings/**", (route) =>
    route.fulfill({ json: buildPublicStandings(s) }),
  );
  await page.goto(`${origin}/publico.html#${s.disputeId}?secao=classificacao`);
  await expect(
    page.getByRole("heading", { name: "Grupo único" }),
  ).toBeVisible();
  s.publishedGames[0].homePoints = 95;
  s.publishedGames[0].publicationVersion++;
  await page.reload();
  await expect(
    page
      .getByRole("table")
      .first()
      .getByRole("row")
      .filter({ hasText: "Lobos" })
      .getByRole("cell")
      .nth(5),
  ).toHaveText("95");
  await page.getByRole("link", { name: "Finais", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Final", exact: true }),
  ).toBeVisible();
  const semi = s.publishedGames.find((g) => g.gameId.endsWith("000000000103"))!;
  semi.publicationVersion++;
  semi.homePoints = 50;
  semi.awayPoints = 60;
  await page.reload();
  await page.getByRole("link", { name: "Finais", exact: true }).click();
  await expect(
    page
      .getByText("Confronto em revisão após alteração dos resultados.")
      .first(),
  ).toBeVisible();
  await page.screenshot({
    path: `.preview-artifacts/public-standings-phases-after-${info.project.name}.png`,
    fullPage: true,
  });
});

test("falha do leitor permite repetir consulta; nomes longos não transbordam em 320 px", async ({
  page,
}) => {
  await publicNavigationFixture(page);
  const s = publicRegulationFixture();
  let failed = true;
  s.registrations[0].name = "Equipe " + "NomeMuitoLongo".repeat(5);
  await page.route("**/api/public/standings/**", (route) =>
    failed
      ? route.fulfill({
          status: 503,
          json: { error: { message: "Indisponível" } },
        })
      : route.fulfill({ json: buildPublicStandings(s) }),
  );
  await page.goto(`${origin}/publico.html#${s.disputeId}?secao=classificacao`);
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível carregar a classificação",
  );
  failed = false;
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 720, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
