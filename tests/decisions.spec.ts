import { test, expect, type Page } from "@playwright/test";
import { regulationBrowserFixture } from "./fixtures/regulation-browser";
import { decisionBackend } from "./fixtures/decisions.mjs";
import { SupabaseDecisions } from "../src/regulation/decision-provider";
import { tid } from "./fixtures/text-import";
async function fixture(
  page: Page,
  options: Record<string, boolean | number | undefined>,
) {
  const f = await regulationBrowserFixture(page),
    source = f.getState();
  source.version = 1;
  source.savedAt = "2026-10-25T01:00:00Z";
  source.definition = {
    registrationIds: [tid(5), tid(6)],
    occurrenceRules: { wo: null },
    groupPhases: [],
    knockoutPhases: [],
    series: [],
  };
  const backend = decisionBackend(source, options),
    provider = new SupabaseDecisions(
      { url: "https://db.example.test", key: "fixture" },
      async (url, init) => {
        const response = await backend(
          new Request(url, {
            ...init,
            headers: {
              authorization: "Bearer fixture-access",
              "content-type": "application/json",
            },
          }),
        );
        if (response)
          return Response.json(await response.json(), {
            status: response.status,
          });
        return Response.json(source);
      },
    );
  await page.route(/\/api\/games\/[^/]+\/occurrence(?:\/|$)/, async (route) => {
    const req = route.request(),
      tail = new URL(req.url()).pathname.slice(
        `/api/games/${tid(8)}/occurrence`.length,
      );
    try {
      if (
        req.method() === "GET" &&
        options.failReadAfterAck &&
        options.occurrenceCommits
      ) {
        options.failReadAfterAck = false;
        return route.fulfill({
          status: 503,
          json: {
            error: {
              code: "access_unavailable",
              message: "Leitura indisponível.",
            },
          },
        });
      }
      if (req.method() === "POST" && tail === "")
        options.saveAttempts = Number(options.saveAttempts ?? 0) + 1;
      if (
        req.method() === "POST" &&
        tail === "" &&
        options.rejectChangedSource
      ) {
        options.rejectChangedSource = false;
        source.contextFingerprint = "b".repeat(64);
        return route.fulfill({
          status: 409,
          json: {
            error: {
              code: "version_conflict",
              message: "As fontes mudaram. Recarregue para conferir.",
            },
          },
        });
      }
      const value =
        req.method() === "GET"
          ? await provider.getOccurrence("fixture", tid(8))
          : tail === "/preview"
            ? await provider.previewOccurrence("fixture", req.postDataJSON())
            : await provider.saveOccurrence("fixture", req.postDataJSON());
      await route.fulfill({ json: value });
    } catch (error) {
      const e = error as { status?: number; code?: string; message?: string };
      await route.fulfill({
        status: e.status ?? 503,
        json: {
          error: {
            code: e.code ?? "access_unavailable",
            message: e.message ?? "Indisponível",
          },
        },
      });
    }
  });
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page
    .getByRole("button", { name: "Abrir jogo Lobos × Lobos B", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Situação e decisões do jogo", exact: true })
    .click();
  return { options };
}
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
