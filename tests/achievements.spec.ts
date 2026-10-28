import { test, expect, type Page } from "@playwright/test";
import { achievementBrowserFixture } from "./fixtures/achievement-browser";
import { tid } from "./fixtures/text-import";
async function open(page: Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`,
  );
  await page
    .getByRole("button", { name: "Colocações e honrarias", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Colocações e honrarias", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Adicionar honraria",
      exact: true,
    }),
  ).toBeEnabled();
}
test("sugere, revisa posição compartilhada e honraria, salva, confirma e retoma", async ({
  page,
}) => {
  const f = await achievementBrowserFixture(page);
  await open(page);
  await page
    .getByLabel("Origem da sugestão", { exact: true })
    .selectOption("group");
  await page
    .getByLabel("Grupo para sugerir colocações", { exact: true })
    .selectOption(`${f.f.id(10)}:${f.f.id(11)}`);
  await page
    .getByRole("button", { name: "Conferir sugestão", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sugestão para conferir", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Usar estas colocações no rascunho",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Posição de Lobos", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByLabel("Posição de Lobos", { exact: true }),
  ).toHaveValue("1");
  await page.getByLabel("Posição de Lobos B", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Adicionar honraria", exact: true })
    .click();
  await expect(
    page.getByLabel("Título da honraria 1", { exact: true }),
  ).toBeFocused();
  await page.getByLabel("Título da honraria 1", { exact: true }).fill("MVP");
  await page
    .getByLabel("Buscar atleta para honraria 1", { exact: true })
    .fill("Atleta");
  await page
    .getByRole("button", {
      name: "Buscar destinatários da honraria 1",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: /Selecionar Atleta para honraria 1/ })
    .click();
  await page
    .getByRole("button", { name: "Salvar rascunho de premiações", exact: true })
    .click();
  await expect(
    page.getByText("Rascunho de premiações salvo.", { exact: true }),
  ).toBeVisible();
  expect(f.options.achievementSaves).toBe(1);
  expect(f.options.achievementConfirmations).toBeUndefined();
  await page
    .getByLabel("Conferi as colocações e os destinatários", { exact: true })
    .check();
  await page
    .getByRole("button", {
      name: "Confirmar e publicar premiações",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Premiações confirmadas.", { exact: true }),
  ).toBeVisible();
  expect(f.options.achievementConfirmations).toBe(1);
  await page
    .getByRole("button", { name: "Ver premiações confirmadas", exact: true })
    .click();
  await expect(
    page.getByText("1º · Lobos / Lobos B", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Colocações e honrarias", exact: true })
    .click();
  await expect(
    page.getByLabel("Título da honraria 1", { exact: true }),
  ).toHaveValue("MVP");
  await expect(
    page.getByLabel("Posição de Lobos B", { exact: true }),
  ).toHaveValue("1");
  await expect(page.getByText("Atleta", { exact: true }).first()).toBeVisible();
});

async function saveManual(page: Page) {
  await page.getByLabel("Posição de Lobos", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Salvar rascunho de premiações", exact: true })
    .click();
  await expect(
    page.getByText("Rascunho de premiações salvo.", { exact: true }),
  ).toBeVisible();
}
test("final e bronze são escolhas explícitas, sem aceitar o mesmo confronto duas vezes", async ({
  page,
}) => {
  const f = await achievementBrowserFixture(page, { series: true });
  await open(page);
  await page
    .getByLabel("Origem da sugestão", { exact: true })
    .selectOption("series");
  await page
    .getByLabel("Confronto da final", { exact: true })
    .selectOption(f.f.id(20));
  await page
    .getByLabel("Confronto do bronze", { exact: true })
    .selectOption(f.f.id(20));
  await page.getByLabel("Posição de Lobos", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Salvar rascunho de premiações", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("origem da sugestão");
  expect(f.attempts).toHaveLength(0);
  await page
    .getByLabel("Confronto do bronze", { exact: true })
    .selectOption("");
  await page
    .getByRole("button", { name: "Conferir sugestão", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Usar estas colocações no rascunho",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Posição de Lobos B", { exact: true }),
  ).toHaveValue("2");
  await page
    .getByRole("button", { name: "Salvar rascunho de premiações", exact: true })
    .click();
  await expect(
    page.getByText("Rascunho de premiações salvo.", { exact: true }),
  ).toBeVisible();
  expect(f.attempts.find((v) => v.path === "")?.body).toMatchObject({
    source: { kind: "series", finalSeriesId: f.f.id(20), bronzeSeriesId: null },
  });
});
test("busca de destinatários pagina20/20 sem perder a identidade escolhida", async ({
  page,
}) => {
  const f = await achievementBrowserFixture(page);
  f.candidatePages(21);
  await open(page);
  await page
    .getByRole("button", { name: "Adicionar honraria", exact: true })
    .click();
  await page
    .getByLabel("Título da honraria 1", { exact: true })
    .fill("Seleção");
  await page
    .getByLabel("Buscar atleta para honraria 1", { exact: true })
    .fill("Atleta");
  await page
    .getByRole("button", {
      name: "Buscar destinatários da honraria 1",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: /Selecionar Atleta 21 para/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Mais destinatários da honraria 1",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: /Selecionar Atleta 21 para/ }).click();
  await expect(page.getByText("Atleta 21", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Mais destinatários da honraria 1",
      exact: true,
    }),
  ).toHaveCount(0);
});
async function confirmManual(page: Page) {
  await page
    .getByLabel("Conferi as colocações e os destinatários", { exact: true })
    .check();
  await page
    .getByRole("button", {
      name: "Confirmar e publicar premiações",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Premiações confirmadas.", { exact: true }),
  ).toBeVisible();
}
test("ACK perdido repete exatamente o comando de salvar e confirmar uma vez", async ({
  page,
}) => {
  const f = await achievementBrowserFixture(page);
  await open(page);
  f.loseSaveAck();
  await page.getByLabel("Posição de Lobos", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Salvar rascunho de premiações", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Repetir envio de premiações",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(
    page.getByLabel("Posição de Lobos", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir envio de premiações", exact: true })
    .click();
  await expect(
    page.getByText("Rascunho de premiações salvo.", { exact: true }),
  ).toBeVisible();
  const saves = f.attempts.filter((v) => v.path === "");
  expect(saves).toHaveLength(2);
  expect(saves[0].body).toEqual(saves[1].body);
  expect(f.options.achievementSaves).toBe(1);
  f.loseConfirmAck();
  await page
    .getByLabel("Conferi as colocações e os destinatários", { exact: true })
    .check();
  await page
    .getByRole("button", {
      name: "Confirmar e publicar premiações",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Repetir envio de premiações", exact: true })
    .click();
  await expect(
    page.getByText("Premiações confirmadas.", { exact: true }),
  ).toBeVisible();
  const confirmations = f.attempts.filter((v) => v.path === "confirm");
  expect(confirmations).toHaveLength(2);
  expect(confirmations[0].body).toEqual(confirmations[1].body);
  expect(f.options.achievementConfirmations).toBe(1);
});
test("ACK conhecido com GET indisponível retoma somente a leitura", async ({
  page,
}) => {
  const f = await achievementBrowserFixture(page);
  await open(page);
  f.failReadAfterMutation();
  await page.getByLabel("Posição de Lobos", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Salvar rascunho de premiações", exact: true })
    .click();
  await expect(
    page.getByText("Gravação confirmada; atualização pendente.", {
      exact: true,
    }),
  ).toBeVisible();
  f.allowReads();
  await page
    .getByRole("button", {
      name: "Retomar atualização das premiações",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Rascunho de premiações salvo.", { exact: true }),
  ).toBeVisible();
  expect(f.attempts.filter((v) => v.path === "")).toHaveLength(1);
  f.failReadAfterMutation();
  await page
    .getByLabel("Conferi as colocações e os destinatários", { exact: true })
    .check();
  await page
    .getByRole("button", {
      name: "Confirmar e publicar premiações",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Retomar atualização das premiações",
      exact: true,
    }),
  ).toBeEnabled();
  f.allowReads();
  await page
    .getByRole("button", {
      name: "Retomar atualização das premiações",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Premiações confirmadas.", { exact: true }),
  ).toBeVisible();
  expect(f.attempts.filter((v) => v.path === "confirm")).toHaveLength(1);
});
test("duas abas recusam versão antiga sem substituir edição", async ({
  page,
  context,
}) => {
  const f = await achievementBrowserFixture(page),
    other = await context.newPage();
  await f.addTab(other);
  await open(page);
  await open(other);
  await other.getByLabel("Posição de Lobos", { exact: true }).fill("2");
  await saveManual(page);
  await other
    .getByRole("button", { name: "Salvar rascunho de premiações", exact: true })
    .click();
  await expect(other.getByRole("alert")).toContainText("versão");
  await expect(
    other.getByLabel("Posição de Lobos", { exact: true }),
  ).toHaveValue("2");
  await other
    .getByRole("button", {
      name: "Atualizar contexto preservando edição",
      exact: true,
    })
    .click();
  await expect(
    other.getByText(
      "Contexto atualizado. Sua edição foi preservada; confira antes de salvar.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    other.getByLabel("Posição de Lobos", { exact: true }),
  ).toHaveValue("2");
  await other
    .getByRole("button", { name: "Salvar rascunho de premiações", exact: true })
    .click();
  await expect(
    other.getByText("Rascunho de premiações salvo.", { exact: true }),
  ).toBeVisible();
  expect(f.options.achievementSaves).toBe(2);
  await other.close();
});
test("sessão expirada conserva os comandos de rascunho e confirmação", async ({
  page,
}) => {
  const f = await achievementBrowserFixture(page),
    sent: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && /\/api\/achievements\//.test(r.url()))
      sent.push(r.postData() ?? "");
  });
  await open(page);
  await page.getByLabel("Posição de Lobos", { exact: true }).fill("1");
  f.expire();
  await page
    .getByRole("button", { name: "Salvar rascunho de premiações", exact: true })
    .click();
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("operator@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  f.resume();
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Repetir envio de premiações", exact: true })
    .click();
  await expect(
    page.getByText("Rascunho de premiações salvo.", { exact: true }),
  ).toBeVisible();
  expect(sent[0]).toBe(sent[1]);
  await page
    .getByLabel("Conferi as colocações e os destinatários", { exact: true })
    .check();
  f.expire();
  await page
    .getByRole("button", {
      name: "Confirmar e publicar premiações",
      exact: true,
    })
    .click();
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("operator@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  f.resume();
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Repetir envio de premiações", exact: true })
    .click();
  await expect(
    page.getByText("Premiações confirmadas.", { exact: true }),
  ).toBeVisible();
  expect(sent[2]).toBe(sent[3]);
  expect(f.options.achievementSaves).toBe(1);
  expect(f.options.achievementConfirmations).toBe(1);
});
test("motivo de revisão ainda não enviado recebe guarda de navegação", async ({
  page,
}) => {
  await achievementBrowserFixture(page);
  await open(page);
  await saveManual(page);
  await confirmManual(page);
  await page
    .getByLabel("Motivo da revisão das premiações", { exact: true })
    .fill("Revisão ainda em edição");
  let dialogs = 0;
  page.on("dialog", async (d) => {
    dialogs++;
    await d.dismiss();
  });
  await page
    .getByRole("button", { name: "Voltar às regras", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Colocações e honrarias", exact: true }),
  ).toBeVisible();
  expect(dialogs).toBe(1);
});
test("honraria sem destinatário é recusada e edição não salva protege navegação", async ({
  page,
}) => {
  const f = await achievementBrowserFixture(page);
  await open(page);
  await page
    .getByRole("button", { name: "Adicionar honraria", exact: true })
    .click();
  await page.getByLabel("Título da honraria 1", { exact: true }).fill("MVP");
  await page
    .getByRole("button", { name: "Salvar rascunho de premiações", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("destinatário");
  expect(f.attempts).toHaveLength(0);
  await expect(page.getByRole("alert")).toBeFocused();
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Voltar aos campeonatos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Colocações e honrarias", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Jogos", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Jogos", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Regulamento", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Colocações e honrarias", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Título da honraria 1", { exact: true }),
  ).toHaveValue("MVP");
});
test("históricos paginam e confirmação antiga mantém o snapshot da ocasião", async ({
  page,
}) => {
  const f = await achievementBrowserFixture(page);
  for (let n = 0; n < 21; n++)
    await f.db.save("fixture-access", {
      ...f.f.draft,
      commandId: f.f.id(3000 + n),
      expectedVersion: n,
    });
  for (let n = 0; n < 21; n++)
    await f.db.confirm("fixture-access", {
      ...f.f.confirmation,
      commandId: f.f.id(4000 + n),
      expectedDraftVersion: 21,
      expectedPublicationVersion: n,
      reason: n ? `Revisão ${n}` : "",
    });
  await open(page);
  await page
    .getByRole("button", { name: "Mais rascunhos de premiações", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ver rascunho 1", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Rascunho 1", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Fechar versão de premiações", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ver rascunho 1", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", {
      name: "Mais confirmações de premiações",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Ver confirmação 1", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Confirmação 1", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("MVP", { exact: true }).last()).toBeVisible();
});
test("320px mantém teclado, controles e captura sem rolagem lateral", async ({
  page,
}, info) => {
  await achievementBrowserFixture(page);
  await page.setViewportSize({ width: 320, height: 840 });
  await open(page);
  const a = page.getByLabel("Posição de Lobos", { exact: true }),
    b = page.getByLabel("Posição de Lobos B", { exact: true });
  await a.focus();
  await page.keyboard.type("1");
  await page.keyboard.press("Tab");
  await expect(b).toBeFocused();
  await page.keyboard.type("2");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/achievements-${info.project.name}-320.png`,
    fullPage: true,
  });
});
