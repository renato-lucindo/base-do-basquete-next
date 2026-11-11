import { test, expect } from "@playwright/test";
import { playerPublicFixture } from "./fixtures/player-public-browser";
import { teamPublicFixture } from "./fixtures/team-public-browser";
import AxeBuilder from "@axe-core/playwright";
import { confirmedManualFixture } from "./fixtures/statistics-publications";

test("v9: placar exige a mesma publicação da participação", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  const result = confirmedManualFixture();
  const row = page.locator(`.player-recent tr[data-game="${result.id}"]`);
  await page.goto(f.url);
  await expect(row.locator(".player-match-score")).toHaveText(
    `${result.facts.teams.home.points} × ${result.facts.teams.away.points}`,
  );
  await page.route(`**/api/public/games/${result.id}`, (route) =>
    route.fulfill({ json: { ...result, version: result.version + 1 } }),
  );
  const response = page.waitForResponse((r) =>
    r.url().endsWith(`/api/public/games/${result.id}`),
  );
  await page.reload();
  await response;
  await expect(row.locator(".player-match-score")).toHaveText("—");
});

test("v9: toque ou teclado expandem recordes sem abrir o confronto", async ({
  page,
}, info) => {
  const f = await playerPublicFixture(page, { long: true });
  await page.goto(f.url + "?secao=historico");
  const action = page.locator('[data-metric="points"] button');
  if (info.project.use.hasTouch) await action.tap();
  else {
    await action.focus();
    await page.keyboard.press("Space");
  }
  await expect(
    page.getByRole("button", { name: "Recolher top 5 de PTS", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  const target = await action.boundingBox();
  expect(target!.width).toBeGreaterThanOrEqual(44);
  expect(target!.height).toBeGreaterThanOrEqual(44);
  expect(page.url()).toContain("secao=historico");
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Ver top 5 de PTS", exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole("button", { name: "Recolher top 5 de PTS", exact: true }),
  ).toBeVisible();
});

test("v9: quatro abas, síntese branca, legenda final curta e nenhum painel extra", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { long: true });
  await page.goto(f.url);
  await expect(page.getByRole("tab")).toHaveText([
    "Visão geral",
    "Estatísticas",
    "Carreira",
    "Ver jogos",
  ]);
  await expect(
    page
      .getByRole("table", { name: "Últimos jogos", exact: true })
      .locator("tbody tr"),
  ).toHaveCount(5);
  await expect(page.locator(".player-records")).toHaveCount(0);
  for (const row of await page.locator(".player-summary tbody tr").all())
    expect(await row.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(
      "rgb(255, 255, 255)",
    );
  await expect(page.locator(".player-summary thead th").first()).toHaveText(
    "Resumo",
  );
  await expect(
    page.getByText(
      /Médias por jogo|Evolução|Siglas e cobertura|J conta os jogos/,
    ),
  ).toHaveCount(0);
  await expect(page.locator(".player-legend")).toHaveCount(1);
  await expect(page.locator(".player-legend dt").first()).toHaveText("J");
  await expect(page.locator(".player-legend dd").first()).toHaveText("Jogos");
  await page.getByRole("tab", { name: "Visão geral", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Ver jogos", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("tab", { name: "Visão geral", exact: true }),
  ).toBeFocused();
});
test("v9: recordes independentes, somente 2º–5º e restauração de expansão", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { long: true });
  await page.goto(f.url + "?secao=historico");
  const table = page.getByRole("table", {
    name: "Recordes da carreira",
    exact: true,
  });
  await expect(table.locator(".player-record-main")).toHaveCount(4);
  expect(
    await table
      .locator(".player-record-value")
      .first()
      .evaluate((e) => getComputedStyle(e).color),
  ).toBe("rgb(21, 87, 164)");
  for (const label of ["PTS", "LL"])
    await table
      .getByRole("button", { name: `Ver top 5 de ${label}`, exact: true })
      .click();
  await expect(table.locator('[data-metric="points"] [data-game]')).toHaveCount(
    5,
  );
  expect(
    new Set(
      await table
        .locator('[data-metric="points"] [data-game]')
        .evaluateAll((es) => es.map((e) => e.getAttribute("data-game"))),
    ).size,
  ).toBe(5);
  expect(
    await table
      .locator(".player-record-ranking")
      .first()
      .evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toBe("rgb(245, 248, 252)");
  await table
    .getByRole("button", { name: "Recolher top 5 de PTS", exact: true })
    .click();
  await expect(
    table.locator('[data-metric="freeMade"] [data-game]'),
  ).toHaveCount(5);
  await page.reload();
  await expect(
    table.locator('[data-metric="freeMade"] [data-game]'),
  ).toHaveCount(5);
  await expect(table.locator('[data-metric="points"] [data-game]')).toHaveCount(
    1,
  );
});
test("v9: página efetiva, 12 jogos por página e filtro aplicado reinicia paginação", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { long: true });
  await page.goto(f.url + "?secao=jogos&page=500");
  const table = page.getByRole("table", {
    name: "Jogos do atleta",
    exact: true,
  });
  await expect(page.getByText("Página 3 de 3", { exact: true })).toBeVisible();
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(12);
  await page
    .getByRole("button", { name: "Filtrar e ajustar", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Ano", exact: true })
    .selectOption("2026");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page).not.toHaveURL(/page=2/);
});
test("v9: modal prepara filtros, Cancelar e Escape preservam seleção e foco", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  await page.goto(f.url + "?secao=jogos");
  const trigger = page.getByRole("button", {
    name: "Filtrar e ajustar",
    exact: true,
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await trigger.click();
  await page
    .getByRole("searchbox", { name: "Buscar adversário", exact: true })
    .fill("VITÓRIA");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page).not.toHaveURL(/adversario/);
  await trigger.click();
  await page
    .getByRole("combobox", { name: "Ano", exact: true })
    .selectOption("2026");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  const applied = page.url();
  await trigger.click();
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(page.url()).toBe(applied);
  await page.getByRole("tab", { name: "Estatísticas", exact: true }).click();
  await trigger.click();
  await page
    .getByRole("combobox", { name: "Ano", exact: true })
    .selectOption("2027");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await page.getByRole("tab", { name: "Ver jogos", exact: true }).click();
  await trigger.click();
  await expect(
    page.getByRole("combobox", { name: "Ano", exact: true }),
  ).toHaveValue("2026");
});
test("v9: confronto inteiro abre a partida; equipe fora dele abre a equipe", async ({
  page,
}) => {
  await teamPublicFixture(page);
  const f = await playerPublicFixture(page);
  await page.goto(f.url + "?anoPerfil=2026");
  const row = page.locator(
    `.player-recent tr[data-game="${f.source.participations[0].fact.gameId}"]`,
  );
  await expect(row.locator("a")).toHaveCount(1);
  await expect(row.locator('a[href*="equipe.html"]')).toHaveCount(0);
  for (const selector of [
    ".player-match-team:first-child",
    ".player-match-team:last-child",
    ".player-game-points",
  ]) {
    const part = row.locator(selector);
    await part.scrollIntoViewIfNeeded();
    const box = await part.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(
      page.getByRole("region", {
        name: "Parciais e placar final",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Voltar à origem", exact: true })
      .click();
    await expect(row).toBeVisible();
    expect(page.url()).toContain("anoPerfil=2026");
  }
  await page.locator(".player-current-team a").click();
  await expect(page.locator(".team-public-page").first()).toBeVisible();
  await page
    .getByRole("link", { name: "Voltar à origem", exact: true })
    .click();
  await page.getByRole("tab", { name: "Carreira", exact: true }).click();
  const knownId = f.source.participations[0].fact.gameId;
  if (
    !(await page.locator(`.player-record-value a[href*="${knownId}"]`).count())
  )
    await page
      .getByRole("button", { name: "Ver top 5 de PTS", exact: true })
      .click();
  const mark = page
      .locator(`.player-record-value a[href*="${knownId}"]`)
      .first(),
    match = mark.locator("xpath=ancestor::tr").locator(".player-record-game");
  expect(await mark.getAttribute("href")).toBe(
    await match.getAttribute("href"),
  );
  await match.click();
  await expect(
    page.getByRole("region", { name: "Parciais e placar final", exact: true }),
  ).toBeVisible();
});
test("v9: trajetória termina nos pontos e um único item não tem linha", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  const otherTeam = "f9000000-0000-4000-8000-000000009999";
  f.source.participations[1].fact.registration.team.id = otherTeam;
  f.source.participations[1].game.home.team.id = otherTeam;
  await page.goto(f.url + "?secao=historico&historicoEquipes=1");
  const items = page.locator(".player-trajectory li");
  await expect(items).toHaveCount(2);
  expect(
    await items
      .first()
      .evaluate((e) => getComputedStyle(e, "::before").content),
  ).toBe("none");
  expect(
    await items.last().evaluate((e) => getComputedStyle(e, "::after").content),
  ).toBe("none");
  await expect(page.locator(".player-trajectory")).not.toContainText(
    f.source.participations[0].fact.context.name,
  );
  for (const item of await items.all()) {
    const geometry = await item.evaluate((e) => {
      const r = e.getBoundingClientRect(),
        p = e
          .querySelector(".player-trajectory-point")!
          .getBoundingClientRect();
      return { center: r.y + r.height / 2, point: p.y + p.height / 2 };
    });
    expect(Math.abs(geometry.center - geometry.point)).toBeLessThan(1);
  }
  const single = await playerPublicFixture(page, { long: true });
  await page.goto(single.url + "?secao=historico&historicoEquipes=1");
  await page.reload();
  await expect(items).toHaveCount(1);
  expect(
    await items
      .first()
      .evaluate((e) => [
        getComputedStyle(e, "::before").content,
        getComputedStyle(e, "::after").content,
      ]),
  ).toEqual(["none", "none"]);
});
for (const width of [320, 390, 1366, 1920])
  test(`v9: alinhamento, nomes, datas e recordes em ${width}px`, async ({
    page,
  }, info) => {
    const f = await playerPublicFixture(page, { long: true });
    f.source.participations.forEach((g, i) => {
      g.game.date = `2026-01-${String(i + 1).padStart(2, "0")}`;
    });
    f.source.profile!.person.publicBirthYear = 2009;
    await page.setViewportSize({ width, height: width >= 1050 ? 1080 : 844 });
    await page.goto(f.url);
    const recent = page.locator(".player-recent");
    await expect(recent.locator("tbody tr")).toHaveCount(5);
    await expect(recent.locator("tbody td").first()).toHaveText(
      /\d{2}\/\d{2}\/\d{4}/,
    );
    await expect(
      recent.locator(".player-game-context").first(),
    ).not.toContainText("2026");
    if (width >= 1050) {
      const a = await page.locator(".player-desktop-honors").boundingBox(),
        b = await recent.boundingBox();
      expect(Math.abs(a!.x - b!.x)).toBeLessThan(1);
    } else
      await expect(
        recent.locator(".player-team-full").first(),
      ).not.toBeVisible();
    await page.getByRole("tab", { name: "Estatísticas", exact: true }).click();
    await expect(page.locator(".player-age")).toHaveCount(21);
    expect(
      await page
        .locator("th.player-champ button")
        .evaluate((e) => getComputedStyle(e).textAlign),
    ).toBe("center");
    await expect(page.locator(".player-champ a").first()).toHaveText(
      f.source.participations[0].fact.registration.name,
    );
    await page.getByRole("tab", { name: "Carreira", exact: true }).click();
    const table = page.locator(".player-records table");
    for (const label of ["PTS", "2P", "3P", "LL"])
      await page
        .getByRole("button", { name: `Ver top 5 de ${label}`, exact: true })
        .click();
    const geometry = await table.evaluate((el) => ({
      head: [...el.querySelectorAll("thead th")].map((e) =>
        e.getBoundingClientRect().toJSON(),
      ),
      rows: [...el.querySelectorAll("tbody tr")].map((e) =>
        [...e.children].map((c) => c.getBoundingClientRect().toJSON()),
      ),
    }));
    for (const row of geometry.rows)
      for (const [h, c] of [
        [1, 2],
        [2, 3],
        [3, 4],
      ])
        expect(
          Math.abs(
            geometry.head[h].x +
              geometry.head[h].width / 2 -
              row[c].x -
              row[c].width / 2,
          ),
        ).toBeLessThan(1);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    if (info.project.name === "desktop")
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
  });
