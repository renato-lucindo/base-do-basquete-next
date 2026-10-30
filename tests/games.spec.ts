import { test, expect, type Page } from "@playwright/test";
import { tid } from "./fixtures/text-import";
import { gamesFixture as fixture } from "./fixtures/games";
async function open(page: Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
  await page
    .getByLabel("Inscrição mandante", { exact: true })
    .selectOption(tid(5));
  await page
    .getByLabel("Inscrição visitante", { exact: true })
    .selectOption(tid(6));
}

test("cria inscrição dentro do jogo e volta com agenda, seleção e foco preservados", async ({
  page,
}) => {
  const f = await fixture(page);
  await open(page);
  await page.getByLabel("Data do jogo", { exact: true }).fill("2026-11-15");
  await page.getByLabel("Horário do jogo", { exact: true }).fill("15:30");
  await page.getByLabel("Local", { exact: true }).fill("Quadra preservada");
  await page
    .getByRole("button", {
      name: "Criar ou editar inscrição aqui",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Adicionar inscrição", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Selecionar Lobos Clube", exact: true })
    .click();
  await page
    .getByLabel("Nome público da inscrição", { exact: true })
    .fill("Lobos Juvenil");
  await page
    .getByRole("button", { name: "Salvar inscrição", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Inscrição salva." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Voltar ao jogo", exact: true })
    .click();
  await expect(page.getByLabel("Data do jogo", { exact: true })).toHaveValue(
    "2026-11-15",
  );
  await expect(page.getByLabel("Horário do jogo", { exact: true })).toHaveValue(
    "15:30",
  );
  await expect(page.getByLabel("Local", { exact: true })).toHaveValue(
    "Quadra preservada",
  );
  await expect(
    page.getByLabel("Inscrição mandante", { exact: true }),
  ).toHaveValue(tid(5));
  await expect(
    page.getByLabel("Inscrição visitante", { exact: true }),
  ).toHaveValue(tid(6));
  await expect(
    page.getByRole("button", {
      name: "Criar ou editar inscrição aqui",
      exact: true,
    }),
  ).toBeFocused();
  const created = [...f.registrations.values()].find(
    (r) => r.name === "Lobos Juvenil",
  )!;
  await page
    .getByLabel("Inscrição visitante", { exact: true })
    .selectOption(created.id);
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  expect([...f.games.values()][0]).toMatchObject({
    awayRegistrationId: created.id,
    venue: "Quadra preservada",
    scheduledAt: "2026-11-15T15:30:00-03:00",
  });
});

test("conserva inscrições selecionadas entre páginas e buscas", async ({
  page,
}) => {
  const f = await fixture(page);
  const template = f.registrations.get(tid(5))!;
  for (let i = 30; i < 53; i++)
    f.registrations.set(tid(i), {
      ...template,
      id: tid(i),
      name: `Equipe ${i}`,
    });
  await open(page);
  await page
    .getByRole("button", { name: "Mais inscrições", exact: true })
    .click();
  await expect(
    page
      .getByLabel("Inscrição visitante", { exact: true })
      .locator(`option[value="${tid(52)}"]`),
  ).toHaveCount(1);
  await expect(
    page.getByLabel("Inscrição mandante", { exact: true }),
  ).toHaveValue(tid(5));
  await page
    .getByLabel("Inscrição visitante", { exact: true })
    .selectOption(tid(52));
  await page
    .getByLabel("Buscar inscrições para este jogo", { exact: true })
    .fill("Equipe 30");
  await expect(
    page
      .getByLabel("Inscrição visitante", { exact: true })
      .locator(`option[value="${tid(30)}"]`),
  ).toHaveCount(1);
  await expect(
    page.getByLabel("Inscrição visitante", { exact: true }),
  ).toHaveValue(tid(52));
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  expect([...f.games.values()][0].awayRegistrationId).toBe(tid(52));
});
test("preserva cadastro do jogo após sessão expirada e bloqueia saída acidental", async ({
  page,
}) => {
  const f = await fixture(page);
  await open(page);
  await page.getByLabel("Local", { exact: true }).fill("Quadra preservada");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Voltar à lista de jogos", exact: true })
    .click();
  await expect(page.getByLabel("Local", { exact: true })).toHaveValue(
    "Quadra preservada",
  );
  f.expire();
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByLabel("Local", { exact: true })).toHaveValue(
    "Quadra preservada",
  );
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
});
test("cadastra partida diretamente, conserva data sem horário e retoma sem placar fictício", async ({
  page,
}, testInfo) => {
  const f = await fixture(page);
  await open(page);
  await page.getByLabel("Data do jogo", { exact: true }).fill("2026-10-23");
  await page.getByLabel("Local", { exact: true }).fill("Quadra Azul");
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  expect([...f.games.values()][0]).toMatchObject({
    date: "2026-10-23",
    time: null,
    scheduledAt: null,
  });
  await page.reload();
  await expect(page.getByText("Quadra Azul", { exact: true })).toBeVisible();
  await expect(page.getByText("Sem resultado", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Abrir jogo Lobos/ }).click();
  await expect(page.getByLabel("Data do jogo", { exact: true })).toHaveValue(
    "2026-10-23",
  );
  await page.screenshot({
    path: `.preview-artifacts/jogos-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/jogos-320-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test("repete a mesma intenção e mantém edição até recarga explícita de conflito", async ({
  page,
}) => {
  const f = await fixture(page);
  await open(page);
  f.uncertain();
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(page.getByLabel("Local", { exact: true })).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  expect(f.attempts[0]).toBe(f.attempts[1]);
  await page.getByLabel("Local", { exact: true }).fill("Meu ajuste");
  f.conflict();
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(page.getByLabel("Local", { exact: true })).toHaveValue(
    "Meu ajuste",
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Recarregar jogo", exact: true })
    .click();
  await expect(page.getByLabel("Local", { exact: true })).toHaveValue(
    "Servidor atualizado",
  );
});
test("registra horários reais, calcula duração com virada do dia e recupera a edição", async ({
  page,
}) => {
  const f = await fixture(page);
  await open(page);
  await page
    .getByLabel("Início real do jogo (data e hora)")
    .fill("2026-10-30T23:15");
  await page
    .getByLabel("Término real do jogo (data e hora)")
    .fill("2026-10-31T00:50");
  await expect(
    page.getByRole("status").filter({ hasText: "1h 35min" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  expect([...f.games.values()][0]).toMatchObject({
    startAt: "2026-10-30T23:15",
    endAt: "2026-10-31T00:50",
  });
  await page.reload();
  await page.getByRole("button", { name: /Abrir jogo Lobos/ }).click();
  await expect(
    page.getByLabel("Início real do jogo (data e hora)"),
  ).toHaveValue("2026-10-30T23:15");
  await expect(
    page.getByLabel("Término real do jogo (data e hora)"),
  ).toHaveValue("2026-10-31T00:50");
});
