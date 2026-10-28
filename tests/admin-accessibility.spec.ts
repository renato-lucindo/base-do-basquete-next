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

test("axe importador em 320px com texto ampliado e rolagem por teclado", async ({
  page,
}, info) => {
  await textImportFixture(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await openTextImport(page);
  const text = page.getByLabel("Texto do elenco", { exact: true });
  const before = await text.evaluate((el) =>
    Number.parseFloat(getComputedStyle(el).fontSize),
  );
  const heading = page.getByRole("heading", {
    name: "Equipes e elencos",
    exact: true,
  });
  const headingBefore = await heading.evaluate((el) =>
    Number.parseFloat(getComputedStyle(el).fontSize),
  );
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await page.screenshot({
    path: `.preview-artifacts/a11y-admin-text200-before-${info.project.name}.png`,
    fullPage: true,
  });
  expect
    .soft(
      await heading.evaluate((el) =>
        Number.parseFloat(getComputedStyle(el).fontSize),
      ),
    )
    .toBeCloseTo(headingBefore * 2);
  expect(
    await text.evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).fontSize),
    ),
  ).toBeCloseTo(before * 2);
  await text.fill("12 - Ricardo Souza - 193 - 1999");
  await page
    .getByRole("button", { name: "Interpretar texto", exact: true })
    .click();
  const region = page.getByRole("region", {
    name: "Tabela de conferência com rolagem horizontal",
    exact: true,
  });
  await expect(region).toBeVisible();
  const layout = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter(
        (el) =>
          !el.closest(".text-import-scroll") &&
          el.getBoundingClientRect().right >
            document.documentElement.clientWidth,
      )
      .map((el) => ({
        tag: el.tagName,
        className: el.className,
        text: el.textContent?.slice(0, 70),
        right: el.getBoundingClientRect().right,
        width: el.getBoundingClientRect().width,
        display: getComputedStyle(el).display,
      })),
  );
  if (layout.length)
    console.log("Importer text200 overflow:", JSON.stringify(layout));
  await info.attach("importer-text200-layout", {
    body: JSON.stringify(layout),
    contentType: "application/json",
  });
  await page.screenshot({
    path: `.preview-artifacts/a11y-admin-import-320-layout-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await region.focus();
  await expect(region).toBeFocused();
  const start = await region.evaluate((el) => el.scrollLeft);
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => region.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(start);
  const registration = page.getByLabel("Registro federativo, linha 1", {
    exact: true,
  });
  await registration.focus();
  await expect(registration).toBeFocused();
  await expect
    .poll(() =>
      registration.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const top = document.elementFromPoint(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        );
        return top === el || (top !== null && el.contains(top));
      }),
    )
    .toBe(true);
  await scan(page, info, "admin-import-320-text200");
});
