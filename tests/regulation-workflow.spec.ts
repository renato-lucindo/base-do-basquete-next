import { test, expect, type Page } from "@playwright/test";
import { regulationBrowserFixture } from "./fixtures/regulation-browser";
import { tid } from "./fixtures/text-import";
import { publicRegulationFixture } from "./fixtures/public-regulation";
import { publicNavigationFixture } from "./fixtures/public-navigation";
import { regulationId } from "./fixtures/regulation";
import { buildPublicStandings } from "../src/regulation/public";
import type { PublicStandingsSource } from "../src/regulation/public-contract";
import AxeBuilder from "@axe-core/playwright";
import {
  createDefaultDefinition,
  createFibaRules,
} from "../src/regulation/defaults";
const open = (page: Page) =>
  page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`,
  );
test("mantém decisão existente protegida durante outra edição de desempate", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page),
    definition = createDefaultDefinition();
  definition.registrationIds = [tid(5), tid(6)];
  definition.groupPhases = [
    {
      phaseId: tid(200),
      name: "Fase",
      rules: createFibaRules(),
      groups: [
        {
          id: tid(201),
          name: "Grupo",
          registrationIds: [tid(5), tid(6)],
          gameIds: [],
        },
      ],
    },
  ];
  definition.tieDecisions = [
    {
      id: tid(202),
      phaseId: tid(200),
      groupId: tid(201),
      order: [tid(5), tid(6)],
      basis: "contexto anterior",
    },
  ];
  definition.tieNotes = [{ id: tid(202), comment: "Decisão anterior" }];
  Object.assign(f.getState(), {
    version: 1,
    definition,
    savedAt: "2026-10-24T20:01:00Z",
  });
  await open(page);
  await page
    .getByRole("button", { name: "Definir desempate", exact: true })
    .click();
  await page
    .getByLabel("Justificativa do desempate", { exact: true })
    .fill("Nova justificativa");
  await expect(
    page.getByRole("button", {
      name: "Retirar decisão de desempate",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Cancelar edição do desempate", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Retirar decisão de desempate",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Salvar rascunho", exact: true }),
  ).toBeEnabled();
});
test("edição do desempate pode ser cancelada sem perder texto por um salvamento paralelo", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  await open(page);
  await page.getByLabel("Incluir Lobos", { exact: true }).check();
  await page.getByLabel("Incluir Lobos B", { exact: true }).check();
  await page
    .getByRole("button", { name: "Adicionar pontos corridos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Definir desempate", exact: true })
    .click();
  await page
    .getByLabel("Justificativa do desempate", { exact: true })
    .fill("Texto ainda em edição");
  await expect(
    page.getByRole("button", { name: "Salvar rascunho", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Cancelar edição do desempate", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Salvar rascunho", exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Motivo da alteração", { exact: true })
    .fill("Publicar com empate pendente");
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
  expect(f.getState().definition?.tieDecisions).toBeUndefined();
});
test("regulamento anterior conserva regras até adoção explícita e confirmação", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page),
    definition = createDefaultDefinition();
  definition.registrationIds = [tid(5), tid(6)];
  definition.occurrenceRules.wo = null;
  definition.groupPhases = [
    {
      phaseId: tid(200),
      name: "Fase anterior",
      rules: {
        format: "round_robin",
        points: { win: 3, loss: 0 },
        tieBreakers: [],
      },
      groups: [
        {
          id: tid(201),
          name: "Grupo anterior",
          registrationIds: [tid(5), tid(6)],
          gameIds: [],
        },
      ],
    },
  ];
  Object.assign(f.getState(), {
    version: 1,
    definition,
    savedAt: "2026-10-24T20:01:00Z",
  });
  await open(page);
  await expect(
    page.getByText("Regulamento anterior", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Turnos da fase", { exact: true })).toHaveValue(
    "",
  );
  await page
    .getByRole("button", { name: "Regras avançadas", exact: true })
    .click();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("3");
  await page
    .getByRole("button", { name: "Aplicar padrão FIBA", exact: true })
    .click();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("2");
  expect(f.getState().definition?.groupPhases[0].rules.points.win).toBe(3);
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await page
    .getByLabel("Motivo da alteração", { exact: true })
    .fill("Adoção do padrão FIBA nesta edição");
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
  expect(f.getState().definition?.groupPhases[0].rules.calculationPolicy).toBe(
    "fiba-2026",
  );
  expect(f.getState().version).toBe(2);
});
test("organização mantém reflow, nomes longos e controles acessíveis", async ({
  page,
}, info) => {
  const f = await regulationBrowserFixture(page);
  const team = f.registrations.get(tid(5))!;
  team.name = "Associação de Basquetebol Comunitário da Região Metropolitana";
  await open(page);
  await page.getByLabel(`Incluir ${team.name}`, { exact: true }).check();
  await page.getByLabel("Incluir Lobos B", { exact: true }).check();
  await page
    .getByRole("button", { name: "Adicionar pontos corridos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [390, 844],
    [320, 720],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.preview-artifacts/regulation-workflow-after-${info.project.name}-${width}.png`,
      fullPage: true,
    });
  }
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations).toEqual([]);
});
test("publica classificação inicial com empate pendente e abre a consulta pública", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  const base = JSON.parse(
    JSON.stringify(publicRegulationFixture())
      .replaceAll(regulationId(90), tid(3))
      .replaceAll(regulationId(1), tid(5))
      .replaceAll(regulationId(2), tid(6))
      .replaceAll(regulationId(100), tid(8)),
  ) as PublicStandingsSource;
  let candidate: PublicStandingsSource | null = null,
    published: PublicStandingsSource | null = null;
  await page.route(
    `**/api/regulations/${tid(3)}/publication`,
    async (route) => {
      if (route.request().method() === "GET") {
        const d = structuredClone(f.getState().definition!);
        delete d.tieNotes;
        delete d.customReason;
        candidate = {
          ...base,
          regulationVersion: f.getState().version,
          definition: d,
          games: [],
          publishedGames: [],
          occurrences: [],
          withdrawals: [],
        };
        return route.fulfill({
          json: { fingerprint: "a".repeat(64), source: candidate },
        });
      }
      published = structuredClone(candidate!);
      return route.fulfill({
        json: {
          commandId: route.request().postDataJSON().commandId,
          disputeId: tid(3),
          publicationVersion: 1,
          publishedAt: base.publishedAt,
        },
      });
    },
  );
  await open(page);
  await page.getByLabel("Incluir Lobos", { exact: true }).check();
  await page.getByLabel("Incluir Lobos B", { exact: true }).check();
  await page
    .getByRole("button", { name: "Adicionar pontos corridos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await page
    .getByLabel("Motivo da alteração", { exact: true })
    .fill("Classificação inicial antes dos resultados");
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
  await page
    .getByRole("button", { name: "Conferir publicação pública", exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: /Conferi os participantes, jogos e efeitos/,
    })
    .check();
  await page
    .getByRole("button", { name: "Confirmar publicação pública", exact: true })
    .click();
  await publicNavigationFixture(page);
  await page.route("**/api/public/catalog?*", (route) =>
    route.fulfill({
      json: {
        games: [],
        next: null,
        disputes: [
          {
            disputeId: tid(3),
            context: base.context,
            registrations: base.registrations,
          },
        ],
      },
    }),
  );
  await page.route("**/api/public/standings/**", (route) =>
    route.fulfill({ json: published ? buildPublicStandings(published) : null }),
  );
  await page
    .getByRole("link", { name: "Abrir consulta pública", exact: true })
    .click();
  const table = page.getByRole("table", {
    name: "Classificação por resultados confirmados",
  });
  await expect(table).toBeVisible();
  await expect(table.locator("tbody tr")).toHaveCount(2);
  await expect(
    page.getByText("Classificação ainda não disponível", { exact: true }),
  ).toHaveCount(0);
  expect(f.getState().definition?.tieDecisions).toBeUndefined();
});
test("rascunho com resposta perdida bloqueia edição e repete o mesmo comando", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  f.loseDraftAck();
  await open(page);
  await page.getByLabel("Incluir Lobos", { exact: true }).check();
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(
    page.getByLabel("Incluir Lobos B", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir envio do rascunho", exact: true })
    .click();
  await expect(
    page.getByText("Rascunho salvo. Ainda não publicado.", { exact: true }),
  ).toBeVisible();
  expect(f.draftAttempts).toHaveLength(2);
  expect(f.draftAttempts[0]).toBe(f.draftAttempts[1]);
  expect(f.getDraft()?.version).toBe(1);
  expect(f.getState().version).toBe(0);
});
test("rascunho concorrente exige recarga sem apagar a edição local", async ({
  page,
  context,
}) => {
  const f = await regulationBrowserFixture(page),
    other = await context.newPage();
  await f.addTab(other);
  await open(page);
  await open(other);
  await expect(
    other.getByRole("button", { name: "Salvar rascunho", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Incluir Lobos", { exact: true }).check();
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(
    page.getByText("Rascunho salvo. Ainda não publicado.", { exact: true }),
  ).toBeVisible();
  await other.getByLabel("Incluir Lobos B", { exact: true }).check();
  await other
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(other.getByRole("alert")).toContainText("rascunho mudou");
  await other
    .getByRole("button", { name: "Recarregar rascunho", exact: true })
    .click();
  await expect(
    other.getByLabel("Incluir Lobos B", { exact: true }),
  ).toBeChecked();
  await expect(
    other.getByLabel("Incluir Lobos", { exact: true }),
  ).not.toBeChecked();
  await other.close({ runBeforeUnload: false });
});
test("personalização exige justificativa e o padrão pode ser restaurado explicitamente", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  await open(page);
  await page.getByLabel("Incluir Lobos", { exact: true }).check();
  await page
    .getByRole("button", { name: "Adicionar pontos corridos", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Regras avançadas", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await page
    .getByRole("button", { name: "Regras avançadas", exact: true })
    .click();
  await page.getByLabel("Pontos por vitória", { exact: true }).fill("3");
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "justificativa das regras personalizadas",
  );
  await page
    .getByLabel("Justificativa das regras personalizadas", { exact: true })
    .fill("Pontuação especial desta edição");
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Depois da alteração", exact: true }),
  ).toBeVisible();
  expect(f.getState().version).toBe(0);
  await page
    .getByRole("button", { name: "Aplicar padrão FIBA", exact: true })
    .click();
  await expect(
    page.getByLabel("Pontos por vitória", { exact: true }),
  ).toHaveValue("2");
  await expect(
    page.getByLabel("Justificativa das regras personalizadas", { exact: true }),
  ).toHaveCount(0);
  expect(f.getState().version).toBe(0);
});
test("salva e recupera rascunho incompleto sem salvar ou publicar regulamento", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  await open(page);
  await page.getByLabel("Incluir Lobos", { exact: true }).check();
  await page
    .getByRole("button", { name: "Adicionar pontos corridos", exact: true })
    .click();
  await page.getByLabel("Nome da fase", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(
    page.getByText("Rascunho salvo. Ainda não publicado.", { exact: true }),
  ).toBeVisible();
  expect(f.getState().version).toBe(0);
  expect(f.getDraft()?.document.definition.groupPhases[0].name).toBe("");
  await page.reload();
  await expect(page.getByLabel("Nome da fase", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByText("Rascunho recuperado. Ainda não publicado.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Usar regulamento confirmado", exact: true })
    .click();
  await expect(page.getByLabel("Nome da fase", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(
    page.getByText("Rascunho salvo. Ainda não publicado.", { exact: true }),
  ).toBeVisible();
  expect(f.getDraft()?.version).toBe(2);
  expect(f.getDraft()?.document.definition.groupPhases).toEqual([]);
});
test("permite justificar desempate manual sem exigir sorteio", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  await open(page);
  await page.getByLabel("Incluir Lobos", { exact: true }).check();
  await page.getByLabel("Incluir Lobos B", { exact: true }).check();
  await page
    .getByRole("button", { name: "Adicionar pontos corridos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Definir desempate", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Subir Lobos B", exact: true })
    .click();
  await page
    .getByLabel("Justificativa do desempate", { exact: true })
    .fill("Critério administrativo acordado pela organização");
  await page
    .getByRole("button", {
      name: "Aplicar decisão ao regulamento",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Conferir impacto", exact: true })
    .click();
  await page
    .getByLabel("Motivo da alteração", { exact: true })
    .fill("Decisão conferida");
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
  expect(f.getState().definition?.tieDecisions?.[0].order[0]).toBe(tid(6));
  expect(f.getState().definition?.tieNotes?.[0].comment).toContain(
    "Critério administrativo",
  );
});
