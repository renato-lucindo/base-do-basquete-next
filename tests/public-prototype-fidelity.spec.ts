import { expect, test } from "@playwright/test";
import { statisticsBrowserFixture } from "./fixtures/statistics-browser";
import { publishedSheet } from "./fixtures/published-game";
import { publicationSheet } from "./fixtures/publication";

for (const kind of ["estatisticas", "sumula"] as const) {
  test(`${kind}: apresentação real usa os tokens vigentes e legenda aberta`, async ({
    page,
  }, info) => {
    await page.setViewportSize(
      info.project.name === "desktop"
        ? { width: 1440, height: 900 }
        : { width: 390, height: 844 },
    );
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
    // Current design tokens and real components are the reference. Archived
    // visual fixtures must not lock a superseded font size or composition.
    const tokens = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return ["--bb-blue", "--bb-danger", "--bb-success"].map((key) =>
        style.getPropertyValue(key).trim().toLowerCase(),
      );
    });
    expect(tokens).toEqual(["#075fca", "#e52207", "#008817"]);
    const legend = page
      .locator(kind === "estatisticas" ? ".reference-legend" : ".legend")
      .first();
    await expect(legend).toBeVisible();
    await expect(legend.locator("dl")).toBeVisible();
    expect(await legend.evaluate((node) => node.tagName)).toBe("SECTION");
    await expect(legend.locator("summary")).toHaveCount(0);
    const position = await page.evaluate(
      (selector) => {
        const legend = document.querySelector(selector);
        const tables = [...document.querySelectorAll("table")];
        const lastTable = tables.at(-1);
        const tableRegion =
          lastTable?.closest(".scrollable-table") ?? lastTable;
        return {
          legendTop: legend?.getBoundingClientRect().top ?? -1,
          lastTableBottom: tableRegion?.getBoundingClientRect().bottom ?? 0,
          pageWidth: document.documentElement.scrollWidth,
          viewport: innerWidth,
        };
      },
      kind === "estatisticas" ? ".reference-legend" : ".legend",
    );
    expect(position.legendTop).toBeGreaterThanOrEqual(
      position.lastTableBottom - 1,
    );
    expect(position.pageWidth).toBeLessThanOrEqual(position.viewport);
    await page.screenshot({
      path: `.preview-artifacts/padroes-atuais-${kind}-${info.project.name}.png`,
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
  await expect(table.locator("tbody tr")).toHaveCount(30);
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
  await expect(table.locator("tbody tr")).toHaveCount(30);
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
    name: "Ordenar por 3P (Cestas de três)",
    exact: true,
  });
  await sort.focus();
  await page.keyboard.press("Enter");
  await expect(
    table.locator('th[data-public-metric="threeMade"]'),
  ).toHaveAttribute("aria-sort", "descending");
  await expect(sort).toBeFocused();
  await expect(page.getByRole("tooltip")).toContainText("Cestas de três");
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
  await expect(table.getByRole("columnheader")).toHaveCount(14);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(table.getByRole("columnheader")).toHaveCount(15);
});

test("320px e texto ampliado suportam a fonte de fallback do Linux", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(f.url);
  await page
    .getByRole("table", { name: "Estatísticas dos atletas", exact: true })
    .waitFor();
  await page.addStyleTag({
    content:
      "html {font-size:200% !important;} .public-site, .public-site * {font-family:Arial !important;}",
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
});
