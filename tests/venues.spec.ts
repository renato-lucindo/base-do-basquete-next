import { test, expect } from "@playwright/test";
import { gamesFixture } from "./fixtures/games";
import { tid } from "./fixtures/text-import";

test("local usa dropdown por teclado sem expandir a página e aceita nome novo", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "desktop", "Recorte desktop aprovado");
  await gamesFixture(page);
  const queries: string[] = [];
  await page.route(/\/api\/games\/venues(\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    queries.push(url.searchParams.get("q") ?? "");
    await route.fulfill({
      json: { items: [{ name: "Ginásio Azul" }], hasMore: false },
    });
  });
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
  const local = page.getByRole("combobox", { name: "Local", exact: true });
  await local.fill("Azul");
  await expect(
    page.getByRole("option", { name: "Ginásio Azul", exact: true }),
  ).toBeVisible();
  await local.press("ArrowDown");
  await local.press("Enter");
  await expect(local).toHaveValue("Ginásio Azul");
  await expect(
    page.getByRole("listbox", { name: "Locais salvos" }),
  ).toBeHidden();
  await local.fill("Quadra Nova");
  await page
    .getByRole("option", { name: "Usar novo local: Quadra Nova", exact: true })
    .click();
  await expect(local).toHaveValue("Quadra Nova");
  expect(queries).toContain("Azul");
  expect(queries).toContain("Quadra Nova");
});
