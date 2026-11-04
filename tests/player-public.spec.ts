import { test, expect } from "@playwright/test";
import { playerPublicFixture } from "./fixtures/player-public-browser";

const summary = (page: import("@playwright/test").Page) =>
  page.getByRole("table", {
    name: "Resumo de temporada e carreira",
    exact: true,
  });
const stats = (page: import("@playwright/test").Page) =>
  page.getByRole("table", { name: "Estatísticas por campeonato", exact: true });

test("perfil contínuo público: dados disponíveis, ordem dos blocos e atalhos por teclado", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  await page.goto(f.url);
  await expect(
    page.getByRole("heading", { name: "Ana Pública", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("180 cm", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Ano de nascimento:", { exact: true }),
  ).toHaveCount(0);
  await expect(summary(page).getByRole("row")).toHaveCount(3);
  await expect(
    page
      .getByRole("table", { name: "Três últimos jogos", exact: true })
      .getByRole("row"),
  ).toHaveCount(3);
  await expect(page.locator(".player-provenance")).toHaveCount(0);
  for (const [name, target] of [
    ["Estatísticas", "#estatisticas"],
    ["Conquistas e honrarias", "#conquistas"],
    ["Jogos", "#jogos"],
    ["Histórico", "#historico"],
    ["Evolução", "#evolucao"],
    ["Resumo", "#resumo"],
  ]) {
    await page
      .getByRole("navigation", { name: "Seções do perfil" })
      .getByRole("link", { name, exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(target)).toBeFocused();
  }
  await expect(page.locator("#jogos").locator("..")).toHaveAttribute(
    "open",
    "",
  );
  await page.reload();
  await expect(page.locator("#jogos").locator("..")).toHaveAttribute(
    "open",
    "",
  );
  expect(f.state.sessionReads).toBe(0);
  await expect(page.getByText(/confirmação v|Resultado v|Fontes/i)).toHaveCount(
    0,
  );
});

test("carreira completa não herda campeonato de origem; filtros e checkboxes não alteram resumo/recentes", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  await page.goto(
    f.url + `?disputeId=${f.source.participations[0].fact.disputeId}`,
  );
  await expect(stats(page).getByRole("row")).toHaveCount(3);
  const before = await summary(page).innerText();
  const recent = page.getByRole("table", {
    name: "Três últimos jogos",
    exact: true,
  });
  await expect(recent.getByRole("row")).toHaveCount(3);
  await page
    .getByRole("combobox", { name: "Ano", exact: true })
    .selectOption("2027");
  await expect(stats(page).getByRole("row")).toHaveCount(2);
  await page
    .locator(".player-options > summary")
    .filter({ hasText: "Equipes" })
    .click();
  const teams = page.getByRole("group", { name: "Equipes", exact: true });
  await teams.getByRole("button", { name: "Nenhuma", exact: true }).click();
  await expect(stats(page)).toContainText(
    "Nenhuma participação neste recorte.",
  );
  await expect(summary(page)).toHaveText(before, { useInnerText: true });
  await expect(recent.getByRole("row")).toHaveCount(3);
  await expect(page.getByText("MVP da edição", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.locator(".player-options > summary").filter({ hasText: "Equipes" }),
  ).toBeFocused();
  await page.reload();
  await expect(stats(page)).toContainText(
    "Nenhuma participação neste recorte.",
  );
  expect(
    f.state.queries.every(
      (p) => !p.get("disputeId") && !p.get("championshipId"),
    ),
  ).toBe(true);
});

test("histórico completo não fica limitado à primeira página e paginação dos jogos é local", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { long: true });
  await page.goto(f.url + "?secao=jogos&page=2&mode=total");
  const games = page.getByRole("table", {
    name: "Jogos confirmados",
    exact: true,
  });
  await expect(games.getByRole("row")).toHaveCount(6);
  await expect(
    page.getByText("Página 2 de 2 · 25 jogos", { exact: true }),
  ).toBeVisible();
  await expect(stats(page).getByRole("row")).toHaveCount(21);
  await expect(
    summary(page).getByRole("row").last().getByRole("cell").first(),
  ).toHaveText("25");
  expect(f.state.queries.map((p) => p.get("page"))).toEqual([null, "2"]);
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await expect(games.getByRole("row")).toHaveCount(21);
  expect(f.state.queries).toHaveLength(2);
  await page
    .getByRole("button", { name: "Próximos campeonatos", exact: true })
    .click();
  await expect(stats(page).getByRole("row")).toHaveCount(6);
  await expect(
    summary(page).getByRole("row").last().getByRole("cell").first(),
  ).toHaveText("25");
});

test("ordenação e colunas persistem sem refazer as consultas da carreira", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  await page.goto(f.url);
  await expect(stats(page).getByRole("row")).toHaveCount(3);
  await stats(page).getByRole("button", { name: "PTS", exact: true }).click();
  await expect(
    stats(page).locator("thead th").filter({ hasText: "PTS" }),
  ).toHaveAttribute("aria-sort", "ascending");
  await expect(stats(page).locator("tbody tr").first()).toContainText("2026");
  await stats(page).getByRole("button", { name: /PTS/ }).click();
  await expect(stats(page).locator("tbody tr").first()).toContainText("2027");
  await page
    .locator(".player-options > summary")
    .filter({ hasText: "Colunas" })
    .click();
  const choices = page.getByRole("group", { name: "Colunas", exact: true });
  await choices
    .getByRole("checkbox", { name: "LL · Lances livres", exact: true })
    .check();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(
    stats(page).locator("thead th").filter({ hasText: "PTS" }),
  ).toHaveAttribute("aria-sort", "descending");
  await expect(
    stats(page).getByRole("button", { name: "LL", exact: true }),
  ).toBeVisible();
  expect(f.state.queries).toHaveLength(2);
});

test("leitura incompleta e alteração entre páginas exigem retry e não exibem carreira parcial", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { long: true });
  f.state.failPage = 2;
  await page.goto(f.url);
  await expect(page.getByRole("alert")).toContainText("Não foi possível");
  await expect(summary(page)).toHaveCount(0);
  f.state.failPage = 0;
  f.state.changedPage = 2;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByRole("alert")).toContainText("publicações mudaram");
  await expect(summary(page)).toHaveCount(0);
  f.state.changedPage = 0;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(stats(page).getByRole("row")).toHaveCount(21);
});

test("perfil sem jogos tem resumo indisponível e somente metadados publicados", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { profileOnly: true });
  await page.goto(f.url);
  await expect(
    page.getByText("Trajetória confirmada.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Nenhuma conquista publicada.", { exact: true }),
  ).toBeVisible();
  await expect(summary(page).getByRole("row").last()).toContainText("—");
  await expect(
    summary(page).getByRole("row").last().getByRole("cell").first(),
  ).toHaveText("0");
  await expect(stats(page)).toContainText(
    "Nenhuma participação neste recorte.",
  );
  await expect(page.locator(".player-with-honors")).toHaveCount(0);
});

test("erros e resposta contaminada não exibem dados; retry recupera", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  f.state.missing = true;
  await page.goto(f.url);
  await expect(page.getByRole("alert")).toContainText("Perfil não publicado");
  f.state.missing = false;
  f.state.corrupt = true;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByRole("alert")).toContainText("Não foi possível");
  await expect(page.getByText("do-not-display")).toHaveCount(0);
  f.state.corrupt = false;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(summary(page)).toBeVisible();
});

test("relacionado sem jogar preserva camisa e não recebe zero estatístico nem jogo recente", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  for (const p of f.source.participations)
    Object.assign(p.fact, {
      played: false,
      starter: false,
      captain: false,
      scoring: null,
      advanced: null,
      foulsCommitted: null,
      foulsReceived: null,
      discipline: null,
    });
  await page.goto(f.url + "?secao=jogos");
  await expect(
    page.getByRole("table", { name: "Três últimos jogos", exact: true }),
  ).toContainText("Ainda não há jogos confirmados");
  const games = page.getByRole("table", {
    name: "Jogos confirmados",
    exact: true,
  });
  await expect(games.getByRole("cell", { name: /Não participou/ })).toHaveCount(
    2,
  );
  await expect(games).toContainText("Camisa 77");
  await expect(games.getByRole("cell", { name: "0", exact: true })).toHaveCount(
    0,
  );
});

test("três recentes usam data do jogo e participação explícita, não publicação de correção", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { long: true });
  f.source.participations.forEach((g, i) => {
    g.game.date = `2026-01-${String(i + 1).padStart(2, "0")}`;
  });
  const newest = f.source.participations.at(-1)!;
  Object.assign(newest.fact, {
    played: false,
    starter: false,
    captain: false,
    scoring: null,
    advanced: null,
    foulsCommitted: null,
    foulsReceived: null,
    discipline: null,
  });
  f.source.participations[0].fact.publishedAt = "2028-01-01T00:00:00Z";
  await page.goto(f.url);
  const recent = page.getByRole("table", {
    name: "Três últimos jogos",
    exact: true,
  });
  await expect(recent.getByRole("row")).toHaveCount(4);
  const dates = await recent
    .locator("tbody tr td:first-child")
    .allTextContents();
  expect(dates).toEqual(["24/01/2026", "23/01/2026", "22/01/2026"]);
});

test("retorno da súmula de outra disputa preserva filtros, painel e rolagem", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  await page.goto(
    f.url + `?disputeId=${f.source.participations[1].fact.disputeId}`,
  );
  await expect(summary(page)).toBeVisible();
  await page
    .getByRole("combobox", { name: "Ano", exact: true })
    .selectOption("2027");
  await page
    .getByRole("link", { name: "Ver todos os jogos", exact: true })
    .click();
  const link = page
    .getByRole("table", { name: "Três últimos jogos", exact: true })
    .locator(`a[href*="${f.source.participations[0].fact.gameId}"]`);
  await link.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await link.click();
  await expect(
    page.getByRole("region", { name: "Parciais e placar final", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Voltar à origem", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Ano", exact: true }),
  ).toHaveValue("2027");
  await expect(page.locator("#jogos").locator("..")).toHaveAttribute(
    "open",
    "",
  );
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThanOrEqual(Math.max(0, before - 3));
});

for (const width of [320, 390, 1366, 1920])
  test(`perfil real: geometria compacta e ordem em ${width}px`, async ({
    page,
  }, info) => {
    const f = await playerPublicFixture(page);
    f.source.profile!.person.name = "Ana de Albuquerque e Vasconcelos da Silva";
    await page.setViewportSize({ width, height: width > 1000 ? 900 : 844 });
    await page.goto(f.url);
    await expect(summary(page)).toBeVisible();
    const identity = await page.locator(".player-identity").boundingBox(),
      honors = await page.locator(".player-honors").boundingBox();
    if (width >= 960)
      expect(honors!.x).toBeGreaterThan(identity!.x + identity!.width);
    else
      expect(honors!.y).toBeGreaterThanOrEqual(identity!.y + identity!.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.preview-artifacts/player-continuous-after-${width}-${info.project.name}.png`,
      fullPage: true,
    });
    if (width === 1920)
      expect(
        await stats(page).evaluate((el) => el.getBoundingClientRect().width),
      ).toBeLessThan(1300);
    if (width === 320) {
      await page.addStyleTag({
        content: "html { font-size: 200% !important; }",
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `.preview-artifacts/player-continuous-after-320-text200-${info.project.name}.png`,
        fullPage: true,
      });
    }
  });
