import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { gamesFixture } from "./fixtures/games";
import { regulationBrowserFixture } from "./fixtures/regulation-browser";
import { openTextImport, textImportFixture, tid } from "./fixtures/text-import";
const savedAt = "2026-10-23T19:00:00Z";

for (const width of [1366, 1920])
  for (const area of ["jogos", "equipes"]) {
    test(`admin compacto ${area} desktop ${width}`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop", "Piloto desktop aprovado");
      await page.setViewportSize({
        width,
        height: width === 1366 ? 768 : 1080,
      });
      const f = await gamesFixture(page);
      const home = f.registrations.get(tid(5))!,
        away = f.registrations.get(tid(6))!;
      for (let n = 0; n < 7; n++)
        f.games.set(tid(500 + n), {
          id: tid(500 + n),
          disputeId: tid(3),
          homeRegistrationId: home.id,
          awayRegistrationId: away.id,
          home,
          away,
          date: `2026-11-${String(n + 1).padStart(2, "0")}`,
          time: "19:30",
          venue: "Ginásio Municipal",
          number: String(n + 1),
          version: 1,
          savedAt,
          state: "scheduled",
          timeZone: "America/Sao_Paulo",
          scheduledAt: `2026-11-${String(n + 1).padStart(2, "0")}T22:30:00Z`,
        });
      await page.route(/\/api\/roster\?/, (route) =>
        route.fulfill({
          json: {
            items: Array.from({ length: 12 }, (_, n) => ({
              id: tid(600 + n),
              registrationId: home.id,
              personId: tid(700 + n),
              disputeId: tid(3),
              jersey: String(n + 1),
              active: true,
              version: 1,
              savedAt,
              startedAt: savedAt,
              endedAt: null,
              person: {
                id: tid(700 + n),
                name:
                  n === 0
                    ? "João Pedro de Albuquerque e Silva de Oliveira Fernandes Nascimento"
                    : "Atleta de exemplo " + String(n + 1),
                nickname: null,
                publicBirthYear: 2000,
              },
            })),
            hasMore: false,
          },
        }),
      );
      await page.goto(
        `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/${area}`,
      );
      const row =
        area === "jogos"
          ? page
              .getByRole("button", {
                name: "Abrir jogo Lobos × Lobos B",
                exact: true,
              })
              .first()
          : page.getByTestId("roster-row").first();
      if (area === "equipes")
        await page
          .getByRole("button", { name: "Expandir Lobos", exact: true })
          .click();
      await expect(row).toBeVisible();
      await page.evaluate(() => scrollTo(0, 0));
      const metrics = await row.evaluate((node) => ({
        firstRowY: node.getBoundingClientRect().top + scrollY,
        documentHeight: document.documentElement.scrollHeight,
        viewportHeight: innerHeight,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      const phase = process.env.ADMIN_CAPTURE_BASELINE ? "before" : "after";
      await page.screenshot({
        path: `.preview-artifacts/admin-${phase}-${area}-${width}.png`,
      });
      await writeFile(
        `.preview-artifacts/admin-${phase}-${area}-${width}.json`,
        JSON.stringify(metrics),
      );
      if (process.env.ADMIN_CAPTURE_BASELINE) return;
      expect(metrics.overflow).toBe(false);
      expect(metrics.firstRowY).toBeLessThan(area === "jogos" ? 300 : 420);
      if (area === "jogos") {
        await expect(
          page.getByRole("table", { name: "Jogos da disputa", exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Novo jogo", exact: true })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Novo jogo", exact: true }),
        ).toBeVisible();
        await expect(
          page
            .getByRole("dialog")
            .getByRole("combobox", { name: "Local", exact: true }),
        ).toBeVisible();
        await expect(
          page
            .getByRole("dialog")
            .getByLabel("Inscrição mandante", { exact: true })
            .getByRole("option", { name: "Lobos", exact: true }),
        ).toHaveCount(1);
        page.once("dialog", (dialog) => dialog.accept());
        await page
          .getByRole("button", { name: "Voltar à lista de jogos", exact: true })
          .click();
        await expect(
          page.getByRole("table", { name: "Jogos da disputa", exact: true }),
        ).toBeVisible();
      } else {
        await expect(page.getByTestId("roster-row")).toHaveCount(12);
        await expect(page.getByText(/Inscrição 00000005/)).toHaveCount(0);
      }
    });
  }

for (const width of [1366, 1920]) {
  test(`admin importação compacta desktop ${width}`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "Escopo desktop");
    await page.setViewportSize({
      width,
      height: width === 1366 ? 768 : 1080,
    });
    await textImportFixture(page);
    await openTextImport(page);
    await page
      .getByLabel("Texto do elenco", { exact: true })
      .fill("Equipe: Lobos\n5 - Ana Silva\n12 - Ricardo Souza");
    await page
      .getByRole("button", { name: "Interpretar texto", exact: true })
      .click();
    const region = page.getByRole("region", {
      name: "Tabela de conferência com rolagem horizontal",
      exact: true,
    });
    const table = page.getByRole("table", {
      name: "Conferência do elenco",
    });
    await expect(region).toBeVisible();
    await expect(table).toBeVisible();
    await expect(
      page.getByText("Carregando inscrições…", { exact: true }),
    ).toBeHidden();
    const metrics = await table.evaluate((node) => ({
      compact: !!node.closest(".compact-pilot"),
      minWidth: getComputedStyle(node).minWidth,
      pageOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    }));
    expect(metrics.compact).toBe(true);
    expect(metrics.minWidth).toBe("1220px");
    expect(metrics.pageOverflow).toBe(false);
    await page.screenshot({
      path: `.preview-artifacts/admin-after-importacao-${width}.png`,
    });
  });
}

for (const [width, height] of [
  [683, 384],
  [960, 540],
]) {
  test(`importação permanece navegável com zoom equivalente a 200% em ${width}px`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "Apenas desktop");
    await page.setViewportSize({ width, height });
    await textImportFixture(page);
    await openTextImport(page);
    await page
      .getByLabel("Texto do elenco", { exact: true })
      .fill(
        ["Equipe: Lobos", "5 - Ana Silva", "12 - Ricardo Souza"].join("\n"),
      );
    await page
      .getByRole("button", { name: "Interpretar texto", exact: true })
      .click();
    const scroller = page.getByRole("region", {
      name: "Tabela de conferência com rolagem horizontal",
      exact: true,
    });
    await expect(scroller).toBeVisible();
    await expect(scroller.locator("tbody tr")).toHaveCount(2);
    await expect(
      scroller.getByLabel("Nome, linha 2", { exact: true }),
    ).toHaveValue("Ana Silva");
    await expect(
      scroller.getByLabel("Nome, linha 3", { exact: true }),
    ).toHaveValue("Ricardo Souza");
    await expect(
      page.getByText("Carregando inscrições…", { exact: true }),
    ).toBeHidden();
    const geometry = await scroller.evaluate((node) => ({
      scrollable: node.scrollWidth > node.clientWidth + 1,
      pageOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    }));
    expect(geometry.scrollable).toBe(true);
    expect(geometry.pageOverflow).toBe(false);
    await scroller.evaluate((node) => {
      node.scrollLeft = 0;
    });
    await page.keyboard.press("Tab");
    await scroller.focus();
    await expect(scroller).toBeFocused();
    await expect(scroller).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => scroller.evaluate((node) => node.scrollLeft))
      .toBeGreaterThan(0);
    await scroller.screenshot({
      path: `.preview-artifacts/admin-import-zoom200-after-${width}.png`,
      animations: "disabled",
    });
  });
}

for (const width of [1366, 1920]) {
  test(`admin regulamento desktop ${width}`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "Escopo desktop");
    await page.setViewportSize({
      width,
      height: width === 1366 ? 768 : 1080,
    });
    await regulationBrowserFixture(page);
    await page.goto(
      `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`,
    );
    await expect(
      page.getByRole("heading", {
        name: "Regulamento da disputa",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".compact-pilot .regulation")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.preview-artifacts/admin-after-regulamento-${width}.png`,
    });
  });
}
