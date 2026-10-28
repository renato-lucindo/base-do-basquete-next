import { test, expect } from "@playwright/test";
import {
  transferBrowserFixture,
  openTransfer,
  conferTransfer,
} from "./fixtures/transfer-browser";
import { tid } from "./fixtures/text-import";

test("transfere com camisa00, preserva períodos e retoma o novo vínculo", async ({
  page,
}) => {
  const f = await transferBrowserFixture(page);
  await openTransfer(page);
  await conferTransfer(page);
  await page
    .getByRole("button", { name: "Confirmar transferência", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Transferência concluída" }),
  ).toBeVisible();
  expect(
    f.context.memberships.filter(
      (m) => m.personId === tid(10) && m.endedAt === null,
    ),
  ).toHaveLength(1);
  expect(
    f.context.memberships.find((m) => m.id === tid(20))!.endedAt,
  ).not.toBeNull();
  await expect(
    page.getByRole("status").filter({ hasText: "Transferência concluída" }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Voltar ao elenco", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Expandir Lobos B", exact: true })
    .click();
  const row = page.getByTestId("roster-row").filter({ hasText: "Ana Silva" });
  await expect(row).toContainText("00");
  await page.reload();
  await page
    .getByRole("button", { name: "Expandir Lobos B", exact: true })
    .click();
  await expect(
    page.getByTestId("roster-row").filter({ hasText: "Ana Silva" }),
  ).toContainText("00");
});
test("ACK incerto congela envio e ACK conhecido com falhaGET repete somente leitura", async ({
  page,
}) => {
  const f = await transferBrowserFixture(page);
  await openTransfer(page);
  await conferTransfer(page);
  f.uncertain();
  f.failRead(true);
  await page
    .getByRole("button", { name: "Confirmar transferência", exact: true })
    .click();
  await expect(
    page.getByLabel("Camisa no destino", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Atualizar vínculo salvo", exact: true }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(2);
  expect(f.attempts[0]).toBe(f.attempts[1]);
  expect(f.receipts.size).toBe(1);
  const newer = f.context.memberships.find(
    (m) => m.personId === tid(10) && m.endedAt === null,
  )!;
  newer.jersey = "7";
  newer.version++;
  f.failRead(false);
  await page
    .getByRole("button", { name: "Atualizar vínculo salvo", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Transferência concluída" }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(2);
});
test("conflito preserva campos e nova conferência depende do contexto atualizado", async ({
  page,
}) => {
  const f = await transferBrowserFixture(page);
  await openTransfer(page);
  await conferTransfer(page);
  f.conflict();
  await page
    .getByRole("button", { name: "Confirmar transferência", exact: true })
    .click();
  await expect(
    page.getByLabel("Camisa no destino", { exact: true }),
  ).toHaveValue("00");
  await expect(
    page.getByRole("button", { name: "Conferir transferência", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", {
      name: "Atualizar contexto preservando campos",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Motivo da transferência ou retorno", { exact: true }),
  ).toHaveValue("Transferência conferida com o regulamento");
  await page
    .getByRole("button", { name: "Conferir transferência", exact: true })
    .click();
  await page
    .getByLabel("Conferi destino, camisa e preservação do histórico", {
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Confirmar transferência", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Transferência concluída" }),
  ).toBeVisible();
});
test("regra ausente bloqueia e guarda mantém edição em320px", async ({
  page,
}, info) => {
  const f = await transferBrowserFixture(page);
  f.context.regulation.transfers = null;
  await page.setViewportSize({ width: 320, height: 840 });
  await openTransfer(page);
  await page
    .getByLabel("Motivo da transferência ou retorno", { exact: true })
    .fill("Rascunho preservado");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Voltar ao elenco", exact: true })
    .click();
  await expect(
    page.getByLabel("Motivo da transferência ou retorno", { exact: true }),
  ).toHaveValue("Rascunho preservado");
  await expect(
    page.getByText(
      "O regulamento ainda não define a permissão de transferência.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Conferir transferência", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/transfer-${info.project.name}-320.png`,
    fullPage: true,
  });
});

test("retorno cria terceiro período sem reativar a primeira linha", async ({
  page,
}) => {
  const f = await transferBrowserFixture(page);
  await openTransfer(page);
  await conferTransfer(page);
  await page
    .getByRole("button", { name: "Confirmar transferência", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Transferência concluída" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Voltar ao elenco", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Expandir Lobos B", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Transferir ou retornar Ana Silva",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Inscrição de destino", { exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Inscrição de destino", { exact: true })
    .selectOption(tid(5));
  await expect(
    page.getByLabel("Camisa no destino", { exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Camisa no destino", { exact: true }).fill("0");
  await page
    .getByLabel("Motivo da transferência ou retorno", { exact: true })
    .fill("Retorno conferido com o regulamento");
  await page
    .getByRole("button", { name: "Conferir transferência", exact: true })
    .click();
  await expect(
    page.getByText("Retorno com novo vínculo:", { exact: false }),
  ).toBeVisible();
  await page
    .getByLabel("Conferi destino, camisa e preservação do histórico", {
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Confirmar transferência", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Retorno concluído" }),
  ).toBeVisible();
  const periods = f.context.memberships.filter((m) => m.personId === tid(10));
  expect(periods).toHaveLength(3);
  expect(periods.filter((m) => m.endedAt === null)).toHaveLength(1);
  expect(periods[0].id).toBe(tid(20));
  expect(periods[0].endedAt).not.toBeNull();
  expect(periods[2].id).not.toBe(tid(20));
});

test("reautenticação preserva comando congelado e campos", async ({ page }) => {
  const f = await transferBrowserFixture(page);
  await openTransfer(page);
  await conferTransfer(page);
  f.expire();
  await page
    .getByRole("button", { name: "Confirmar transferência", exact: true })
    .click();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByLabel("Camisa no destino", { exact: true }),
  ).toHaveValue("00");
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Transferência concluída" }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(2);
  expect(f.attempts[0]).toBe(f.attempts[1]);
  expect(f.receipts.size).toBe(1);
});

test("prévia recusa regulamento alterado preservando campos para atualizar contexto", async ({
  page,
}) => {
  const f = await transferBrowserFixture(page);
  await openTransfer(page);
  await conferTransfer(page);
  f.context.regulation.version++;
  f.context.contextFingerprint = "c".repeat(64);
  await page
    .getByRole("button", { name: "Conferir transferência", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("mudaram");
  await expect(
    page.getByLabel("Camisa no destino", { exact: true }),
  ).toHaveValue("00");
  await page
    .getByRole("button", {
      name: "Atualizar contexto preservando campos",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Conferir transferência", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Conferência da transferência",
      exact: true,
    }),
  ).toBeVisible();
});

test("duas abas recusam versão antiga sem substituir a edição local", async ({
  page,
  context,
}) => {
  const f = await transferBrowserFixture(page),
    second = await context.newPage();
  try {
    await transferBrowserFixture(second, f);
    await openTransfer(page);
    await conferTransfer(page);
    await openTransfer(second);
    await conferTransfer(second);
    await page
      .getByRole("button", { name: "Confirmar transferência", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Transferência concluída" }),
    ).toBeVisible();
    await second
      .getByRole("button", { name: "Confirmar transferência", exact: true })
      .click();
    await expect(second.getByRole("alert")).toContainText("mudaram");
    await expect(
      second.getByLabel("Camisa no destino", { exact: true }),
    ).toHaveValue("00");
    expect(f.receipts.size).toBe(1);
    await second
      .getByRole("button", {
        name: "Atualizar contexto preservando campos",
        exact: true,
      })
      .click();
    await second
      .getByRole("button", { name: "Conferir transferência", exact: true })
      .click();
    await expect(second.getByRole("alert")).toContainText(
      "vínculo de origem mudou",
    );
    expect(f.receipts.size).toBe(1);
  } finally {
    await second.close();
  }
});

test("histórico completo é paginado sem gravação ou período omitido", async ({
  page,
}) => {
  const f = await transferBrowserFixture(page),
    model = f.context.memberships[0];
  for (let n = 1; n <= 25; n++)
    f.context.memberships.push({
      ...model,
      id: tid(1000 + n),
      startedAt: `2020-01-${String(n).padStart(2, "0")}T00:00:00Z`,
      endedAt: `2020-01-${String(n).padStart(2, "0")}T01:00:00Z`,
      version: 1,
    });
  await openTransfer(page);
  await expect(page.getByText("1–20 de 26", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Próximos períodos", exact: true })
    .click();
  await expect(page.getByText("21–26 de 26", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Próximos períodos", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Períodos anteriores", exact: true })
    .click();
  await expect(page.getByText("1–20 de 26", { exact: true })).toBeVisible();
  expect(f.attempts).toHaveLength(0);
});
