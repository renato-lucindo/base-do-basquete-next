import { expect, test } from "@playwright/test";

test("camisa Enter ação Enter permite transcrever a sequência inteira sem mouse", async ({
  page,
}) => {
  await page.goto("/#/sumula");
  await page.getByLabel("Camisa de Ana da Silva").fill("12");
  await page.getByLabel("Camisa de Beatriz Costa").fill("77");
  await page.getByLabel("Camisa de Elisa Rocha").fill("23");
  await page
    .getByText("Adicionar atleta relacionado sem sair da súmula", {
      exact: true,
    })
    .click();
  await page
    .getByLabel("Nome do atleta", { exact: true })
    .fill("Marina Santos");
  await page.getByLabel("Camisa", { exact: true }).fill("34");
  await page
    .getByRole("button", { name: "Adicionar relacionado", exact: true })
    .click();
  const target = page.getByLabel("Camisa / alvo", { exact: true });
  const code = page.getByLabel("Código", { exact: true });
  const rows = page
    .getByRole("region", { name: "Ações da súmula", exact: true })
    .locator("tbody tr");
  await target.focus();
  await page.keyboard.press("ControlOrMeta+A");
  const actions = [
    ["12", "P2"],
    ["77", "3"],
    ["23", "2"],
    ["23", "3"],
    ["77", "1"],
    ["77", "1"],
    ["34", "U2"],
  ];
  for (let i = 0; i < actions.length; i++) {
    await page.keyboard.type(actions[i][0]);
    await page.keyboard.press("Enter");
    await expect(code).toBeFocused();
    if (i) await expect(rows).toHaveCount(i);
    else
      await expect(
        page.getByRole("button", { name: "Editar ação 1", exact: true }),
      ).toHaveCount(0);
    await page.keyboard.type(actions[i][1]);
    await page.keyboard.press("Enter");
    await expect(target).toBeFocused();
    await expect(code).toHaveValue("");
  }
  await expect(rows.locator("td:nth-child(4)")).toHaveText(
    actions.map((x) => x[0]),
  );
  await expect(rows.locator("td:nth-child(5)")).toHaveText(
    actions.map((x) => x[1]),
  );
  await expect(page.locator(".score")).toHaveText("10×0");
});

test("atalhos trocam equipe/quarto, mantêm 0 e 00 e erros não avançam nem duplicam ações", async ({
  page,
}) => {
  await page.goto("/#/sumula");
  const target = page.getByLabel("Camisa / alvo", { exact: true });
  const code = page.getByLabel("Código", { exact: true });
  await page.keyboard.press("Alt+b");
  await expect(page.getByLabel("Equipe", { exact: true })).toHaveValue("away");
  await expect(target).toBeFocused();
  await page.keyboard.press("Alt+3");
  await expect(page.getByLabel("Período", { exact: true })).toHaveValue("3");
  await page.keyboard.type("4");
  await page.keyboard.press("Enter");
  await page.keyboard.type("2");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Alt+a");
  await expect(page.getByLabel("Equipe", { exact: true })).toHaveValue("home");
  await page.keyboard.press("Alt+q");
  await expect(page.getByLabel("Período", { exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(target).toBeFocused();
  await expect(page.getByLabel("Período", { exact: true })).toHaveValue("4");
  await page.keyboard.type("00");
  await page.keyboard.press("Enter");
  await page.keyboard.type("3");
  await page.keyboard.press("Enter");
  await page.keyboard.type("0");
  await page.keyboard.press("Enter");
  await page.keyboard.type("2");
  await page.keyboard.press("Enter");
  await expect(page.locator(".score")).toHaveText("5×2");
  await page.keyboard.type("99");
  await page.keyboard.press("Enter");
  await expect(target).toBeFocused();
  await expect(target).toHaveValue("99");
  await expect(
    page.getByRole("alert").filter({ hasText: "Camisa não relacionada" }),
  ).toBeVisible();
  await page.keyboard.type("7");
  await page.keyboard.press("Enter");
  await page.keyboard.type("X");
  await page.keyboard.press("Enter");
  await expect(code).toBeFocused();
  await expect(code).toHaveValue("X");
  await expect(target).toHaveValue("7");
  await page.keyboard.type("2");
  await page.keyboard.press("Enter");
  await expect(target).toBeFocused();
  await expect(page.locator(".score")).toHaveText("7×2");
  await expect(
    page
      .getByRole("region", { name: "Ações da súmula", exact: true })
      .locator("tbody tr"),
  ).toHaveCount(4);
});
