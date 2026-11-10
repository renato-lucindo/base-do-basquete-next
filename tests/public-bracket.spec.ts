import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { publicNavigationFixture } from "./fixtures/public-navigation";
import {
  publicKnockoutFixture,
  publicQuarterfinalsFixture,
} from "./fixtures/public-regulation";
import { regulationId as id } from "./fixtures/regulation";
import { buildPublicStandings } from "../src/regulation/public";

const origin = "http://127.0.0.1:5174";
test("approved quarterfinal bracket, MD3 in every round and no preliminary stage", async ({
  page,
}, info) => {
  await publicNavigationFixture(page);
  const source = publicQuarterfinalsFixture();
  await page.route("**/api/public/standings/**", (r) =>
    r.fulfill({ json: buildPublicStandings(source) }),
  );
  await page.goto(
    `${origin}/publico.html#${source.disputeId}?secao=classificacao`,
  );
  const board = page.getByRole("region", {
    name: "Confrontos da eliminatória",
  });
  await expect(board.locator("article")).toHaveCount(7);
  await expect(board.locator("svg path")).toHaveCount(6);
  await expect(board.getByRole("heading", { level: 2 })).toHaveText([
    "Quartas de final",
    "Semifinais",
    "Final",
  ]);
  await expect(
    page.getByRole("link", { name: "Classificatória", exact: true }),
  ).toHaveCount(0);
  await expect(board.locator("tbody td")).toHaveCount(42);
  const finale = board.getByRole("article", { name: "Final", exact: true });
  await expect(finale.locator("tbody th")).toContainText([
    "Aurora",
    "A definir",
  ]);
  await expect(finale.locator("tbody td")).toHaveText([
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
  ]);
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [390, 844],
    [320, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `.preview-artifacts/bracket-quarterfinals-${width}-${info.project.name}.png`,
      fullPage: true,
    });
  }
  const headers = board.getByRole("columnheader", {
    name: "Jogo 1",
    exact: true,
  });
  await expect(headers).toHaveCount(7);
  await expect(headers.first().getByRole("button")).toHaveCount(0);
  await expect(board.locator(".knockout-state")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("two legs show per-game points, official total and concrete conflict without assigning an old score", async ({
  page,
}) => {
  await publicNavigationFixture(page);
  const source = publicKnockoutFixture(),
    semi = source.definition.series[0];
  semi.format = "two_leg";
  const game = source.games.find((g) => g.id === semi.games[0].gameId)!,
    fact = source.publishedGames.find((g) => g.gameId === game.id)!;
  fact.homePoints = 80;
  fact.awayPoints = 70;
  source.games.push({
    ...game,
    id: id(130),
    homeRegistrationId: game.awayRegistrationId,
    awayRegistrationId: game.homeRegistrationId,
  });
  source.publishedGames.push({
    ...fact,
    gameId: id(130),
    homeRegistrationId: game.awayRegistrationId,
    awayRegistrationId: game.homeRegistrationId,
    homePoints: 60,
    awayPoints: 75,
  });
  semi.games.push({ slot: 2, gameId: id(130) });
  await page.route("**/api/public/standings/**", (r) =>
    r.fulfill({ json: buildPublicStandings(source) }),
  );
  await page.goto(
    `${origin}/publico.html#${source.disputeId}?secao=classificacao&etapa=eliminatoria`,
  );
  const table = page.getByRole("table", {
    name: "Jogos da Semifinal A",
    exact: true,
  });
  await expect(table.locator("tbody tr").first().locator("td")).toHaveText([
    /80/,
    /75/,
    "155",
  ]);
  await expect(table.locator("tbody tr").nth(1).locator("td")).toHaveText([
    "70",
    "60",
    "130",
  ]);
  source.publishedGames[0].homePoints = 50;
  source.publishedGames[0].awayPoints = 90;
  source.publishedGames[0].publicationVersion++;
  await page.reload();
  await expect(
    page.getByRole("article", { name: "Semifinal A", exact: true }),
  ).toContainText("Confronto em revisão");
  await expect(table.locator("tbody td")).toHaveText([
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
  ]);
});

test("two stages, all knockout phases and internal game headers without clicking a match", async ({
  page,
}, info) => {
  await publicNavigationFixture(page);
  const source = publicKnockoutFixture(),
    semi = source.definition.series[0];
  semi.format = "best_of_3";
  const game = source.games.find((g) => g.id === semi.games[0].gameId)!;
  const fact = source.publishedGames.find((g) => g.gameId === game.id)!;
  fact.homePoints = 76;
  fact.awayPoints = 62;
  const second = {
    ...game,
    id: id(120),
    homeRegistrationId: game.awayRegistrationId,
    awayRegistrationId: game.homeRegistrationId,
  };
  source.games.push(second);
  source.publishedGames.push({
    ...fact,
    gameId: second.id,
    homeRegistrationId: second.homeRegistrationId,
    awayRegistrationId: second.awayRegistrationId,
    homePoints: 65,
    awayPoints: 71,
  });
  semi.games.push({ slot: 2, gameId: second.id });
  await page.route("**/api/public/standings/**", (r) =>
    r.fulfill({ json: buildPublicStandings(source) }),
  );
  await page.goto(
    `${origin}/publico.html#${source.disputeId}?secao=classificacao`,
  );
  const stages = page.getByRole("navigation", {
    name: "Etapas da classificação",
  });
  await expect(stages.getByRole("link")).toHaveText([
    "Classificatória",
    "Eliminatória",
  ]);
  await stages.getByRole("link", { name: "Eliminatória", exact: true }).click();
  const board = page.getByRole("region", {
    name: "Confrontos da eliminatória",
  });
  await expect(
    board.getByRole("heading", { name: "Semifinais", exact: true }),
  ).toBeVisible();
  await expect(
    board.getByRole("heading", { name: "Finais", exact: true }),
  ).toBeVisible();
  const table = board.getByRole("table", {
    name: "Jogos da Semifinal A",
    exact: true,
  });
  await expect(table.getByRole("columnheader")).toHaveText([
    "MD3",
    "Jogo 1",
    "Jogo 2",
    "Jogo 3",
  ]);
  await expect(table.locator("tbody tr").first().locator("td")).toHaveText([
    /76/,
    /71/,
    "—",
  ]);
  await expect(table.locator("tbody tr").nth(1).locator("td")).toHaveText([
    "62",
    "65",
    "—",
  ]);
  await expect(board.locator("article")).toHaveCount(4);
  await expect(board.locator("svg path")).toHaveCount(4);
  await expect(page).toHaveURL(/etapa=eliminatoria/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `.preview-artifacts/bracket-${info.project.name}.png`,
    fullPage: true,
  });
  await stages
    .getByRole("link", { name: "Classificatória", exact: true })
    .click();
  await expect(
    page.getByRole("table", {
      name: "Classificação por resultados confirmados",
    }),
  ).toBeVisible();
  await page.goBack();
  await expect(board).toBeVisible();
  await page.reload();
  await expect(board).toBeVisible();
});

test("knockout appears when opponents are defined before games or results, and legacy links still open it", async ({
  page,
}) => {
  await publicNavigationFixture(page);
  const source = publicKnockoutFixture();
  const knockoutIds = new Set(
    source.definition.series.flatMap((s) => s.games.map((g) => g.gameId)),
  );
  source.definition.series.forEach((s) => (s.games = []));
  source.games = source.games.filter((g) => !knockoutIds.has(g.id));
  source.publishedGames = source.publishedGames.filter(
    (g) => !knockoutIds.has(g.gameId),
  );
  let value = buildPublicStandings(source);
  await page.route("**/api/public/standings/**", (r) =>
    r.fulfill({ json: value }),
  );
  await page.goto(
    `${origin}/publico.html#${source.disputeId}?secao=classificacao&fase=${source.definition.knockoutPhases[1].id}`,
  );
  await expect(
    page.getByRole("region", { name: "Confrontos da eliminatória" }),
  ).toBeVisible();
  await expect(
    page.locator(".knockout-card").first().locator("tbody td"),
  ).toHaveText(["—", "—"]);
  source.publishedGames = [];
  value = buildPublicStandings(source);
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Eliminatória", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("table", {
      name: "Classificação por resultados confirmados",
    }),
  ).toBeVisible();
});

test("long names, seven-game series, zoom and horizontal navigation preserve the page width", async ({
  page,
}, info) => {
  await publicNavigationFixture(page);
  const source = publicKnockoutFixture();
  source.definition.series[0].format = "best_of_7";
  source.registrations[0].name = (
    "Associação Esportiva " + "NomeMuitoLongo".repeat(8)
  ).slice(0, 120);
  await page.route("**/api/public/standings/**", (r) =>
    r.fulfill({ json: buildPublicStandings(source) }),
  );
  await page.goto(
    `${origin}/publico.html#${source.disputeId}?secao=classificacao&etapa=eliminatoria`,
  );
  const board = page.getByRole("region", {
    name: "Confrontos da eliminatória",
  });
  await expect(
    board.getByRole("columnheader", { name: "Jogo 7", exact: true }),
  ).toBeVisible();
  for (const width of [1366, 1920, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.locator(".knockout-round").evaluateAll((rounds) =>
          rounds.every((round) => {
            const cards = [...round.querySelectorAll("article")];
            return cards.every(
              (c, i) =>
                !i ||
                c.getBoundingClientRect().top >=
                  cards[i - 1].getBoundingClientRect().bottom + 16,
            );
          }),
        ),
      )
      .toBe(true);
  }
  await page
    .getByRole("button", { name: "Rolar quadro para a direita" })
    .click();
  await expect
    .poll(() => board.evaluate((e) => e.scrollLeft))
    .toBeGreaterThan(0);
  await page.setViewportSize({ width: 720, height: 844 });
  await page.evaluate(() => (document.documentElement.style.zoom = "2"));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/bracket-long-${info.project.name}.png`,
    fullPage: true,
  });
});
