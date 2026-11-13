import { test, expect, type Page } from "@playwright/test";
import { playerPublicFixture } from "./fixtures/player-public-browser";
import { confirmedManualFixture } from "./fixtures/statistics-publications";
const summary = (p: Page) =>
  p.getByRole("table", { name: "Resumo de temporada e carreira", exact: true });
const stats = (p: Page) =>
  p.getByRole("table", { name: "Estatísticas por campeonato", exact: true });
const tab = (p: Page, name: string) =>
  p.getByRole("tab", { name, exact: true }).click();
const filters = (p: Page) =>
  p.getByRole("button", { name: "Filtrar e ajustar", exact: true }).click();
const apply = (p: Page) =>
  p.getByRole("button", { name: "Aplicar", exact: true }).click();

test("perfil público mantém identidade, metadados publicados e navegação de teclado", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  Object.assign(f.source, { currentAge: 17 });
  Object.assign(f.source.profile!.person, {
    publicBirthYear: 2008,
    position: "Armadora",
  });
  await page.goto(f.url);
  await expect(
    page.getByRole("heading", { name: "AP", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".player-full-name")).toHaveText("Ana Pública");
  await expect(page.getByText("1,80 m", { exact: true })).toBeVisible();
  await expect(page.getByText("17 anos", { exact: true })).toBeVisible();
  await expect(page.getByText("Armadora", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Trajetória confirmada.", { exact: true }),
  ).toHaveCount(0);
  await expect(summary(page).locator("tbody tr")).toHaveCount(2);
  await expect(page.locator(".player-legend")).toBeVisible();
  await page.getByRole("button", { name: "J: Jogos", exact: true }).focus();
  await expect(page.getByRole("tooltip")).toHaveText("Jogos");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).not.toBeVisible();
  await page.getByRole("tab", { name: "Visão geral", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Estatísticas", exact: true }),
  ).toBeFocused();
  expect(f.state.sessionReads).toBe(0);
  await expect(page.getByText(/confirmação v|Resultado v|Fontes/i)).toHaveCount(
    0,
  );
});
test("carreira completa não herda origem; filtros e nenhuma equipe não alteram resumo ou recentes", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  await page.goto(
    f.url + `?disputeId=${f.source.participations[0].fact.disputeId}`,
  );
  const result = confirmedManualFixture();
  await expect(
    page.locator(
      `.player-recent tr[data-game="${result.id}"] .player-match-score`,
    ),
  ).toHaveText(
    `${result.facts.teams.home.points} × ${result.facts.teams.away.points}`,
  );
  const before = await summary(page).innerText();
  const recent = await page
    .getByRole("table", { name: "Últimos jogos", exact: true })
    .innerText();
  await tab(page, "Estatísticas");
  await expect(stats(page).locator("tbody tr")).toHaveCount(2);
  await filters(page);
  await page
    .getByRole("combobox", { name: "Ano", exact: true })
    .selectOption("2027");
  await apply(page);
  await expect(stats(page).locator("tbody tr")).toHaveCount(1);
  await filters(page);
  await page
    .getByRole("group", { name: "Equipes", exact: true })
    .getByRole("button", { name: "Nenhuma", exact: true })
    .click();
  await apply(page);
  await expect(
    page.getByText("Nenhuma participação neste recorte.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(stats(page).locator("tbody tr")).toHaveCount(0);
  await tab(page, "Visão geral");
  await expect(summary(page)).toHaveText(before, { useInnerText: true });
  await expect(
    page.getByRole("table", { name: "Últimos jogos", exact: true }),
  ).toHaveText(recent, { useInnerText: true });
  expect(
    f.state.queries.every(
      (p) => !p.get("disputeId") && !p.get("championshipId"),
    ),
  ).toBe(true);
});
test("histórico e jogos carregam todas as páginas antes da paginação local", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { long: true });
  await page.goto(f.url + "?secao=jogos&page=2&mode=total");
  const games = page.getByRole("table", {
    name: "Jogos do atleta",
    exact: true,
  });
  await expect(games.locator("tbody tr")).toHaveCount(12);
  await expect(page.getByText("Página 2 de 3", { exact: true })).toBeVisible();
  expect(f.state.queries.map((p) => p.get("page"))).toEqual([null, "2"]);
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(games.locator("tbody tr")).toHaveCount(1);
  expect(f.state.queries).toHaveLength(2);
  await tab(page, "Estatísticas");
  await expect(stats(page).locator("tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(stats(page).locator("tbody tr")).toHaveCount(5);
  await tab(page, "Visão geral");
  await expect(
    summary(page).locator("tbody tr").last().locator("td").first(),
  ).toHaveText("25");
});
test("ordenação, modo, nenhuma coluna e recarga preservam valores sem novas leituras de carreira", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  await page.goto(f.url + "?secao=estatisticas");
  await expect(stats(page).locator("tbody tr")).toHaveCount(2);
  await stats(page)
    .getByRole("button", { name: "Ordenar por PTS (Pontos)", exact: true })
    .click();
  await expect(
    stats(page).locator("thead th[aria-sort=descending]"),
  ).toHaveCount(1);
  await stats(page)
    .getByRole("button", { name: "Ordenar por PTS (Pontos)", exact: true })
    .click();
  await expect(
    stats(page).locator("thead th[aria-sort=ascending]"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Total", exact: true }).click();
  expect(f.state.queries).toHaveLength(1);
  await filters(page);
  await page
    .getByRole("group", { name: "Colunas", exact: true })
    .getByRole("button", { name: "Nenhuma", exact: true })
    .click();
  await apply(page);
  await page.reload();
  await expect(
    stats(page).getByRole("button", {
      name: "Ordenar por PTS (Pontos)",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Total", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(f.state.queries).toHaveLength(2);
});
test("leitura incompleta ou alterada não exibe carreira parcial; retry recupera", async ({
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
  await expect(summary(page)).toBeVisible();
  await tab(page, "Estatísticas");
  await expect(stats(page).locator("tbody tr")).toHaveCount(20);
});
test("perfil sem jogos mantém apenas metadados públicos e zero de J", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { profileOnly: true });
  await page.goto(f.url);
  await expect(page.getByText("1,80 m", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Trajetória confirmada.", { exact: true }),
  ).toHaveCount(0);
  await expect(summary(page).locator("tbody tr").last()).toContainText("—");
  await expect(
    summary(page).locator("tbody tr").last().locator("td").first(),
  ).toHaveText("0");
  await expect(page.locator(".player-with-honors")).toHaveCount(0);
  await tab(page, "Estatísticas");
  await expect(
    page.getByText("Nenhuma participação neste recorte.", { exact: true }),
  ).toBeVisible();
  await tab(page, "Carreira");
  await expect(page.locator(".player-records")).toContainText(
    "Nenhuma marca registrada.",
  );
});
test("erros e resposta contaminada não exibem dados privados; retry recupera", async ({
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
test("relacionado sem atuar não recebe zero nem entra nos recentes", async ({
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
  const games = page.getByRole("table", {
    name: "Jogos do atleta",
    exact: true,
  });
  await expect(games).toHaveCount(0);
  await expect(page.locator(".player-games-count")).toHaveText(
    "0 jogos encontrados",
  );
  await expect(
    page
      .getByRole("tabpanel")
      .getByText("Nenhum jogo encontrado.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".player-current-team")).toContainText("77");
  await tab(page, "Visão geral");
  await expect(page.locator(".player-recent table")).toHaveCount(0);
});
test("recentes usam data e participação, sem reordenar por publicação de correção", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { long: true });
  f.source.participations.forEach((g, i) => {
    g.game.date = `2026-01-${String(i + 1).padStart(2, "0")}`;
  });
  Object.assign(f.source.participations.at(-1)!.fact, {
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
  await expect(page.locator(".player-recent tbody tr")).toHaveCount(5);
  await expect(page.locator(".player-recent tbody td:first-child")).toHaveText([
    "24/01/2026",
    "23/01/2026",
    "22/01/2026",
    "21/01/2026",
    "20/01/2026",
  ]);
});
test("ano de nascimento público controla presença integral da coluna Idade", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  await page.goto(f.url + "?secao=estatisticas");
  await expect(page.locator(".player-age")).toHaveCount(0);
  f.source.profile!.person.publicBirthYear = 2009;
  await page.reload();
  await expect(page.locator(".player-age")).toHaveText(["Idade", "18", "17"]);
  await expect(page.locator(".player-champ a").first()).toHaveText(
    "Outra inscrição",
  );
});
test("retorno de outra disputa mantém aba, filtros e origem", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  await page.goto(
    f.url +
      `?secao=jogos&anoJogos=2026&disputeId=${f.source.participations[1].fact.disputeId}`,
  );
  await expect(page.locator(".player-games-page tbody tr")).toHaveCount(1);
  const expected = page.url();
  await page.getByRole("tabpanel").locator(".player-game-link").click();
  await expect(
    page.getByRole("region", { name: "Parciais e placar final", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: /^Voltar à origem/ }).click();
  await expect(
    page.getByRole("tab", { name: "Ver jogos", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(page.url()).toBe(expected);
});
for (const width of [320, 390, 1366, 1920])
  test(`geometria das quatro abas e nomes longos em ${width}px`, async ({
    page,
  }) => {
    const f = await playerPublicFixture(page);
    f.source.profile!.person.name = "Ana de Albuquerque e Vasconcelos da Silva";
    await page.setViewportSize({ width, height: width > 1000 ? 1080 : 844 });
    await page.goto(f.url);
    await expect(summary(page)).toBeVisible();
    for (const name of [
      "Visão geral",
      "Estatísticas",
      "Carreira",
      "Ver jogos",
    ]) {
      await tab(page, name);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await expect(page.locator(".player-legend")).toHaveCount(1);
    }
  });
