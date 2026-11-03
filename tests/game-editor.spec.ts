import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { gamesFixture, selectGameRegistration } from "./fixtures/games";
import { tid } from "./fixtures/text-import";

test("busca mantém a opção ativa visível ao navegar pela lista com teclado", async ({
  page,
}) => {
  const f = await gamesFixture(page);
  const template = f.registrations.get(tid(5))!;
  for (let n = 30; n < 55; n++)
    f.registrations.set(tid(n), {
      ...template,
      id: tid(n),
      name: `Equipe ${n}`,
    });
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
  const field = page.getByLabel("Inscrição mandante", { exact: true });
  await field.fill("Equipe");
  await expect(
    page.getByRole("option", { name: "Equipe 49", exact: true }),
  ).toBeAttached();
  for (let n = 0; n < 20; n++) await field.press("ArrowDown");
  const option = page.getByRole("option", { name: "Equipe 49", exact: true });
  await expect(option).toHaveAttribute("aria-selected", "true");
  await expect(option).toBeInViewport();
  await field.press("Enter");
  await expect(field).toHaveValue("Equipe 49");
});

test("diálogo aprovado: etapa lateral, rodadas opcionais e ações sempre visíveis", async ({
  page,
}, info) => {
  await gamesFixture(page);
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Novo jogo", exact: true });
  await expect(
    page.getByLabel("Jogo de eliminatória", { exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("combobox", { name: "Etapa (opcional)", exact: true }),
  ).toBeHidden();
  await expect(page.getByLabel("Hora de fim", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Rodada (opcional)", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("group", { name: "Oficiais de Quadra", exact: true }),
  ).toBeHidden();
  await page.getByLabel("Jogo de eliminatória", { exact: true }).check();
  for (const [width, height] of info.project.name === "desktop"
    ? [
        [1366, 768],
        [1920, 1080],
        [683, 384],
      ]
    : [
        [390, 844],
        [320, 740],
      ]) {
    await page.setViewportSize({ width, height });
    await page
      .getByRole("combobox", { name: "Etapa (opcional)", exact: true })
      .scrollIntoViewIfNeeded();
    const stage = await page
      .getByRole("combobox", { name: "Etapa (opcional)", exact: true })
      .boundingBox();
    const check = await page.locator(".game-knockout-check").boundingBox();
    expect(stage!.x).toBeGreaterThan(check!.x);
    expect(Math.abs(stage!.y - check!.y)).toBeLessThan(4);
    await expect(
      page.getByRole("button", {
        name: "Salvar e adicionar outro",
        exact: true,
      }),
    ).toBeInViewport();
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.preview-artifacts/game-editor-${width}.png`,
    });
  }
  await page
    .getByRole("combobox", { name: "Etapa (opcional)", exact: true })
    .fill("Etapa especial");
  await page.getByLabel("Jogo de eliminatória", { exact: true }).uncheck();
  await page.getByLabel("Jogo de eliminatória", { exact: true }).check();
  await expect(
    page.getByRole("combobox", { name: "Etapa (opcional)", exact: true }),
  ).toHaveValue("");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

for (const mode of ["uncertain", "ack"] as const)
  test(`salvar e adicionar outro recupera ${mode} sem duplicar e limpa só os dados combinados`, async ({
    page,
  }) => {
    const f = await gamesFixture(page);
    await page.goto(
      `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
    );
    await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
    await selectGameRegistration(page, "mandante", "Lobos");
    await selectGameRegistration(page, "visitante", "Lobos B");
    await page.getByLabel("Data do jogo", { exact: true }).fill("2026-11-15");
    await page.getByLabel("Hora de início", { exact: true }).fill("18:30");
    await page.getByLabel("Hora de fim", { exact: true }).fill("20:15");
    await page
      .getByLabel("Local", { exact: true })
      .fill("Ginásio de demonstração");
    await page.getByLabel("Número do jogo", { exact: true }).fill("027");
    await page
      .getByRole("combobox", { name: "Rodada (opcional)", exact: true })
      .fill("5");
    await page.getByLabel("Jogo de eliminatória", { exact: true }).check();
    await page
      .getByRole("combobox", { name: "Etapa (opcional)", exact: true })
      .fill("Semifinal");
    if (mode === "uncertain") f.uncertain();
    else f.failNextEditorRead();
    await page
      .getByRole("button", { name: "Salvar e adicionar outro", exact: true })
      .click();
    const retry = page.getByRole("button", {
      name: mode === "ack" ? "Recuperar jogo salvo" : "Repetir o mesmo envio",
      exact: true,
    });
    await expect(retry).toBeVisible();
    await expect(
      page.getByLabel("Número do jogo", { exact: true }),
    ).toHaveValue("027");
    await retry.click();
    await expect(
      page.getByLabel("Inscrição mandante", { exact: true }),
    ).toHaveValue("");
    await expect(
      page.getByLabel("Inscrição visitante", { exact: true }),
    ).toHaveValue("");
    await expect(
      page.getByLabel("Hora de início", { exact: true }),
    ).toHaveValue("");
    await expect(page.getByLabel("Hora de fim", { exact: true })).toHaveValue(
      "",
    );
    await expect(
      page.getByLabel("Número do jogo", { exact: true }),
    ).toHaveValue("");
    await expect(
      page.getByLabel("Jogo de eliminatória", { exact: true }),
    ).not.toBeChecked();
    await expect(page.getByLabel("Data do jogo", { exact: true })).toHaveValue(
      "2026-11-15",
    );
    await expect(page.getByLabel("Local", { exact: true })).toHaveValue(
      "Ginásio de demonstração",
    );
    await expect(
      page.getByRole("combobox", { name: "Rodada (opcional)", exact: true }),
    ).toHaveValue("5");
    await expect(
      page.getByLabel("Inscrição mandante", { exact: true }),
    ).toBeFocused();
    expect(f.games.size).toBe(1);
    expect(new Set(f.attempts).size).toBe(1);
    expect(f.attempts).toHaveLength(mode === "ack" ? 1 : 2);
    expect([...f.games.values()][0]).toMatchObject({
      stageKind: "knockout",
      round: 5,
      knockoutStage: "Semifinal",
      endAt: "2026-11-15T20:15",
    });
  });

test("rodada inválida mantém edição e jogo regular salva sem etapa nem rodada", async ({
  page,
}) => {
  const f = await gamesFixture(page);
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
  await selectGameRegistration(page, "mandante", "Lobos");
  await selectGameRegistration(page, "visitante", "Lobos B");
  await page
    .getByLabel("Inscrição mandante", { exact: true })
    .fill("Busca sem seleção");
  await page.getByLabel("Inscrição mandante", { exact: true }).press("Escape");
  await expect(
    page.getByLabel("Inscrição mandante", { exact: true }),
  ).toHaveValue("Lobos");
  const round = page.getByRole("combobox", {
    name: "Rodada (opcional)",
    exact: true,
  });
  await round.fill("0");
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(round).toHaveAttribute("aria-invalid", "true");
  await expect(round).toBeFocused();
  expect(f.games.size).toBe(0);
  await round.fill("");
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Preparar súmula", exact: true }),
  ).toBeEnabled();
  expect([...f.games.values()][0]).toMatchObject({
    stageKind: "round_robin",
    round: null,
    knockoutStage: null,
  });
});
