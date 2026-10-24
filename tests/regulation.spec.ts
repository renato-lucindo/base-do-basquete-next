import { test, expect, type Page } from "@playwright/test";
import { regulationBrowserFixture } from "./fixtures/regulation-browser";
import { tid } from "./fixtures/text-import";
async function prepare(page: Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`,
  );
  await page
    .getByRole("heading", { name: "Regulamento da disputa", exact: true })
    .waitFor();
  await page.getByLabel("Incluir Lobos", { exact: true }).check();
  await page.getByLabel("Incluir Lobos B", { exact: true }).check();
  await page
    .getByRole("button", { name: "Adicionar pontos corridos", exact: true })
    .click();
  await page.getByLabel("Pontos por vitória", { exact: true }).fill("2");
  await page.getByLabel("Pontos por derrota", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Ver jogos para atribuir", exact: true })
    .click();
  await page
    .getByLabel("Organização do jogo 1", { exact: true })
    .selectOption({ label: "Fase 1 / Grupo 1" });
}
test("organiza pontos corridos, confere impacto, salva e retoma a classificação após recarregar", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  await prepare(page);
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Depois da alteração", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Confirmar e salvar regulamento",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByLabel("Motivo da alteração", { exact: true })
    .fill("Regras conferidas com o resultado registrado");
  await page
    .getByLabel("Conferi o impacto nos resultados e cruzamentos", {
      exact: true,
    })
    .check();
  await page
    .getByRole("button", {
      name: "Confirmar e salvar regulamento",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Regulamento salvo" }),
  ).toBeVisible();
  expect(f.getState().version).toBe(1);
  await page.reload();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("2");
  await expect(
    page.getByRole("heading", { name: "Classificação atual", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver versão 1", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Versão 1 do regulamento", exact: true }),
  ).toBeVisible();
});
test("repete somente o comando congelado depois de resposta perdida sem criar outra versão", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  await prepare(page);
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await page
    .getByLabel("Motivo da alteração", { exact: true })
    .fill("Conferência para salvar esta organização");
  await page
    .getByLabel("Conferi o impacto nos resultados e cruzamentos", {
      exact: true,
    })
    .check();
  f.uncertain();
  await page
    .getByRole("button", {
      name: "Confirmar e salvar regulamento",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir envio do regulamento", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Regulamento salvo" }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(2);
  expect(f.attempts[0]).toBe(f.attempts[1]);
  expect(f.getState().version).toBe(1);
});

test("recupera falha do catálogo inicial sem liberar um editor sem inscrições", async ({
  page,
}) => {
  await regulationBrowserFixture(page);
  let failed = false;
  await page.route(/\/api\/registrations\?/, async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({
        status: 503,
        json: {
          error: {
            code: "access_unavailable",
            message: "Catálogo indisponível.",
          },
        },
      });
    } else await route.fallback();
  });
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`,
  );
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(page.getByLabel("Incluir Lobos", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Incluir Lobos B", { exact: true }),
  ).toBeVisible();
});

test("preserva edição quando o contexto muda e exige conferir uma nova prévia", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  await prepare(page);
  f.changeContext();
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Recarregar dados para nova prévia",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("2");
  expect(f.attempts).toHaveLength(0);
  await page
    .getByRole("button", {
      name: "Recarregar dados para nova prévia",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("2");
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Depois da alteração", exact: true }),
  ).toBeVisible();
});

test("preserva slots atribuídos ao trocar formato e permite remover eliminatória vazia", async ({
  page,
}) => {
  await regulationBrowserFixture(page);
  await prepare(page);
  await page
    .getByRole("button", { name: "Adicionar eliminatória", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adicionar confronto", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Formato do confronto", exact: true })
    .selectOption("best_of_7");
  await page
    .getByLabel("Organização do jogo 1", { exact: true })
    .selectOption({ label: "Confronto 1 / Jogo 7" });
  await expect(
    page
      .getByRole("combobox", { name: "Formato do confronto", exact: true })
      .locator('option[value="single"]'),
  ).toHaveJSProperty("disabled", true);
  await page
    .getByLabel("Organização do jogo 1", { exact: true })
    .selectOption("");
  await page
    .getByRole("combobox", { name: "Formato do confronto", exact: true })
    .selectOption("single");
  await expect(
    page.getByRole("button", { name: "Remover eliminatória", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Remover confronto", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remover eliminatória", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome da fase eliminatória", { exact: true }),
  ).toHaveCount(0);
});

test("mantém a página em 320px com tabelas roláveis dentro dos painéis", async ({
  page,
}, testInfo) => {
  await regulationBrowserFixture(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await prepare(page);
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Depois da alteração", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const standings = page.getByRole("table").filter({
    has: page.getByRole("columnheader", { name: "Posição", exact: true }),
  });
  expect(
    await standings
      .locator("th")
      .first()
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBeGreaterThanOrEqual(70);
  await page.screenshot({
    path: testInfo.outputPath("regulamento-320.png"),
    fullPage: true,
  });
});

test("retoma o mesmo comando após reautenticação sem perder a edição", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  const sent: string[] = [];
  await page.route(/\/api\/regulations\//, async (route) => {
    if (
      route.request().method() === "POST" &&
      !route.request().url().endsWith("/preview")
    )
      sent.push(route.request().postData()!);
    await route.fallback();
  });
  await prepare(page);
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await page
    .getByLabel("Motivo da alteração", { exact: true })
    .fill("Confirmar regras e partidas");
  await page
    .getByLabel("Conferi o impacto nos resultados e cruzamentos", {
      exact: true,
    })
    .check();
  f.expireRegulation();
  await page
    .getByRole("button", {
      name: "Confirmar e salvar regulamento",
      exact: true,
    })
    .click();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("2");
  await page
    .getByRole("button", { name: "Repetir envio do regulamento", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Regulamento salvo" }),
  ).toBeVisible();
  expect(sent).toHaveLength(2);
  expect(sent[0]).toBe(sent[1]);
  expect(f.getState().version).toBe(1);
});
