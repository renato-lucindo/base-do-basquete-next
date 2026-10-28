import { test, expect } from "@playwright/test";
import { publishedSheet, publishedSite } from "./fixtures/published-game";
import { pubId } from "./fixtures/publication";

test("resultado liga cada atleta à identidade sem usar camisa como chave", async ({
  page,
}) => {
  const r = publishedSheet();
  await page.route(`**/api/public/games/${r.id}`, (route) =>
    route.fulfill({ json: r }),
  );
  await page.goto(`http://127.0.0.1:5174/resultado.html#${r.id}`);
  for (const p of r.facts.players)
    await expect(
      page.locator(`a[href="/atleta.html#${p.person.id}"]`),
    ).toBeVisible();
  for (const side of ["home", "away"] as const)
    await expect(
      page.locator(
        `a[href="/equipe.html#${r.game[side].team.id}?disputeId=${r.disputeId}&registrationId=${r.game[side].registrationId}"]`,
      ),
    ).toBeVisible();
});
test("public result opens without application login and shows only published participation", async ({
  page,
}, testInfo) => {
  let sessionReads = 0;
  await page.route("**/api/session", (route) => {
    sessionReads++;
    return route.fulfill({
      status: 401,
      json: { error: { message: "login" } },
    });
  });
  await page.route(`**/api/public/games/${pubId(8)}`, (route) =>
    route.fulfill({ json: publishedSheet() }),
  );
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto(`http://127.0.0.1:5174/resultado.html#${pubId(8)}`);
  await expect(
    page.getByRole("heading", { name: "Resultado publicado", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Lobos 2 × 0 Águias", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);
  expect(sessionReads).toBe(0);
  await expect(
    page.getByRole("table", {
      name: "Participações e estatísticas publicadas",
      exact: true,
    }),
  ).toHaveCount(2);
  await page
    .getByRole("link", { name: "Pular para o conteúdo", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(pubId(8) + "$"));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/public-result-320-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test("missing publication and private-field contamination cannot display draft details", async ({
  page,
}) => {
  let invalid = false;
  await page.route(`**/api/public/games/${pubId(8)}`, (route) =>
    route.fulfill(
      invalid
        ? { json: { ...publishedSheet(), privateValue: "do-not-display" } }
        : {
            status: 404,
            json: {
              error: {
                code: "public_not_found",
                message: "Resultado não publicado ou não encontrado.",
              },
            },
          },
    ),
  );
  await page.goto(`http://127.0.0.1:5174/resultado.html#${pubId(8)}`);
  await expect(page.getByRole("alert")).toContainText(
    "Resultado não publicado",
  );
  invalid = true;
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Não foi possível");
  await expect(page.getByText("do-not-display")).toHaveCount(0);
  await expect(page.getByRole("table")).toHaveCount(0);
});
test("Site projection keeps unavailable periods distinct from real zero stats", async ({
  page,
}) => {
  const r = await publishedSite();
  await page.route(`**/api/public/games/${pubId(8)}`, (route) =>
    route.fulfill({ json: r }),
  );
  await page.goto(`http://127.0.0.1:5174/resultado.html#${pubId(8)}`);
  await expect(
    page.getByText("Períodos não informados.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Boxscore Basketball Site", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "MIN", exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("columnheader", { name: "Q1", exact: true }),
  ).toHaveCount(0);
});
