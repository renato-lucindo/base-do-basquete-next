import { expect, test } from "@playwright/test";
test("confere quartos, edita e exclui ação específica com recuperação e histórico", async ({
  page,
}) => {
  await page.goto("/#/sumula");
  for (const period of ["3", "1", "2", "4"]) {
    await page.getByLabel("Período", { exact: true }).selectOption(period);
    await page.getByLabel("Código", { exact: true }).fill("2");
    await page.getByLabel("Código", { exact: true }).press("Enter");
  }
  const rows = page
    .getByRole("region", { name: "Ações da súmula", exact: true })
    .locator("tbody tr");
  await expect(rows.nth(0)).toHaveClass(/period-red/);
  await expect(rows.nth(2)).toHaveClass(/period-blue/);
  await page.getByLabel("Ordem das ações").selectOption("period");
  await expect(rows.locator("td:nth-child(2)")).toHaveText([
    "Q1",
    "Q2",
    "Q3",
    "Q4",
  ]);
  await page
    .getByRole("button", { name: "Editar ação 1", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Revisar resultado", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Código", { exact: true }).fill("D");
  await page
    .getByRole("button", { name: "Salvar alteração", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Cesta posterior" }),
  ).toBeVisible();
  await expect(page.locator(".score")).toHaveText("8×0");
  await page.getByLabel("Código", { exact: true }).fill("3");
  await page.getByLabel("Período", { exact: true }).selectOption("2");
  await page
    .getByRole("button", { name: "Salvar alteração", exact: true })
    .click();
  await expect(page.locator(".score")).toHaveText("9×0");
  await expect(rows.locator("td:first-child")).toHaveText(["2", "1", "3", "4"]);
  await page
    .getByRole("button", { name: "Excluir ação 2", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancelar exclusão", exact: true })
    .click();
  await expect(rows).toHaveCount(4);
  await page
    .getByRole("button", { name: "Excluir ação 2", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar exclusão", exact: true })
    .click();
  await expect(page.locator(".score")).toHaveText("7×0");
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.locator(".score")).toHaveText("9×0");
  await page.getByRole("button", { name: "Refazer" }).click();
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await expect(
    page.getByText("Salvo neste navegador.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".score")).toHaveText("7×0");
  await page
    .getByRole("button", { name: "Revisar resultado", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar e publicar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar ação 1", exact: true })
    .click();
  await page.getByLabel("Código", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Salvar alteração", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Revisar resultado", exact: true })
    .click();
  await expect(
    page.getByText(
      "Informe um motivo de revisão com pelo menos 10 caracteres.",
    ),
  ).toBeVisible();
  await page
    .getByLabel("Motivo da revisão *")
    .fill("Correção de ação após conferir a súmula.");
  await page
    .getByRole("button", { name: "Revisar resultado", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar e republicar", exact: true })
    .click();
  await expect(
    page.getByText("Versão 1 · 7 × 0", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Versão 2 · 6 × 0", { exact: false }),
  ).toBeVisible();
});

test("mantém acessíveis ações anteriores às últimas trinta", async ({
  page,
}) => {
  await page.goto("/#/sumula");
  for (let i = 0; i < 31; i++) {
    await page.getByLabel("Código", { exact: true }).fill("2");
    await page.getByLabel("Código", { exact: true }).press("Enter");
  }
  await page
    .getByRole("button", { name: "Editar ação 1", exact: true })
    .click();
  await page.getByLabel("Código", { exact: true }).fill("3");
  await page
    .getByRole("button", { name: "Salvar alteração", exact: true })
    .click();
  await expect(page.locator(".score")).toHaveText("63×0");
  await expect(
    page
      .getByRole("region", { name: "Ações da súmula", exact: true })
      .locator("tbody tr"),
  ).toHaveCount(31);
});
