import { expect, test } from "@playwright/test";
import { publishedSheet } from "./fixtures/published-game";
import { publicationSheet, pubId } from "./fixtures/publication";
import { statisticsBrowserFixture } from "./fixtures/statistics-browser";

const viewport = (project: string) =>
  project === "desktop"
    ? { width: 1440, height: 900 }
    : { width: 390, height: 844 };

test("súmula real mantém atletas na primeira tela e detalhes acessíveis", async ({
  page,
}, info) => {
  await page.setViewportSize(viewport(info.project.name));
  const sheet = publicationSheet();
  sheet.events.push({
    id: pubId(501),
    side: "home",
    period: 1,
    target: "0",
    code: "P",
  });
  const publication = publishedSheet(sheet);
  publication.facts.players[0].person.name =
    "Atleta com nome e sobrenomes extraordinariamente longos para a tabela";
  await page.route(`**/api/public/games/${publication.id}`, (route) =>
    route.fulfill({ json: publication }),
  );
  await page.goto(`http://127.0.0.1:5174/resultado.html#${publication.id}`);
  const tables = page.getByRole("table", {
    name: "Participações e estatísticas publicadas",
  });
  await expect(tables).toHaveCount(2);
  const frame = await page.evaluate(() => {
    const table = document.querySelector(".public-athletes table")!;
    const rows = [...table.querySelectorAll("tbody tr")];
    const first = rows[0].getBoundingClientRect();
    return {
      firstY: first.y,
      visible: rows.filter(
        (row) => row.getBoundingClientRect().bottom <= innerHeight,
      ).length,
      total: rows.length,
      viewportOverflow: document.documentElement.scrollWidth > innerWidth,
      sticky: getComputedStyle(table.querySelector("tbody th")!).position,
      scrollable: table.scrollWidth > table.parentElement!.clientWidth,
    };
  });
  console.log(`SÚMULA ${info.project.name}: ${JSON.stringify(frame)}`);
  expect(frame.firstY).toBeLessThan(
    info.project.name === "desktop" ? 400 : 460,
  );
  expect(frame.visible).toBeGreaterThanOrEqual(Math.min(8, frame.total));
  expect(frame.viewportOverflow).toBe(false);
  expect(frame.sticky).toBe("sticky");
  await page.screenshot({
    path: `.preview-artifacts/resultado-real-${info.project.name}.png`,
    fullPage: false,
  });

  const detail = page
    .getByRole("button", { name: /faltas, detalhes de/ })
    .first();
  await detail.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: /Faltas/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fechar" })).toBeFocused();
  await page.screenshot({
    path: `.preview-artifacts/resultado-detalhe-${info.project.name}.png`,
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(detail).toBeFocused();
});

test("estatísticas reais mantêm linha e identidade fixa sem largura global", async ({
  page,
}, info) => {
  await page.setViewportSize(viewport(info.project.name));
  const f = await statisticsBrowserFixture(page);
  f.source.games[0].snapshot.facts.players[0].person.name =
    "Atleta com nome e sobrenomes extraordinariamente longos para a tabela";
  await page.goto(f.url);
  const table = page.getByRole("table", { name: "Estatísticas dos atletas" });
  await expect(table.locator("tbody tr").first()).toBeVisible();
  const frame = await table.evaluate((node) => {
    const rows = [...node.querySelectorAll("tbody tr")];
    const first = rows[0].getBoundingClientRect();
    const scroll = node.closest(".statistics-table-wrap")!;
    return {
      firstY: first.y,
      visible: rows.filter(
        (row) => row.getBoundingClientRect().bottom <= innerHeight,
      ).length,
      total: rows.length,
      viewportOverflow: document.documentElement.scrollWidth > innerWidth,
      sticky: getComputedStyle(node.querySelector("tbody .statistics-player")!)
        .position,
      scrollable: scroll.scrollWidth > scroll.clientWidth,
      blocks: Object.fromEntries(
        [
          ".access-header",
          ".statistics-page",
          ".statistics-page h1",
          ".statistics-page nav",
          ".statistics-quickbar",
          ".statistics-advanced",
          ".statistics-result-heading",
          ".statistics-result-heading + p",
          ".statistics-explanation",
          ".statistics-scroll",
        ].map((selector) => {
          const element = document.querySelector(selector);
          const rect = element?.getBoundingClientRect();
          return [
            selector,
            rect
              ? { top: Math.round(rect.top), height: Math.round(rect.height) }
              : null,
          ];
        }),
      ),
    };
  });
  console.log(`ESTATÍSTICAS ${info.project.name}: ${JSON.stringify(frame)}`);
  await page.screenshot({
    path: `.preview-artifacts/estatisticas-real-${info.project.name}.png`,
    fullPage: false,
  });
  expect(frame.firstY).toBeLessThan(
    info.project.name === "desktop" ? 390 : 540,
  );
  expect(frame.visible).toBeGreaterThanOrEqual(8);
  expect(frame.viewportOverflow).toBe(false);
  expect(frame.sticky).toBe("sticky");
  if (info.project.name === "mobile") {
    expect(frame.scrollable).toBe(true);
    const scrolled = await table.evaluate((node) => {
      const region = node.closest(".statistics-table-wrap")!;
      const rank = node.querySelector("tbody .statistics-position")!;
      const player = node.querySelector("tbody .statistics-player")!;
      const rankWidth = rank.getBoundingClientRect().width;
      const stickyLeft = parseFloat(getComputedStyle(player).left);
      const before = node
        .querySelector("tbody .statistics-player")!
        .getBoundingClientRect().left;
      region.scrollLeft = 200;
      const pinned = node
        .querySelector("tbody .statistics-player")!
        .getBoundingClientRect().left;
      region.scrollLeft = 300;
      const pinnedAgain = node
        .querySelector("tbody .statistics-player")!
        .getBoundingClientRect().left;
      return {
        pinnedOffset: Math.abs(pinnedAgain - pinned),
        scroll: region.scrollLeft,
        rankWidth,
        stickyLeft,
        playerOffset: Math.abs(
          node
            .querySelector("tbody .statistics-player")!
            .getBoundingClientRect().left - before,
        ),
      };
    });
    expect(scrolled.scroll).toBeGreaterThan(0);
    expect(scrolled.stickyLeft).toBe(0);
    expect(scrolled.pinnedOffset).toBeLessThan(1);
    expect(scrolled.playerOffset).toBeLessThanOrEqual(scrolled.rankWidth + 1);
  }
});
