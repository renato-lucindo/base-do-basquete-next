import { test, expect, type Page } from "@playwright/test";
import { decisionBrowserFixture as fixture } from "./fixtures/decisions-browser";
import { tid } from "./fixtures/text-import";
async function confer(page: Page) {
  await page
    .getByRole("combobox", { name: "Tipo da ocorrência", exact: true })
    .selectOption("cancelled");
  await page
    .getByRole("textbox", { name: "Motivo da ocorrência", exact: true })
    .fill("Cancelamento confirmado após conferência");
  await page
    .getByRole("button", { name: "Conferir decisão", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Conferência da decisão", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Conferi o impacto desta decisão", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Confirmar decisão do jogo", exact: true })
    .click();
}
async function previewDecision(page: Page, kind: string, reason: string) {
  await page
    .getByRole("combobox", { name: "Tipo da ocorrência", exact: true })
    .selectOption(kind);
  await page
    .getByRole("textbox", { name: "Motivo da ocorrência", exact: true })
    .fill(reason);
  await page
    .getByRole("button", { name: "Conferir decisão", exact: true })
    .click();
}
async function saveDecision(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Conferência da decisão", exact: true }),
  ).toBeVisible();
  const impact = page.getByRole("checkbox", {
    name: "Conferi o impacto desta decisão",
    exact: true,
  });
  if (await impact.count()) await impact.check();
  await page
    .getByRole("button", { name: "Confirmar decisão do jogo", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Decisão do jogo salva" }),
  ).toBeVisible();
}
test("histórico pagina e abre versão sem substituir a decisão em edição", async ({
  page,
}) => {
  const f = await fixture(page, {});
  for (let n = 1; n <= 25; n++) {
    const s = await f.provider.getOccurrence("fixture", tid(8));
    await f.provider.saveOccurrence("fixture", {
      commandId: tid(300 + n),
      disputeId: tid(3),
      gameId: tid(8),
      occurrenceId: tid(200),
      expectedVersion: n - 1,
      expectedGameVersion: s.gameVersion,
      expectedPublicationVersion: s.publicationVersion,
      expectedRegulationVersion: s.regulationVersion,
      expectedContextFingerprint: s.contextFingerprint,
      effect: { kind: "cancelled" },
      reason: `Decisão histórica ${n}`,
      acknowledgeImpact: true,
    });
  }
  await page.reload();
  await page
    .getByRole("button", { name: "Abrir jogo Lobos × Lobos B", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Situação e decisões do jogo", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Motivo da ocorrência", exact: true })
    .fill("Edição preservada durante consulta histórica");
  await page
    .getByText("Histórico de decisões do jogo", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mais decisões anteriores", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Consultar decisão versão 1", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Decisão histórica — versão 1",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Decisão histórica 1", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Motivo da ocorrência", exact: true }),
  ).toHaveValue("Edição preservada durante consulta histórica");
  expect(f.options.occurrenceCommits).toBe(25);
  const s = await f.provider.getOccurrence("fixture", tid(8));
  await f.provider.saveOccurrence("fixture", {
    commandId: tid(326),
    disputeId: tid(3),
    gameId: tid(8),
    occurrenceId: tid(200),
    expectedVersion: 25,
    expectedGameVersion: s.gameVersion,
    expectedPublicationVersion: s.publicationVersion,
    expectedRegulationVersion: s.regulationVersion,
    expectedContextFingerprint: s.contextFingerprint,
    effect: { kind: "postponed" },
    reason: "Decisão concorrente durante consulta",
    acknowledgeImpact: true,
  });
  await page
    .getByRole("button", { name: "Decisões mais recentes", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("O histórico mudou");
  await expect(
    page.getByRole("button", {
      name: "Recarregar situação preservando edição",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Motivo da ocorrência", exact: true }),
  ).toHaveValue("Edição preservada durante consulta histórica");
});
test("W.O. usa regra explícita e retirada reativa o fato sem fabricar placar", async ({
  page,
}) => {
  const f = await fixture(page, {});
  await page
    .getByRole("combobox", { name: "Tipo da ocorrência", exact: true })
    .selectOption("wo");
  await page
    .getByRole("combobox", { name: "Vencedor da decisão", exact: true })
    .selectOption(tid(6));
  await page
    .getByRole("textbox", { name: "Motivo da ocorrência", exact: true })
    .fill("W.O. confirmado pelo responsável");
  await page
    .getByRole("button", { name: "Conferir decisão", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(f.options.occurrenceCommits ?? 0).toBe(0);
  f.source.definition!.occurrenceRules.wo = {
    winnerLeaguePoints: 2,
    loserLeaguePoints: 0,
    score: null,
  };
  await page
    .getByRole("button", { name: "Conferir decisão", exact: true })
    .click();
  await expect(page.getByText(/Depois:.*placar não informado/)).toBeVisible();
  await saveDecision(page);
  await previewDecision(
    page,
    "remove",
    "Retirada da ocorrência para retomar o fato registrado",
  );
  await expect(
    page.getByText("Depois: 80 × 70", { exact: true }),
  ).toBeVisible();
  await saveDecision(page);
  await previewDecision(
    page,
    "interrupted",
    "Interrupção conferida sem descartar súmula",
  );
  await saveDecision(page);
  expect(f.options.occurrenceCommits).toBe(3);
  expect(f.source.context.publishedGames[0]).toMatchObject({
    homePoints: 80,
    awayPoints: 70,
  });
});
test("award administrativo exige pontos e mantém score ausente", async ({
  page,
}) => {
  const f = await fixture(page, {});
  await page
    .getByRole("combobox", { name: "Tipo da ocorrência", exact: true })
    .selectOption("administrative");
  await page
    .getByRole("combobox", { name: "Efeito administrativo", exact: true })
    .selectOption("award");
  await page
    .getByRole("combobox", { name: "Vencedor da decisão", exact: true })
    .selectOption(tid(5));
  await page
    .getByRole("textbox", { name: "Motivo da ocorrência", exact: true })
    .fill("Decisão administrativa conferida");
  await page
    .getByRole("button", { name: "Conferir decisão", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Conferência da decisão", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("spinbutton", {
      name: "Pontos de classificação mandante",
      exact: true,
    })
    .fill("2");
  await page
    .getByRole("spinbutton", {
      name: "Pontos de classificação visitante",
      exact: true,
    })
    .fill("0");
  await page
    .getByRole("button", { name: "Conferir decisão", exact: true })
    .click();
  await expect(page.getByText(/Depois:.*placar não informado/)).toBeVisible();
  await saveDecision(page);
  expect(f.source.context.occurrences[0]?.effect).toMatchObject({
    kind: "administrative",
    decision: {
      kind: "award",
      score: null,
      homeLeaguePoints: 2,
      awayLeaguePoints: 0,
    },
  });
});
test("reautenticação conserva comando congelado e replay grava uma vez", async ({
  page,
}) => {
  const f = await fixture(page, { loseOccurrenceAck: true });
  await confer(page);
  f.options.expireDecision = true;
  await page
    .getByRole("button", { name: "Repetir decisão do jogo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Acesso administrativo", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "E-mail", exact: true })
    .fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByLabel("Senha", { exact: true }).press("Enter");
  await page
    .getByRole("button", { name: "Repetir decisão do jogo", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Decisão do jogo salva" }),
  ).toBeVisible();
  const saves = f.attempts
    .map((x) => JSON.parse(x))
    .filter((x) => "acknowledgeImpact" in x && x.acknowledgeImpact);
  expect(saves).toHaveLength(3);
  expect(new Set(saves.map((x) => JSON.stringify(x))).size).toBe(1);
  expect(f.options.occurrenceCommits).toBe(1);
});
test("duas abas recusam versão antiga sem substituir edição", async ({
  page,
  context,
}) => {
  const f = await fixture(page, {}),
    other = await context.newPage();
  await f.addTab(other);
  await other.goto(page.url());
  await other
    .getByRole("button", { name: "Abrir jogo Lobos × Lobos B", exact: true })
    .click();
  await other
    .getByRole("button", { name: "Situação e decisões do jogo", exact: true })
    .click();
  await other
    .getByRole("combobox", { name: "Tipo da ocorrência", exact: true })
    .selectOption("postponed");
  await other
    .getByRole("textbox", { name: "Motivo da ocorrência", exact: true })
    .fill("Adiamento preparado na outra aba");
  await other
    .getByRole("button", { name: "Conferir decisão", exact: true })
    .click();
  await confer(page);
  await other
    .getByRole("checkbox", {
      name: "Conferi o impacto desta decisão",
      exact: true,
    })
    .check();
  await other
    .getByRole("button", { name: "Confirmar decisão do jogo", exact: true })
    .click();
  await expect(other.getByRole("alert")).toBeVisible();
  await expect(
    other.getByRole("textbox", { name: "Motivo da ocorrência", exact: true }),
  ).toHaveValue("Adiamento preparado na outra aba");
  await other
    .getByRole("button", {
      name: "Recarregar situação preservando edição",
      exact: true,
    })
    .click();
  await expect(
    other.getByRole("combobox", { name: "Tipo da ocorrência", exact: true }),
  ).toHaveValue("postponed");
  expect(f.options.occurrenceCommits).toBe(1);
  await other.close();
});
test("confere e salva cancelamento dentro do jogo sem perder a resposta incerta", async ({
  page,
}) => {
  const { options } = await fixture(page, { loseOccurrenceAck: true });
  await confer(page);
  await expect(
    page.getByRole("combobox", { name: "Tipo da ocorrência", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir decisão do jogo", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Decisão do jogo salva" }),
  ).toBeVisible();
  expect(options.occurrenceCommits).toBe(1);
  await page.reload();
  await page
    .getByRole("button", { name: "Abrir jogo Lobos × Lobos B", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Situação e decisões do jogo", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Tipo da ocorrência", exact: true }),
  ).toHaveValue("cancelled");
});

test("fonte alterada recusa envio e recarga explícita conserva a edição em 320px", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const { options } = await fixture(page, { rejectChangedSource: true });
  await confer(page);
  await expect(page.getByRole("alert")).toContainText("As fontes mudaram");
  await expect(
    page.getByRole("textbox", { name: "Motivo da ocorrência", exact: true }),
  ).toHaveValue("Cancelamento confirmado após conferência");
  await page
    .getByRole("button", {
      name: "Recarregar situação preservando edição",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Recarregar situação preservando edição",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Motivo da ocorrência", exact: true }),
  ).toHaveValue("Cancelamento confirmado após conferência");
  await expect(
    page.getByRole("combobox", { name: "Tipo da ocorrência", exact: true }),
  ).toHaveValue("cancelled");
  expect(options.occurrenceCommits ?? 0).toBe(0);
  await page
    .getByRole("button", { name: "Conferir decisão", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Conferência da decisão", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("occurrence-320.png"),
    fullPage: true,
  });
});

test("ACK conhecido recupera somente leitura e protege edição ao sair", async ({
  page,
}) => {
  const { options } = await fixture(page, { failReadAfterAck: true });
  await page
    .getByRole("textbox", { name: "Motivo da ocorrência", exact: true })
    .fill("Edição ainda não enviada");
  await expect(
    page.getByRole("status").filter({ hasText: "Decisão não salva" }),
  ).toBeVisible();
  const dialogs: string[] = [];
  page.once("dialog", (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  await page
    .getByRole("button", { name: "Voltar à lista de jogos", exact: true })
    .click();
  expect(dialogs).toEqual([
    "Há uma decisão não salva ou envio não confirmado. Sair desta edição?",
  ]);
  await expect(
    page.getByRole("textbox", { name: "Motivo da ocorrência", exact: true }),
  ).toHaveValue("Edição ainda não enviada");
  await confer(page);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Gravação confirmada; leitura pendente" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Recarregar decisão confirmada", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Decisão do jogo salva" }),
  ).toBeVisible();
  expect(options.occurrenceCommits).toBe(1);
  expect(options.saveAttempts).toBe(1);
});
