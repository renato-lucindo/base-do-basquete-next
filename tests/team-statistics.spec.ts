import { test, expect } from "@playwright/test";
import { teamPublicFixture } from "./fixtures/team-public-browser";
import { pubId } from "./fixtures/publication";
test("tabela por inscrição preserva duas linhas e alterna totais/médias por teclado", async ({
  page,
}) => {
  const f = await teamPublicFixture(page);
  await page.goto(f.listUrl);
  const table = page.getByRole("table", {
    name: "Equipes com resultados confirmados",
    exact: true,
  });
  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(
    table.getByRole("link", { name: "Lobos", exact: true }),
  ).toBeVisible();
  await expect(
    table.getByRole("link", { name: "Lobos B", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Modo", exact: true })
    .selectOption("total");
  await expect(
    page.getByRole("heading", {
      name: "Equipes com resultados confirmados",
      exact: true,
    }),
  ).toBeFocused();
  const lobos = table
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: "Lobos", exact: true }) });
  await expect(
    lobos.getByRole("cell", { name: "4", exact: true }),
  ).toBeVisible();
  await expect(
    lobos.getByRole("cell", { name: "-2", exact: true }),
  ).toBeVisible();
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
    name: "Equipes com resultados confirmados",
    exact: true,
  });
  await expect(table.getByRole("row")).toHaveCount(7);
  await table.getByRole("link", { name: "Inscrição 20", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Inscrição 20", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Voltar às equipes", exact: true })
    .click();
  await expect(page).toHaveURL(/page=2/);
  await expect(table.getByRole("row")).toHaveCount(7);
  await page
    .getByRole("textbox", { name: "Buscar equipe ou inscrição", exact: true })
    .fill("Inscrição 25");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(table.getByRole("row")).toHaveCount(2);
  await page.reload();
  await expect(
    page.getByRole("textbox", {
      name: "Buscar equipe ou inscrição",
      exact: true,
    }),
  ).toHaveValue("Inscrição 25");
});
test("ambiguidade exige inscrição e navegação conserva URL, foco e histórico", async ({
  page,
}) => {
  const f = await teamPublicFixture(page);
  await page.goto(f.detailUrl.replace(`&registrationId=${pubId(5)}`, ""));
  await expect(
    page.getByRole("heading", { name: "Escolha a inscrição", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Lobos B", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Lobos B", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp("registrationId=" + pubId(6)));
  for (const name of ["Participantes", "Jogos", "Resumo"]) {
    await page
      .getByRole("navigation", { name: "Seções da equipe" })
      .getByRole("link", { name, exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeFocused();
  }
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Jogos", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Jogos", exact: true }),
  ).toBeVisible();
});
test("participantes históricos separam homônimos, camisas0/00 e DNP de zero", async ({
  page,
}) => {
  const f = await teamPublicFixture(page);
  await page.goto(f.detailUrl + "&section=participantes&mode=total");
  const table = page.getByRole("table", {
    name: "Participantes em jogos publicados",
    exact: true,
  });
  await expect(table.getByRole("row")).toHaveCount(7);
  await expect(
    table.getByRole("cell", { name: "0", exact: true }),
  ).not.toHaveCount(0);
  await expect(
    table.getByRole("cell", { name: "00", exact: true }),
  ).toHaveCount(1);
  const dnp = table
    .getByRole("row")
    .filter({ has: page.locator(`a[href="/atleta.html#${pubId(7)}"]`) });
  await expect(dnp).toContainText("Não participou");
  await expect(
    dnp.getByRole("cell", { name: "—", exact: true }),
  ).not.toHaveCount(0);
  expect(await table.locator('a[href^="/atleta.html#"]').count()).toBe(6);
});
test("paginação de jogos/participantes não reduz resumo e preserva filtros", async ({
  page,
}) => {
  const f = await teamPublicFixture(page, { longDetail: true });
  await page.goto(
    f.detailUrl + "&section=participantes&mode=total&rosterPage=2&page=2",
  );
  await expect(
    page
      .getByRole("table", {
        name: "Participantes em jogos publicados",
        exact: true,
      })
      .getByRole("row"),
  ).toHaveCount(21);
  await page.getByRole("link", { name: "Jogos", exact: true }).click();
  await expect(
    page
      .getByRole("table", { name: "Jogos da inscrição", exact: true })
      .getByRole("row"),
  ).toHaveCount(6);
  await page.getByRole("link", { name: "Resumo", exact: true }).click();
  await expect(
    page.getByText("25 partidas publicadas", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/rosterPage=2/);
});
test("escopo vazio, erro e contaminação têm estados próprios sem placar fictício", async ({
  page,
}) => {
  const f = await teamPublicFixture(page);
  for (const g of f.source.games) g.phase = null;
  await page.goto(f.listUrl);
  await page
    .getByRole("combobox", { name: "Escopo", exact: true })
    .selectOption("regular");
  await expect(
    page.getByText(
      "Nenhuma inscrição com resultados confirmados neste recorte.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  f.state.corrupt = true;
  await page
    .getByRole("combobox", { name: "Escopo", exact: true })
    .selectOption("all");
  await expect(page.getByRole("alert")).toContainText("Não foi possível");
  await expect(page.getByText("do-not-display")).toHaveCount(0);
  f.state.corrupt = false;
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(page.getByRole("table")).toBeVisible();
});
test("resposta atrasada e320px/texto200% preservam rota/foco/controles", async ({
  page,
}, info) => {
  const f = await teamPublicFixture(page);
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto(f.detailUrl);
  await expect(
    page.getByRole("heading", { name: "Lobos", exact: true }),
  ).toBeVisible();
  f.state.delayNext = 300;
  await page.getByRole("link", { name: "Jogos", exact: true }).click();
  await page.getByRole("link", { name: "Participantes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Participantes", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("link", { name: "Pular para o conteúdo", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(pubId(9) + ".*section=participantes"),
  );
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
