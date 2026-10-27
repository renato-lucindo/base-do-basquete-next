import { test, expect } from "@playwright/test";
import { gamesFixture } from "./fixtures/games";
import { tid } from "./fixtures/text-import";

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop", "Recorte desktop aprovado");
});
async function openNewGame(page: import("@playwright/test").Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
}

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

test("local pagina em overlay, mantém nome acessível e fecha por Escape e Tab", async ({
  page,
}) => {
  await gamesFixture(page);
  await page.route(/\/api\/games\/venues(\?|$)/, async (route) => {
    const offset = Number(
      new URL(route.request().url()).searchParams.get("offset") ?? "0",
    );
    await route.fulfill({
      json: {
        items: Array.from({ length: offset === 0 ? 20 : 1 }, (_, i) => ({
          name: `Quadra ${offset + i + 1}`,
        })),
        hasMore: offset === 0,
      },
    });
  });
  await openNewGame(page);
  const local = page.getByRole("combobox", { name: "Local", exact: true });
  const next = page.getByLabel("Número do jogo", { exact: true });
  const documentY = () =>
    next.evaluate((node) => node.getBoundingClientRect().top + window.scrollY);
  const before = await documentY();
  await local.focus();
  await expect(
    page.getByRole("option", { name: "Quadra 1", exact: true }),
  ).toBeVisible();
  expect(await documentY()).toBe(before);
  await page.getByRole("button", { name: "Mais locais", exact: true }).click();
  await expect(
    page.getByRole("option", { name: "Quadra 21", exact: true }),
  ).toBeVisible();
  await page.getByRole("option", { name: "Quadra 21", exact: true }).click();
  await expect(local).toHaveValue("Quadra 21");
  await local.press("ArrowDown");
  await expect(local).toHaveAttribute("aria-expanded", "true");
  await local.press("Escape");
  await expect(local).toHaveAttribute("aria-expanded", "false");
  await local.press("Tab");
  await expect(next).toBeFocused();
});

test("local oferece recuperação de busca e ignora respostas antigas", async ({
  page,
}) => {
  await gamesFixture(page);
  let failed = true;
  let release: (() => void) | undefined;
  await page.route(/\/api\/games\/venues(\?|$)/, async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    if (failed)
      return route.fulfill({
        status: 503,
        json: {
          error: { code: "access_unavailable", message: "Busca indisponível" },
        },
      });
    if (query === "Antigo")
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    await route
      .fulfill({
        json: {
          items: [
            { name: query === "Antigo" ? "Quadra antiga" : "Quadra atual" },
          ],
          hasMore: false,
        },
      })
      .catch(() => {});
  });
  await openNewGame(page);
  const local = page.getByRole("combobox", { name: "Local", exact: true });
  await local.fill("Teste");
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível buscar os locais",
  );
  await local.press("Escape");
  failed = false;
  await local.fill("Antigo");
  await expect.poll(() => !!release).toBe(true);
  await local.fill("Atual");
  await expect(
    page.getByRole("option", { name: "Quadra atual", exact: true }),
  ).toBeVisible();
  release?.();
  await expect(
    page.getByRole("option", { name: "Quadra antiga", exact: true }),
  ).toHaveCount(0);
  await expect(local).toHaveValue("Atual");
});
