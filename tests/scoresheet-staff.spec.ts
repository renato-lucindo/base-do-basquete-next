import { expect, test } from "@playwright/test";

test("capitão assume sem técnico, assistente condicional e rascunho recuperável", async ({
  page,
}) => {
  await page.goto("/#/sumula");
  const staff = page.getByRole("group", {
    name: "Comissão técnica de Lobos",
    exact: true,
  });
  await expect(staff.getByLabel("Técnico", { exact: true })).toHaveValue(
    "Ana da Silva",
  );
  await expect(staff.getByLabel("Técnico", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(staff.getByLabel("Ass. Técnico", { exact: true })).toHaveCount(
    0,
  );
  await staff.getByLabel("Capitão", { exact: true }).selectOption("2");
  await expect(staff.getByLabel("Técnico", { exact: true })).toHaveValue(
    "Beatriz Costa",
  );
  await staff
    .getByLabel("Sem técnico: capitão assume", { exact: true })
    .uncheck();
  await staff.getByLabel("Técnico", { exact: true }).fill("Patrícia Lima");
  await staff
    .getByLabel("Ass. Técnico", { exact: true })
    .pressSequentially("Joana Silva");
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await expect(
    page.getByText("Salvo neste navegador.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(staff.getByLabel("Técnico", { exact: true })).toHaveValue(
    "Patrícia Lima",
  );
  await expect(staff.getByLabel("Ass. Técnico", { exact: true })).toHaveValue(
    "Joana Silva",
  );
  await expect(staff.getByLabel("Capitão", { exact: true })).toHaveValue("2");
  await staff
    .getByLabel("Sem técnico: capitão assume", { exact: true })
    .check();
  await expect(staff.getByLabel("Técnico", { exact: true })).toHaveValue(
    "Beatriz Costa",
  );
  await expect(staff.getByLabel("Ass. Técnico", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(staff.getByLabel("Ass. Técnico", { exact: true })).toHaveValue(
    "Joana Silva",
  );
});

test("capitão-técnico combina faltas e troca de técnico revalida a sequência", async ({
  page,
}) => {
  await page.goto("/#/sumula");
  const staff = page.getByRole("group", {
    name: "Comissão técnica de Lobos",
    exact: true,
  });
  await staff.getByLabel("Capitão", { exact: true }).selectOption("2");
  for (const [target, code] of [
    ["00", "T1"],
    ["C", "C1"],
  ]) {
    await page.getByLabel("Camisa / alvo", { exact: true }).fill(target);
    await page.getByLabel("Camisa / alvo", { exact: true }).press("Enter");
    await page.keyboard.type(code);
    await page.keyboard.press("Enter");
  }
  await expect(
    page.getByRole("row").filter({
      has: page.getByRole("rowheader", {
        name: "Beatriz Costa",
        exact: true,
      }),
    }),
  ).toContainText("GD");
  await expect(
    staff.getByText("Situação do técnico: GD", { exact: true }),
  ).toBeVisible();
  await staff
    .getByLabel("Sem técnico: capitão assume", { exact: true })
    .uncheck();
  await staff.getByLabel("Técnico", { exact: true }).fill("Patrícia Lima");
  await page.getByLabel("Camisa / alvo", { exact: true }).fill("00");
  await page.getByLabel("Camisa / alvo", { exact: true }).press("Enter");
  await page.keyboard.type("2");
  await page.keyboard.press("Enter");
  await expect(page.locator(".score")).toHaveText("2×0");
  await staff
    .getByLabel("Sem técnico: capitão assume", { exact: true })
    .click();
  await expect(
    staff.getByLabel("Sem técnico: capitão assume", { exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("alert").filter({ hasText: "Cesta posterior" }),
  ).toBeVisible();
  await expect(page.locator(".score")).toHaveText("2×0");
});
