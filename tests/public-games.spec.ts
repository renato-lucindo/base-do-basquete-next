import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { publicNavigationFixture } from "./fixtures/public-navigation";
import { publicGamesFixture } from "./fixtures/public-games";
import { buildPublicStandings } from "../src/regulation/public";
import { regulationId as id } from "./fixtures/regulation";

for (const width of [320, 390, 683, 960, 1366, 1920]) {
  test(`lista de jogos centralizada em ${width}px, com fase e W.O. em texto`, async ({
    page,
  }, info) => {
    await publicNavigationFixture(page);
    const source = publicGamesFixture();
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
    await expect(list.getByRole("link")).toHaveCount(0);
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
