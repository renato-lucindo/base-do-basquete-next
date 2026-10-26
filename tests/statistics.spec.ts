import { test, expect } from "@playwright/test";
import { statisticsBrowserFixture } from "./fixtures/statistics-browser";
import { regulationBrowserFixture } from "./fixtures/regulation-browser";
import { tid } from "./fixtures/text-import";

test("nome estatístico liga à identidade estável no perfil público", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url);
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  const person = f.source.games[0].snapshot.facts.players[0].person;
  await expect(
    table.locator(`a[href="/atleta.html#${person.id}"]`).first(),
  ).toBeVisible();
});

test("comparação resume todas inscrições e destaca melhor/pior sem transformar ausência em empate", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page, {
      multipleRegistrations: true,
    }),
    first = f.source.games[0].snapshot.facts.players[0].person.id,
    second = f.source.games[1].snapshot.facts.players[0].person.id;
  await page.goto(
    f.url + `&mode=total&preset=simple&compare=${first},${second}`,
  );
  const table = page.getByRole("table", {
    name: "Resumo comparativo dos atletas",
    exact: true,
  });
  await expect(table).toBeVisible();
  const points = table.getByRole("row").filter({
    has: page.getByRole("rowheader", { name: "Pontos", exact: true }),
  });
  await expect(
    points.getByLabel("Melhor valor: 4", { exact: true }),
  ).toBeVisible();
  await expect(
    points.getByLabel("Pior valor: 2", { exact: true }),
  ).toBeVisible();
});

test("disputa salva oferece estatísticas em outra aba sem substituir edição administrativa", async ({
  page,
}) => {
  await regulationBrowserFixture(page);
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`,
  );
  const link = page.getByRole("link", {
    name: "Estatísticas publicadas",
    exact: true,
  });
  await expect(link).toHaveAttribute(
    "href",
    `/estatisticas.html#${tid(3)}?scope=all`,
  );
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/u);
});

test("seleção por teclado mantém foco após consulta e limita comparação a dois atletas", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url);
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  const boxes = table.getByRole("checkbox"),
    label = await boxes.first().getAttribute("aria-label");
  await boxes.first().focus();
  await page.keyboard.press("Space");
  const first = table.getByRole("checkbox", { name: label!, exact: true });
  await expect(first).toBeChecked();
  await expect(
    page
      .getByRole("table", {
        name: "Resumo comparativo dos atletas",
        exact: true,
      })
      .getByRole("columnheader", { name: /Resumo: João 1-0/u }),
  ).toBeVisible();
  await expect(first).toBeFocused();
  await boxes.nth(1).check();
  await expect(boxes.nth(2)).toBeDisabled();
});
test("adicionar filtro foca a métrica e permite remover filtro ainda incompleto", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url);
  await page
    .getByRole("button", { name: "Adicionar filtro", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Métrica do filtro 1", exact: true }),
  ).toBeFocused();
  await page.getByLabel("Valor do filtro 1", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Remover filtro 1", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Métrica do filtro 1", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Adicionar filtro", exact: true }),
  ).toBeFocused();
});

test("atalho para conteúdo preserva URL da consulta e permite foco por teclado", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url);
  await expect(page.getByRole("table")).toBeVisible();
  const url = page.url();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Ir para estatísticas" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  expect(page.url()).toBe(url);
  await expect(page.getByRole("main")).toBeFocused();
});

test("consulta estatística pagina, compartilha URL e restaura recorte ao recarregar", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url + "&preset=simple&mode=total");
  await expect(
    page.getByRole("heading", {
      name: "Estatísticas dos atletas",
      exact: true,
    }),
  ).toBeVisible();
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  await expect(table.getByRole("row")).toHaveCount(21);
  await expect(
    page.getByRole("status").filter({ hasText: "33 participações" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Próxima página", exact: true })
    .click();
  await expect(table.getByRole("row")).toHaveCount(14);
  await expect(page).toHaveURL(/page=2/u);
  await page.reload();
  await expect(table.getByRole("row")).toHaveCount(14);
  await page
    .getByRole("combobox", { name: "Escopo", exact: true })
    .selectOption("regular");
  await expect(page).toHaveURL(/page=1/u);
  await expect(
    page.getByRole("status").filter({ hasText: "11 participações" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Escopo", exact: true }),
  ).toHaveValue("regular");
});
test("MIN oculta por30 preserva coluna e remove filtro/ordem incompatíveis", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url + "&preset=all&sort=minutes&filters=minutes:%3E:0");
  await expect(
    page.getByRole("combobox", { name: "Ordenar por", exact: true }),
  ).toHaveValue("minutes");
  await page
    .getByRole("combobox", { name: "Modo", exact: true })
    .selectOption("per-30");
  await expect(
    page.getByRole("columnheader", { name: "Minutos", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Ordenar por", exact: true }),
  ).toHaveValue("points");
  const columns = page.getByRole("group", { name: "Colunas visíveis" });
  await page.getByText("Personalizar colunas", { exact: true }).click();
  await expect(
    columns.getByLabel("Minutos (MIN)", { exact: true }),
  ).toBeChecked();
  await expect(
    columns.getByLabel("Minutos (MIN)", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("combobox", { name: "Modo", exact: true })
    .selectOption("total");
  await expect(
    page.getByRole("columnheader", { name: "Minutos", exact: true }),
  ).toBeVisible();
});
test("comparação fora da página mantém todas inscrições do atleta e permite remover seleção", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page, {
      multipleRegistrations: true,
    }),
    first = f.source.games[0].snapshot.facts.players[0].person.id,
    second = f.source.games[1].snapshot.facts.players[0].person.id;
  await page.goto(f.url + `&page=2&compare=${first},${second}`);
  const comparison = page.getByRole("region", {
    name: "Comparação de atletas",
    exact: true,
  });
  await expect(
    comparison.getByText("Outra inscrição", { exact: true }),
  ).toBeVisible();
  await expect(comparison.getByText("João 1-0", { exact: true })).toBeVisible();
  await expect(comparison.getByText("João 2-0", { exact: true })).toBeVisible();
  await comparison.getByRole("button", { name: /Remover João 1-0/u }).click();
  await expect(
    comparison.getByText("Outra inscrição", { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(comparison.getByText("João 2-0", { exact: true })).toBeVisible();
});
test("busca/filtros por teclado, equipes vazias e líderes antes da página têm estados claros", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url);
  const search = page.getByLabel("Buscar atleta ou equipe", { exact: true });
  await search.fill("joao");
  await search.press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: "3 participações" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Adicionar filtro", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Métrica do filtro 1", exact: true })
    .selectOption("points");
  await page.getByLabel("Valor do filtro 1", { exact: true }).fill("3");
  await page
    .getByRole("button", { name: "Aplicar consulta", exact: true })
    .click();
  await expect(
    page.getByText("Nenhuma participação atende à consulta.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remover filtro 1", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Todas as equipes", exact: true })
    .uncheck();
  await expect(
    page.getByText("Nenhuma equipe selecionada.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Todas as equipes", exact: true })
    .check();
  await expect(
    page.getByRole("status").filter({ hasText: "3 participações" }),
  ).toBeVisible();
});
test("amostra insuficiente difere de ausência sem esconder atleta e filtros não usam valor fictício", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page, { insufficient: true });
  await page.goto(f.url + "&mode=per-30");
  await expect(
    page.getByLabel("Amostra insuficiente", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("—", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Mínimo para o cálculo por 30/u)).toBeVisible();
  await page
    .getByRole("button", { name: "Adicionar filtro", exact: true })
    .click();
  await page.getByLabel("Valor do filtro 1", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Aplicar consulta", exact: true })
    .click();
  await expect(
    page.getByText("Nenhuma participação atende à consulta.", { exact: true }),
  ).toBeVisible();
});
test("falha de consulta permite retry e contexto sem publicação não finge tabela de zeros", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  f.state.failNext = true;
  await page.goto(f.url);
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível consultar",
  );
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Estatísticas dos atletas", exact: true }),
  ).toBeVisible();
  f.state.empty = true;
  await page.reload();
  await expect(
    page.getByText("Ainda não há resultados confirmados nesta disputa.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});
test("resposta antiga não substitui recorte novo;320px conserva controles e tabela rolável", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(f.url);
  await expect(page.getByRole("table")).toBeVisible();
  f.state.delayNext = 300;
  await page
    .getByRole("combobox", { name: "Escopo", exact: true })
    .selectOption("regular");
  await page
    .getByRole("combobox", { name: "Escopo", exact: true })
    .selectOption("all");
  await expect(
    page.getByRole("status").filter({ hasText: "33 participações" }),
  ).toBeVisible();
  await page.waitForTimeout(350);
  await expect(
    page.getByRole("combobox", { name: "Escopo", exact: true }),
  ).toHaveValue("all");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("region", {
      name: "Tabela estatística rolável",
      exact: true,
    }),
  ).toHaveAttribute("tabindex", "0");
  await page.screenshot({
    path: `.preview-artifacts/statistics-${test.info().project.name}-320.png`,
    fullPage: true,
  });
});
