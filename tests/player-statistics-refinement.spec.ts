import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { statisticsBrowserFixture } from "./fixtures/statistics-browser";

test("bordas: tabela e barra superior contêm o deslocamento elástico", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url);
  await expect(page.locator(".statistics-table tbody tr")).toHaveCount(30);
  const behavior = await page
    .locator(".scrollable-table-top, .statistics-table-wrap")
    .evaluateAll((elements) =>
      elements.map((el) => ({
        x: getComputedStyle(el).getPropertyValue("overscroll-behavior-x"),
        y: getComputedStyle(el).getPropertyValue("overscroll-behavior-y"),
        touch: getComputedStyle(el).touchAction,
      })),
    );
  expect(behavior).toEqual([
    { x: "none", y: "none", touch: "auto" },
    { x: "none", y: "none", touch: "auto" },
  ]);
});

test("bordas: sincronização não propaga offsets elásticos nem reescreve o mesmo valor", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(f.url);
  await expect(page.locator(".statistics-table tbody tr")).toHaveCount(30);
  const result = await page
    .locator(".scrollable-table")
    .evaluate(async (el) => {
      const top = el.querySelector<HTMLElement>(".scrollable-table-top")!;
      const viewport = el.querySelector<HTMLElement>(".statistics-table-wrap")!;
      const descriptor = Object.getOwnPropertyDescriptor(
        Element.prototype,
        "scrollLeft",
      )!;
      const writes: number[] = [];
      Object.defineProperty(top, "scrollLeft", {
        configurable: true,
        get() {
          return descriptor.get!.call(top);
        },
        set(value: number) {
          writes.push(value);
          descriptor.set!.call(top, value);
        },
      });
      const maximum = viewport.scrollWidth - viewport.clientWidth;
      const targetMaximum = top.scrollWidth - top.clientWidth;
      for (const value of [-80, 0, 60.25, 60.25, maximum + 80]) {
        Object.defineProperty(viewport, "scrollLeft", {
          configurable: true,
          get: () => value,
        });
        viewport.dispatchEvent(new Event("scroll"));
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      }
      delete (viewport as Partial<HTMLElement>).scrollLeft;
      delete (top as Partial<HTMLElement>).scrollLeft;
      return {
        writes,
        maximum: Math.min(maximum, targetMaximum),
        final: top.scrollLeft,
      };
    });
  expect(result.writes).toEqual([60.25, result.maximum]);
  expect(result.final).toBe(result.maximum);
});

test("súmula:30linhas, paginação antes da legenda e controles sem formulário avançado", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url);
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  await expect(table.locator("tbody tr")).toHaveCount(30);
  await expect(
    page.getByText("Mais filtros e opções", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Cobertura dos dados", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".legend-notes")).toHaveCount(0);
  const legend = page.getByRole("region", { name: "Legenda", exact: true });
  await expect(legend.locator("dt").filter({ hasText: /^PP%$/ })).toBeVisible();
  await expect(legend).toContainText("Participação nos Pontos");
  await expect(legend).not.toContainText("percentual dos pontos da equipe");
  const pager = page.getByRole("navigation", { name: "Paginação estatística" });
  expect(
    await pager.evaluate(
      (el) =>
        el.previousElementSibling?.classList.contains("statistics-explorer") &&
        el.nextElementSibling?.classList.contains("table-legend"),
    ),
  ).toBe(true);
  await pager.getByRole("button", { name: "Próxima página" }).focus();
  await page.keyboard.press("Enter");
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await expect(page).toHaveURL(/page=2/);
  await expect(
    page
      .getByRole("heading", { name: "Participações no contexto", exact: true })
      .last(),
  ).toBeFocused();
  await page.reload();
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await pager.getByRole("button", { name: "Página anterior" }).click();
  await expect(table.locator("tbody tr")).toHaveCount(30);
  await table
    .getByRole("button", {
      name: "Ordenar por F (Faltas cometidas)",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/sort=foulsCommitted/);
  await expect(
    table.locator('[data-public-metric="foulsCommitted"][data-leader]'),
  ).toHaveCount(0);
  const search = page.getByRole("searchbox", {
    name: "Buscar atleta ou equipe",
  });
  await search.fill("joao");
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await page
    .getByRole("spinbutton", { name: "Mínimo de jogos", exact: true })
    .fill("2");
  await expect(
    page.getByText("Nenhuma participação atende à consulta.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .first()
    .click();
  await expect(table.locator("tbody tr")).toHaveCount(30);
  await page
    .getByRole("button", { name: "Equipe Todas as equipes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Não selecionar nenhuma equipe" })
    .click();
  await expect(
    page.getByText("Nenhuma participação atende à consulta.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Selecionar todas as equipes" })
    .click();
  await expect(table.locator("tbody tr")).toHaveCount(30);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Equipe Todas as equipes", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Por jogo", exact: true }).click();
  await expect(page).toHaveURL(/mode=per-game/);
  await page.getByRole("button", { name: /^Colunas ·/ }).click();
  await page.locator('input[data-column-choice="pointsShare"]').uncheck();
  await expect(
    table.locator('thead th[data-public-metric="pointsShare"]'),
  ).toHaveCount(0);
  await expect(legend.locator("dt").filter({ hasText: /^PP%$/ })).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /^Colunas ·/ })).toBeFocused();
  expect(f.state.queries.every((q) => q.get("pageSize") === "30")).toBe(true);
});

test("rótulos PP% e5F coincidem no cabeçalho, tooltip e legenda", async ({
  page,
}, info) => {
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url + "&preset=custom&columns=pointsShare,fiveFouls");
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  const legend = page.getByRole("region", { name: "Legenda", exact: true });
  for (const [key, label, name] of [
    ["pointsShare", "PP%", "Participação nos Pontos"],
    ["fiveFouls", "5F", "Exclusões por cinco faltas"],
  ]) {
    const header = table.locator(`thead th[data-public-metric="${key}"]`);
    await expect(header).toHaveAccessibleName(name);
    const button = header.getByRole("button");
    await expect(button).toHaveAccessibleName(`Ordenar por ${label} (${name})`);
    await button.focus();
    await expect(button).toBeFocused();
    await expect(page.getByRole("tooltip")).toHaveText(name);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toBeHidden();
    if (info.project.use.hasTouch) await button.tap();
    else await button.hover();
    await expect(page.getByRole("tooltip")).toHaveText(name);
    const entry = legend.locator("dl > div").filter({
      has: page.locator("dt").filter({ hasText: new RegExp(`^${label}$`) }),
    });
    await expect(entry.locator("dd")).toHaveText(name);
    const readable = await entry.locator("dd").evaluate((element) => {
      const style = getComputedStyle(element);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      context.font = style.font;
      return (
        Math.max(
          ...element
            .textContent!.split(" ")
            .map((word) => context.measureText(word).width),
        ) <=
        element.clientWidth + 1
      );
    });
    expect(readable).toBe(true);
    if (key === "fiveFouls")
      await page.screenshot({
        path: info.outputPath("rotulos.png"),
        fullPage: true,
      });
    await page.keyboard.press("Escape");
  }
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);
});

for (const width of [1366, 1920, 390, 320])
  test(`espaçamento, nomes longos, foco, contenção e axe em${width}px`, async ({
    page,
  }, info) => {
    const f = await statisticsBrowserFixture(page);
    f.source.games[0].snapshot.facts.players[0].person.name =
      "José Antônio de Albuquerque e Vasconcelos Filho";
    await page.setViewportSize({
      width,
      height: width === 1366 ? 768 : width === 1920 ? 1080 : 844,
    });
    await page.goto(
      f.url +
        "&preset=custom&columns=games,points,pointsPerGame,pointsShare,foulsCommitted",
    );
    const table = page.getByRole("table", {
      name: "Estatísticas dos atletas",
      exact: true,
    });
    await expect(table.locator("tbody tr")).toHaveCount(30);
    const geometry = await table.evaluate((el) => ({
      padding: [...el.querySelectorAll("tbody tr:first-child :is(th,td)")].map(
        (c) => getComputedStyle(c).paddingLeft,
      ),
      spare:
        el.closest(".statistics-table-wrap")!.getBoundingClientRect().right -
        el.getBoundingClientRect().right,
      documentOverflow: document.documentElement.scrollWidth > innerWidth,
      widths: {
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
        inner: innerWidth,
        body: document.body.getBoundingClientRect().width,
      },
      overflow: [...document.querySelectorAll("body *")]
        .filter(
          (el) =>
            el.getBoundingClientRect().right > innerWidth &&
            !el.closest(".statistics-table-wrap"),
        )
        .map((el) => ({
          tag: el.tagName,
          css: el.className,
          width: el.getBoundingClientRect().width,
          right: el.getBoundingClientRect().right,
        }))
        .slice(0, 15),
    }));
    expect(
      geometry.padding.every(
        (p) => p === (width >= 640 ? "21px" : width > 600 ? "14px" : "10px"),
      ),
    ).toBe(true);
    expect(
      geometry.documentOverflow,
      JSON.stringify([geometry.widths, geometry.overflow]),
    ).toBe(false);
    if (width >= 1366) {
      const gutter = await table.evaluate((el) => {
        const viewport = el.closest<HTMLElement>(".statistics-table-wrap")!;
        return viewport.offsetWidth - viewport.clientWidth;
      });
      expect(geometry.spare).toBeLessThanOrEqual(gutter + 1);
    }
    const region = page.getByRole("region", {
      name: "Tabela estatística rolável",
    });
    await region.focus();
    await expect(region).toBeFocused();
    await page.keyboard.press("ArrowRight");
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
    await page.screenshot({
      path: `.preview-artifacts/players-refinement-${width}-${info.project.name}.png`,
      fullPage: true,
    });
    if (width === 1366) {
      // 200% browser zoom yields half the CSS viewport; text-only expansion is checked as well.
      await page.addStyleTag({ content: "html {font-size:200%}" });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `.preview-artifacts/players-refinement-text200-${info.project.name}.png`,
        fullPage: true,
      });
      await page.addStyleTag({ content: "html {font-size:100%}" });
      await page.setViewportSize({ width: 683, height: 450 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.getByRole("button", { name: "Próxima página", exact: true }),
      ).toBeEnabled();
      await page.screenshot({
        path: `.preview-artifacts/players-refinement-zoom200-${info.project.name}.png`,
        fullPage: true,
      });
    }
  });
