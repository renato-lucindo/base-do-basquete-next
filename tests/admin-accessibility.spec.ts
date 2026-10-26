import { test, expect } from "@playwright/test";
import { scanAccessibility as scan } from "./fixtures/accessibility";
import { gamesFixture } from "./fixtures/games";
import { openTextImport, textImportFixture, tid } from "./fixtures/text-import";
test("axe acesso administrativo e erro de entrada por teclado", async ({
  page,
}, info) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: "invalid_session" } },
    }),
  );
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await expect(
    page.getByRole("heading", { name: "Acesso administrativo", exact: true }),
  ).toBeVisible();
  await scan(page, info, "admin-login");
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  const password = page.getByLabel("Senha", { exact: true });
  await password.fill("fixture-password");
  await password.press("Enter");
  await expect(page.getByRole("alert")).toContainText(
    "E-mail ou senha inválidos",
  );
  await expect(password).toBeFocused();
  await scan(page, info, "admin-login-error");
});
test("axe contexto de jogos e formulário sem dados opcionais", async ({
  page,
}, info) => {
  await gamesFixture(page);
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  const add = page.getByRole("button", { name: "Novo jogo", exact: true });
  await expect(add).toBeVisible();
  await scan(page, info, "admin-games");
  await add.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByLabel("Inscrição mandante", { exact: true }),
  ).toBeVisible();
  await scan(page, info, "admin-game-form");
});

test("axe equipes e elenco expandido por teclado", async ({ page }, info) => {
  await textImportFixture(page);
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/equipes`,
  );
  const expand = page.getByRole("button", {
    name: "Expandir Lobos",
    exact: true,
  });
  await expect(expand).toBeVisible();
  await scan(page, info, "admin-teams");
  await expand.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Importar elenco", exact: true }),
  ).toBeVisible();
  await scan(page, info, "admin-roster");
});

test("axe importação com correspondência e confirmação do elenco", async ({
  page,
}, info) => {
  await textImportFixture(page);
  await openTextImport(page);
  await scan(page, info, "admin-import-input");
  await page
    .getByLabel("Texto do elenco", { exact: true })
    .fill("Equipe: Lobos\n5 - Ana Silva\n12 - Ricardo Souza - 193 - 1999");
  await page
    .getByRole("button", { name: "Interpretar texto", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Conferência do elenco" }),
  ).toBeVisible();
  await expect(page.getByTestId(`candidate-${tid(10)}`)).toBeVisible();
  await scan(page, info, "admin-import-review");
  await page
    .getByTestId(`candidate-${tid(10)}`)
    .getByRole("button", { name: /Usar/ })
    .click();
  await page
    .getByRole("button", { name: "Confirmar selecionados", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "2 confirmados" }),
  ).toBeVisible();
  await scan(page, info, "admin-import-confirmed");
});
