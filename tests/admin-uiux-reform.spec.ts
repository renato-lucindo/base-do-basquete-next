import { test, expect } from "@playwright/test";
import { gamesFixture } from "./fixtures/games";
import { tid } from "./fixtures/text-import";
import { scanAccessibility } from "./fixtures/accessibility";
const route = (area: string) =>
  `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}${area}`;
test("Jogos ordena no servidor antes de paginar e conserva contexto ao fechar editor", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const f = await gamesFixture(page),
    home = f.registrations.get(tid(5))!,
    away = f.registrations.get(tid(6))!;
  for (let i = 1; i <= 35; i++)
    f.games.set(tid(500 + i), {
      id: tid(500 + i),
      disputeId: tid(3),
      homeRegistrationId: home.id,
      awayRegistrationId: away.id,
      home,
      away,
      date: null,
      time: null,
      venue: "Local",
      number: String(i),
      version: 1,
      savedAt: "2026-10-23T19:00:00Z",
      state: "scheduled",
      timeZone: "America/Sao_Paulo",
      scheduledAt: null,
    });
  await page.goto(route("/jogos"));
  const table = page.getByRole("table", {
    name: "Jogos da disputa",
    exact: true,
  });
  await page
    .getByRole("textbox", { name: "Buscar jogo", exact: true })
    .fill("Local");
  await expect(
    table.getByRole("columnheader", { name: /Data/ }),
  ).toHaveAttribute("aria-sort", "ascending");
  const request = page.waitForRequest(
    (r) => new URL(r.url()).searchParams.get("sort") === "number",
  );
  await table
    .getByRole("button", { name: "Ordenar por Nº", exact: true })
    .click();
  await request;
  await expect(table.locator("tbody tr")).toHaveCount(20);
  await expect(
    table.locator("tbody tr").first().locator("td").first(),
  ).toHaveText("1");
  await table
    .getByRole("button", { name: "Ordenar por Nº", exact: true })
    .click();
  await expect(
    table.locator("tbody tr").first().locator("td").first(),
  ).toHaveText("35");
  await page.getByRole("button", { name: "Mais jogos", exact: true }).click();
  await expect(
    table.locator("tbody tr").first().locator("td").first(),
  ).toHaveText("15");
  await table.locator("tbody tr").first().getByRole("button").click();
  await page
    .getByRole("button", { name: "Voltar à lista de jogos", exact: true })
    .click();
  await expect(table.getByRole("columnheader", { name: /Nº/ })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
  await expect(
    table.locator("tbody tr").first().locator("td").first(),
  ).toHaveText("15");
  await expect(
    page.getByRole("textbox", { name: "Buscar jogo", exact: true }),
  ).toHaveValue("Local");
  expect(errors).toEqual([]);
});
test("Equipes mostra painel escolhido e retorno acessivel", async ({
  page,
}, info) => {
  await gamesFixture(page);
  await page.goto(route("/equipes"));
  await expect(
    page.getByText("Selecione uma equipe para ver o elenco", { exact: true }),
  ).toBeVisible();
  const choice = page.getByRole("button", {
    name: "Expandir Lobos",
    exact: true,
  });
  await choice.click();
  const panel = page.getByRole("region", {
    name: "Elenco de Lobos",
    exact: true,
  });
  await expect(panel).toBeVisible();
  if (info.project.name === "desktop") {
    const list = await page
        .getByRole("region", { name: "Equipes inscritas", exact: true })
        .boundingBox(),
      detail = await panel.boundingBox();
    expect(detail!.x).toBeGreaterThan(list!.x + list!.width - 1);
    await page
      .getByRole("button", { name: "Expandir Lobos B", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Elenco de Lobos B", exact: true }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole("region", { name: "Equipes inscritas", exact: true }),
    ).toBeHidden();
    await page
      .getByRole("button", { name: "Voltar às equipes", exact: true })
      .click();
    await expect(choice).toBeVisible();
    await expect(choice).toBeFocused();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("Informacoes mantem categoria proporcional em desktop e reflow no celular", async ({
  page,
}, info) => {
  await gamesFixture(page);
  await page.goto(route(""));
  const category = page.getByRole("textbox", {
    name: "Categoria da disputa 1.1",
    exact: true,
  });
  await expect(category).toBeVisible();
  if (info.project.name === "desktop")
    expect((await category.boundingBox())!.width).toBeLessThanOrEqual(240);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Falha ao ordenar nao apresenta linhas antigas sob a nova ordem", async ({
  page,
}) => {
  const f = await gamesFixture(page),
    home = f.registrations.get(tid(5))!,
    away = f.registrations.get(tid(6))!;
  f.games.set(tid(501), {
    id: tid(501),
    disputeId: tid(3),
    homeRegistrationId: home.id,
    awayRegistrationId: away.id,
    home,
    away,
    date: null,
    time: null,
    venue: null,
    number: "1",
    version: 1,
    savedAt: "2026-10-23T19:00:00Z",
    state: "scheduled",
    timeZone: "America/Sao_Paulo",
    scheduledAt: null,
  });
  await page.goto(route("/jogos"));
  const table = page.getByRole("table", {
    name: "Jogos da disputa",
    exact: true,
  });
  await expect(table.locator("tbody tr")).toHaveCount(1);
  let fail = true;
  await page.route(/\/api\/games\?/, async (r) => {
    if (
      new URL(r.request().url()).searchParams.get("sort") === "number" &&
      fail
    )
      await r.fulfill({
        status: 503,
        json: {
          error: { code: "access_unavailable", message: "Busca indisponivel." },
        },
      });
    else await r.fallback();
  });
  await table
    .getByRole("button", { name: "Ordenar por Nº", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Busca indisponivel.");
  await expect(table.locator("tbody tr")).toHaveCount(0);
  await expect(
    page.getByText("Nenhum jogo encontrado nesta disputa.", { exact: true }),
  ).toHaveCount(0);
  fail = false;
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(table.locator("tbody tr")).toHaveCount(1);
});

test("Painel preserva edicao cancelada e so troca apos descarte confirmado", async ({
  page,
}) => {
  await gamesFixture(page);
  await page.goto(route("/equipes"));
  await page
    .getByRole("button", { name: "Expandir Lobos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adicionar atleta", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: /^(Criar nova pessoa|Cadastrar novo atleta)$/,
      exact: true,
    })
    .click();
  await page
    .getByLabel("Nome da pessoa", { exact: true })
    .fill("Atleta em rascunho");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Cancelar edição", exact: true })
    .click();
  await expect(page.getByLabel("Nome da pessoa", { exact: true })).toHaveValue(
    "Atleta em rascunho",
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Cancelar edição", exact: true })
    .click();
  const back = page.getByRole("button", {
    name: "Voltar às equipes",
    exact: true,
  });
  if (await back.isVisible()) await back.click();
  await page
    .getByRole("button", { name: "Expandir Lobos B", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Elenco de Lobos B", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Nome da pessoa", { exact: true })).toHaveCount(
    0,
  );
});
test("Retorno conserva pesquisa pagina e posicao da lista de equipes", async ({
  page,
}, info) => {
  const f = await gamesFixture(page),
    sample = f.registrations.get(tid(5))!;
  for (let i = 1; i <= 40; i++)
    f.registrations.set(tid(400 + i), {
      ...sample,
      id: tid(400 + i),
      name: "Equipe " + String(i).padStart(2, "0"),
    });
  await page.goto(route("/equipes"));
  const search = page.getByRole("textbox", {
    name: "Buscar inscrição ou equipe",
    exact: true,
  });
  await search.fill("Equipe");
  await page
    .getByRole("button", { name: "Próxima página", exact: true })
    .click();
  const choice = page.getByRole("button", {
    name: "Expandir Equipe 40",
    exact: true,
  });
  await choice.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => ({
    y: scrollY,
    scroll: document.querySelector(".teams-master")!.scrollTop,
  }));
  await choice.click();
  if (info.project.name === "mobile")
    await page
      .getByRole("button", { name: "Voltar às equipes", exact: true })
      .click();
  else
    await page
      .getByRole("button", { name: "Recolher Equipe 40", exact: true })
      .click();
  await expect(search).toHaveValue("Equipe");
  await expect(choice).toBeInViewport();
  expect(
    await page.evaluate(() => ({
      y: scrollY,
      scroll: document.querySelector(".teams-master")!.scrollTop,
    })),
  ).toEqual(before);
  await expect(
    page.getByRole("button", { name: "Página anterior", exact: true }),
  ).toBeVisible();
  if (info.project.name === "mobile") await expect(choice).toBeFocused();
});

test("Retorno permanece acessivel quando a inscricao salva sai do filtro", async ({
  page,
}, info) => {
  const f = await gamesFixture(page);
  await page.goto(route("/equipes"));
  const search = page.getByRole("textbox", {
    name: "Buscar inscrição ou equipe",
    exact: true,
  });
  await search.fill("Lobos B");
  await page
    .getByRole("button", { name: "Expandir Lobos B", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar inscrição", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nome público da inscrição", exact: true })
    .fill("Tigres");
  await page
    .getByRole("button", { name: "Salvar inscrição", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Elenco", exact: true }),
  ).toBeVisible();
  expect(f.registrations.get(tid(6))!.name).toBe("Tigres");
  const back = page.getByRole("button", {
    name: "Voltar às equipes",
    exact: true,
  });
  if (info.project.name === "mobile") {
    await expect(back).toBeVisible();
    await back.focus();
  }
  await scanAccessibility(page, info, "admin-registration-outside-filter");
  if (info.project.name === "mobile") {
    await page.keyboard.press("Enter");
    await expect(search).toBeFocused();
  }
  await expect(search).toBeVisible();
  await expect(search).toHaveValue("Lobos B");
  await search.fill("");
  await expect(
    page.getByRole("button", { name: "Expandir Tigres", exact: true }),
  ).toBeVisible();
});
