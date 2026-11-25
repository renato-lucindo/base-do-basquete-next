import { test, expect } from "@playwright/test";
import { teamPublicFixture } from "./fixtures/team-public-browser";
import { pubId } from "./fixtures/publication";
test("tabela por inscrição preserva duas linhas e alterna totais/médias por teclado", async ({
  page,
}) => {
  const f = await teamPublicFixture(page);
  await page.goto(f.listUrl);
  const table = page.getByRole("table", {
    name: "Estatísticas das equipes",
    exact: true,
  });
  await expect(table.getByRole("row")).toHaveCount(3);
  const columns = () =>
    table.locator("thead th").evaluateAll((items) =>
      items.map((el) => ({
        x: el.getBoundingClientRect().x,
        width: el.getBoundingClientRect().width,
      })),
    );
  const average = await columns();
  await expect(
    table.getByRole("link", { name: "Lobos", exact: true }),
  ).toBeVisible();
  await expect(
    table.getByRole("link", { name: "Lobos B", exact: true }),
  ).toBeVisible();
  const totals = page.getByRole("button", { name: "Total", exact: true });
  await totals.focus();
  await page.keyboard.press("Enter");
  await expect(totals).toBeFocused();
  const total = await columns();
  total.forEach((value, index) => {
    expect(Math.abs(value.width - average[index].width)).toBeLessThan(1);
    expect(Math.abs(value.x - average[index].x)).toBeLessThan(1);
  });
  const lobos = table
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: "Lobos", exact: true }) });
  await expect(
    lobos.getByRole("cell", { name: "4", exact: true }),
  ).toBeVisible();
  await expect(table.locator('[data-team-metric="foulsReceived"]')).toHaveCount(
    1,
  );
  await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);
  expect(f.state.sessionReads).toBe(0);
});
test("busca/ordem/página da lista reaparecem no retorno do detalhe", async ({
  page,
}) => {
  const f = await teamPublicFixture(page, { longList: true });
  await page.goto(
    f.listUrl + "?mode=total&scope=all&sort=name&direction=asc&page=2",
  );
  const table = page.getByRole("table", {
    name: "Estatísticas das equipes",
    exact: true,
  });
  await expect(table.getByRole("row")).toHaveCount(27);
  await table.getByRole("link", { name: "Inscrição 20", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Inscrição 20", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Voltar às equipes", exact: true })
    .click();
  await expect(page).toHaveURL(/sort=name/);
  await expect(table.getByRole("row")).toHaveCount(27);
  await expect(
    page.getByRole("searchbox", {
      name: "Buscar equipe ou inscrição",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Equipe Todas as equipes/ }).click();
  await page
    .getByRole("button", { name: "Não selecionar nenhuma equipe" })
    .click();
  await page
    .getByRole("checkbox", { name: "Inscrição 25", exact: true })
    .check();
  await page.keyboard.press("Escape");
  await expect(table.getByRole("row")).toHaveCount(2);
  await page.reload();
  await expect(table.getByRole("row")).toHaveCount(2);
  await expect(table).toContainText("Inscrição 25");
});
test("ambiguidade exige inscrição e abas conservam foco e histórico", async ({
  page,
}) => {
  const f = await teamPublicFixture(page);
  await page.goto(f.detailUrl.replace(`&registrationId=${pubId(5)}`, ""));
  await expect(
    page.getByRole("heading", { name: "Inscrições da equipe", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Lobos B", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Lobos B", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp("registrationId=" + pubId(6)));
  for (const name of ["Jogadores", "Jogos", "Visão geral"]) {
    const tab = page.getByRole("tab", { name, exact: true });
    await tab.focus();
    await page.keyboard.press("Enter");
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(tab).toBeFocused();
  }
  await page.goBack();
  await expect(
    page.getByRole("tab", { name: "Jogos", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Jogos", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});
test("estatísticas completas separam homônimos, camisas 0/00 e DNP de zero", async ({
  page,
}) => {
  const f = await teamPublicFixture(page);
  await page.goto(f.detailUrl + "&section=participantes&mode=total");
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  await expect(table.getByRole("row")).toHaveCount(7);
  await expect(
    table.getByRole("cell", { name: "00", exact: true }),
  ).toHaveCount(1);
  const dnp = table.getByRole("row").filter({
    has: page.locator(`a[href^="/atleta.html"][href*="#${pubId(7)}?"]`),
  });
  await expect(dnp.locator('[data-public-metric="games"]')).toHaveText("0");
  await expect(dnp.locator('[data-public-metric="points"]')).toHaveText("—");
  expect(await table.locator('a[href^="/atleta.html"]').count()).toBe(6);
  expect(
    await table.locator('[data-public-metric="technicalFouls"]').count(),
  ).toBe(7);
});
test("paginação de jogadores mantém totais completos e filtros ao voltar à visão geral", async ({
  page,
}) => {
  const f = await teamPublicFixture(page, { longDetail: true });
  await page.goto(
    f.detailUrl + "&section=participantes&mode=total&rosterPage=2&page=2",
  );
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  await expect(table.getByRole("row")).toHaveCount(51);
  await expect(
    page.getByRole("navigation", { name: "Páginas de jogadores" }),
  ).toContainText("Página 2 de 2");
  await page.getByRole("tab", { name: "Jogos", exact: true }).click();
  await expect(page.locator(".team-profile-games tbody tr")).toHaveCount(25);
  await page.getByRole("tab", { name: "Visão geral", exact: true }).click();
  const collective = page.getByRole("table", {
    name: "Estatísticas das equipes",
    exact: true,
  });
  await expect(
    collective
      .getByRole("row")
      .filter({ has: page.getByRole("link", { name: "Lobos", exact: true }) })
      .locator('[data-team-value="games"]'),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Jogadores", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Páginas de jogadores" }),
  ).toContainText("Página 2 de 2");
});
test("escopo vazio, erro e contaminação têm estados próprios sem placar fictício", async ({
  page,
}) => {
  const f = await teamPublicFixture(page);
  for (const g of f.source.games) g.phase = null;
  await page.goto(f.listUrl);
  await page.getByRole("button", { name: "Fase regular", exact: true }).click();
  await expect(
    page.getByText("Nenhuma inscrição neste recorte.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  f.state.corrupt = true;
  await page.getByRole("button", { name: "Todos", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Não foi possível");
  await expect(page.getByText("do-not-display")).toHaveCount(0);
  f.state.corrupt = false;
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(page.getByRole("table")).toBeVisible();
});
test("resposta atrasada e 320px/texto200% preservam rota e controles", async ({
  page,
}, info) => {
  const f = await teamPublicFixture(page);
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto(f.detailUrl);
  await expect(
    page.getByRole("heading", { name: "Lobos", exact: true }),
  ).toBeVisible();
  f.state.delayNext = 300;
  await page.getByRole("tab", { name: "Jogadores", exact: true }).click();
  await page.getByRole("tab", { name: "Jogos", exact: true }).click();
  await expect(page.locator(".team-profile-games")).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Estatísticas dos atletas", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Pular para o perfil", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#team-profile")).toBeFocused();
  await expect(page).toHaveURL(new RegExp(pubId(9) + ".*secao=jogos"));
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/team-public-320-text200-${info.project.name}.png`,
    fullPage: true,
  });
});
