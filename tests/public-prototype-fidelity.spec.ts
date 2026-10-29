import { expect, test } from "@playwright/test";
import { statisticsBrowserFixture } from "./fixtures/statistics-browser";
import { publishedSheet } from "./fixtures/published-game";
import { publicationSheet } from "./fixtures/publication";

for (const kind of ["estatisticas", "sumula"] as const) {
  test(`${kind}: componentes reais conservam a apresentação aprovada`, async ({
    page,
  }, info) => {
    await page.setViewportSize(
      info.project.name === "desktop"
        ? { width: 1440, height: 900 }
        : { width: 390, height: 844 },
    );
    const reference =
      kind === "estatisticas"
        ? "/docs/design/prototipos/estatisticas/Estatisticas%20de%20atletas.html"
        : "/docs/design/prototipos/sumula/Sumula%20do%20jogo%20publicado.html";
    const selectors =
      kind === "estatisticas"
        ? [
            ".header-inner.wrap",
            ".brand",
            ".filters",
            "#team-filter-toggle",
            "#column-picker-toggle",
            ".reference-explorer .statistics-table .reference-player",
          ]
        : [
            ".header-inner.wrap",
            ".brand",
            ".game-context",
            ".period-table",
            ".roster-table .athlete-cell",
          ];
    const read = () =>
      page.evaluate(
        (items) =>
          items.map((selector) => {
            const node = document.querySelector(selector);
            if (!node) return { selector, missing: true };
            const s = getComputedStyle(node);
            return {
              selector,
              font: s.fontFamily,
              size: s.fontSize,
              color: s.color,
              background: s.backgroundColor,
              width:
                selector === ".header-inner.wrap"
                  ? node.getBoundingClientRect().width
                  : undefined,
            };
          }),
        selectors,
      );
    await page.goto("http://127.0.0.1:5174" + reference);
    await page
      .locator(kind === "estatisticas" ? ".reference-player" : ".roster-table")
      .first()
      .waitFor();
    const expected = await read();
    if (kind === "estatisticas") {
      const f = await statisticsBrowserFixture(page);
      await page.goto(f.url);
      await page
        .getByRole("table", { name: "Estatísticas dos atletas", exact: true })
        .waitFor();
    } else {
      const result = publishedSheet(publicationSheet());
      await page.route(`**/api/public/games/${result.id}`, (route) =>
        route.fulfill({ json: result }),
      );
      await page.goto(`http://127.0.0.1:5174/resultado.html#${result.id}`);
      await page
        .getByRole("table", { name: "Participações e estatísticas publicadas" })
        .first()
        .waitFor();
    }
    expect(await read()).toEqual(expected);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.preview-artifacts/fidelidade-${kind}-${info.project.name}.png`,
      fullPage: false,
    });
  });
}

test("seletores aprovados preservam escolhas, teclado e consulta real", async ({
  page,
}, info) => {
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url);
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  await expect(table.locator("tbody tr")).toHaveCount(20);
  const teams = page.getByRole("button", {
    name: "Equipe Todas as equipes",
    exact: true,
  });
  await teams.click();
  await page
    .getByRole("button", { name: "Não selecionar nenhuma equipe", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Nenhum atleta encontrado",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Selecionar todas as equipes", exact: true })
    .click();
  await expect(table.locator("tbody tr")).toHaveCount(20);
  await page.keyboard.press("Escape");
  await expect(teams).toBeFocused();
  const picker = page.getByRole("button", { name: /^Colunas ·/u });
  await picker.click();
  await page.getByRole("button", { name: "Nenhuma", exact: true }).click();
  await expect(table.getByRole("columnheader")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(picker).toBeFocused();
  const rank = await table.locator("tbody td").first().innerText();
  await page.setViewportSize(
    info.project.name === "desktop"
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 },
  );
  await page.reload();
  await expect(table.getByRole("columnheader")).toHaveCount(2);
  await expect(table.locator("tbody td").first()).toHaveText(rank);
  await picker.click();
  await page.getByRole("button", { name: "Todas", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(table.getByRole("columnheader")).toHaveCount(15);
  const search = page.getByRole("searchbox", {
    name: "Buscar atleta ou equipe",
    exact: true,
  });
  await search.fill("joao");
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await expect(search).toBeFocused();
  await page.getByRole("button", { name: "Por jogo", exact: true }).click();
  await expect.poll(() => f.state.queries.at(-1)?.get("mode")).toBe("per-game");
  const sort = page.getByRole("button", {
    name: "Ordenar por 3P (Cestas de três oficiais)",
    exact: true,
  });
  await sort.focus();
  await page.keyboard.press("Enter");
  await expect(
    table.locator('th[data-public-metric="threeMade"]'),
  ).toHaveAttribute("aria-sort", "descending");
  await expect(sort).toBeFocused();
  await expect(page.getByRole("tooltip")).toContainText(
    "Cestas de três oficiais",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();
});

test("colunas padrão acompanham largura até uma escolha manual", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(f.url);
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  await expect(table.getByRole("columnheader")).toHaveCount(15);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(table.getByRole("columnheader")).toHaveCount(11);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(table.getByRole("columnheader")).toHaveCount(15);
});
