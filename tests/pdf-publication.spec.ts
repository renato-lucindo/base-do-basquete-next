import { test, expect, type Page } from "@playwright/test";
import { pdfPreparationFixture } from "./fixtures/pdf-preparation";
import { tid } from "./fixtures/text-import";
async function open(page: Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos/pdfs`,
  );
  await page
    .getByRole("button", { name: "Revisar Boxscore-site.pdf", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Preparar publicação do PDF", exact: true })
    .click();
}
async function selectPlayers(
  page: Page,
  f: Awaited<ReturnType<typeof pdfPreparationFixture>>,
) {
  for (const m of f.review.document.mappings) {
    const team = f.source.parsed.teams[m.sourceSide];
    await page
      .getByLabel(`Participação ${team.name} linha ${m.sourceIndex + 1}`, {
        exact: true,
      })
      .selectOption("played");
    if (m.sourceIndex < 5)
      await page
        .getByLabel(`Titular ${team.name} linha ${m.sourceIndex + 1}`, {
          exact: true,
        })
        .check();
  }
  for (const [side, name] of [
    [0, "Lobos"],
    [1, "Lobos B"],
  ] as const) {
    const m = f.review.document.mappings.find((m) => m.sourceSide === side)!;
    await page
      .getByLabel(`Capitão de ${name}`, { exact: true })
      .selectOption(m.rosterEntryId!);
    await page
      .getByLabel(`Técnico de ${name}`, { exact: true })
      .selectOption("captain");
  }
}
test("PDF preparation requires participation, five starters and captains and survives reload without publishing", async ({
  page,
}) => {
  const f = await pdfPreparationFixture(page);
  await open(page);
  await page
    .getByRole("button", { name: "Salvar preparação", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /participação|titulares|capitão/ }),
  ).toBeVisible();
  expect(f.saveAttempts).toHaveLength(0);
  await selectPlayers(page, f);
  await expect(
    page.getByLabel("Ass. Técnico de Lobos", { exact: true }),
  ).toHaveCount(0);
  for (const label of [
    "Fonte de faltas recebidas",
    "Fonte de indicadores coletivos",
    "Fonte de indicadores gerais",
  ])
    await expect(
      page.getByLabel(label, { exact: true }).locator('option[value="pdf"]'),
    ).toHaveCount(0);
  await page
    .getByLabel("Técnico de Lobos", { exact: true })
    .selectOption(tid(900));
  await page
    .getByLabel("Ass. Técnico de Lobos", { exact: true })
    .selectOption(tid(901));
  await expect(
    page
      .getByLabel("Fonte dos períodos", { exact: true })
      .locator('option[value="pdf"]'),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Salvar preparação", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Preparação salva" }),
  ).toBeVisible();
  expect(f.publishAttempts).toHaveLength(0);
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("heading", { name: "Conferir publicação do PDF", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `.preview-artifacts/pdf-preparation-320-${test.info().project.name}.png`,
  });
  const intent = f.saved()!.publication;
  await page.reload();
  await page
    .getByRole("button", { name: "Preparar publicação do PDF", exact: true })
    .click();
  await expect(
    page.getByLabel("Técnico de Lobos", { exact: true }),
  ).toHaveValue(tid(900));
  await expect(
    page.getByLabel("Ass. Técnico de Lobos", { exact: true }),
  ).toHaveValue(tid(901));
  await page
    .getByRole("button", { name: "Publicar preparação salva", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Resultado publicado" }),
  ).toBeVisible();
  expect(JSON.parse(f.publishAttempts[0]).requestId).toBe(intent.requestId);
  await expect(
    page.getByRole("link", { name: "Ver resultado publicado", exact: true }),
  ).toBeVisible();
});

test("saved PDF preparation repeats identical save and publish commands after response loss and reload", async ({
  page,
}) => {
  const f = await pdfPreparationFixture(page);
  await open(page);
  await selectPlayers(page, f);
  f.loseSave();
  await page
    .getByRole("button", { name: "Salvar preparação", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Repetir salvamento da preparação",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Técnico de Lobos", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", {
      name: "Repetir salvamento da preparação",
      exact: true,
    })
    .click();
  expect(f.saveAttempts).toHaveLength(2);
  expect(f.saveAttempts[0]).toBe(f.saveAttempts[1]);
  f.losePublish();
  await page
    .getByRole("button", { name: "Publicar preparação salva", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Repetir publicação do PDF",
      exact: true,
    }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.reload();
  await page
    .getByRole("button", { name: "Preparar publicação do PDF", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publicar preparação salva", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Resultado publicado" }),
  ).toBeVisible();
  expect(f.publishAttempts).toHaveLength(2);
  expect(f.publishAttempts[0]).toBe(f.publishAttempts[1]);
});

test("PDF publication survives reauthentication with the same command", async ({
  page,
}) => {
  const f = await pdfPreparationFixture(page);
  await open(page);
  await selectPlayers(page, f);
  await page
    .getByRole("button", { name: "Salvar preparação", exact: true })
    .click();
  f.expirePublish();
  await page
    .getByRole("button", { name: "Publicar preparação salva", exact: true })
    .click();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Repetir publicação do PDF", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Resultado publicado" }),
  ).toBeVisible();
  expect(f.publishAttempts).toHaveLength(2);
  expect(f.publishAttempts[0]).toBe(f.publishAttempts[1]);
});

test("PDF conflict preserves choices and requires explicit fresh preparation", async ({
  page,
}) => {
  const f = await pdfPreparationFixture(page);
  await open(page);
  await selectPlayers(page, f);
  await page
    .getByRole("button", { name: "Salvar preparação", exact: true })
    .click();
  const g = f.games.get(tid(8))!;
  f.games.set(g.id, { ...g, version: 2 });
  await page
    .getByRole("button", { name: "Publicar preparação salva", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Outra aba" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Publicar preparação salva",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Capitão de Lobos", { exact: true }),
  ).toHaveValue(f.review.document.mappings[0].rosterEntryId!);
  await page
    .getByRole("button", { name: "Preparar nova revisão", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar preparação", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Preparação salva" }),
  ).toBeVisible();
  expect(f.saved()?.publication.gameVersion).toBe(2);
  expect(JSON.parse(f.publishAttempts[0]).gameVersion).toBe(1);
});

test("known PDF publication recovers only its read and revision transports an explicit reason", async ({
  page,
}) => {
  const f = await pdfPreparationFixture(page);
  await open(page);
  await selectPlayers(page, f);
  await page
    .getByRole("button", { name: "Salvar preparação", exact: true })
    .click();
  f.failPublishedRead();
  await page
    .getByRole("button", { name: "Publicar preparação salva", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Recuperar resultado publicado",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Recuperar resultado publicado", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Resultado publicado" }),
  ).toBeVisible();
  expect(f.publishAttempts).toHaveLength(1);
  await page
    .getByRole("button", { name: "Voltar às associações do PDF", exact: true })
    .click();
  await page
    .getByLabel("Motivo da revisão do PDF", { exact: true })
    .fill("Correção de observação após publicação.");
  await page
    .getByLabel("Observações da revisão", { exact: true })
    .fill("Conferência final.");
  const sent = page.waitForRequest(
    (r) =>
      r.url().endsWith(`/api/pdf-sources/${f.source.id}/review`) &&
      r.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  expect((await sent).postDataJSON().reason).toBe(
    "Correção de observação após publicação.",
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Revisão salva" }),
  ).toBeVisible();
  expect(f.publishAttempts).toHaveLength(1);
});

test("a changed PDF review does not silently reuse the prior supplement", async ({
  page,
}) => {
  const f = await pdfPreparationFixture(page);
  await open(page);
  await selectPlayers(page, f);
  await page
    .getByRole("button", { name: "Salvar preparação", exact: true })
    .click();
  f.reviews.set(f.source.id, {
    ...f.review,
    version: 2,
    document: { ...f.review.document, notes: "Revisão feita em outra aba" },
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Preparar publicação do PDF", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "outra revisão ou destino" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Capitão de Lobos", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", {
      name: "Publicar preparação salva",
      exact: true,
    }),
  ).toHaveCount(0);
});
