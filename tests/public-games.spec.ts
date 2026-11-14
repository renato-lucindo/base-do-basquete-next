import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { publicNavigationFixture } from "./fixtures/public-navigation";
import { publicGamesFixture } from "./fixtures/public-games";
import { buildPublicStandings } from "../src/regulation/public";
import { regulationId as id } from "./fixtures/regulation";
import { publicRegulationFixture } from "./fixtures/public-regulation";
import type { PublicStandingsSource } from "../src/regulation/public-contract";

test("agenda real abre placar e perfis, sem inventar detalhe para jogo futuro", async ({
  page,
}) => {
  const f = await publicNavigationFixture(page);
  const snapshot = f.source.games[0].snapshot;
  const source: PublicStandingsSource = publicRegulationFixture();
  source.disputeId = snapshot.disputeId;
  source.context = snapshot.context;
  source.definition.registrationIds = [
    snapshot.game.home.registrationId,
    snapshot.game.away.registrationId,
  ];
  source.definition.groupPhases = [];
  source.registrations = [snapshot.game.home, snapshot.game.away].map(
    ({ registrationId, ...team }) => ({ ...team, id: registrationId }),
  );
  const game = {
    ...source.games[0],
    id: snapshot.id,
    disputeId: snapshot.disputeId,
    homeRegistrationId: snapshot.game.home.registrationId,
    awayRegistrationId: snapshot.game.away.registrationId,
  };
  source.games = [game, { ...game, id: id(999), date: "2027-01-01" }];
  source.publishedGames = [
    {
      ...source.publishedGames[0],
      gameId: game.id,
      disputeId: game.disputeId,
      homeRegistrationId: game.homeRegistrationId,
      awayRegistrationId: game.awayRegistrationId,
      homePoints: snapshot.facts.teams.home.points,
      awayPoints: snapshot.facts.teams.away.points,
    },
  ];
  const value = buildPublicStandings({
    ...source,
    organizationPendingGameIds: source.games.map((g) => g.id),
  });
  await page.route("**/api/public/standings/**", (route) =>
    route.fulfill({ json: value }),
  );
  await page.goto(
    `http://127.0.0.1:5174/publico.html#${source.disputeId}?secao=jogos`,
  );
  const search = page.getByRole("searchbox", { name: "Buscar jogo" });
  await search.fill("Lobos");
  const from = page.url();
  const future = page.locator(`[data-game-id="${id(999)}"]`);
  await expect(future.locator(".public-game-score a")).toHaveCount(0);
  await expect(future.getByLabel("Sem placar publicado")).toBeVisible();
  await expect(future.locator(".public-game-home a")).toHaveCount(1);
  const row = page.locator(`[data-game-id="${game.id}"]`);
  const score = row.getByRole("link", { name: /^Ver jogo:/ });
  await expect(row.locator(".public-game-score")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await score.focus();
  expect(await score.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    "solid",
  );
  await page.keyboard.press("Enter");
  await expect(
    page
      .getByRole("table", { name: "Participações e estatísticas publicadas" })
      .first(),
  ).toBeVisible();
  await page.getByRole("link", { name: /^Voltar à origem/ }).click();
  expect(page.url()).toBe(from);
  for (const side of ["home", "away"]) {
    await row.locator(`.public-game-${side} a`).click();
    await expect(
      page.getByRole("navigation", { name: "Seções da equipe" }),
    ).toBeVisible();
    await page.getByRole("link", { name: /^Voltar à origem/ }).click();
    expect(page.url()).toBe(from);
    await expect(search).toHaveValue("Lobos");
  }
});

for (const width of [320, 390, 683, 960, 1366, 1920]) {
  test(`lista de jogos centralizada em ${width}px, com fase e W.O. em texto`, async ({
    page,
  }, info) => {
    const f = await publicNavigationFixture(page);
    const source = publicGamesFixture();
    const game = source.games[0];
    const team = (registrationId: string) => {
      const r = source.registrations.find((r) => r.id === registrationId)!;
      return { registrationId, name: r.name, team: r.team };
    };
    await page.route("**/api/public/catalog?*", (route) =>
      route.fulfill({
        json: {
          games: [
            {
              ...f.games[0],
              id: game.id,
              disputeId: source.disputeId,
              context: source.context,
              game: {
                ...f.games[0].game,
                home: team(game.homeRegistrationId),
                away: team(game.awayRegistrationId),
              },
              score: { home: 20, away: 0 },
            },
          ],
          next: null,
        },
      }),
    );
    await page.route("**/api/public/standings/**", (route) =>
      route.fulfill({ json: buildPublicStandings(source) }),
    );
    await page.setViewportSize({ width, height: width === 683 ? 384 : 844 });
    await page.goto(
      `http://127.0.0.1:5174/publico.html#${source.disputeId}?secao=jogos`,
    );
    const list = page.getByRole("list", {
      name: "Jogos por data",
      exact: true,
    });
    await expect(list.getByRole("listitem")).toHaveCount(41);
    await expect(list.locator(".public-game-score a")).toHaveCount(1);
    await expect(list.locator(".public-game-home a").first()).toBeVisible();
    await expect(list.locator(".public-game-away a").first()).toBeVisible();
    const wo = page.locator(`[data-game-id="${id(104)}"]`);
    await expect(wo.locator(".public-game-phase")).toHaveText(
      "Quartas de final - W.O.",
    );
    await expect(
      page.locator(`[data-game-id="${id(103)}"] .public-game-phase`),
    ).toHaveText("Quartas de final · Jogo 2 - W.O.");
    await expect(
      page.locator(`[data-game-id="${id(100)}"] .public-game-score`),
    ).toHaveText(/20.*0/);
    await expect(
      page.locator(`[data-game-id="${id(100)}"] .public-game-phase`),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        /Desconsiderado|Decisão administrativa|Em revisão|Aguardando resultado/,
      ),
    ).toHaveCount(0);
    const geometry = await list.evaluate((el) => {
      const rect = (node: Element) => node.getBoundingClientRect();
      const rows = [...el.querySelectorAll(".public-game-row")];
      return {
        overflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
        invalid: rows.filter((row) => {
          const meta = rect(row.querySelector(".public-game-meta")!),
            match = rect(row.querySelector(".public-game-matchup")!),
            score = rect(row.querySelector(".public-game-score")!),
            venue = rect(row.querySelector(".public-game-venue")!);
          const phase = row.querySelector(".public-game-phase");
          return (
            meta.bottom > match.top + 1 ||
            venue.top < match.bottom - 1 ||
            Math.abs(
              (score.left + score.right - match.left - match.right) / 2,
            ) > 1 ||
            (phase &&
              Math.abs(
                (rect(phase).left +
                  rect(phase).right -
                  score.left -
                  score.right) /
                  2,
              ) > 1) ||
            getComputedStyle(row).textAlign !== "center"
          );
        }).length,
      };
    });
    expect(geometry).toEqual({ overflow: false, invalid: 0 });
    const search = page.getByRole("searchbox", {
      name: "Buscar jogo",
      exact: true,
    });
    await search.fill("aguas");
    await expect(list.getByRole("listitem")).toHaveCount(2);
    await page.reload();
    await expect(search).toHaveValue("aguas");
    await search.press("Escape");
    await expect(list.getByRole("listitem")).toHaveCount(41);
    if (width === 390 || width === 1366) {
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
    }
    await wo.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `.preview-artifacts/games-${width}-${info.project.name}.png`,
    });
  });
}
