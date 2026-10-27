import { test, expect } from "@playwright/test";
import { textImportFixture, openTextImport, tid } from "./fixtures/text-import";

test("seleciona identidades seguras, retoma e confirma o conjunto sem conferir cada atleta", async ({
  page,
}) => {
  const f = await textImportFixture(page);
  const originalPeople = structuredClone([...f.persons.values()]);
  await openTextImport(page);
  await page
    .getByLabel("Texto do elenco", { exact: true })
    .fill("5 - Ana Silva\n9 - Joao Silva - 000222");
  await page
    .getByRole("button", { name: "Interpretar texto", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: /· Conferência salva$/u }),
  ).toBeVisible();
  const saved = [...f.reviews.values()][0];
  expect(saved.rows.map((r) => r.decision)).toEqual([
    { kind: "existing", personId: tid(10), version: 1, approveChanges: false },
    { kind: "existing", personId: tid(12), version: 1, approveChanges: false },
  ]);
  expect(saved.rows[0]).toMatchObject({ rosterId: tid(20), rosterVersion: 1 });
  expect(f.members.size).toBe(2);
  await expect(
    page.getByRole("button", { name: "Confirmar selecionados", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await page
    .getByRole("button", { name: "Expandir Lobos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Importar elenco", exact: true })
    .click();
  await page
    .getByText("Retomar uma conferência salva", { exact: true })
    .click();
  await page
    .getByRole("button", { name: /Retomar conferência/ })
    .first()
    .click();
  await expect(
    page.getByText("Cadastro escolhido: Ana Silva", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Cadastro escolhido: Joao Silva", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar selecionados", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "2 confirmados" }),
  ).toBeVisible();
  expect([...f.persons.values()]).toEqual(originalPeople);
  expect(f.members.size).toBe(3);
  expect(
    [...f.members.values()].find((m) => m.personId === tid(12)),
  ).toMatchObject({ jersey: "9", registrationId: tid(5) });
  expect(f.members.get(tid(21))?.personId).toBe(tid(14));
});

test("mantém homônimos e grafia apenas semelhante pendentes", async ({
  page,
}) => {
  await textImportFixture(page);
  await openTextImport(page);
  await page
    .getByLabel("Texto do elenco", { exact: true })
    .fill("9 - Joao Silva\n10 - Luke Silva");
  await page
    .getByRole("button", { name: "Interpretar texto", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: /· Conferência salva$/u }),
  ).toBeVisible();
  await expect(
    page.getByText("Escolha a identidade", { exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Confirmar selecionados", exact: true }),
  ).toBeDisabled();
  await page
    .getByTestId(`candidate-${tid(12)}`)
    .getByRole("button", { name: "Usar este cadastro", exact: true })
    .click();
  await expect(
    page.getByText("Cadastro escolhido: Joao Silva", { exact: true }),
  ).toBeVisible();
});

test("respeita linha desmarcada e escolha manual de outra pessoa ao refazer a busca", async ({
  page,
}) => {
  const f = await textImportFixture(page);
  await openTextImport(page);
  await page
    .getByLabel("Texto do elenco", { exact: true })
    .fill("5 - Ana Silva\n9 - Joao Silva - 000222");
  await page
    .getByRole("button", { name: "Interpretar texto", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: /· Conferência salva$/u }),
  ).toBeVisible();
  await page.getByLabel("Selecionar linha 1", { exact: true }).uncheck();
  const second = page
    .getByRole("table", { name: "Conferência do elenco" })
    .getByRole("row")
    .nth(2);
  await second
    .getByRole("button", {
      name: "É outra pessoa: criar novo cadastro",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Buscar correspondências", exact: true })
    .click();
  await expect(
    page.getByLabel("Selecionar linha 1", { exact: true }),
  ).not.toBeChecked();
  await expect(
    second.getByText("Criar nova pessoa", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Salvar conferência", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: /· Conferência salva$/u }),
  ).toBeVisible();
  const saved = [...f.reviews.values()][0];
  expect(saved.rows[1].decision).toMatchObject({
    kind: "new",
    confirmHomonym: true,
  });
  expect(f.persons.size).toBe(5);
});
