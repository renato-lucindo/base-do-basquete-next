import type {
  DisputeAdministration,
  DisputeAdministrationCommand,
} from "../src/competition/administration-contract";
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
import type {
  Organizer,
  OrganizerSelection,
} from "../src/competition/organizer-contract";

const fecaba: Organizer = {
  id: "c7e4505a-5774-4af1-a893-08a87327817e",
  name: "Federação Capixaba de Basquetebol",
  abbreviation: "FECABA",
  kind: "federation",
};

async function fixture(
  page: Page,
  initial?: CompetitionSnapshot,
  extra: CompetitionSnapshot[] = [],
) {
  let saved = initial;
  const changes = new Map<string, DisputeAdministration>();
  const organizers = new Map<string, Organizer>();
  const choices = [fecaba];
  let renameReasonRequired = false;
  function administration(id: string): DisputeAdministration {
    return (
      changes.get(id) ?? {
        disputeId: id,
        version: 1,
        status: "planned",
        visibility: "private",
        lockReason: lockIdentification ? "registration" : null,
        isTest: testIds.has(id),
        wasPublic: false,
      }
    );
  }
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
        organizer?: OrganizerSelection;
      };
      for (const id of body.testDisputeIds ?? []) testIds.add(id);
      attempts.push(body.commandId);
      if (
        renameReasonRequired &&
        !(request.postDataJSON() as { renameReason?: string }).renameReason
      ) {
        return route.fulfill({
          status: 409,
          json: {
            error: {
              code: "championship_rename_reason_required",
              message: "Informe o motivo da alteração do nome.",
            },
          },
        });
      }

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
        const selection = body.organizer;
        if (selection) {
          const value =
            selection.mode === "test"
              ? ({
                  id: randomUUID(),
                  name: "Admin",
                  abbreviation: null,
                  kind: "system",
                } as const)
              : selection.mode === "create"
                ? { ...selection, id: randomUUID() }
                : choices.find((choice) => choice.id === selection.id);
          if (value) {
            const { id, name, abbreviation, kind } = value;
            organizers.set(body.competition.id, {
              id,
              name,
              abbreviation,
              kind,
            });
            if (selection.mode === "create")
              choices.push({ id, name, abbreviation, kind });
          }
        }
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
        json:
          saved && url.searchParams.has("organizer")
            ? {
                ...saved,
                organizer: organizers.get(saved.id) ?? null,
                organizerLocked:
                  organizers.has(saved.id) &&
                  saved.seasons.some((s) =>
                    s.disputes.some((d) => administration(d.id).wasPublic),
                  ),
              }
            : (saved ?? { error: { code: "context_not_found" } }),
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
    if (path.endsWith("/organizers")) {
      const query =
        new URL(request.url()).searchParams.get("q")?.toLowerCase() ?? "";
      return route.fulfill({
        json: choices.filter(({ name, abbreviation }) =>
          [name, abbreviation].some((value) =>
            value?.toLowerCase().includes(query),
          ),
        ),
      });
    }
    if (path.endsWith("/listing")) {
      const query = request.postDataJSON() as DisputeListQuery;
      queries.push(query);
      const snapshot = saved;
      const rows: DisputeListRow[] = [snapshot, ...extra].flatMap(
        (snapshot) =>
          snapshot?.seasons.flatMap((s) =>
            s.disputes.map((d) => ({
              competitionId: snapshot.id,
              seasonId: s.id,
              name: snapshot.name,
              organizer: organizers.get(snapshot.id) ?? null,
              year: s.year,
              gender: d.gender,
              category: d.category,
              division: d.division,
              lastActivityAt: snapshot.savedAt,
              administration: administration(d.id),
            })),
          ) ?? [],
      );
      const items = rows.filter(
        (row) =>
          (!query.q ||
            [row.name, row.year, row.category, row.division]
              .join(" ")
              .toLowerCase()
              .includes(query.q.toLowerCase())) &&
          (!query.year || row.year === query.year) &&
          (!query.championshipIds.length ||
            query.championshipIds.includes(row.competitionId)) &&
          (!query.gender || row.gender === query.gender) &&
          (!query.status || row.administration.status === query.status) &&
          (!query.visibility ||
            (row.administration.isTest
              ? "test"
              : row.administration.visibility) === query.visibility),
      );
      const column =
        query.sort === "championship"
          ? "name"
          : query.sort === "activity"
            ? "lastActivityAt"
            : query.sort;
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
          championships: [snapshot, ...extra].flatMap((item) =>
            item ? [{ id: item.id, name: item.name }] : [],
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
          s.disputes.map((d) => administration(d.id)),
        ),
      });
    const command = request.postDataJSON() as DisputeAdministrationCommand;
    const previous = administration(command.disputeId);
    const updated: DisputeAdministration = {
      ...previous,
      version: previous.version + 1,
      visibility: command.visibility ?? previous.visibility,
      wasPublic: previous.wasPublic || command.visibility === "public",
      status: command.action === "cancel" ? "cancelled" : previous.status,
    };
    changes.set(command.disputeId, updated);
    return route.fulfill({ json: updated });
  });
  return {
    requireRenameReason: () => {
      renameReasonRequired = true;
    },
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

async function draft(page: Page, pickOrganizer = true) {
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Adicionar disputa" });
  const newChampionship = dialog.getByRole("button", {
    name: "Criar novo campeonato",
    exact: true,
  });
  if (await newChampionship.count()) await newChampionship.click();
  await dialog.getByLabel("Nome do campeonato").fill("Liga Regional");
  await dialog.getByLabel("Ano da temporada", { exact: true }).fill("2026");
  await dialog.getByLabel("Naipe", { exact: true }).selectOption("feminino");
  if (pickOrganizer) {
    const organizer = dialog.getByRole("combobox", { name: "Organizador" });
    await organizer.fill("fecaba");
    await dialog.getByRole("option", { name: /FECABA/ }).click();
  }
  return dialog;
}

test("saves a reusable organizer in the championship dialog and presents its abbreviation", async ({
  page,
}, info) => {
  const state = await fixture(page);
  await page.goto("http://127.0.0.1:5174/foundation.html");
  const dialog = await draft(page, false);
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Selecione ou cadastre",
  );
  await dialog.getByRole("button", { name: "Cadastrar organizador" }).click();
  await expect(dialog.getByLabel("Nome do organizador")).toBeFocused();
  await dialog
    .getByLabel("Nome do organizador")
    .fill("Secretaria de Esportes de Vitória");
  await dialog.getByLabel("Sigla (opcional)").fill("SEME");
  await dialog.getByLabel("Tipo").selectOption("public_authority");
  await page.screenshot({
    path: `.preview-artifacts/organizador-formulario-${info.project.name}.png`,
  });
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("row", { name: /Liga Regional.*SEME/ }),
  ).toBeVisible();
  const sort = page.getByRole("button", { name: "Organizador", exact: true });
  await sort.click();
  await expect.poll(() => state.queries.at(-1)?.sort).toBe("organizer");
  await page.screenshot({
    path: `.preview-artifacts/organizador-lista-${info.project.name}.png`,
  });
});

test("chooses Admin for a new test championship and keeps subsequent disputes in test mode", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("http://127.0.0.1:5174/foundation.html");
  const dialog = await draft(page, false);
  await dialog.getByLabel("Campeonato de teste").check();
  await expect(dialog.getByText("Admin", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(dialog.getByLabel("Disputa de teste")).toBeChecked();
  await expect(dialog.getByLabel("Disputa de teste")).toBeDisabled();
});

async function create(page: Page) {
  const dialog = await draft(page);
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

async function editFirstDispute(page: Page) {
  await page
    .getByRole("button", { name: /^Editar Liga Regional/ })
    .first()
    .click();
}

async function addDispute(page: Page) {
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Adicionar disputa" });
  await dialog.getByLabel("Ano da temporada").fill("2026");
}
test("protege a identificação no diálogo e administra a visibilidade pela lista", async ({
  page,
}, info) => {
  const state = await fixture(page);
  state.lockIdentification();
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await create(page);
  await editFirstDispute(page);
  const edit = page.getByRole("dialog", { name: "Editar dados da disputa" });
  await expect(
    edit.getByText("A disputa já tem histórico de inscrições."),
  ).toBeVisible();
  await expect(
    edit.getByText("Campos protegidos pelo histórico"),
  ).toBeVisible();
  await expect(edit.getByLabel("Nome do campeonato")).toHaveCount(0);
  for (const label of [
    "Ano da temporada",
    "Naipe",
    "Categoria da disputa em edição",
    "Divisão (opcional)",
  ]) {
    await expect(edit.getByLabel(label, { exact: true })).toBeDisabled();
  }
  await page.screenshot({
    path: `.preview-artifacts/disputas-edicao-${info.project.name}.png`,
  });
  await expect(edit.getByRole("button", { name: "Fechar diálogo" })).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  for (const button of [
    edit.getByRole("button", { name: "Fechar diálogo" }),
    edit.getByRole("button", { name: "Descartar alterações", exact: true }),
  ]) {
    await expect(button).toHaveCSS("background-color", "rgb(229, 34, 7)");
    await expect(button).toHaveCSS("color", "rgb(255, 255, 255)");
  }
  await edit
    .getByRole("button", { name: "Descartar alterações", exact: true })
    .click();
  const row = page
    .getByRole("table", { name: "Disputas" })
    .locator("tbody tr")
    .first();
  await expect(row.locator("time")).toHaveText("23/10/26 08:00");
  await expect(page.getByText("1 disputa", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Anterior", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Próxima", exact: true }),
  ).toHaveCount(0);
  const visibility = row.getByRole("button", { name: /^Privada/ });
  await visibility.click();
  const menu = page.getByRole("menu", { name: "Escolher visibilidade" });
  const privateOption = menu.getByRole("menuitemradio", { name: "Privada" });
  await expect(privateOption).toHaveAttribute("aria-checked", "true");
  await expect(privateOption).toBeFocused();
  expect(await menu.evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(
    await menu.evaluate((node) => node.clientWidth),
  );
  await page.screenshot({
    path: `.preview-artifacts/disputas-visibilidade-${info.project.name}.png`,
  });
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(visibility).toBeFocused();
  await visibility.click();
  await menu.getByRole("menuitemradio", { name: "Pública" }).click();
  await expect(page.getByText("Disputa tornada pública.")).toBeVisible();
  await expect(row.getByRole("button", { name: /^Pública/ })).toBeVisible();
  await editFirstDispute(page);
  const cancelDispute = edit
    .getByRole("region", { name: "Situação da disputa" })
    .getByRole("button", { name: "Cancelar disputa", exact: true });
  await expect(cancelDispute).toHaveCSS("border-top-color", "rgb(229, 34, 7)");
  if (info.project.use.hasTouch) await cancelDispute.tap();
  else await cancelDispute.click();
  const confirmation = page.getByRole("dialog", {
    name: "Cancelar disputa",
    exact: true,
  });
  const reason = confirmation.getByLabel("Motivo");
  const confirmCancel = confirmation.getByRole("button", {
    name: "Cancelar disputa",
    exact: true,
  });
  await expect(reason).toBeFocused();
  await expect(confirmCancel).toBeDisabled();
  await reason.fill("  ");
  await expect(confirmCancel).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(confirmation).toBeHidden();
  await expect(cancelDispute).toBeFocused();
  await cancelDispute.press("Enter");
  await expect(reason).toHaveValue("");
  await reason.fill("Cancelamento do calendário");
  await expect(confirmCancel).toHaveCSS("background-color", "rgb(229, 34, 7)");
  await page.screenshot({
    path: `.preview-artifacts/disputas-cancelamento-${info.project.name}.png`,
  });
  await confirmCancel.click();
  await expect(confirmation).toBeHidden();
  await expect(edit.getByText("Cancelada · Pública")).toBeVisible();
});

test("edição mantém descarte fixo e identifica a faixa etária sem perder o rascunho", async ({
  page,
}, info) => {
  const state = await fixture(page);
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await create(page);
  await editFirstDispute(page);
  const edit = page.getByRole("dialog", { name: "Editar dados da disputa" });
  const discard = edit.getByRole("button", {
    name: "Descartar alterações",
    exact: true,
  });
  const category = edit.getByLabel("Categoria da disputa em edição", {
    exact: true,
  });
  const age = edit.getByLabel("Faixa Etária da disputa em edição", {
    exact: true,
  });
  await expect(discard).toBeVisible();
  await expect(age).toHaveCount(0);
  await category.selectOption("base");
  await expect(edit.getByText("Faixa Etária", { exact: true })).toBeVisible();
  await age.selectOption("15");
  await category.selectOption("master");
  await expect(age).toHaveValue("");
  await age.selectOption("35");
  await expect(discard).toBeVisible();
  await page.screenshot({
    path: `.preview-artifacts/disputas-faixa-etaria-${info.project.name}.png`,
  });
  for (const button of [
    discard,
    edit.getByRole("button", { name: "Fechar diálogo" }),
  ]) {
    page.once("dialog", (confirmation) => confirmation.dismiss());
    await button.click();
    await expect(age).toHaveValue("35");
    await expect(discard).toBeVisible();
  }
  await category.selectOption("adult");
  await expect(age).toHaveCount(0);
  await discard.click();
  await expect(edit).toHaveCount(0);
  await editFirstDispute(page);
  await category.selectOption("base");
  await age.selectOption("15");
  await edit.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(edit).toHaveCount(0);
  state.lockIdentification();
  await editFirstDispute(page);
  await expect(age).toHaveValue("15");
  await expect(age).toBeDisabled();
  await expect(edit.getByText("Faixa Etária", { exact: true })).toBeVisible();
  await expect(discard).toBeVisible();
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
    await expect(
      list.getByRole("columnheader", { name: "Ações", exact: true }),
    ).toBeVisible();
    await expect(
      list.getByRole("columnheader", { name: "Última alteração", exact: true }),
    ).toHaveAttribute("aria-sort", "descending");
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
    const filterSizes = await page
      .locator(
        ".dispute-list-filters > label :is(input,select), .dispute-list-filters summary",
      )
      .evaluateAll((controls) =>
        controls.map((control) => {
          const { width, height } = control.getBoundingClientRect();
          return { width: Math.round(width), height: Math.round(height) };
        }),
      );
    expect(new Set(filterSizes.map((size) => JSON.stringify(size))).size).toBe(
      1,
    );
    await page.screenshot({ path: `.preview-artifacts/disputas-${width}.png` });
    await page.getByRole("button", { name: "Próxima", exact: true }).click();
    await expect(list.locator("tbody tr")).toHaveCount(5);
    await expect(
      page.getByRole("button", { name: "Anterior", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Próxima", exact: true }),
    ).toBeDisabled();
    await page.getByLabel("Naipe", { exact: true }).selectOption("feminino");
    await expect(list.locator("tbody tr")).toHaveCount(15);
    await expect(
      page.getByRole("button", { name: "Anterior", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Próxima", exact: true }),
    ).toHaveCount(0);
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

test("uses one dialog and prevents duplicate disputes while accepting other divisions and genders", async ({
  page,
}, info) => {
  const f = await fixture(page);
  await page.goto("http://127.0.0.1:5174/foundation.html");
  const first = await draft(page);
  await first
    .getByLabel("Categoria da disputa nova", { exact: true })
    .selectOption("base");
  await first
    .getByLabel("Faixa Etária da disputa nova", { exact: true })
    .selectOption("15");
  await expect(
    first
      .getByRole("group", { name: "Categoria", exact: true })
      .getByRole("combobox"),
  ).toHaveCount(2);
  if (info.project.name === "desktop") {
    await page.screenshot({
      path: ".preview-artifacts/lista-disputas-dialogo.png",
    });
  }
  await first.getByRole("button", { name: "Salvar", exact: true }).click();
  const table = page.getByRole("table", { name: "Disputas" });
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await addDispute(page);
  const dialog = page.getByRole("dialog", { name: "Adicionar disputa" });
  await expect(
    dialog.getByText("Liga Regional", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Alterar campeonato" }).click();
  const search = dialog.getByRole("combobox", { name: "Campeonato" });
  await expect(search).toBeFocused();
  await search.fill("regional");
  await expect(
    dialog.getByRole("option", { name: "Liga Regional" }),
  ).toBeVisible();
  await page.screenshot({
    path: `.preview-artifacts/disputas-busca-${info.project.name}.png`,
  });
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(
    dialog.getByText("Liga Regional", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Ano da temporada")).toHaveValue("2026");
  await dialog.getByLabel("Naipe", { exact: true }).selectOption("feminino");
  await dialog
    .getByLabel("Categoria da disputa nova", { exact: true })
    .selectOption("base");
  await dialog
    .getByLabel("Faixa Etária da disputa nova", { exact: true })
    .selectOption("15");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Já existe uma disputa desse naipe e categoria",
  );
  expect(f.attempts()).toHaveLength(1);
  await dialog.getByLabel("Divisão (opcional)").fill("2ª");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(2);
  await addDispute(page);
  await dialog
    .getByLabel("Categoria da disputa nova", { exact: true })
    .selectOption("base");
  await dialog
    .getByLabel("Faixa Etária da disputa nova", { exact: true })
    .selectOption("15");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await addDispute(page);
  await dialog.getByLabel("Ano da temporada").fill("2027");
  await dialog.getByLabel("Disputa de teste").check();
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(table.getByRole("row", { name: /2027.*Teste/ })).toBeVisible();
  expect(
    f.saved()?.seasons.map((item) => [item.year, item.disputes.length]),
  ).toEqual([
    [2027, 1],
    [2026, 3],
  ]);
});

test("keeps multiple championship checkboxes and opens the selected dispute in Games", async ({
  page,
}) => {
  const snapshots = ["Liga Regional", "Copa Escolar", "Liga Nacional"].map(
    (name) => ({
      id: randomUUID(),
      name,
      version: 1,
      savedAt: "2026-10-23T11:00:00Z",
      seasons: [
        {
          id: randomUUID(),
          year: 2026,
          disputes: [
            {
              id: randomUUID(),
              gender: "feminino" as const,
              category: "Sub-15",
              division: null,
            },
            {
              id: randomUUID(),
              gender: "masculino" as const,
              category: "Sub-15",
              division: null,
            },
          ],
        },
      ],
    }),
  );
  const f = await fixture(page, snapshots[0], snapshots.slice(1));
  await page.goto("http://127.0.0.1:5174/foundation.html");
  const table = page.getByRole("table", { name: "Disputas" });
  await expect(table.locator("tbody tr")).toHaveCount(6);
  await page
    .locator("summary")
    .filter({ hasText: /^Todos$/ })
    .click();
  await page
    .getByRole("checkbox", { name: "Liga Regional", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Copa Escolar", exact: true })
    .check();
  await expect(table.locator("tbody tr")).toHaveCount(4);
  expect(f.queries.at(-1)?.championshipIds).toEqual([
    snapshots[0].id,
    snapshots[1].id,
  ]);
  await page.keyboard.press("Escape");
  await expect(page.getByText("2 selecionados")).toBeVisible();
  await table
    .getByRole("button", { name: /^Abrir Liga Regional.*feminino/ })
    .click();
  const contest = page.getByLabel("Disputa de trabalho", { exact: true });
  await expect(contest).toHaveValue(snapshots[0].seasons[0].disputes[0].id);
  await expect(
    page.getByRole("button", { name: "Jogos", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: "Informações", exact: true }),
  ).toHaveCount(0);
  await contest.selectOption(snapshots[0].seasons[0].disputes[1].id);
  await expect(page).toHaveURL(/\/jogos$/);
  await page
    .getByRole("button", { name: "Voltar aos campeonatos", exact: true })
    .click();
  await expect(page.getByText("2 selecionados")).toBeVisible();
  await expect(table.locator("tbody tr")).toHaveCount(4);
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
  await editFirstDispute(page);
  await page.getByRole("button", { name: "Renomear campeonato" }).click();
  await expect(page.getByLabel("Nome do campeonato")).toHaveValue(
    "Liga Regional",
  );
  await page.getByLabel("Nome do campeonato").fill("Minha edição preservada");
  f.setMode("conflict");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("outra sessão");
  await expect(page.getByLabel("Nome do campeonato")).toHaveValue(
    "Minha edição preservada",
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Descartar alterações", exact: true })
    .click();
  await expect(page.getByLabel("Nome do campeonato")).toHaveValue(
    "Minha edição preservada",
  );
  await page
    .getByRole("button", { name: "Descartar edição e recarregar", exact: true })
    .click();
  await expect(page.getByLabel("Nome do campeonato")).toHaveValue(
    "Versão de outra sessão",
  );
});

test("a publicação em outra sessão revela a justificativa de renomeação sem perder o rascunho", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await create(page);
  await editFirstDispute(page);
  await page.getByRole("button", { name: "Renomear campeonato" }).click();
  await page.getByLabel("Nome do campeonato").fill("Liga Regional atualizada");
  state.requireRenameReason();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page
    .getByLabel("Motivo da alteração do nome")
    .fill("Correção de identificação");
  await expect(page.getByLabel("Nome do campeonato")).toHaveValue(
    "Liga Regional atualizada",
  );
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.saved()?.name).toBe("Liga Regional atualizada");
});
