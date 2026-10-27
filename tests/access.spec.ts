import { test, expect } from "@playwright/test";

test("password form supports keyboard, errors, restore and logout without browser token storage", async ({
  page,
}) => {
  let signedIn = false;
  let reject = true;
  await page.route("**/api/competitions**", (route) =>
    route.fulfill({ json: { items: [], recents: [], hasMore: false } }),
  );
  await page.route("**/api/session", async (route) => {
    const method = route.request().method();
    if (method === "POST") {
      if (reject)
        return route.fulfill({
          status: 401,
          json: { error: { code: "invalid_session" } },
        });
      signedIn = true;
    }
    if (method === "DELETE") {
      signedIn = false;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({
      status: signedIn ? 200 : 401,
      json: { authenticated: signedIn },
    });
  });
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await expect(
    page.getByRole("heading", { name: "Acesso administrativo" }),
  ).toBeVisible();
  await page.getByLabel("E-mail").fill("admin@example.test");
  await page.getByLabel("E-mail").press("Tab");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByLabel("Senha", { exact: true }).press("Enter");
  await expect(page.getByRole("alert")).toContainText(
    "E-mail ou senha inválidos",
  );
  await expect(page.getByLabel("Senha", { exact: true })).toBeFocused();
  reject = false;
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByLabel("Senha", { exact: true }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "Área administrativa" }),
  ).toBeFocused();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Campeonatos", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Acesso administrativo" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("provider failure offers explicit retry instead of silently discarding a session", async ({
  page,
}) => {
  let failed = true;
  await page.route("**/api/session", (route) =>
    route.fulfill({ status: failed ? 503 : 401, json: {} }),
  );
  await page.goto("http://127.0.0.1:5174/foundation.html");
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível verificar",
  );
  failed = false;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Acesso administrativo" }),
  ).toBeVisible();
});
