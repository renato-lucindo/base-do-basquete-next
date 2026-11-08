import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { publicNavigationFixture } from "./fixtures/public-navigation";
import { publicKnockoutFixture } from "./fixtures/public-regulation";
import { regulationId as id } from "./fixtures/regulation";
import { buildPublicStandings } from "../src/regulation/public";

const origin = "http://127.0.0.1:5174";
function source() {
  const s = publicKnockoutFixture();
  s.definition.groupPhases.push({
    ...structuredClone(s.definition.groupPhases[0]),
    phaseId: id(40),
    name: "Segunda fase",
    groups: [
      {
        id: id(41),
        name: "Grupo da segunda fase",
        registrationIds: [id(1), id(2)],
        gameIds: [id(110)],
      },
    ],
  });
  s.games.push({ ...s.games[0], id: id(110), date: null });
  s.publishedGames.push({
    ...s.publishedGames[0],
    gameId: id(110),
    homePoints: 60,
    awayPoints: 70,
  });
  return s;
}

test("cinco resultados em ordem, anel recente e decisão administrativa sem placar acompanham correções e exclusões", async ({
  page,
}) => {
  await publicNavigationFixture(page);
  const s = source();
  const group = s.definition.groupPhases[0].groups[0];
  for (let n = 111; n <= 117; n++) {
    const game = {
      ...s.games[0],
      id: id(n),
      date: `2026-11-${n - 100}`,
      time: "19:30",
    };
    s.games.push(game);
    group.gameIds.push(game.id);
    if (n < 117)
      s.publishedGames.push({
        ...s.publishedGames[0],
        gameId: game.id,
        homePoints: n % 2 ? 60 : 90,
      });
  }
  s.occurrences.push({
    id: id(210),
    version: 1,
    gameId: id(117),
    gameVersion: s.games[0].version,
    publicationVersion: 0,
    effect: {
      kind: "administrative",
      decision: {
        kind: "award",
        winnerRegistrationId: id(1),
        homeLeaguePoints: 2,
        awayLeaguePoints: 0,
        score: null,
      },
    },
  });
  buildPublicStandings(s);
  await page.route("**/api/public/standings/**", (r) =>
    r.fulfill({ json: buildPublicStandings(s) }),
  );
  await page.goto(`${origin}/publico.html#${s.disputeId}`);
  const row = page.getByRole("row").filter({
    has: page.getByRole("rowheader", { name: "Lobos", exact: true }),
  });
  const icons = row.locator(".standings-result");
  await expect(icons).toHaveCount(5);
  for (let i = 0; i < 5; i++)
    await expect(icons.nth(i)).toHaveAccessibleName(
      new RegExp(`${13 + i}/11/2026 às 19:30`),
    );
  await expect(row.locator("[data-latest]")).toHaveCount(1);
  await expect(icons.last()).toHaveAccessibleName(
    /Vitória.*Placar não informado.*administrativo.*mais recente/,
  );
  await icons.last().focus();
  await expect(page.getByRole("tooltip")).toHaveText(
    "LOB — x — Águias - 17/11",
  );
  await expect(row.getByRole("cell").nth(1)).toHaveText("8");
  s.publishedGames.find((g) => g.gameId === id(116))!.homePoints = 50;
  s.publishedGames.find((g) => g.gameId === id(116))!.publicationVersion++;
  await page.reload();
  await expect(icons.nth(3)).toHaveAccessibleName(
    /Derrota.*Lobos 50 × 70 Águias/,
  );
  s.occurrences[0] = {
    ...s.occurrences[0],
    version: 2,
    effect: { kind: "cancelled" },
  };
  await page.reload();
  await expect(icons.last()).toHaveAccessibleName(
    /Derrota.*16\/11\/2026.*mais recente/,
  );
  await expect(icons.last()).not.toHaveAccessibleName(/administrativo/);
  await expect(row.getByRole("cell").nth(1)).toHaveText("7");
});

test("grupo e fase na URL, recarga, voltar e seleção inválida preservam uma única tabela", async ({
  page,
}) => {
  await publicNavigationFixture(page);
  const s = source();
  buildPublicStandings(s);
  await page.route("**/api/public/standings/**", (r) =>
    r.fulfill({ json: buildPublicStandings(s) }),
  );
  await page.goto(
    `${origin}/publico.html#${s.disputeId}?secao=classificacao&fase=${id(10)}&grupo=${id(12)}`,
  );
  await expect(
    page.getByRole("combobox", { name: "Grupo", exact: true }),
  ).toHaveValue(id(12));
  await expect(page.getByRole("table")).toHaveCount(1);
  await expect(page.getByRole("rowheader")).toHaveText([
    "Inscrição 3",
    "Inscrição 4",
  ]);
  await page
    .getByRole("combobox", { name: "Grupo", exact: true })
    .selectOption(id(11));
  await expect(page).toHaveURL(new RegExp(`grupo=${id(11)}`));
  await page.reload();
  await expect(page.getByRole("rowheader")).toHaveText(["Lobos", "Águias"]);
  await page.goBack();
  await expect(
    page.getByRole("combobox", { name: "Grupo", exact: true }),
  ).toHaveValue(id(12));
  await page.getByRole("link", { name: "Segunda fase", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`fase=${id(40)}&grupo=${id(41)}`));
  await expect(
    page.getByRole("combobox", { name: "Grupo", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("rowheader")).toHaveText(["Águias", "Lobos"]);
  await expect(
    page.getByRole("button", {
      name: /Derrota contra Águias.*Data não informada/,
    }),
  ).toHaveCount(1);
  await page.goBack();
  await expect(
    page.getByRole("combobox", { name: "Grupo", exact: true }),
  ).toHaveValue(id(12));
  await page.goto(
    `${origin}/publico.html#${s.disputeId}?fase=invalida&grupo=invalido`,
  );
  await expect(
    page.getByRole("combobox", { name: "Grupo", exact: true }),
  ).toHaveValue(id(11));
  await expect(page).toHaveURL(new RegExp(`fase=${id(10)}&grupo=${id(11)}`));
});

test("ícones oferecem tooltip compacto por foco, hover e toque e descrição acessível completa, sem navegar", async ({
  page,
}, info) => {
  await publicNavigationFixture(page);
  const s = source();
  buildPublicStandings(s);
  await page.route("**/api/public/standings/**", (r) =>
    r.fulfill({ json: buildPublicStandings(s) }),
  );
  await page.goto(
    `${origin}/publico.html#${s.disputeId}?fase=${id(10)}&grupo=${id(11)}`,
  );
  const result = page.getByRole("button", { name: /Vitória contra Águias/ });
  await expect(result).toHaveAccessibleName(
    /10\/11\/2026.*Lobos 80 × 70 Águias.*mais recente/,
  );
  expect(
    await result.locator("svg").evaluate((el) => getComputedStyle(el).stroke),
  ).toBe("rgb(255, 255, 255)");
  await result.focus();
  await expect(page.getByRole("tooltip")).toHaveText(
    "LOB 80 x 70 Águias - 10/11",
  );
  await expect(result).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();
  await result.blur();
  if (info.project.name === "mobile") await result.tap();
  else await result.hover();
  await expect(page.getByRole("tooltip")).toHaveText(
    "LOB 80 x 70 Águias - 10/11",
  );
  const url = page.url();
  await result.click();
  await expect(page).toHaveURL(url);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("cabeçalhos e legenda usam apenas significados curtos e dispensam avisos genéricos", async ({
  page,
}, info) => {
  await publicNavigationFixture(page);
  const s = source();
  await page.route("**/api/public/standings/**", (r) =>
    r.fulfill({ json: buildPublicStandings(s) }),
  );
  await page.goto(`${origin}/publico.html#${s.disputeId}`);
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  await expect(
    page.getByText("Classificação provisória", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Resultados publicados atualizam esta consulta/),
  ).toHaveCount(0);
  for (const label of ["Equipe", "Últimos jogos"]) {
    const header = table.getByRole("columnheader", {
      name: label,
      exact: true,
    });
    await expect(header).toHaveText(label);
    await expect(header.getByRole("button")).toHaveCount(0);
    await expect(header.locator("[title], [aria-describedby]")).toHaveCount(0);
  }
  const meanings = [
    ["Pos.", "Posição"],
    ["J", "Jogos"],
    ["V", "Vitórias"],
    ["D", "Derrotas"],
    ["Aprov.", "Aproveitamento"],
    ["PP", "Pontos pró"],
    ["PC", "Pontos contra"],
    ["SLD", "Saldo de pontos"],
  ];
  for (const [label, meaning] of meanings) {
    const help = table
      .locator("thead")
      .getByRole("button", { name: `${label}: ${meaning}`, exact: true });
    await help.focus();
    await expect(page.getByRole("tooltip")).toHaveText(meaning);
    await page.keyboard.press("Escape");
  }
  const help = table
    .locator("thead")
    .getByRole("button", { name: "V: Vitórias", exact: true });
  await help.blur();
  if (info.project.name === "mobile") await help.tap();
  else await help.hover();
  await expect(page.getByRole("tooltip")).toHaveText("Vitórias");
  const legend = page.getByRole("region", { name: "Legenda da classificação" });
  await expect(
    legend.getByRole("heading", { name: "Legenda", exact: true }),
  ).toBeVisible();
  await expect(legend.locator("dt")).toHaveText(
    meanings.map(([label]) => label),
  );
  await expect(legend.locator("dd")).toHaveText(
    meanings.map(([, meaning]) => meaning),
  );
  await expect(legend.locator("p")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("tooltip usa siglas, ordem do confronto e DD/MM; ausência de sigla ou data não acrescenta explicações", async ({
  page,
}) => {
  await publicNavigationFixture(page);
  const s = source();
  s.registrations[0].team.abbreviation = "LUSB";
  s.registrations[1].team.abbreviation = "IVV/Cetaf";
  s.games[0].date = "2026-09-20";
  s.publishedGames[0].homePoints = 56;
  s.publishedGames[0].awayPoints = 66;
  await page.route("**/api/public/standings/**", (r) =>
    r.fulfill({ json: buildPublicStandings(s) }),
  );
  await page.goto(`${origin}/publico.html#${s.disputeId}`);
  const icon = page
    .getByRole("row")
    .filter({
      has: page.getByRole("rowheader", { name: "Lobos", exact: true }),
    })
    .locator(".standings-result");
  await icon.focus();
  await expect(page.getByRole("tooltip")).toHaveText(
    "LUSB 56 x 66 IVV/Cetaf - 20/09",
  );
  await expect(icon).toHaveAccessibleName(/Derrota.*Lobos 56 × 66 Águias/);
  s.games[0].date = null;
  s.registrations[1].team.abbreviation = null;
  s.publishedGames[0].homePoints = 0;
  await page.reload();
  await icon.focus();
  await expect(page.getByRole("tooltip")).toHaveText("LUSB 0 x 66 Águias");
  await expect(icon).toHaveAccessibleName(/Data não informada/);
});

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
  { width: 320, height: 844 },
]) {
  test(`tabela compacta com cabeçalho e equipe fixos em ${viewport.width} CSS px`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await publicNavigationFixture(page);
    const s = source();
    for (let n = 800; n < 825; n++) {
      s.registrations.push({
        ...s.registrations[0],
        id: id(n),
        name: n === 800 ? "Equipe NomeMuitoLongo".repeat(4) : `Equipe ${n}`,
      });
      s.definition.registrationIds.push(id(n));
      s.definition.groupPhases[0].groups[0].registrationIds.push(id(n));
    }
    await page.route("**/api/public/standings/**", (r) =>
      r.fulfill({ json: buildPublicStandings(s) }),
    );
    await page.goto(`${origin}/publico.html#${s.disputeId}`);
    const region = page.getByRole("region", {
      name: "Classificação do Grupo único",
    });
    await expect(region).toBeVisible();
    const table = region.getByRole("table");
    await expect(table.getByRole("columnheader")).toHaveText([
      "Pos.",
      "Equipe",
      "J",
      "V",
      "D",
      "Aprov.",
      "PP",
      "PC",
      "SLD",
      "Últimos jogos",
    ]);
    expect(
      await page
        .locator("html")
        .evaluate((el) => getComputedStyle(el).fontSize),
    ).toBe(viewport.width >= 640 ? "24px" : "16px");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const identity = table.locator("thead th").nth(1);
    await expect(table.getByRole("columnheader").last()).toHaveCSS(
      "text-align",
      "center",
    );
    await region.evaluate((el) => {
      el.scrollLeft = 500;
      el.scrollTop = 300;
    });
    const geometry = await identity.evaluate((el) => {
      const r = el.getBoundingClientRect(),
        p = el.closest(".statistics-table-wrap")!.getBoundingClientRect();
      return { left: r.left - p.left, top: r.top - p.top };
    });
    expect(Math.abs(geometry.top)).toBeLessThanOrEqual(2);
    if (viewport.width < 1366)
      expect(Math.abs(geometry.left)).toBeLessThanOrEqual(2);
    await region.focus();
    await expect(region).toBeFocused();
    await page.keyboard.press("Home");
    await expect.poll(() => region.evaluate((el) => el.scrollTop)).toBe(0);
    await region.evaluate((el) => {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    });
    await page.screenshot({
      path: `.preview-artifacts/standings-recent-after-${viewport.width}-${info.project.name}.png`,
      fullPage: true,
    });
  });
}
