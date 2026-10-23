import { expect, test } from "@playwright/test";
test("opções no final, camisas ordenadas e cinco titulares obrigatórios por equipe", async ({
  page,
}) => {
  await page.goto("/#/sumula");
  const region = page.getByRole("region", {
    name: "Relacionados A",
    exact: true,
  });
  await expect(region.getByRole("textbox")).toHaveCount(6);
  expect(
    await region
      .getByRole("textbox")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("value"))),
  ).toEqual(["0", "00", "7", "8", "9", "10"]);
  const later = page.getByRole("region", {
    name: "Outras opções da súmula",
    exact: true,
  });
  expect(
    await later.evaluate(
      (node) =>
        !!(
          document
            .querySelector(".publish-bar")!
            .compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
    ),
  ).toBe(true);
  await page.getByLabel("Código", { exact: true }).fill("2");
  await page.getByLabel("Código", { exact: true }).press("Enter");
  await page
    .getByRole("button", { name: "Revisar resultado", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "5 titulares" }),
  ).toBeVisible();
  for (const side of ["A", "B"]) {
    const roster = page.getByRole("region", {
      name: `Relacionados ${side}`,
      exact: true,
    });
    for (const box of (
      await roster.getByRole("checkbox", { name: / titular$/ }).all()
    ).slice(0, 5))
      await box.check();
  }
  const sixth = region.getByRole("checkbox", { name: / titular$/ }).nth(5);
  await sixth.click();
  await expect(sixth).not.toBeChecked();
  await expect(
    page.getByRole("alert").filter({ hasText: "5 titulares" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await expect(
    page.getByText("Salvo neste navegador.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    region.getByRole("checkbox", { name: / titular$/, checked: true }),
  ).toHaveCount(5);
  await page
    .getByRole("button", { name: "Revisar resultado", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirmar e publicar", exact: true }),
  ).toBeVisible();
});
