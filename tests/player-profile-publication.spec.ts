import { test, expect } from "@playwright/test";
import {
  profileBrowserFixture,
  openProfilePublication,
  conferProfile,
} from "./fixtures/player-profile-browser";
test("confirma somente metadados salvos, sem expor campos privados na conferência", async ({
  page,
}) => {
  const f = await profileBrowserFixture(page);
  await openProfilePublication(page);
  await conferProfile(page);
  await expect(
    page.getByRole("region", { name: "Dados públicos do perfil", exact: true }),
  ).toContainText("Ana Silva");
  await expect(
    page.getByRole("region", { name: "Dados públicos do perfil", exact: true }),
  ).not.toContainText("Data de nascimento");
  await page
    .getByRole("button", { name: "Publicar perfil", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Perfil confirmado" }),
  ).toBeVisible();
  expect(f.receipts.size).toBe(1);
  const c = JSON.parse(f.attempts[0]);
  expect(c).not.toHaveProperty("person");
  expect(c.personId).toBe(f.pid);
  await page
    .getByRole("button", { name: "Voltar ao elenco", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Perfil público de Ana Silva", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Ver página pública", exact: true }),
  ).toHaveAttribute("href", `/atleta.html#${f.pid}`);
});
test("ACK incerto repete comando e ACK conhecido com leitura falha repete sóGET", async ({
  page,
}) => {
  const f = await profileBrowserFixture(page);
  await openProfilePublication(page);
  await conferProfile(page);
  f.uncertain();
  f.failRead(true);
  await page
    .getByRole("button", { name: "Publicar perfil", exact: true })
    .click();
  await expect(
    page.getByLabel("Motivo da publicação", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Atualizar confirmação", exact: true }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(2);
  expect(f.attempts[0]).toBe(f.attempts[1]);
  f.failRead(false);
  await page
    .getByRole("button", { name: "Atualizar confirmação", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Perfil confirmado" }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(2);
});
test("reautenticação conserva motivo e comando congelado", async ({ page }) => {
  const f = await profileBrowserFixture(page);
  await openProfilePublication(page);
  await conferProfile(page);
  f.expire();
  await page
    .getByRole("button", { name: "Publicar perfil", exact: true })
    .click();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByLabel("Motivo da publicação", { exact: true }),
  ).toHaveValue("Dados públicos conferidos");
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Perfil confirmado" }),
  ).toBeVisible();
  expect(f.attempts[0]).toBe(f.attempts[1]);
});
test("conflito conserva motivo e exige conferir a fonte atualizada", async ({
  page,
}) => {
  const f = await profileBrowserFixture(page);
  await openProfilePublication(page);
  await conferProfile(page);
  f.changeSource();
  await page
    .getByRole("button", { name: "Publicar perfil", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("cadastro mudou");
  await expect(
    page.getByLabel("Motivo da publicação", { exact: true }),
  ).toHaveValue("Dados públicos conferidos");
  await expect(
    page.getByRole("button", { name: "Publicar perfil", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Atualizar dados para conferir", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Dados públicos do perfil", exact: true }),
  ).toContainText("Nome atualizado");
  await conferProfile(page);
  await page
    .getByRole("button", { name: "Publicar perfil", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Perfil confirmado" }),
  ).toBeVisible();
  expect(JSON.parse(f.attempts[1]).expectedPersonVersion).toBe(2);
});
test("guarda preserva motivo e conferência reflui em320px", async ({
  page,
}, info) => {
  await profileBrowserFixture(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await openProfilePublication(page);
  await page
    .getByLabel("Motivo da publicação", { exact: true })
    .fill("Motivo não salvo");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Voltar ao elenco", exact: true })
    .click();
  await expect(
    page.getByLabel("Motivo da publicação", { exact: true }),
  ).toHaveValue("Motivo não salvo");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/profile-publication-${info.project.name}-320.png`,
    fullPage: true,
  });
});
