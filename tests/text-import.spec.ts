import { test, expect } from "@playwright/test";
import { textImportFixture, openTextImport, tid } from "./fixtures/text-import";
test("importa dados ricos, conserva existentes/ausentes e retoma conferência salva", async ({
  page,
}, info) => {
  const f = await textImportFixture(page);
  await openTextImport(page);
  await page
    .getByLabel("Texto do elenco", { exact: true })
    .fill(
      'Equipe: Lobos\n5 - Ana Silva\n12 - Ricardo Souza - 193 - 1999\nPato Ganso - "PH" - Canhoto',
    );
  await page
    .getByRole("button", { name: "Interpretar texto", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Conferência do elenco" }),
  ).toBeVisible();
  const columns = [
    "Nome",
    "Camisa",
    "Apelido",
    "Nascimento",
    "Ano de nascimento",
    "Posições",
    "Altura (cm)",
    "Peso (kg)",
    "Mão dominante",
    "Registro federativo",
    "Selecionar e situação",
    "Identidade e alterações",
  ];
  await expect(page.getByRole("columnheader")).toHaveText(columns);
  const firstRow = page
    .getByRole("table", { name: "Conferência do elenco" })
    .getByRole("row")
    .nth(1);
  for (let index = 0; index < 10; index++) {
    const label = index === 5 ? "Posição 1" : columns[index];
    await expect(
      firstRow
        .getByRole("cell")
        .nth(index)
        .getByLabel(`${label}, linha 2`, { exact: true }),
    ).toHaveCount(1);
  }
  await page
    .getByTestId(`candidate-${tid(10)}`)
    .getByRole("button", { name: /Usar/ })
    .click();
  await expect(
    page.getByLabel("Mão dominante, linha 2", { exact: true }),
  ).toHaveValue("left");
  await expect(
    page.getByLabel("Altura (cm), linha 3", { exact: true }),
  ).toHaveValue("193");
  await page
    .getByLabel("Nome, linha 3", { exact: true })
    .fill("Ricardo Corrigido");
  await expect(page.getByText("Ausente", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar selecionados", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "3 confirmados" }),
  ).toBeVisible();
  expect(f.members.size).toBe(4);
  expect(f.persons.get(tid(10))!.data.nickname).toBe("Aninha");
  expect(
    [...f.persons.values()].find((p) => p.data.name === "Ricardo Corrigido")
      ?.data,
  ).toMatchObject({ heightCm: 193, birthYear: 1999 });
  expect([...f.members.values()].some((m) => m.personId === tid(14))).toBe(
    true,
  );
  if (info.project.name === "mobile")
    await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/importador-${info.project.name}.png`,
    fullPage: true,
  });
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
    page.getByRole("status").filter({ hasText: "3 confirmados" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nome, linha 3", { exact: true })).toHaveValue(
    "Ricardo Corrigido",
  );
});
test("resolve homônimos e corrige pendências sem desfazer sucessos do lote", async ({
  page,
}) => {
  const f = await textImportFixture(page);
  f.failedNames.add("Falha");
  await openTextImport(page);
  await page
    .getByLabel("Texto do elenco", { exact: true })
    .fill(
      "Joao Silva - 2001\n7 - Dado inválido - 31/02/2000\n9 - Pronta\n10 - Falha\n11 - Outra pronta",
    );
  await page
    .getByRole("button", { name: "Interpretar texto", exact: true })
    .click();
  await page
    .getByTestId(`candidate-${tid(12)}`)
    .getByRole("button", { name: /Usar/ })
    .click();
  await page
    .getByRole("button", { name: "Confirmar selecionados", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "3 confirmados" }),
  ).toBeVisible();
  expect([...f.members.values()].some((m) => m.personId === tid(12))).toBe(
    true,
  );
  expect(
    [...f.persons.values()].filter((p) => p.data.name === "Joao Silva"),
  ).toHaveLength(2);
  await page
    .getByLabel("Nascimento, linha 2", { exact: true })
    .fill("2000-02-29");
  await page.getByLabel("Nome, linha 4", { exact: true }).fill("Corrigida");
  await page
    .getByRole("button", { name: "Confirmar selecionados", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "5 confirmados" }),
  ).toBeVisible();
  expect(f.members.size).toBe(7);
});
test("repete envio incerto, preserva revisão ao reautenticar e recarrega conflitos explicitamente", async ({
  page,
}) => {
  const f = await textImportFixture(page);
  await openTextImport(page);
  await page.getByLabel("Texto do elenco", { exact: true }).fill("7 - Nova");
  await page
    .getByRole("button", { name: "Interpretar texto", exact: true })
    .click();
  f.uncertain();
  await page
    .getByRole("button", { name: "Confirmar selecionados", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome, linha 1", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "1 confirmado" }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(2);
  expect(f.attempts[0]).toBe(f.attempts[1]);
  await page
    .getByRole("button", { name: "Voltar ao elenco", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Importar elenco", exact: true })
    .click();
  await page.getByLabel("Texto do elenco", { exact: true }).fill("8 - Segunda");
  f.expire();
  await page
    .getByRole("button", { name: "Interpretar texto", exact: true })
    .click();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByLabel("Nome, linha 1", { exact: true })).toHaveValue(
    "Segunda",
  );
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await page.getByLabel("Nome, linha 1", { exact: true }).fill("Meu ajuste");
  f.conflict();
  await page
    .getByRole("button", { name: "Salvar conferência", exact: true })
    .click();
  await expect(page.getByLabel("Nome, linha 1", { exact: true })).toHaveValue(
    "Meu ajuste",
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Recarregar conferência", exact: true })
    .click();
  await expect(page.getByLabel("Nome, linha 1", { exact: true })).toHaveValue(
    "Alterada noutra sessão",
  );
});

for (const kind of ["newTeam", "existingTeam", "registration"] as const) {
  test(`escolhe destino ${kind} e confirma por teclado sem criar no rascunho`, async ({
    page,
  }) => {
    const f = await textImportFixture(page);
    await page.goto(
      `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/equipes`,
    );
    await page
      .getByRole("button", { name: "Importar equipe e elenco", exact: true })
      .click();
    await page
      .getByLabel("Como vincular esta equipe?", { exact: true })
      .selectOption(kind);
    if (kind !== "newTeam")
      await page
        .getByRole("button", {
          name:
            kind === "existingTeam"
              ? "Lobos Clube · 00000004"
              : "Lobos · 00000005",
          exact: true,
        })
        .click();
    await page
      .getByLabel("Texto do elenco", { exact: true })
      .fill("Equipe: Nova equipe\n00 - Pessoa nova - 2001");
    await page
      .getByRole("button", { name: "Interpretar texto", exact: true })
      .click();
    await expect(
      page.getByRole("table", { name: "Conferência do elenco" }),
    ).toBeVisible();
    expect(f.members.size).toBe(2);
    if (kind !== "registration")
      await page
        .getByLabel("Nome público da inscrição", { exact: true })
        .fill("Nova inscrição");
    const name = page.getByLabel("Nome, linha 2", { exact: true });
    await name.focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Pessoa corrigida");
    await page.keyboard.press("Tab");
    await expect(
      page.getByLabel("Camisa, linha 2", { exact: true }),
    ).toBeFocused();
    const confirm = page.getByRole("button", {
      name: "Confirmar selecionados",
      exact: true,
    });
    await confirm.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("status").filter({ hasText: "1 confirmado" }),
    ).toBeVisible();
    expect(
      [...f.persons.values()].some((p) => p.data.name === "Pessoa corrigida"),
    ).toBe(true);
    expect(f.members.size).toBe(3);
  });
}

test("aprova alterações explícitas e mantém os campos omitidos e atletas ausentes", async ({
  page,
}) => {
  const f = await textImportFixture(page);
  await openTextImport(page);
  await page
    .getByLabel("Texto do elenco", { exact: true })
    .fill('Ana Silva - "Novo apelido" - 001234');
  await page
    .getByRole("button", { name: "Interpretar texto", exact: true })
    .click();
  await page
    .getByTestId(`candidate-${tid(10)}`)
    .getByRole("button", { name: /Usar/ })
    .click();
  await expect(
    page.getByText("Apelido: Aninha → Novo apelido", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Aprovo atualizar os dados fornecidos no cadastro global", {
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Confirmar selecionados", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "1 confirmado" }),
  ).toBeVisible();
  expect(f.persons.get(tid(10))!.data).toMatchObject({
    nickname: "Novo apelido",
    birthYear: 1990,
    dominantHand: "left",
    federationRegistration: "001234",
  });
  expect(f.members.get(tid(20))!.jersey).toBe("5");
  expect(f.members.has(tid(21))).toBe(true);
});
