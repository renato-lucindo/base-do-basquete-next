import { test, expect } from "@playwright/test";
import {
  removalBrowserFixture,
  openRemovalTeams,
} from "./fixtures/removal-browser";
import { tid } from "./fixtures/text-import";
import { scanAccessibility as scan } from "./fixtures/accessibility";

test("bloqueia histórico e exclui apenas inscrição vazia por teclado", async ({
  page,
}, info) => {
  const f = await removalBrowserFixture(page);
  await openRemovalTeams(page);
  await page
    .getByRole("button", { name: "Excluir inscrição Lobos", exact: true })
    .click();
  await expect(
    page.getByText("Elenco, incluindo vínculos encerrados", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Excluir esta inscrição", exact: true }),
  ).toBeDisabled();
  await scan(page, info, "removal-blocked");
  await page
    .getByRole("button", { name: "Voltar às inscrições", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Excluir inscrição Lobos", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Excluir inscrição Lobos B", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", {
      name: "Conferir exclusão de Lobos B",
      exact: true,
    }),
  ).toBeFocused();
  const confirm = page.getByRole("button", {
    name: "Excluir esta inscrição",
    exact: true,
  });
  await expect(confirm).toBeEnabled();
  await scan(page, info, "removal-available");
  await confirm.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: "Inscrição excluída" }),
  ).toBeFocused();
  expect(f.state.receipts.size).toBe(1);
  expect(f.state.records.has(tid(5))).toBe(true);
  await page
    .getByRole("button", { name: "Voltar às inscrições", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Equipes e elencos", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Expandir Lobos B", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Expandir Lobos", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Expandir Lobos", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Expandir Lobos B", exact: true }),
  ).toHaveCount(0);
});

test("ACK incerto congela intenção e ACK conhecido repete somente GET", async ({
  page,
}) => {
  const f = await removalBrowserFixture(page);
  await openRemovalTeams(page);
  await page
    .getByRole("button", { name: "Excluir inscrição Lobos B", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Excluir esta inscrição", exact: true }),
  ).toBeEnabled();
  f.state.loseAck = true;
  f.state.failReads = 1;
  await page
    .getByRole("button", { name: "Excluir esta inscrição", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  const refresh = page.getByRole("button", {
    name: "Atualizar resultado da exclusão",
    exact: true,
  });
  await expect(refresh).toBeVisible();
  expect(f.state.attempts).toHaveLength(2);
  expect(f.state.attempts[0]).toBe(f.state.attempts[1]);
  await refresh.click();
  await expect(
    page.getByRole("status").filter({ hasText: "Inscrição excluída" }),
  ).toBeVisible();
  expect(f.state.attempts).toHaveLength(2);
  expect(f.state.receipts.size).toBe(1);
});

test("duas abas recusam versão antiga e exigem nova conferência", async ({
  page,
  context,
}) => {
  const f = await removalBrowserFixture(page);
  await openRemovalTeams(page);
  const other = await context.newPage();
  try {
    await removalBrowserFixture(other, f.state);
    await openRemovalTeams(other);
    for (const p of [page, other]) {
      await p
        .getByRole("button", { name: "Excluir inscrição Lobos B", exact: true })
        .click();
      await expect(
        p.getByRole("button", { name: "Excluir esta inscrição", exact: true }),
      ).toBeEnabled();
    }
    f.state.versions.set(tid(6), 2);
    await page
      .getByRole("button", { name: "Excluir esta inscrição", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Excluir esta inscrição", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Atualizar conferência", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Excluir esta inscrição", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Excluir esta inscrição", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Inscrição excluída" }),
    ).toBeVisible();
    expect(JSON.parse(f.state.attempts[0]).expectedVersion).toBe(1);
    expect(JSON.parse(f.state.attempts[1]).expectedVersion).toBe(2);
    expect(JSON.parse(f.state.attempts[0]).commandId).not.toBe(
      JSON.parse(f.state.attempts[1]).commandId,
    );
    await other
      .getByRole("button", { name: "Excluir esta inscrição", exact: true })
      .click();
    await other
      .getByRole("button", { name: "Atualizar conferência", exact: true })
      .click();
    await expect(
      other.getByRole("status").filter({ hasText: "Inscrição excluída" }),
    ).toBeVisible();
    expect(f.state.receipts.size).toBe(1);
  } finally {
    await other.close();
  }
});

test("reauth preserva comando em 320px e texto ampliado", async ({
  page,
}, info) => {
  const f = await removalBrowserFixture(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await openRemovalTeams(page);
  await page
    .getByRole("button", { name: "Excluir inscrição Lobos B", exact: true })
    .click();
  const heading = page.getByRole("heading", {
    name: "Conferir exclusão de Lobos B",
    exact: true,
  });
  await expect(heading).toBeFocused();
  const size = await heading.evaluate((el) =>
    Number.parseFloat(getComputedStyle(el).fontSize),
  );
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  expect(
    await heading.evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).fontSize),
    ),
  ).toBeCloseTo(size * 2);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.screenshot({
    path: `.preview-artifacts/removal-320-text200-${info.project.name}.png`,
    fullPage: true,
  });
  f.state.expireWrite = true;
  await page
    .getByRole("button", { name: "Excluir esta inscrição", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Acesso administrativo", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Inscrição excluída" }),
  ).toBeVisible();
  expect(f.state.attempts).toHaveLength(2);
  expect(f.state.attempts[0]).toBe(f.state.attempts[1]);
});
