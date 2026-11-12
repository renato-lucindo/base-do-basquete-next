import { expect, test } from "@playwright/test";
import { publicNavigationFixture } from "./fixtures/public-navigation";

const origin = process.env.COPA_TEST_ORIGIN ?? "http://127.0.0.1:5174";

test("site exclusivo mantém as quatro seções e os detalhes na mesma disputa", async ({
  page,
}) => {
  const f = await publicNavigationFixture(page);
  const id = f.source.disputeId;
  await page.route(
    /\/(publico|estatisticas|equipes|equipe|atleta|resultado)\.html(?:\?|$)/u,
    async (route) => {
      if (route.request().resourceType() !== "document")
        return route.continue();
      const response = await route.fetch();
      await route.fulfill({
        response,
        body: (await response.text()).replace(
          "<head>",
          `<head><meta name="bdb-dispute" content="${id}">`,
        ),
      });
    },
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin + "/publico.html");
  await expect(
    page.getByRole("navigation", { name: "Seções da disputa" }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`#${id}`));
  async function onlyCopa() {
    await expect(page.locator(".public-header .brand")).toHaveText(
      "b.Copa ES U15",
    );
    await expect(page.getByText("Trocar disputa", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.locator(".public-catalog-link, .public-admin, .public-header form"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Competições", exact: true }),
    ).toHaveCount(0);
  }
  await onlyCopa();
  // Neither a bare catalogue URL nor a foreign fragment can open discovery.
  await page.goto(
    origin + "/publico.html#f2200000-0000-4000-8000-000000000090?q=Adulto",
  );
  await expect(page).toHaveURL(new RegExp(`#${id}`));
  await expect(
    page.getByRole("heading", { name: "Competições", exact: true }),
  ).toHaveCount(0);
  for (const section of ["Equipes", "Jogadores", "Jogos"]) {
    await page
      .getByRole("navigation", { name: "Seções da disputa" })
      .getByRole("link", { name: section, exact: true })
      .click();
    await onlyCopa();
    await expect(
      page
        .getByRole("navigation", { name: "Seções da disputa" })
        .getByRole("link", { name: section, exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
  await page.locator(".public-game-score a").first().click();
  await expect(
    page
      .getByRole("table", { name: "Participações e estatísticas publicadas" })
      .first(),
  ).toBeVisible();
  await onlyCopa();
  await page.getByRole("link", { name: /^Voltar à origem/ }).click();
  await page
    .getByRole("navigation", { name: "Seções da disputa" })
    .getByRole("link", { name: "Jogadores", exact: true })
    .click();
  await page
    .locator('.statistics-table a[href^="/atleta.html"]')
    .first()
    .click();
  await expect(page.locator(".player-overview")).toBeVisible();
  await onlyCopa();
  await expect(page).toHaveURL(new RegExp(`disputeId=${id}`));
  expect(errors).toEqual([]);
});
