import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type {
  DisputeListQuery,
  DisputeListRow,
} from "../src/competition/catalog-contract";
import type {
  CompetitionSnapshot,
  SaveCompetition,
} from "../src/competition/contract";

async function fixture(page: Page, initial?: CompetitionSnapshot) {
  let saved = initial;
  const testIds = new Set<string>();
  const queries: DisputeListQuery[] = [];
  let mode: "normal" | "uncertain" | "conflict" = "normal";
  const commands = new Map<string, { id: string; version: number }>();
  let attempts: string[] = [];
  let authenticated = true;
  let lockIdentification = false;
  await page.route("**/api/session", (route) => {
    if (route.request().method() === "POST") authenticated = true;
    if (route.request().method() === "DELETE") {
      authenticated = false;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({
      status: authenticated ? 200 : 401,
      json: { authenticated },
    });
  });
  const competitions = async (route: import("@playwright/test").Route) => {
    if (!authenticated)
      return route.fulfill({
        status: 401,
        json: { error: { code: "invalid_session" } },
      });
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST") {
      const body = request.postDataJSON() as SaveCompetition & {
        testDisputeIds?: string[];
      };
      for (const id of body.testDisputeIds ?? []) testIds.add(id);
      attempts.push(body.commandId);
      if (mode === "conflict") {
        if (saved)
          saved = {
            ...saved,
            name: "Versão de outra sessão",
            version: saved.version + 1,
          };
        mode = "normal";
        return route.fulfill({
          status: 409,
          json: {
            error: {
              code: "version_conflict",
              message:
                "O campeonato foi alterado em outra sessão. Recarregue antes de salvar.",
            },
          },
        });
      }
      if (!commands.has(body.commandId)) {
        saved = {
          ...body.competition,
          version: (saved?.version ?? 0) + 1,
          savedAt: "2026-10-23T11:00:00Z",
        };
        saved.seasons.sort((a, b) => b.year - a.year);
        for (const season of saved.seasons)
          season.disputes.sort(
            (a, b) =>
              a.gender.localeCompare(b.gender) ||
              a.category.localeCompare(b.category),
          );
        commands.set(body.commandId, { id: saved.id, version: saved.version });
      }
      if (mode === "uncertain") {
        mode = "normal";
        return route.fulfill({
          status: 503,
          json: { error: { code: "access_unavailable" } },
        });
      }
      return route.fulfill({ json: commands.get(body.commandId) });
    }
    if (url.pathname !== "/api/competitions")
      return route.fulfill({
        status: saved ? 200 : 404,
        json: saved ?? { error: { code: "context_not_found" } },
      });
    const item = saved
      ? {
          id: saved.id,
          name: saved.name,
          version: saved.version,
          savedAt: saved.savedAt,
          contexts: saved.seasons.flatMap((s) =>
            s.disputes.map((d) => ({
              year: s.year,
              gender: d.gender,
              category: d.category,
              division: d.division,
            })),
          ),
        }
      : undefined;
    return route.fulfill({
      json: {
        items: item ? [item] : [],
        recents: item ? [item] : [],
        hasMore: false,
      },
    });
  };
  await page.route("**/api/competitions**", competitions);
  await page.route("**/api/competition-administration/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/competition")) return competitions(route);
    if (path.endsWith("/listing")) {
      const query = request.postDataJSON() as DisputeListQuery;
      queries.push(query);
      const snapshot = saved;
      const rows: DisputeListRow[] =
        snapshot?.seasons.flatMap((s) =>
          s.disputes.map((d) => ({
            competitionId: snapshot.id,
            seasonId: s.id,
            name: snapshot.name,
            year: s.year,
            gender: d.gender,
            category: d.category,
            division: d.division,
            administration: {
              disputeId: d.id,
              version: 1,
              status: "planned",
              visibility: "private",
              lockReason: null,
              isTest: testIds.has(d.id),
              wasPublic: false,
            },
          })),
        ) ?? [];
      const items = rows.filter(
        (row) =>
          (!query.q ||
            [row.name, row.year, row.category, row.division]
              .join(" ")
              .toLowerCase()
              .includes(query.q.toLowerCase())) &&
          (!query.year || row.year === query.year) &&
          (!query.championshipId ||
            row.competitionId === query.championshipId) &&
          (!query.gender || row.gender === query.gender) &&
          (!query.status || row.administration.status === query.status) &&
          (!query.visibility ||
            (row.administration.isTest
              ? "test"
              : row.administration.visibility) === query.visibility),
      );
      const column = query.sort === "championship" ? "name" : query.sort;
      if (column !== "visibility" && column !== "status")
        items.sort(
          (a, b) =>
            String(a[column] ?? "").localeCompare(String(b[column] ?? "")) *
            (query.direction === "asc" ? 1 : -1),
        );
      return route.fulfill({
        json: {
          items: items.slice(query.offset, query.offset + 25),
          years: [...new Set(rows.map((row) => row.year))].sort(
            (a, b) => b - a,
          ),
          total: items.length,
          hasMore: items.length > query.offset + 25,
        },
      });
    }
    if (!saved) return route.fulfill({ json: [] });
    if (request.method() === "GET")
      return route.fulfill({
        json: saved.seasons.flatMap((s) =>
          s.disputes.map((d) => ({
            disputeId: d.id,
            version: 1,
            status: "planned",
            visibility: "private",
            lockReason: lockIdentification ? "registration" : null,
            isTest: false,
            wasPublic: false,
          })),
        ),
      });
    const command = request.postDataJSON();
    return route.fulfill({
      json: {
        disputeId: command.disputeId,
        version: 2,
        status: "planned",
        visibility: command.visibility,
        wasPublic: command.visibility === "public",
        isTest: false,
        lockReason: null,
      },
    });
  });
  return {
    setMode: (next: typeof mode) => {
      mode = next;
      attempts = [];
    },
    attempts: () => attempts,
    queries,
    saved: () => saved,
    lockIdentification: () => {
      lockIdentification = true;
    },
    expire: () => {
      authenticated = false;
    },
  };
}

async function draft(page: Page) {
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page
    .getByRole("button", { name: "Novo campeonato", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Novo campeonato" });
  await dialog.getByLabel("Nome do campeonato").fill("Liga Regional");
  await dialog.getByLabel("Temporada", { exact: true }).fill("2026");
  await dialog.getByLabel("Naipe", { exact: true }).selectOption("feminino");
  return dialog;
}

async function create(page: Page) {
  const dialog = await draft(page);
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

async function openFirstDispute(page: Page) {
  await page
    .getByRole("button", { name: /^Abrir Liga Regional ·/ })
    .first()
    .click();
}

test("protege os campos de identificação e confirma a alteração de visibilidade", async ({
  page,
}) => {
  const state = await fixture(page);
  state.lockIdentification();
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await create(page);
  await openFirstDispute(page);
  await expect(
    page.getByLabel("Ano da temporada 1", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Naipe da disputa 1.1", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Categoria da disputa 1.1", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Divisão da disputa 1.1", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("A disputa já tem histórico de inscrições."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tornar pública", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Tornar pública" });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Tornar pública", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Planejada · Pública")).toBeVisible();
});

test("mantém a prévia de teste ao navegar e restaura o catálogo normal ao sair", async ({
  page,
}) => {
  const disputeId = "7d780000-0000-4000-8000-000000000222";
  const scopes: (string | undefined)[] = [];
  await page.route("**/api/public/catalog**", (route) => {
    scopes.push(route.request().headers()["x-dispute-preview"]);
    return route.fulfill({ json: { games: [], disputes: [], next: null } });
  });
  await page.goto("http://127.0.0.1:5174/publico.html?previa=" + disputeId);
  await expect(page.getByText("Prévia de disputa de teste")).toBeVisible();
  await expect.poll(() => scopes.at(-1)).toBe(disputeId);
  const beforeNavigation = scopes.length;
  await page.getByRole("link", { name: "Campeonatos", exact: true }).click();
  await expect.poll(() => scopes.length).toBeGreaterThan(beforeNavigation);
  expect(scopes.at(-1)).toBe(disputeId);
  await page.getByRole("link", { name: "Sair da prévia" }).click();
  await expect(page.getByText("Prévia de disputa de teste")).toHaveCount(0);
  await expect.poll(() => scopes.at(-1)).toBeUndefined();
});

for (const width of [1366, 1920]) {
  test(`lista de disputas compacta em ${width}px`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "Recorte desktop");
    const height = width === 1366 ? 768 : 1080;
    await page.setViewportSize({ width, height });
    const f = await fixture(page, {
      id: randomUUID(),
      name: "Liga Regional de Basquete",
      version: 1,
      savedAt: "2026-10-23T11:00:00Z",
      seasons: [2026, 2025, 2024].map((year) => ({
        id: randomUUID(),
        year,
        disputes: Array.from({ length: 10 }, (_, i) => ({
          id: randomUUID(),
          gender: i % 2 ? "feminino" : "masculino",
          category: "Adulto",
          division: String(i + 1),
        })),
      })),
    });
    await page.goto("http://127.0.0.1:5174/foundation.html");
    const list = page.getByRole("table", { name: "Disputas", exact: true });
    await expect(list.locator("tbody tr")).toHaveCount(25);
    const layout = await list.evaluate((table) => ({
      visible: Array.from(table.querySelectorAll("tbody tr")).filter(
        (row) => row.getBoundingClientRect().bottom <= innerHeight,
      ).length,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    expect(layout.visible).toBeGreaterThanOrEqual(8);
    expect(layout.overflow).toBe(false);
    await expect(page.locator(".dispute-catalog button.primary")).toHaveCount(
      1,
    );
    await page.screenshot({ path: `.preview-artifacts/disputas-${width}.png` });
    await page.getByRole("button", { name: "Próxima", exact: true }).click();
    await expect(list.locator("tbody tr")).toHaveCount(5);
    await page.getByLabel("Naipe", { exact: true }).selectOption("feminino");
    await expect(list.locator("tbody tr")).toHaveCount(15);
    await list.getByRole("button", { name: "Campeonato", exact: true }).click();
    await expect
      .poll(() => f.queries.at(-1))
      .toMatchObject({
        gender: "feminino",
        offset: 0,
        sort: "championship",
        direction: "asc",
      });
    const first = list
      .getByRole("button", { name: /^Abrir Liga Regional/ })
      .first();
    await first.click();
    await page
      .getByRole("button", { name: "Voltar aos campeonatos", exact: true })
      .click();
    await expect(page.getByLabel("Naipe", { exact: true })).toHaveValue(
      "feminino",
    );
    await expect(first).toBeFocused();
  });
}

test("unsaved season and dispute removals require a visible modal confirmation", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await create(page);
  await openFirstDispute(page);
  const addDispute = page.getByRole("button", {
    name: "Adicionar disputa à temporada 1",
    exact: true,
  });
  const category = page.getByLabel("Categoria da disputa 1.2", {
    exact: true,
  });
  const removeDispute = page.getByRole("button", {
    name: "Remover disputa 1.2",
    exact: true,
  });
  await addDispute.click();
  await category.selectOption("base");
  await page
    .getByLabel("Idade máxima da categoria 1.2", { exact: true })
    .selectOption("18");
  await removeDispute.click();
  const dialog = page.getByRole("dialog", {
    name: "Remover disputa?",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Sub-18");
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      path: `dist/ui-ux-captures/competition-removal-after-${viewport.width}x${viewport.height}.png`,
      animations: "disabled",
    });
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(category).toHaveValue("base");
  await expect(
    page.getByLabel("Idade máxima da categoria 1.2", { exact: true }),
  ).toHaveValue("18");
  await removeDispute.click();
  await dialog
    .getByRole("button", { name: "Confirmar remoção", exact: true })
    .click();
  await expect(category).toHaveCount(0);
  await page
    .getByRole("button", { name: "Adicionar temporada", exact: true })
    .click();
  const removeSeason = page.getByRole("button", {
    name: "Remover temporada 2",
    exact: true,
  });
  const seasonDialog = page.getByRole("dialog", {
    name: "Remover temporada?",
  });
  await removeSeason.click();
  await expect(seasonDialog).toBeVisible();
  await seasonDialog
    .getByRole("button", { name: "Cancelar remoção", exact: true })
    .click();
  await expect(page.getByLabel("Ano da temporada 2")).toBeVisible();
  await removeSeason.click();
  await seasonDialog
    .getByRole("button", { name: "Confirmar remoção", exact: true })
    .click();
  await expect(page.getByLabel("Ano da temporada 2")).toHaveCount(0);
});

test("championship save shows a dismissible toast", async ({ page }, info) => {
  await fixture(page);
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await create(page);
  const toast = page.getByRole("region", { name: "Notificação" });
  await expect(toast).toContainText("Cadastro salvo");
  if (info.project.name === "desktop") {
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await page.screenshot({
        path: `dist/ui-ux-captures/competition-toast-after-${viewport.width}x${viewport.height}.png`,
        animations: "disabled",
      });
    }
  }
  await toast.getByRole("button", { name: "Dispensar notificação" }).click();
  await expect(toast).toHaveCount(0);
  await expect(
    page.getByRole("row", { name: /Liga Regional.*2026/ }),
  ).toBeVisible();
});

test("competition is saved and restored with multiple seasons and explicit disputes", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await create(page);
  await openFirstDispute(page);
  const add = page.getByRole("button", {
    name: "Adicionar disputa à temporada 1",
    exact: true,
  });
  await add.focus();
  await page.keyboard.press("Enter");
  await page
    .getByLabel("Naipe da disputa 1.2", { exact: true })
    .selectOption("masculino");
  await page
    .getByLabel("Categoria da disputa 1.2", { exact: true })
    .selectOption("base");
  await page
    .getByLabel("Idade máxima da categoria 1.2", { exact: true })
    .selectOption("18");
  await page.getByLabel("Divisão da disputa 1.2", { exact: true }).fill("B");
  await page
    .getByRole("button", { name: "Adicionar temporada", exact: true })
    .click();
  await page.getByLabel("Ano da temporada 2", { exact: true }).fill("2026");
  await page
    .getByLabel("Categoria da disputa 2.1", { exact: true })
    .selectOption("master");
  await page
    .getByLabel("Idade mínima da categoria 2.1", { exact: true })
    .selectOption("50");
  await page
    .getByRole("button", { name: "Salvar campeonato", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("não podem se repetir");
  await page.getByLabel("Ano da temporada 2", { exact: true }).fill("2027");
  await page
    .getByRole("button", { name: "Salvar campeonato", exact: true })
    .click();
  await expect(page.getByTestId("competition-save-state")).toContainText(
    "Salvo",
  );
  await expect(
    page.getByRole("button", { name: "Remover disputa 1.1", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Nome do campeonato")).toHaveValue(
    "Liga Regional",
  );
  await expect(
    page.getByLabel("Divisão da disputa 2.2", { exact: true }),
  ).toHaveValue("B");
  await page.screenshot({
    path: `.preview-artifacts/contexto-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Voltar aos campeonatos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Disputas", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Abrir Liga Regional/ }),
  ).toHaveCount(3);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  await page
    .getByRole("button", { name: /^Abrir Liga Regional/ })
    .first()
    .click();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("adds a season and a dispute in dialogs while keeping existing records", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await create(page);
  const table = page.getByRole("table", { name: "Disputas" });
  await expect(table.locator("tbody tr")).toHaveCount(1);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page
    .getByRole("button", { name: "Nova temporada", exact: true })
    .click();
  const season = page.getByRole("dialog", {
    name: "Nova temporada",
    exact: true,
  });
  const championship = season.getByRole("combobox", {
    name: "Campeonato",
    exact: true,
  });
  await championship.fill("Liga");
  await expect(
    season.getByRole("option", { name: "Liga Regional", exact: true }),
  ).toBeVisible();
  await championship.press("ArrowDown");
  await championship.press("Enter");
  await expect(
    season.getByText("Liga Regional", { exact: true }),
  ).toBeVisible();
  await season.getByLabel("Temporada", { exact: true }).fill("2027");
  await season.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(2);
  const row = table.getByRole("row", { name: /Liga Regional.*2027/ });
  const actions = row.getByRole("button", { name: /Ações de Liga Regional/ });
  // The table scrolls on narrow screens; Playwright brings the action into view.
  await actions.click();
  await page
    .getByRole("button", { name: "Nova disputa nesta temporada", exact: true })
    .click();
  const dispute = page.getByRole("dialog", {
    name: "Nova disputa",
    exact: true,
  });
  await expect(
    dispute.getByRole("combobox", { name: "Temporada", exact: true }),
  ).toHaveValue(f.saved()!.seasons[0].id);
  await dispute.getByLabel("Naipe", { exact: true }).selectOption("feminino");
  await dispute.getByLabel("Disputa de teste").check();
  await dispute.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await expect(
    table.getByRole("row", { name: /2027.*Feminino.*Teste/ }),
  ).toBeVisible();
  expect(f.saved()?.seasons.map((s) => [s.year, s.disputes.length])).toEqual([
    [2027, 2],
    [2026, 1],
  ]);
});

test("modal draft survives cancellation and reauthentication", async ({
  page,
}) => {
  const f = await fixture(page);
  // Expire the editing operation after the independently scheduled initial listing.
  // Otherwise listing may expire first and hide Save before the click.
  const initialListing = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        "/api/competition-administration/listing" &&
      response.request().method() === "POST",
  );
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await initialListing;
  const draftDialog = await draft(page);
  await page.getByLabel("Nome do campeonato").fill("Edição preservada");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Nome do campeonato")).toHaveValue(
    "Edição preservada",
  );
  f.expire();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Acesso administrativo", exact: true }),
  ).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("fixture@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByLabel("Nome do campeonato")).toHaveValue(
    "Edição preservada",
  );
  await page
    .getByRole("button", { name: "Repetir envio", exact: true })
    .click();
  await expect(draftDialog).toHaveCount(0);
});

test("uncertain save retries the same command and conflicts preserve edits until explicit reload", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("http://127.0.0.1:5174/foundation.html");
  const draftDialog = await draft(page);
  f.setMode("uncertain");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("envio");
  await expect(page.getByLabel("Nome do campeonato")).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir envio", exact: true })
    .click();
  await expect(draftDialog).toHaveCount(0);
  expect(f.attempts()).toHaveLength(2);
  expect(f.attempts()[0]).toBe(f.attempts()[1]);
  await openFirstDispute(page);
  await page.getByLabel("Nome do campeonato").fill("Minha edição preservada");
  f.setMode("conflict");
  await page
    .getByRole("button", { name: "Salvar campeonato", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("outra sessão");
  await expect(page.getByLabel("Nome do campeonato")).toHaveValue(
    "Minha edição preservada",
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Voltar aos campeonatos", exact: true })
    .click();
  await expect(page.getByLabel("Nome do campeonato")).toHaveValue(
    "Minha edição preservada",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Recarregar versão salva", exact: true })
    .click();
  await expect(page.getByLabel("Nome do campeonato")).toHaveValue(
    "Versão de outra sessão",
  );
});
