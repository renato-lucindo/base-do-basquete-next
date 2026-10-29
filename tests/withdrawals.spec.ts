import { test, expect, type Page } from "@playwright/test";
import { decisionBrowserFixture } from "./fixtures/decisions-browser";
import { tid } from "./fixtures/text-import";
async function prepare(
  page: Page,
  options: Record<string, boolean | number | undefined> = {},
) {
  const f = await decisionBrowserFixture(page, options);
  await expect(
    page.getByRole("combobox", { name: "Tipo da ocorrência", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Voltar à lista de jogos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Equipes e elencos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Expandir Lobos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Desistência desta inscrição", exact: true })
    .click();
  return f;
}
test("relação e impacto paginados conservam a lista completa da inscrição", async ({
  page,
}) => {
  const f = await decisionBrowserFixture(page);
  f.addPublishedGames(25);
  await expect(
    page.getByRole("combobox", { name: "Tipo da ocorrência", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Voltar à lista de jogos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Equipes e elencos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Expandir Lobos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Desistência desta inscrição", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mais jogos da relação", exact: true })
    .click();
  await expect(
    page.getByText(/Lobos × Lobos B · jogo 25/, { exact: false }),
  ).toBeVisible();
  await preview(page, "keep_results");
  await page
    .getByRole("button", { name: "Mais jogos afetados", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Confirmar desistência ou retorno",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Desistência ou retorno salvo" }),
  ).toBeVisible();
  expect(f.source.context.withdrawals[0]?.previousGameIds).toHaveLength(25);
  expect(f.source.context.publishedGames).toHaveLength(25);
});
async function preview(page: Page, policy: string) {
  await page
    .getByRole("combobox", {
      name: "Tratamento dos resultados anteriores",
      exact: true,
    })
    .selectOption(policy);
  await page
    .getByRole("textbox", {
      name: "Motivo da desistência ou retorno",
      exact: true,
    })
    .fill("Decisão conferida com o responsável da inscrição");
  await page
    .getByRole("checkbox", {
      name: "Conferi a relação completa de jogos anteriores",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", {
      name: "Conferir desistência ou retorno",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Conferência da desistência ou retorno",
      exact: true,
    }),
  ).toBeVisible();
  const impact = page.getByRole("checkbox", {
    name: "Conferi o impacto da desistência ou retorno",
    exact: true,
  });
  if (await impact.count()) await impact.check();
}
test("sem resultado anterior não cria placar ou vencedor para jogo futuro", async ({
  page,
}) => {
  const f = await prepare(page);
  f.source.context.publishedGames = [];
  f.source.contextFingerprint = "d".repeat(64);
  await page
    .getByRole("button", { name: "Desistência desta inscrição", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Desistência desta inscrição", exact: true })
    .click();
  await expect(
    page.getByText(
      "Nenhum resultado anterior. Jogos futuros continuam pendentes de decisão própria.",
      { exact: true },
    ),
  ).toBeVisible();
  await preview(page, "keep_results");
  await expect(
    page.getByText(/Depois: Pendente de decisão própria/),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Confirmar desistência ou retorno",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Desistência ou retorno salvo" }),
  ).toBeVisible();
  expect(f.source.context.withdrawals[0]?.previousGameIds).toEqual([]);
  expect(f.source.context.publishedGames).toEqual([]);
  expect(f.source.context.occurrences).toEqual([]);
});
test("jogo trocado na leitura é recusado e permite recuperar sem envio", async ({
  page,
}) => {
  const f = await prepare(page);
  const other = {
    id: tid(777),
    disputeId: tid(3),
    homeRegistrationId: tid(5),
    awayRegistrationId: tid(6),
    date: null,
    time: null,
    venue: null,
    number: null,
    state: "scheduled",
    version: 2,
    savedAt: "2026-10-25T01:00:00Z",
    timeZone: "America/Sao_Paulo",
    scheduledAt: null,
    home: {
      id: tid(5),
      disputeId: tid(3),
      teamId: tid(4),
      name: "Lobos",
      version: 1,
      savedAt: "2026-10-23T19:00:00Z",
      team: {
        id: tid(4),
        name: "Lobos Clube",
        abbreviation: "LOB",
        version: 1,
        savedAt: "2026-10-23T19:00:00Z",
      },
    },
    away: {
      id: tid(6),
      disputeId: tid(3),
      teamId: tid(4),
      name: "Lobos B",
      version: 1,
      savedAt: "2026-10-23T19:00:00Z",
      team: {
        id: tid(4),
        name: "Lobos Clube",
        abbreviation: "LOB",
        version: 1,
        savedAt: "2026-10-23T19:00:00Z",
      },
    },
  };
  const pattern = new RegExp(`/api/games/${tid(8)}$`);
  await page.route(pattern, (r) => r.fulfill({ json: other }));
  await page
    .getByRole("button", { name: "Desistência desta inscrição", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Desistência desta inscrição", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Um jogo da relação não corresponde à inscrição",
  );
  await expect(
    page.getByRole("button", {
      name: "Confirmar desistência ou retorno",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.unroute(pattern);
  await page
    .getByRole("button", {
      name: "Recarregar desistência da inscrição",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("combobox", {
      name: "Tratamento dos resultados anteriores",
      exact: true,
    }),
  ).toBeEnabled();
  expect(f.options.withdrawalCommits ?? 0).toBe(0);
});
test("histórico de desistência preserva política e motivo em edição", async ({
  page,
}) => {
  const f = await prepare(page);
  f.addPublishedGames(25);
  for (let n = 1; n <= 25; n++) {
    const s = await f.provider.getWithdrawal("fixture", tid(5));
    await f.provider.saveWithdrawal("fixture", {
      commandId: tid(400 + n),
      withdrawalId: tid(250),
      disputeId: tid(3),
      registrationId: tid(5),
      expectedVersion: n - 1,
      expectedRegulationVersion: s.regulationVersion,
      expectedContextFingerprint: s.contextFingerprint,
      policy: "keep_results",
      previousGameIds: s.previousGameIds,
      reason: `Desistência histórica ${n}`,
      acknowledgeImpact: true,
    });
  }
  await page.reload();
  await page
    .getByRole("button", { name: "Expandir Lobos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Desistência desta inscrição", exact: true })
    .click();
  await page
    .getByRole("textbox", {
      name: "Motivo da desistência ou retorno",
      exact: true,
    })
    .fill("Texto preservado durante consulta");
  await page
    .getByText("Histórico de desistências da inscrição", { exact: true })
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
    page.getByText("Desistência histórica 1", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mais jogos históricos", exact: true })
    .click();
  await expect(page.getByText(/Lobos × Lobos B · jogo 25/)).toBeVisible();
  await expect(
    page.getByRole("textbox", {
      name: "Motivo da desistência ou retorno",
      exact: true,
    }),
  ).toHaveValue("Texto preservado durante consulta");
  expect(f.options.withdrawalCommits).toBe(25);
});
test("conferência de desistência cabe em 320px e mantém contexto", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await prepare(page);
  await preview(page, "exclude_results");
  await page
    .getByRole("heading", {
      name: "Conferência da desistência ou retorno",
      exact: true,
    })
    .scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("withdrawal-320.png") });
});
test("ACK confirmado recupera sóGET e guarda impede recolher edição", async ({
  page,
}) => {
  const f = await prepare(page, { failWithdrawalReadAfterAck: true });
  await page
    .getByRole("textbox", {
      name: "Motivo da desistência ou retorno",
      exact: true,
    })
    .fill("Edição protegida da inscrição");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Desistência ou retorno não salvo" }),
  ).toBeVisible();
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Recolher Lobos", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", {
      name: "Motivo da desistência ou retorno",
      exact: true,
    }),
  ).toHaveValue("Edição protegida da inscrição");
  await preview(page, "keep_results");
  await page
    .getByRole("button", {
      name: "Confirmar desistência ou retorno",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Gravação confirmada; leitura pendente" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Recarregar desistência confirmada",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Desistência ou retorno salvo" }),
  ).toBeVisible();
  expect(
    f.withdrawalAttempts
      .map((x) => JSON.parse(x))
      .filter((x) => x.acknowledgeImpact),
  ).toHaveLength(1);
  expect(f.options.withdrawalCommits).toBe(1);
});
test("reautenticação retoma a desistência incerta com o mesmo comando", async ({
  page,
}) => {
  const f = await prepare(page, { loseWithdrawalAck: true });
  await preview(page, "keep_results");
  await page
    .getByRole("button", {
      name: "Confirmar desistência ou retorno",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Repetir desistência ou retorno",
      exact: true,
    }),
  ).toBeVisible();
  f.options.expireWithdrawal = true;
  await page
    .getByRole("button", {
      name: "Repetir desistência ou retorno",
      exact: true,
    })
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
    .getByRole("button", {
      name: "Repetir desistência ou retorno",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Desistência ou retorno salvo" }),
  ).toBeVisible();
  const writes = f.withdrawalAttempts
    .map((x) => JSON.parse(x))
    .filter((x) => x.acknowledgeImpact);
  expect(writes).toHaveLength(3);
  expect(new Set(writes.map((x) => JSON.stringify(x))).size).toBe(1);
  expect(f.options.withdrawalCommits).toBe(1);
});
test("novo resultado recusa lista antiga e exige reconferir sem perder motivo", async ({
  page,
}) => {
  const f = await prepare(page);
  await preview(page, "exclude_results");
  f.addPublishedGames(2);
  f.source.contextFingerprint = "c".repeat(64);
  await page
    .getByRole("button", {
      name: "Confirmar desistência ou retorno",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("button", {
      name: "Recarregar desistência preservando edição",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("textbox", {
      name: "Motivo da desistência ou retorno",
      exact: true,
    }),
  ).toHaveValue("Decisão conferida com o responsável da inscrição");
  await expect(
    page.getByRole("checkbox", {
      name: "Conferi a relação completa de jogos anteriores",
      exact: true,
    }),
  ).not.toBeChecked();
  await expect(
    page.getByText(/2 jogos com resultado ou decisão anterior/),
  ).toBeVisible();
  await preview(page, "exclude_results");
  await page
    .getByRole("button", {
      name: "Confirmar desistência ou retorno",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Desistência ou retorno salvo" }),
  ).toBeVisible();
  expect(f.source.context.withdrawals[0]?.previousGameIds).toHaveLength(2);
  expect(f.options.withdrawalCommits).toBe(1);
});
test("duas abas isolam versão e duas inscrições da mesma equipe", async ({
  page,
  context,
}) => {
  const f = await prepare(page),
    other = await context.newPage();
  await f.addTab(other);
  await other.goto(page.url());
  await other
    .getByRole("button", { name: "Expandir Lobos", exact: true })
    .click();
  await other
    .getByRole("button", { name: "Desistência desta inscrição", exact: true })
    .click();
  await preview(other, "exclude_results");
  await preview(page, "keep_results");
  await page
    .getByRole("button", {
      name: "Confirmar desistência ou retorno",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Desistência ou retorno salvo" }),
  ).toBeVisible();
  await other
    .getByRole("button", {
      name: "Confirmar desistência ou retorno",
      exact: true,
    })
    .click();
  await expect(
    other.getByRole("button", {
      name: "Recarregar desistência preservando edição",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    other.getByRole("combobox", {
      name: "Tratamento dos resultados anteriores",
      exact: true,
    }),
  ).toHaveValue("exclude_results");
  expect(f.options.withdrawalCommits).toBe(1);
  await page
    .getByRole("button", { name: "Expandir Lobos B", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Desistência desta inscrição", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", {
      name: "Tratamento dos resultados anteriores",
      exact: true,
    }),
  ).toHaveValue("");
  expect(f.source.context.withdrawals).toHaveLength(1);
  await other.close();
});
test("desistência por inscrição conserva fontes, repete ACK perdido e retoma política", async ({
  page,
}) => {
  const f = await prepare(page, { loseWithdrawalAck: true });
  await expect(
    page
      .locator(".teams-workspace:visible")
      .getByText(/Lobos × Lobos B/)
      .last(),
  ).toBeVisible();
  await preview(page, "exclude_results");
  await page
    .getByRole("button", {
      name: "Confirmar desistência ou retorno",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("combobox", {
      name: "Tratamento dos resultados anteriores",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", {
      name: "Repetir desistência ou retorno",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Desistência ou retorno salvo" }),
  ).toBeVisible();
  expect(f.options.withdrawalCommits).toBe(1);
  expect(f.source.context.withdrawals[0]).toMatchObject({
    registrationId: tid(5),
    policy: "exclude_results",
    previousGameIds: [tid(8)],
  });
  expect(f.source.context.publishedGames[0]).toMatchObject({
    homePoints: 80,
    awayPoints: 70,
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Expandir Lobos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Desistência desta inscrição", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", {
      name: "Tratamento dos resultados anteriores",
      exact: true,
    }),
  ).toHaveValue("exclude_results");
  await preview(page, "return");
  await page
    .getByRole("button", {
      name: "Confirmar desistência ou retorno",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Desistência ou retorno salvo" }),
  ).toBeVisible();
  expect(f.source.context.withdrawals).toHaveLength(0);
  expect(f.options.withdrawalCommits).toBe(2);
});
