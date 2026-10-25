import { test, expect, type Page } from "@playwright/test";
import { regulationBrowserFixture } from "./fixtures/regulation-browser";
import { tid } from "./fixtures/text-import";
async function prepare(page: Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`,
  );
  await page
    .getByRole("heading", { name: "Regulamento da disputa", exact: true })
    .waitFor();
  await page.getByLabel("Incluir Lobos", { exact: true }).check();
  await page.getByLabel("Incluir Lobos B", { exact: true }).check();
  await page
    .getByRole("button", { name: "Adicionar pontos corridos", exact: true })
    .click();
  await page.getByLabel("Pontos por vitória", { exact: true }).fill("2");
  await page.getByLabel("Pontos por derrota", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Ver jogos para atribuir", exact: true })
    .click();
  await page
    .getByLabel("Organização do jogo 1", { exact: true })
    .selectOption({ label: "Fase 1 / Grupo 1" });
}
test("organiza pontos corridos, confere impacto, salva e retoma a classificação após recarregar", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  await prepare(page);
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Depois da alteração", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Confirmar e salvar regulamento",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByLabel("Motivo da alteração", { exact: true })
    .fill("Regras conferidas com o resultado registrado");
  await page
    .getByLabel("Conferi o impacto nos resultados e cruzamentos", {
      exact: true,
    })
    .check();
  await page
    .getByRole("button", {
      name: "Confirmar e salvar regulamento",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Regulamento salvo" }),
  ).toBeVisible();
  expect(f.getState().version).toBe(1);
  await page.reload();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("2");
  await expect(
    page.getByRole("heading", { name: "Classificação atual", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver versão 1", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Versão 1 do regulamento", exact: true }),
  ).toBeVisible();
});
test("repete somente o comando congelado depois de resposta perdida sem criar outra versão", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  await prepare(page);
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await page
    .getByLabel("Motivo da alteração", { exact: true })
    .fill("Conferência para salvar esta organização");
  await page
    .getByLabel("Conferi o impacto nos resultados e cruzamentos", {
      exact: true,
    })
    .check();
  f.uncertain();
  await page
    .getByRole("button", {
      name: "Confirmar e salvar regulamento",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir envio do regulamento", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Regulamento salvo" }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(2);
  expect(f.attempts[0]).toBe(f.attempts[1]);
  expect(f.getState().version).toBe(1);
});

test("recupera falha do catálogo inicial sem liberar um editor sem inscrições", async ({
  page,
}) => {
  await regulationBrowserFixture(page);
  let failed = false;
  await page.route(/\/api\/registrations\?/, async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({
        status: 503,
        json: {
          error: {
            code: "access_unavailable",
            message: "Catálogo indisponível.",
          },
        },
      });
    } else await route.fallback();
  });
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`,
  );
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(page.getByLabel("Incluir Lobos", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Incluir Lobos B", { exact: true }),
  ).toBeVisible();
});

test("preserva edição quando o contexto muda e exige conferir uma nova prévia", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  await prepare(page);
  f.changeContext();
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Recarregar dados para nova prévia",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("2");
  expect(f.attempts).toHaveLength(0);
  await page
    .getByRole("button", {
      name: "Recarregar dados para nova prévia",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("2");
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Depois da alteração", exact: true }),
  ).toBeVisible();
});

test("preserva slots atribuídos ao trocar formato e permite remover eliminatória vazia", async ({
  page,
}) => {
  await regulationBrowserFixture(page);
  await prepare(page);
  await page
    .getByRole("button", { name: "Adicionar eliminatória", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adicionar confronto", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Formato do confronto", exact: true })
    .selectOption("best_of_7");
  await page
    .getByLabel("Organização do jogo 1", { exact: true })
    .selectOption({ label: "Confronto 1 / Jogo 7" });
  await expect(
    page
      .getByRole("combobox", { name: "Formato do confronto", exact: true })
      .locator('option[value="single"]'),
  ).toHaveJSProperty("disabled", true);
  await page
    .getByLabel("Organização do jogo 1", { exact: true })
    .selectOption("");
  await page
    .getByRole("combobox", { name: "Formato do confronto", exact: true })
    .selectOption("single");
  await expect(
    page.getByRole("button", { name: "Remover eliminatória", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Remover confronto", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remover eliminatória", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome da fase eliminatória", { exact: true }),
  ).toHaveCount(0);
});

test("mantém a página em 320px com tabelas roláveis dentro dos painéis", async ({
  page,
}, testInfo) => {
  await regulationBrowserFixture(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await prepare(page);
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Depois da alteração", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const standings = page.getByRole("table").filter({
    has: page.getByRole("columnheader", { name: "Posição", exact: true }),
  });
  expect(
    await standings
      .locator("th")
      .first()
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBeGreaterThanOrEqual(70);
  await page.screenshot({
    path: testInfo.outputPath("regulamento-320.png"),
    fullPage: true,
  });
});

test("retoma o mesmo comando após reautenticação sem perder a edição", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  const sent: string[] = [];
  await page.route(/\/api\/regulations\//, async (route) => {
    if (
      route.request().method() === "POST" &&
      !route.request().url().endsWith("/preview")
    )
      sent.push(route.request().postData()!);
    await route.fallback();
  });
  await prepare(page);
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await page
    .getByLabel("Motivo da alteração", { exact: true })
    .fill("Confirmar regras e partidas");
  await page
    .getByLabel("Conferi o impacto nos resultados e cruzamentos", {
      exact: true,
    })
    .check();
  f.expireRegulation();
  await page
    .getByRole("button", {
      name: "Confirmar e salvar regulamento",
      exact: true,
    })
    .click();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("2");
  await page
    .getByRole("button", { name: "Repetir envio do regulamento", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Regulamento salvo" }),
  ).toBeVisible();
  expect(sent).toHaveLength(2);
  expect(sent[0]).toBe(sent[1]);
  expect(f.getState().version).toBe(1);
});

test("resolve inscrições do grupo na prévia de eliminatória sem inventar resultado da série", async ({
  page,
}) => {
  await regulationBrowserFixture(page);
  await prepare(page);
  await page
    .getByRole("button", { name: "Adicionar eliminatória", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adicionar confronto", exact: true })
    .click();
  for (const [side, position] of [
    ["A", 1],
    ["B", 2],
  ] as const) {
    const group = page.getByRole("group", {
      name: `Confronto 1: equipe ${side}`,
      exact: true,
    });
    await page
      .getByRole("combobox", {
        name: `Confronto 1: equipe ${side}: origem`,
        exact: true,
      })
      .selectOption("group_rank");
    await group
      .getByRole("combobox", { name: "Grupo", exact: true })
      .selectOption({ label: "Fase 1 / Grupo 1" });
    await group
      .getByRole("spinbutton", { name: "Posição no grupo", exact: true })
      .fill(String(position));
  }
  for (const format of [
    "single",
    "two_leg",
    "best_of_3",
    "best_of_5",
    "best_of_7",
  ]) {
    await page
      .getByRole("combobox", { name: "Formato do confronto", exact: true })
      .selectOption(format);
    await page
      .getByRole("button", { name: "Conferir impacto", exact: true })
      .click();
    const after = page.locator(".reg-review .reg-projection").filter({
      has: page.getByRole("heading", {
        name: "Depois da alteração",
        exact: true,
      }),
    });
    await expect(after.getByRole("article")).toContainText("Lobos × Lobos B");
    await expect(after.getByRole("article")).toContainText(
      "Aguardando definição ou resultados.",
    );
    await expect(
      after.getByText("Vencedor da série:", { exact: false }),
    ).toHaveCount(0);
  }
});

async function reviewForSave(page: Page) {
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await page
    .getByLabel("Motivo da alteração", { exact: true })
    .fill("Conferência das regras e atribuições");
  await page
    .getByLabel("Conferi o impacto nos resultados e cruzamentos", {
      exact: true,
    })
    .check();
}
async function confirmSave(page: Page) {
  await page
    .getByRole("button", {
      name: "Confirmar e salvar regulamento",
      exact: true,
    })
    .click();
}

test("ACK conhecido recupera somente leitura depois de falha GET", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  await prepare(page);
  await reviewForSave(page);
  f.failReadAfterSave();
  await confirmSave(page);
  await expect(
    page.getByRole("button", { name: "Recarregar confirmação", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Recarregar confirmação", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Regulamento salvo" }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(1);
  expect(f.reads.filter((x) => x.endsWith(tid(3)))).toHaveLength(3);
});

test("duas abas recusam versão antiga preservando a pontuação e pedindo nova prévia", async ({
  page,
  context,
}) => {
  const f = await regulationBrowserFixture(page),
    other = await context.newPage();
  await f.addTab(other);
  await prepare(page);
  await prepare(other);
  await other.getByLabel("Pontos por vitória", { exact: true }).fill("9");
  await reviewForSave(page);
  await reviewForSave(other);
  await confirmSave(page);
  await expect(
    page.getByRole("status").filter({ hasText: "Regulamento salvo" }),
  ).toBeVisible();
  await confirmSave(other);
  await expect(
    other.getByRole("button", {
      name: "Recarregar dados para nova prévia",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    other.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("9");
  expect(f.getState().version).toBe(1);
  await other
    .getByRole("button", {
      name: "Recarregar dados para nova prévia",
      exact: true,
    })
    .click();
  await expect(
    other.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("9");
  await reviewForSave(other);
  await confirmSave(other);
  await expect(
    other.getByRole("status").filter({ hasText: "Regulamento salvo" }),
  ).toBeVisible();
  expect(f.getState().version).toBe(2);
  expect(f.getState().definition!.groupPhases[0].rules.points.win).toBe(9);
});

test("atribuição de jogo sobrevive à paginação e busca sem gerar resultado ausente", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  f.addGames(25);
  await prepare(page);
  await page
    .getByRole("button", { name: "Próximos jogos", exact: true })
    .click();
  await page
    .getByLabel("Organização do jogo 22", { exact: true })
    .selectOption({ label: "Fase 1 / Grupo 1" });
  await page.getByLabel("Buscar jogos", { exact: true }).fill("22");
  await expect(
    page.getByLabel("Organização do jogo 22", { exact: true }),
  ).not.toHaveValue("");
  await page.getByLabel("Buscar jogos", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Próximos jogos", exact: true })
    .click();
  await expect(
    page.getByLabel("Organização do jogo 22", { exact: true }),
  ).not.toHaveValue("");
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await expect(page.locator(".reg-review")).toContainText(
    "1 jogo(s) aguardando resultado ou revisão.",
  );
  await expect(page.locator(".reg-review tbody tr")).toHaveCount(2);
  await expect(page.locator(".reg-review tbody tr").first()).toContainText(
    "Lobos",
  );
});

test("histórico paginado abre versão antiga sem substituir rascunho nem gravar", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  await prepare(page);
  await reviewForSave(page);
  await confirmSave(page);
  await expect(
    page.getByRole("status").filter({ hasText: "Regulamento salvo" }),
  ).toBeVisible();
  f.addHistory(25);
  await page.reload();
  await page.getByLabel("Pontos por vitória", { exact: true }).fill("9");
  await page.getByRole("button", { name: "Mais versões", exact: true }).click();
  await page.getByRole("button", { name: "Ver versão 1", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Classificação nessa versão",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("9");
  await page
    .getByRole("button", { name: "Fechar versão", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Versões anteriores", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ver versão 25", exact: true }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(1);
});

test("grupos alimentam semifinais, final e perdedores com fontes explícitas", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page),
    s = f.getState();
  const A = tid(5),
    B = tid(6),
    C = tid(7),
    D = tid(9),
    phase = tid(100),
    ga = tid(101),
    gb = tid(102),
    ko = tid(110);
  for (const [id, name] of [
    [C, "Corujas"],
    [D, "Tigres"],
  ])
    f.registrations.set(id, { ...f.registrations.get(A)!, id, name });
  s.context.registrationIds = [A, B, C, D];
  const addFact = (
    id: string,
    home: string,
    away: string,
    hp: number,
    ap: number,
  ) => {
    s.context.games.push({
      id,
      version: 1,
      disputeId: tid(3),
      homeRegistrationId: home,
      awayRegistrationId: away,
    });
    s.context.publishedGames.push({
      gameId: id,
      publicationVersion: 1,
      disputeId: tid(3),
      homeRegistrationId: home,
      awayRegistrationId: away,
      homePoints: hp,
      awayPoints: ap,
      status: "played",
      pointsSource: { kind: "sheet", version: 1 },
    });
  };
  addFact(tid(10), C, D, 70, 60);
  addFact(tid(11), A, D, 80, 60);
  addFact(tid(12), C, B, 60, 80);
  s.version = 1;
  s.savedAt = "2026-10-24T20:01:00Z";
  s.definition = {
    registrationIds: [A, B, C, D],
    occurrenceRules: { wo: null },
    groupPhases: [
      {
        phaseId: phase,
        name: "Grupos",
        rules: {
          format: "round_robin",
          points: { win: 2, loss: 1 },
          tieBreakers: [],
        },
        groups: [
          {
            id: ga,
            name: "Grupo A",
            registrationIds: [A, B],
            gameIds: [tid(8)],
          },
          {
            id: gb,
            name: "Grupo B",
            registrationIds: [C, D],
            gameIds: [tid(10)],
          },
        ],
      },
    ],
    knockoutPhases: [{ id: ko, name: "Mata-mata" }],
    series: [
      {
        id: tid(201),
        phaseId: ko,
        name: "Semifinal A",
        format: "single",
        home: { kind: "group_rank", phaseId: phase, groupId: ga, position: 1 },
        away: { kind: "group_rank", phaseId: phase, groupId: gb, position: 2 },
        games: [{ slot: 1, gameId: tid(11) }],
      },
      {
        id: tid(202),
        phaseId: ko,
        name: "Semifinal B",
        format: "single",
        home: { kind: "group_rank", phaseId: phase, groupId: gb, position: 1 },
        away: { kind: "group_rank", phaseId: phase, groupId: ga, position: 2 },
        games: [{ slot: 1, gameId: tid(12) }],
      },
      {
        id: tid(203),
        phaseId: ko,
        name: "Final",
        format: "single",
        home: { kind: "series_winner", seriesId: tid(201) },
        away: { kind: "series_winner", seriesId: tid(202) },
        games: [],
      },
      {
        id: tid(204),
        phaseId: ko,
        name: "Terceiro lugar",
        format: "single",
        home: { kind: "series_loser", seriesId: tid(201) },
        away: { kind: "series_loser", seriesId: tid(202) },
        games: [],
      },
    ],
  };
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`,
  );
  const current = page.locator(".reg-projection").filter({
    has: page.getByRole("heading", {
      name: "Classificação atual",
      exact: true,
    }),
  });
  const final = current
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Final", exact: true }) });
  const third = current.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Terceiro lugar", exact: true }),
  });
  await expect(final).toContainText("Lobos × Lobos B");
  await expect(third).toContainText("Tigres × Corujas");
  await expect(final).toContainText("Aguardando definição ou resultados.");
  await expect(third).toContainText("Aguardando definição ou resultados.");
  // Uma referência circular não pode chegar à confirmação nem gravar outra versão.
  const finalHome = page.getByRole("group", {
    name: "Final: equipe A",
    exact: true,
  });
  await finalHome
    .getByRole("combobox", { name: "Confronto de origem", exact: true })
    .selectOption(tid(203));
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Confira referências, grupos e jogos atribuídos.",
  );
  await expect(
    page.getByRole("button", {
      name: "Confirmar e salvar regulamento",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(f.attempts).toHaveLength(0);
});

test("recarregar contexto atualiza inscrições disponíveis sem descartar edição", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  await prepare(page);
  const added = {
    ...f.registrations.get(tid(5))!,
    id: tid(99),
    name: "Novos inscritos",
  };
  f.registrations.set(added.id, added);
  f.getState().context.registrationIds.push(added.id);
  f.changeContext();
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Recarregar dados para nova prévia",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Incluir Novos inscritos", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("2");
  await page.getByLabel("Incluir Novos inscritos", { exact: true }).check();
});
