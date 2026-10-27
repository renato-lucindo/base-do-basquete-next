import { test, expect, type Page } from "@playwright/test";
import type {
  CompetitionSnapshot,
  SaveCompetition,
} from "../src/competition/contract";

async function fixture(page: Page) {
  let saved: CompetitionSnapshot | undefined;
  let mode: "normal" | "uncertain" | "conflict" = "normal";
  const commands = new Map<string, { id: string; version: number }>();
  let attempts: string[] = [];
  let authenticated = true;
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
  await page.route("**/api/competitions**", async (route) => {
    if (!authenticated)
      return route.fulfill({
        status: 401,
        json: { error: { code: "invalid_session" } },
      });
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST") {
      const body = request.postDataJSON() as SaveCompetition;
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
  });
  return {
    setMode: (next: typeof mode) => {
      mode = next;
      attempts = [];
    },
    attempts: () => attempts,
    expire: () => {
      authenticated = false;
    },
  };
}

async function create(page: Page) {
  await page
    .getByRole("button", { name: "Novo campeonato", exact: true })
    .click();
  await page.getByLabel("Nome do campeonato").fill("Liga Regional");
  await page.getByLabel("Ano da temporada 1", { exact: true }).fill("2026");
  await page
    .getByLabel("Naipe da disputa 1.1", { exact: true })
    .selectOption("feminino");
  await page
    .getByLabel("Categoria da disputa 1.1", { exact: true })
    .fill("Adulto");
}

for (const width of [1366, 1920])
  test(`campeonato compacto desktop ${width} mantém campos e salvamento acessíveis`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "Recorte desktop");
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    await fixture(page);
    await page.goto("http://127.0.0.1:5174/foundation.html");
    await create(page);
    await page
      .getByRole("button", {
        name: "Adicionar disputa à temporada 1",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Categoria da disputa 1.2", { exact: true })
      .fill("Sub-18");
    await page.evaluate(() => scrollTo(0, 0));
    const phase = process.env.ADMIN_CAPTURE_BASELINE ? "before" : "after";
    await page.screenshot({
      path: `.preview-artifacts/admin-expansion-${phase}-competition-${width}.png`,
      fullPage: true,
    });
    const year = await page
      .getByLabel("Ano da temporada 1", { exact: true })
      .boundingBox();
    const name = await page
      .getByLabel("Nome do campeonato", { exact: true })
      .boundingBox();
    const save = page.getByRole("button", {
      name: "Salvar campeonato",
      exact: true,
    });
    const box = await save.boundingBox();
    expect(year!.width).toBeLessThanOrEqual(150);
    expect(name!.width).toBeGreaterThan(year!.width * 3);
    expect(box!.y + box!.height).toBeLessThan(width === 1366 ? 768 : 1080);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await save.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("competition-save-state")).toContainText(
      "Salvo",
    );
    await page.reload();
    await expect(
      page.getByLabel("Categoria da disputa 1.2", { exact: true }),
    ).toHaveValue("Sub-18");
    await page
      .getByRole("button", { name: "Voltar aos campeonatos", exact: true })
      .click();
    await expect(
      page.getByRole("table", { name: "Campeonatos", exact: true }).last(),
    ).toContainText("Liga Regional");
    await expect(
      page.getByRole("button", { name: "Sair", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `.preview-artifacts/admin-expansion-${phase}-listing-${width}.png`,
    });
  });

test("unsaved season and dispute removals require a visible modal confirmation", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await create(page);
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
  await category.fill("Sub-18");
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
  await expect(category).toHaveValue("Sub-18");
  await removeDispute.click();
  await dialog
    .getByRole("button", { name: "Confirmar remoção", exact: true })
    .click();
  await expect(category).toHaveCount(0);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Disputa removida do rascunho" }),
  ).toBeVisible();
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

test("competition is saved and restored with multiple seasons and explicit disputes", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await create(page);
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
    .fill("Sub-18");
  await page.getByLabel("Divisão da disputa 1.2", { exact: true }).fill("B");
  await page
    .getByRole("button", { name: "Adicionar temporada", exact: true })
    .click();
  await page.getByLabel("Ano da temporada 2", { exact: true }).fill("2026");
  await page
    .getByLabel("Categoria da disputa 2.1", { exact: true })
    .fill("Adulto");
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
    page.getByRole("heading", { name: "Recentes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Abrir Liga Regional", exact: true }),
  ).toHaveCount(2);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  await page
    .getByRole("button", { name: "Abrir Liga Regional", exact: true })
    .first()
    .click();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("unsaved work prevents accidental logout and survives reauthentication in memory", async ({
  page,
}) => {
  const f = await fixture(page);
  // Expire the editing operation after the independently scheduled initial listing.
  // Otherwise its delayed GET may expire first and hide Save before the click.
  const initialListing = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/competitions" &&
      response.request().method() === "GET",
  );
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await initialListing;
  await create(page);
  await page.getByLabel("Nome do campeonato").fill("Edição preservada");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByLabel("Nome do campeonato")).toHaveValue(
    "Edição preservada",
  );
  f.expire();
  await page
    .getByRole("button", { name: "Salvar campeonato", exact: true })
    .click();
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
    .getByRole("button", { name: "Salvar campeonato", exact: true })
    .click();
  await expect(page.getByTestId("competition-save-state")).toContainText(
    "Salvo",
  );
});

test("uncertain save retries the same command and conflicts preserve edits until explicit reload", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await create(page);
  f.setMode("uncertain");
  await page
    .getByRole("button", { name: "Salvar campeonato", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("envio");
  await expect(page.getByLabel("Nome do campeonato")).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir envio", exact: true })
    .click();
  await expect(page.getByTestId("competition-save-state")).toContainText(
    "Salvo",
  );
  expect(f.attempts()).toHaveLength(2);
  expect(f.attempts()[0]).toBe(f.attempts()[1]);
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
