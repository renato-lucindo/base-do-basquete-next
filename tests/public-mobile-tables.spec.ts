import { confirmedManualFixture } from "./fixtures/statistics-publications";
import { publicationSheet, pubId } from "./fixtures/publication";
import { test, expect } from "@playwright/test";
import { statisticsPageSchema } from "../src/statistics/page-contract";
import { playerPublicFixture } from "./fixtures/player-public-browser";
import { teamProfileBrowserFixture } from "./fixtures/team-profile";
import {
  buildStatisticsPage,
  parseStatisticsQuery,
} from "../src/statistics/query";

for (const width of [320, 375, 390, 430, 639, 640, 768, 1366]) {
  test(`refinamento público: confrontos compactos e recordes em ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const f = await playerPublicFixture(page, { long: true });
    for (const [index, p] of f.source.participations.entries()) {
      p.game.date = `2026-10-${String(index + 1).padStart(2, "0")}`;
      p.game.home.name = "GS Nice de Paula";
      p.game.away.name = "IVV/Cetaf";
      p.game.home.team.abbreviation = "NICE";
      p.game.away.team.abbreviation = "IVV";
      p.fact.registration = structuredClone(p.game[p.fact.side]);
    }
    const scoreSheet = publicationSheet();
    scoreSheet.events = Array.from({ length: 67 }, (_, index) => ({
      id: pubId(30000 + index),
      side: index < 34 ? ("home" as const) : ("away" as const),
      period: 4,
      target: "0",
      code: "3",
    }));
    const publication = confirmedManualFixture(false, scoreSheet);
    await page.route("**/api/public/games/**", async (route) => {
      const id = new URL(route.request().url()).pathname.split("/").at(-1);
      const game = f.source.participations.find((p) => p.fact.gameId === id)!;
      await route.fulfill({
        json: {
          ...publication,
          id,
          disputeId: game.fact.disputeId,
          version: game.fact.publicationVersion,
          publishedAt: game.fact.publishedAt,
        },
      });
    });
    await page.goto(f.url);
    const recent = page.getByRole("table", {
      name: "Últimos jogos",
      exact: true,
    });
    await expect(recent.locator("tbody tr")).toHaveCount(5);
    await expect(recent.locator(".player-match-score").first()).toHaveText(
      "102 × 99",
    );
    const check = async () => {
      const table = page
        .getByRole("table")
        .filter({ has: page.locator(".player-matchup") })
        .last();
      if (width < 640) {
        await expect(table.locator(".profile-match-row").first()).toBeVisible();
        await expect(table.locator(".player-team-full").first()).toBeVisible();
        const geometry = await table
          .locator(".player-matchup")
          .first()
          .evaluate((el) => {
            const [home, score, away] = [...el.children].map((c) =>
              c.getBoundingClientRect(),
            );
            return {
              difference: Math.abs(home.width - away.width),
              scoreHeight: score.height,
              scoreLine: parseFloat(
                getComputedStyle(el.children[1]).lineHeight,
              ),
              teamWrap: getComputedStyle(el.children[0]).overflowWrap,
            };
          });
        expect(geometry.difference).toBeLessThan(1);
        expect(geometry.teamWrap).toBe("normal");
        expect(geometry.scoreHeight).toBeLessThanOrEqual(
          geometry.scoreLine + 1,
        );
      } else await expect(table.locator(".profile-match-row")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
    };
    await check();
    await page.screenshot({
      path: info.outputPath(`recentes-${width}.png`),
      fullPage: true,
    });
    await page.getByRole("tab", { name: "Ver jogos", exact: true }).click();
    await check();
    await page.screenshot({
      path: info.outputPath(`historico-${width}.png`),
      fullPage: true,
    });
    await page.getByRole("tab", { name: "Carreira", exact: true }).click();
    const records = page.getByRole("table", {
      name: "Recordes da carreira",
      exact: true,
    });
    const toggle = records.getByRole("button", {
      name: "Ver top 5 de PTS",
      exact: true,
    });
    await toggle.click();
    await expect(
      records.locator('[data-metric="points"] [data-game]'),
    ).toHaveCount(5);
    await check();
    if (width < 640)
      await expect(
        records.locator(
          '[data-metric="points"] .player-record-group-heading button',
        ),
      ).toBeVisible();
    await records
      .getByRole("button", { name: "Recolher top 5 de PTS", exact: true })
      .click();
    await expect(
      records.locator('[data-metric="points"] [data-game]'),
    ).toHaveCount(1);
    await page.screenshot({
      path: info.outputPath(`recordes-${width}.png`),
      fullPage: true,
    });
  });

  test(`refinamento público: camisa inline e cor pública em ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const f = await teamProfileBrowserFixture(page);
    let shortNames = false;
    await page.route("**/api/public/statistics/**", async (route) => {
      const data = buildStatisticsPage(
        f.source,
        parseStatisticsQuery(new URL(route.request().url()).searchParams),
      );
      data.rows = data.rows.map((row, i) => ({
        ...row,
        names: [
          shortNames
            ? "Bia"
            : i === 0
              ? "Ana Maria de Souza Oliveira"
              : i === 1
                ? "Bia"
                : "Carla",
        ],
        nicknames: [null],
        jerseys: i === 0 ? ["0"] : i === 1 ? [] : ["00"],
      }));
      await route.fulfill({ json: statisticsPageSchema.parse(data) });
    });
    await page.goto(f.url);
    await page.getByRole("tab", { name: "Jogadores", exact: true }).click();
    const table = page.getByRole("table", {
      name: "Estatísticas dos atletas",
      exact: true,
    });
    await expect(
      table.getByRole("columnheader", { name: "Camisa", exact: true }),
    ).toHaveCount(0);
    await expect(
      table.locator("tbody tr").first().locator(".player-jersey"),
    ).toHaveText("#0");
    await expect(
      table.locator("tbody tr").nth(1).locator(".player-jersey"),
    ).toHaveCount(0);
    await expect(table.locator("tbody tr").nth(2)).toContainText("#00");
    await expect(
      table.locator("tbody tr").first().locator(".player-team-mobile"),
    ).toHaveCount(0);
    await expect(page.locator(".public-header .brand-mark")).toHaveCSS(
      "background-color",
      "rgb(7, 95, 202)",
    );
    const back = page.locator(".public-return a");
    await expect(back).toHaveCSS("text-decoration-line", "none");
    await back.hover();
    await expect(back).toHaveCSS("text-decoration-line", "none");
    await page.keyboard.press("Tab");
    await back.focus();
    await expect(back).toHaveCSS("outline-style", "solid");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: info.outputPath(`atletas-${width}.png`),
      fullPage: true,
    });
    const longWidth = (await table
      .locator("thead .statistics-player")
      .boundingBox())!.width;
    const picker = page.locator("#column-picker-toggle");
    const selected = Number(
      (await picker.innerText()).match(/Colunas · (\d+)/)![1],
    );
    await expect(table.locator("thead th")).toHaveCount(selected + 2);
    await picker.click();
    await expect(page.locator(".column-options")).not.toContainText("Camisa");
    await page.getByRole("button", { name: "Nenhuma", exact: true }).click();
    await expect(picker).toContainText("Colunas · 0 de");
    await expect(table.locator("thead th")).toHaveCount(2);
    await page.getByRole("button", { name: "Todas", exact: true }).click();
    const all = Number((await picker.innerText()).match(/Colunas · (\d+)/)![1]);
    await expect(table.locator("thead th")).toHaveCount(all + 2);
    await page.keyboard.press("Escape");
    const region = table.locator("..");
    if (width < 640)
      expect(
        await region.evaluate((el) => el.scrollWidth > el.clientWidth),
      ).toBe(true);
    await page
      .getByRole("link", { name: "Ver perfil geral", exact: true })
      .click();
    await page.getByRole("tab", { name: "Elencos", exact: true }).click();
    await page
      .getByRole("navigation", {
        name: "Participações para consultar jogadores",
      })
      .getByRole("link")
      .first()
      .click();
    await expect(
      table.locator("tbody tr").first().locator(".player-jersey"),
    ).toHaveText("#0");
    await expect(
      table.getByRole("columnheader", { name: "Camisa", exact: true }),
    ).toHaveCount(0);
    shortNames = true;
    await page.reload();
    await expect(table.locator(".player-name").first()).toHaveText(/Bia/);
    expect(
      (await table.locator("thead .statistics-player").boundingBox())!.width,
    ).toBeLessThan(longWidth);
  });
}
