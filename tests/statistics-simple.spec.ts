import { test, expect } from "@playwright/test";
import { mixedStatisticsFixture } from "./fixtures/statistics-mixed";
import {
  buildStatisticsPage,
  parseStatisticsQuery,
} from "../src/statistics/query";

test.beforeEach(({}, info) => {
  test.skip(
    info.project.name.includes("mobile"),
    "Desktop MVP; mobile deferred by owner",
  );
});
async function fixture(page: import("@playwright/test").Page) {
  const source = await mixedStatisticsFixture();
  await page.route("**/api/public/statistics/*", async (route) => {
    await route.fulfill({
      json: buildStatisticsPage(
        source,
        parseStatisticsQuery(new URL(route.request().url()).searchParams),
      ),
    });
  });
  return {
    source,
    url: `http://127.0.0.1:5174/estatisticas.html#${source.disputeId}?view=simple&scope=all`,
  };
}
test("súmula apresenta totais e PTS/J juntos, sem estatísticas que a fonte não fornece", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto(f.url);
  await expect(
    page.getByRole("heading", { name: "Estatísticas de súmula", exact: true }),
  ).toBeVisible();
  const table = page.getByRole("table", {
    name: "Dados simples dos jogos publicados",
  });
  await expect(table.getByRole("columnheader")).toHaveText([
    "Pos.",
    "Atleta",
    "Equipe",
    "J",
    "PTS",
    "PTS/J",
    "2PC",
    "3PC",
    "LLC",
    "F",
    "GD",
  ]);
  await expect(page.getByLabel("Modo", { exact: true })).toHaveCount(0);
  await expect(
    table.getByRole("columnheader", { name: "MIN", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Buscar atleta ou equipe").fill("Atleta de comparação");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  const row = table.getByRole("row").filter({
    has: page.getByRole("link", {
      name: "Atleta de comparação",
      exact: true,
    }),
  });
  const total = f.source.games.reduce(
    (sum, g) => sum + g.snapshot.facts.players[0].points,
    0,
  );
  await expect(row.getByRole("cell").nth(2)).toHaveText("2");
  await expect(row.getByRole("cell").nth(3)).toHaveText(String(total));
  await expect(row.getByRole("cell").nth(4)).toHaveText(
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
      total / 2,
    ),
  );
  await page.screenshot({
    path: ".preview-artifacts/statistics-simple-desktop.png",
    fullPage: true,
  });
});
test("súmula compartilha pesquisa e ordenação; boxscore restringe a amostra a PDFs", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto(f.url);
  await page.getByLabel("Buscar atleta ou equipe").fill("Atleta de comparação");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page
    .getByRole("button", { name: "Ordenar por PTS/J", exact: true })
    .click();
  await expect(page).toHaveURL(/view=simple/);
  await expect(page).toHaveURL(/sort=pointsPerGame/);
  await page.reload();
  await expect(page.getByLabel("Buscar atleta ou equipe")).toHaveValue(
    "Atleta de comparação",
  );
  await page
    .getByRole("link", { name: "Boxscore completo", exact: true })
    .click();
  await expect(page).toHaveURL(/dataset=boxscore/);
  await expect(
    page.getByRole("heading", {
      name: "Estatísticas dos atletas",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "participações contextuais",
  );
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  await expect(
    table
      .getByRole("row")
      .filter({
        has: page.getByRole("link", {
          name: "Atleta de comparação",
          exact: true,
        }),
      })
      .getByRole("cell")
      .nth(3),
  ).toHaveText("1");
});

test("resultado de súmula mostra faltas e disciplina sem transformar DNP em zero", async ({
  page,
}) => {
  const { confirmedManualFixture } =
    await import("./fixtures/statistics-publications");
  const game = confirmedManualFixture(true);
  const reserve = game.facts.players.find((p) => !p.played)!;
  reserve.person.name = "Reserva sem participação";
  await page.route("**/api/public/games/*", (route) =>
    route.fulfill({ json: game }),
  );
  await page.goto(`http://127.0.0.1:5174/resultado.html#${game.id}`);
  const table = page.getByRole("table").filter({
    has: page.getByRole("link", {
      name: "Reserva sem participação",
      exact: true,
    }),
  });
  await expect(
    table.getByRole("columnheader", { name: "F", exact: true }),
  ).toBeVisible();
  await expect(
    table.getByRole("columnheader", { name: "GD", exact: true }),
  ).toBeVisible();
  const row = table.getByRole("row").filter({
    has: page.getByRole("link", {
      name: "Reserva sem participação",
      exact: true,
    }),
  });
  await expect(row.getByRole("cell").nth(2)).toHaveText("—");
  await expect(
    table.getByRole("columnheader", { name: "MIN", exact: true }),
  ).toHaveCount(0);
});

test("súmula pagina e filtra equipes sem perder o estado da URL", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto(f.url);
  const table = page.getByRole("table", {
    name: "Dados simples dos jogos publicados",
  });
  await expect(table.locator("tbody tr")).toHaveCount(20);
  await page
    .getByRole("button", { name: "Próxima página", exact: true })
    .click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    table.locator("tbody tr").first().getByRole("cell").first(),
  ).toHaveText("21");
  await page.reload();
  await expect(page).toHaveURL(/page=2/);
  await page
    .getByRole("combobox", { name: "Equipe", exact: true })
    .selectOption(f.source.games[0].snapshot.game.home.team.id);
  await expect(page).toHaveURL(/page=1/);
  await expect(
    table.locator("tbody").getByRole("link", { name: "Lobos B", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Buscar atleta ou equipe")
    .fill("Sem atleta nesta busca");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByText("Nenhuma participação atende à consulta.", { exact: true }),
  ).toBeVisible();
});
test("falha simples permite nova consulta sem oferecer tabela de zeros", async ({
  page,
}) => {
  const f = await fixture(page);
  let fail = true;
  await page.unroute("**/api/public/statistics/*");
  await page.route("**/api/public/statistics/*", async (route) => {
    if (fail)
      return route.fulfill({
        status: 503,
        json: { error: { message: "Falha de teste" } },
      });
    return route.fulfill({
      json: buildStatisticsPage(
        f.source,
        parseStatisticsQuery(new URL(route.request().url()).searchParams),
      ),
    });
  });
  await page.goto(f.url);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  fail = false;
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Dados simples dos jogos publicados" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Jogadores", exact: true }),
  ).toBeFocused();
});
