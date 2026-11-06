import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { teamPublicFixture } from "./fixtures/team-public-browser";
test("Equipes abre completa, filtra sem tirar foco e mantém opções e retorno", async ({
  page,
}) => {
  const f = await teamPublicFixture(page, { longList: true });
  await page.goto(f.listUrl);
  await expect(
    page.getByRole("heading", { level: 1, name: "Equipes", exact: true }),
  ).toBeVisible();
  const table = page.getByRole("table", { name: "Estatísticas das equipes" });
  await expect(table.locator("tbody tr")).toHaveCount(26);
  await expect(
    page.getByRole("button", { name: "Por jogo", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Colunas", exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Próxima página de inscrições/ }),
  ).toHaveCount(0);
  const search = page.getByRole("searchbox", {
    name: "Buscar equipe ou inscrição",
  });
  await search.fill("inexistente");
  await expect(
    page.getByText("Nenhuma inscrição neste recorte."),
  ).toBeVisible();
  await expect(search).toBeFocused();
  await page.getByRole("button", { name: /Equipe Todas as equipes/ }).click();
  await expect(page.getByRole("checkbox")).toHaveCount(26);
  await page
    .getByRole("button", { name: "Não selecionar nenhuma equipe" })
    .click();
  await page.keyboard.press("Escape");
  await search.fill("");
  await expect(
    page.getByText("Nenhuma inscrição neste recorte."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Legenda", exact: true }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("Equipes: largura intrínseca, sticky, barra superior e bordas", async ({
  page,
  browserName,
}, info) => {
  const f = await teamPublicFixture(page, { longList: true });
  for (const g of f.source.games)
    g.snapshot.game.home.name =
      "Equipe de nome comprido " + g.snapshot.game.home.name;
  await page.goto(f.listUrl);
  const table = page.getByRole("table", { name: "Estatísticas das equipes" }),
    region = page.getByRole("region", {
      name: "Tabela de equipes",
      exact: true,
    });
  await expect(table.locator("tbody tr")).toHaveCount(26);
  for (const width of [1920, 1366, 1051, 1050, 390, 320]) {
    await page.setViewportSize({ width, height: width > 1050 ? 768 : 844 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    const geometry = await table.evaluate((el) => {
      const r = el.closest(".statistics-table-wrap") as HTMLElement,
        b = el.closest(".team-list-results")!,
        top = b.querySelector(".scrollable-table-top")!;
      return {
        table: el.getBoundingClientRect().width,
        wrap: r.clientWidth,
        gap: r.clientWidth - el.getBoundingClientRect().width,
        center: Math.abs(
          (b.getBoundingClientRect().left + b.getBoundingClientRect().right) /
            2 -
            (b.parentElement!.getBoundingClientRect().left +
              b.parentElement!.getBoundingClientRect().right) /
              2,
        ),
        maxHeight: parseFloat(getComputedStyle(r).maxHeight),
        overscroll: getComputedStyle(r).overscrollBehavior,
        topVisible: getComputedStyle(top).visibility,
        padding: parseFloat(
          getComputedStyle(el.querySelector("td")!).paddingLeft,
        ),
      };
    });
    expect(geometry.maxHeight).toBeCloseTo((width > 1050 ? 768 : 844) * 0.7, 0);
    expect(geometry.padding).toBe(
      (width > 1050 ? 14 : 10) * (width >= 640 ? 1.5 : 1),
    );
    if (width > 1050) {
      expect(geometry.gap).toBeLessThanOrEqual(2);
      expect(geometry.center).toBeLessThanOrEqual(1);
    }
    if (browserName !== "webkit" || process.platform !== "win32")
      expect(geometry.overscroll).toBe("none");
    if (width === 390 || width === 1366 || width === 1920 || width === 320)
      await page.screenshot({
        path: `.preview-artifacts/equipes-${width}-${info.project.name}.png`,
        fullPage: true,
      });
  }
  await region.evaluate((el) => {
    el.scrollTop = 300;
    el.scrollLeft = 200;
  });
  await expect
    .poll(() => region.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  const sticky = await table.evaluate((el) => {
    const r = el.closest(".statistics-table-wrap")!.getBoundingClientRect(),
      p = el.querySelector("thead th")!.getBoundingClientRect(),
      name = el.querySelector('tbody th[scope="row"]')!.getBoundingClientRect();
    return { top: p.top - r.top, left: name.left - r.left };
  });
  expect(Math.abs(sticky.top)).toBeLessThanOrEqual(2);
  expect(Math.abs(sticky.left)).toBeLessThanOrEqual(2);
  const top = page.locator(".team-list-explorer .scrollable-table-top");
  await expect
    .poll(async () =>
      Math.abs(
        (await top.evaluate((el) => el.scrollLeft)) -
          (await region.evaluate((el) => el.scrollLeft)),
      ),
    )
    .toBeLessThanOrEqual(1);
  await top.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });
  await expect
    .poll(async () =>
      Math.abs(
        (await top.evaluate((el) => el.scrollLeft)) -
          (await region.evaluate((el) => el.scrollLeft)),
      ),
    )
    .toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 720, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  const zoomOverflow = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter(
        (el) =>
          el.getBoundingClientRect().right > innerWidth &&
          !el.closest(".statistics-table-wrap, .scrollable-table-top"),
      )
      .slice(0, 15)
      .map((el) => ({
        tag: el.tagName,
        css: el.className,
        text: el.textContent,
        parent: el.parentElement?.outerHTML.slice(0, 200),
        right: el.getBoundingClientRect().right,
      })),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    JSON.stringify(zoomOverflow),
  ).toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/equipes-zoom200-${info.project.name}.png`,
    fullPage: true,
  });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "";
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/equipes-text200-${info.project.name}.png`,
    fullPage: true,
  });
});

test("Equipes: consulta explícita e retorno do perfil conservam seleção e rolagem", async ({
  page,
}) => {
  const f = await teamPublicFixture(page, { longList: true });
  await page.goto(
    f.listUrl + "?mode=total&scope=all&sort=name&direction=desc&q=Inscrição",
  );
  const table = page.getByRole("table", { name: "Estatísticas das equipes" });
  await expect(table.locator("tbody tr")).toHaveCount(26);
  await expect(
    page.getByRole("button", { name: "Totais", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const region = page.getByRole("region", {
    name: "Tabela de equipes",
    exact: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await region.evaluate((el) => {
    el.scrollTop = 120;
    el.scrollLeft = 200;
  });
  await table.getByRole("link", { name: "Inscrição 20", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Inscrição 20", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Voltar às equipes", exact: true })
    .click();
  await expect(table.locator("tbody tr")).toHaveCount(26);
  await expect(
    page.getByRole("searchbox", { name: "Buscar equipe ou inscrição" }),
  ).toHaveValue("Inscrição");
  await expect(page).toHaveURL(/direction=desc/);
  await expect
    .poll(() => region.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
});

test("Equipes: seleção extensa usa referência local e consulta POST sem cortar IDs", async ({
  page,
}) => {
  const f = await teamPublicFixture(page, { longList: true }),
    seed = f.source.games[0];
  f.source.games = Array.from({ length: 500 }, (_, i) => {
    const g = structuredClone(seed);
    g.snapshot.id = `f9000000-0000-4000-8000-${String(90000 + i).padStart(12, "0")}`;
    for (const side of ["home", "away"] as const) {
      const n = i * 2 + (side === "home" ? 0 : 1),
        id = `f9000000-0000-4000-8000-${String(71000 + n).padStart(12, "0")}`;
      g.snapshot.game[side].registrationId = id;
      g.snapshot.game[side].name = `Inscrição ${String(n).padStart(3, "0")}`;
      for (const p of g.snapshot.facts.players.filter((p) => p.side === side))
        p.registrationId = id;
    }
    return g;
  });
  const ids = f.source.games
      .flatMap((g) => [
        g.snapshot.game.home.registrationId,
        g.snapshot.game.away.registrationId,
      ])
      .slice(0, 999),
    p = new URLSearchParams("selection=custom");
  ids.forEach((id) => p.append("registrationId", id));
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/public/teams/"))
      requests.push(r.method() + ":" + (r.postData() ?? r.url()));
  });
  await page.goto(f.listUrl + "?" + p);
  const table = page.getByRole("table", { name: "Estatísticas das equipes" });
  await expect(table.locator("tbody tr")).toHaveCount(999);
  await expect(page).toHaveURL(/stateRef=/);
  expect(page.url().length).toBeLessThan(2000);
  await expect(
    page.getByRole("status").filter({ hasText: "não está integralmente" }),
  ).toBeVisible();
  expect(
    requests.some(
      (r) =>
        r.startsWith("POST:") &&
        (JSON.parse(r.slice(5)) as { query: string }).query.match(
          /registrationId=/g,
        )?.length === 999,
    ),
  ).toBe(true);
  await page.reload();
  await expect(table.locator("tbody tr")).toHaveCount(999);
  await page
    .getByRole("searchbox", { name: "Buscar equipe ou inscrição" })
    .fill("Inscrição 000");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await table.getByRole("link", { name: "Inscrição 000", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Inscrição 000", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Voltar às equipes", exact: true })
    .click();
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(page).toHaveURL(/stateRef=/);
});

test("Equipes: última resposta prevalece e máximos positivos preservam empates", async ({
  page,
}) => {
  const f = await teamPublicFixture(page, { longList: true });
  await page.goto(f.listUrl);
  const table = page.getByRole("table", { name: "Estatísticas das equipes" });
  await expect(table.locator("tbody tr")).toHaveCount(26);
  await expect(
    table.locator('[data-team-value="points"]').filter({ hasText: "2,0" }),
  ).toHaveCount(13);
  expect(
    await table
      .locator('[data-team-value="points"]')
      .first()
      .evaluate((el) => getComputedStyle(el).fontWeight),
  ).toBe("700");
  expect(
    await table
      .locator('[data-team-value="benchPoints"]')
      .first()
      .evaluate((el) => getComputedStyle(el).fontWeight),
  ).toBe("400");
  f.state.delayNext = 700;
  const search = page.getByRole("searchbox", {
    name: "Buscar equipe ou inscrição",
  });
  await search.fill("Inscrição 01");
  await expect
    .poll(() => f.state.queries.some((q) => q.includes("01")))
    .toBe(true);
  await search.fill("Inscrição 24");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table).toContainText("Inscrição 24");
  await expect(search).toBeFocused();
  await page.getByRole("button", { name: "Totais", exact: true }).click();
  await expect(table).toContainText("Inscrição 24");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("Equipes: armazenamento indisponível preserva consultas curtas e foco", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
  });
  const f = await teamPublicFixture(page);
  await page.goto(f.listUrl);
  const table = page.getByRole("table", { name: "Estatísticas das equipes" });
  await expect(table.locator("tbody tr")).toHaveCount(2);
  const totals = page.getByRole("button", { name: "Totais", exact: true });
  await totals.focus();
  await page.keyboard.press("Enter");
  await expect(totals).toBeFocused();
  await expect(page).toHaveURL(/mode=total/);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("Equipes: seleção grande que não pode ser guardada mantém a escolha anterior", async ({
  page,
}) => {
  const f = await teamPublicFixture(page, { longList: true }),
    seed = f.source.games[0];
  f.source.games = Array.from({ length: 40 }, (_, i) => {
    const g = structuredClone(seed);
    g.snapshot.id = `f9000000-0000-4000-8000-${String(98000 + i).padStart(12, "0")}`;
    for (const side of ["home", "away"] as const) {
      const n = i * 2 + (side === "home" ? 0 : 1),
        id = `f9000000-0000-4000-8000-${String(97000 + n).padStart(12, "0")}`;
      g.snapshot.game[side].registrationId = id;
      for (const p of g.snapshot.facts.players.filter((p) => p.side === side))
        p.registrationId = id;
    }
    return g;
  });
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("team-list:"))
        throw new DOMException("Full", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await page.goto(f.listUrl);
  const table = page.getByRole("table", { name: "Estatísticas das equipes" });
  await expect(table.locator("tbody tr")).toHaveCount(80);
  await page.getByRole("button", { name: /Equipe Todas as equipes/ }).click();
  await page.getByRole("checkbox").first().click();
  await expect(
    page.getByRole("status").filter({ hasText: "Não foi possível guardar" }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await expect(table.locator("tbody tr")).toHaveCount(80);
  await expect(page).not.toHaveURL(/stateRef=|registrationId=/);
  await page.keyboard.press("Escape");
});
