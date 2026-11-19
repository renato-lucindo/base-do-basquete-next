import { test, expect } from "@playwright/test";
import { gamesFixture } from "./fixtures/games";
import { tid } from "./fixtures/text-import";
import { scanAccessibility } from "./fixtures/accessibility";
const route = (area: string) =>
  `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}${area}`;
test("Jogos ordena no servidor, carrega ao rolar e preserva contexto na edição e súmula", async ({
  page,
}, info) => {
  if (info.project.name === "desktop")
    await page.setViewportSize({ width: 1920, height: 945 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const f = await gamesFixture(page),
    home = f.registrations.get(tid(5))!,
    away = f.registrations.get(tid(6))!;
  for (let i = 0; i < 21; i++)
    f.registrations.set(tid(600 + i), {
      ...away,
      id: tid(600 + i),
      name: `Equipe ${i + 1}`,
    });
  const lastAway = f.registrations.get(tid(620))!;
  for (let i = 1; i <= 35; i++)
    f.games.set(tid(500 + i), {
      id: tid(500 + i),
      disputeId: tid(3),
      homeRegistrationId: home.id,
      awayRegistrationId: i === 34 ? lastAway.id : away.id,
      home,
      away: i === 34 ? lastAway : away,
      date: i === 34 ? "2026-11-19" : null,
      time: null,
      venue: "Local",
      number: String(i),
      version: 1,
      savedAt: "2026-10-23T19:00:00Z",
      state: i === 1 ? "finished" : "scheduled",
      timeZone: "America/Sao_Paulo",
      scheduledAt: null,
    });
  f.scores.set(tid(501), { home: 20, away: 0 });
  await page.route("**/api/games/*/sheet", (route) =>
    route.fulfill({ json: null }),
  );
  let failNextBatch = true;
  await page.route(/\/api\/games\?/, (route) => {
    if (
      failNextBatch &&
      new URL(route.request().url()).searchParams.get("offset") === "20"
    ) {
      failNextBatch = false;
      return route.fulfill({
        status: 503,
        json: {
          error: { code: "unavailable", message: "Falha ao carregar o lote." },
        },
      });
    }
    return route.fallback();
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
  await table
    .getByRole("button", { name: "Ordenar por Nº", exact: true })
    .click();
  const rows = table.locator("tbody tr");
  await expect(rows).toHaveCount(20);
  await expect(rows.first().locator("td").first()).toHaveText("1");
  await expect(rows.first().locator(".game-list-score")).toHaveText("20 × 0");
  await expect(rows.first().locator(".game-list-matchup")).toHaveText(
    /Lobos\s*20 × 0\s*Lobos B/,
  );
  await expect(table.getByRole("columnheader", { name: "Placar" })).toHaveCount(
    0,
  );
  await expect(rows.first()).toContainText("Resultado registrado");
  await expect(rows.nth(1).locator(".game-list-score")).toHaveText("—");
  const list = page.getByRole("region", { name: "Tabela de jogos" });
  if (info.project.name === "desktop")
    expect((await list.boundingBox())!.height).toBeGreaterThan(650);
  await list.evaluate((region) => {
    region.scrollTop = region.scrollHeight;
  });
  await expect(list.getByRole("alert")).toHaveText("Falha ao carregar o lote.");
  await expect(rows).toHaveCount(20);
  await list.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(rows).toHaveCount(35);
  await expect(rows.first().locator("td").first()).toHaveText("1");
  await expect(rows.last().locator("td").first()).toHaveText("35");
  if (info.project.name === "desktop") {
    await list.evaluate((region) => {
      region.scrollTop = 0;
    });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: ".preview-artifacts/admin-games-list-1920.png",
    });
  }
  const edit = rows
    .last()
    .getByRole("button", { name: "Editar jogo Lobos × Lobos B", exact: true });
  await expect(edit).toHaveCSS("color", "rgb(7, 95, 202)");
  await expect(
    page
      .getByRole("button", { name: "Novo jogo", exact: true })
      .locator("svg path"),
  ).toHaveAttribute("d", "M12 5v14M5 12h14");
  await edit.click();
  await page
    .getByRole("button", { name: "Voltar à lista de jogos", exact: true })
    .click();
  await expect(edit).toBeFocused();
  await expect
    .poll(() => list.evaluate((region) => region.scrollTop))
    .toBeGreaterThan(0);
  await expect(rows).toHaveCount(35);
  await expect(
    page.getByRole("textbox", { name: "Buscar jogo", exact: true }),
  ).toHaveValue("Local");
  const sheet = rows
    .last()
    .getByRole("button", { name: "Súmula de Lobos × Lobos B", exact: true });
  await sheet.click();
  await expect(
    page.getByRole("group", { name: "Navegação da súmula" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Editar jogo" })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Lista de jogos", exact: true })
    .click();
  await expect(sheet).toBeFocused();
  await table
    .getByRole("button", { name: "Ordenar por Nº", exact: true })
    .click();
  await expect(rows.first().locator("td").first()).toHaveText("35");
  const team = page.getByRole("combobox", { name: "Equipe", exact: true });
  const state = page.getByRole("combobox", { name: "Situação", exact: true });
  const date = page.getByLabel("Data", { exact: true });
  await team.selectOption({ label: "Equipe 21" });
  await expect(rows).toHaveCount(1);
  await expect(rows.first().locator("td").first()).toHaveText("34");
  await state.selectOption("finished");
  await expect(
    page.getByText("Nenhum jogo encontrado nesta disputa."),
  ).toBeVisible();
  await state.selectOption("scheduled");
  await date.fill("2026-11-19");
  await expect(rows).toHaveCount(1);
  await date.fill("2026-11-20");
  await expect(
    page.getByText("Nenhum jogo encontrado nesta disputa."),
  ).toBeVisible();
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
test("Adicionar disputa mantém categoria proporcional em desktop e reflow no celular", async ({
  page,
}, info) => {
  await gamesFixture(page);
  await page.route("**/api/competition-administration/listing", (request) =>
    request.fulfill({
      json: {
        items: [],
        total: 0,
        hasMore: false,
        years: [],
        championships: [],
      },
    }),
  );
  await page.goto("http://127.0.0.1:5174/foundation.html");
  const add = page.getByRole("button", { name: "Adicionar", exact: true });
  await add.click();
  const dialog = page.getByRole("dialog", {
    name: "Adicionar disputa",
    exact: true,
  });
  const category = dialog.getByRole("group", {
    name: "Categoria",
    exact: true,
  });
  const kind = category.getByRole("combobox", {
    name: "Categoria da disputa nova",
    exact: true,
  });
  await kind.selectOption("base");
  const age = category.getByRole("combobox", {
    name: "Faixa Etária da disputa nova",
    exact: true,
  });
  await expect(age).toBeVisible();
  await expect(
    category.getByText("Faixa Etária", { exact: true }),
  ).toBeVisible();
  await age.selectOption("15");
  await kind.selectOption("master");
  await expect(age).toHaveValue("");
  await age.selectOption("35");
  await expect(age).toHaveValue("35");
  const [kindBox, ageBox, dialogBox] = await Promise.all([
    kind.boundingBox(),
    age.boundingBox(),
    dialog.boundingBox(),
  ]);
  if (info.project.name === "desktop") {
    expect(kindBox!.width).toBeLessThanOrEqual(240 * 1.5);
    expect(ageBox!.width).toBeCloseTo(kindBox!.width, 0);
  }
  expect(ageBox!.x + ageBox!.width).toBeLessThan(
    dialogBox!.x + dialogBox!.width,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await kind.selectOption("adult");
  await expect(age).toHaveCount(0);
});

test("Ordenar mantém as linhas e a ordem anterior enquanto atualiza ou se falhar", async ({
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
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/api\/games\?/, async (r) => {
    if (
      new URL(r.request().url()).searchParams.get("sort") === "number" &&
      fail
    ) {
      await pending;
      await r.fulfill({
        status: 503,
        json: {
          error: { code: "access_unavailable", message: "Busca indisponivel." },
        },
      });
    } else await r.fallback();
  });
  await table
    .getByRole("button", { name: "Ordenar por Nº", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Atualizando jogos" }),
  ).toBeVisible();
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator("th[aria-sort]")).toHaveText(/Data/);
  release();
  await expect(page.getByRole("alert")).toContainText("Busca indisponivel.");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator("th[aria-sort]")).toHaveText(/Data/);
  await expect(
    page.getByText("Nenhum jogo encontrado nesta disputa.", { exact: true }),
  ).toHaveCount(0);
  fail = false;
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator("th[aria-sort]")).toHaveText(/Nº/);
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
