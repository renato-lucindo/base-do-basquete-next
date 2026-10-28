import { test, expect, type Page } from "@playwright/test";
import { pdfFixture } from "./fixtures/pdf";
import {
  pdfPublicationFixture,
  pdfPublicationFixtures,
} from "./fixtures/pdf-publication";
import { tid } from "./fixtures/text-import";
import {
  publishPdfSchema,
  type PublishPdf,
} from "../src/publication/pdf-contract";
async function fixture(
  page: Page,
  mode: "lost" | "invalid" | "expired" | "expiredRead" = "lost",
) {
  const f = await pdfFixture(page),
    commands = new Map<string, PublishPdf>(),
    attempts = new Map<string, string[]>(),
    receipts = new Map<string, unknown>(),
    commits = new Map<string, number>();
  let failed = false;
  for (const [i, filename] of [
    pdfPublicationFixtures[0],
    pdfPublicationFixtures[1],
  ].entries()) {
    const sample = await pdfPublicationFixture(filename),
      source = { ...sample.review.source, id: tid(60 + i), disputeId: tid(3) },
      game = { ...f.games.get(tid(8))!, id: tid(8 + i) };
    f.sources.set(source.id, source);
    f.games.set(game.id, game);
    commands.set(source.id, {
      requestId: tid(80 + i),
      gameId: game.id,
      gameVersion: 1,
      basePublicationVersion: 0,
      source: {
        kind: "pdf",
        sourceId: source.id,
        sourceVersion: 2,
        reviewVersion: 1,
      },
      supplement: sample.supplement,
      authority: sample.authority,
      sheetVersion: null,
      reason: "",
      acceptDivergence: false,
    });
  }
  await page.route(/\/api\/pdf-sources\/[^/]+\/preparation$/, (route) => {
    if (mode === "expiredRead" && !failed) {
      failed = true;
      return route.fulfill({
        status: 401,
        json: {
          error: { code: "invalid_session", message: "Entre novamente." },
        },
      });
    }
    const id = new URL(route.request().url()).pathname.split("/")[3],
      publication = commands.get(id);
    return route.fulfill({
      json: publication
        ? {
            sourceId: id,
            version: 1,
            savedAt: "2026-10-24T14:15:00Z",
            publication,
          }
        : null,
    });
  });
  await page.route(/\/api\/games\/[^/]+\/publication\/pdf$/, (route) => {
    const c = publishPdfSchema.parse(route.request().postDataJSON()),
      sid = c.source.sourceId;
    attempts.set(sid, [
      ...(attempts.get(sid) ?? []),
      route.request().postData()!,
    ]);
    if (mode === "expired" && !failed) {
      failed = true;
      return route.fulfill({
        status: 401,
        json: {
          error: { code: "invalid_session", message: "Entre novamente." },
        },
      });
    }
    if (mode === "invalid" && sid === tid(61))
      return route.fulfill({
        status: 400,
        json: {
          error: {
            code: "invalid_input",
            message: "Confira os atletas deste jogo.",
          },
        },
      });
    if (!receipts.has(c.requestId)) {
      commits.set(sid, (commits.get(sid) ?? 0) + 1);
      receipts.set(c.requestId, {
        requestId: c.requestId,
        gameId: c.gameId,
        version: 1,
        gameVersion: 2,
        sourceVersion: 2,
        reviewVersion: 1,
        publishedAt: "2026-10-24T14:15:00Z",
      });
    }
    if (mode === "lost" && sid === tid(61) && !failed) {
      failed = true;
      return route.fulfill({
        status: 503,
        json: {
          error: {
            code: "access_unavailable",
            message: "Resposta não confirmada.",
          },
        },
      });
    }
    return route.fulfill({ json: receipts.get(c.requestId) });
  });
  return { ...f, commands, attempts, commits };
}
async function select(page: Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos/pdfs`,
  );
  await expect(
    page.getByRole("heading", {
      name: "Publicar documentos selecionados",
      exact: true,
    }),
  ).toBeVisible();
  for (const filename of [pdfPublicationFixtures[0], pdfPublicationFixtures[1]])
    await page
      .getByLabel(`Selecionar ${filename} para publicação`, { exact: true })
      .check();
  await page
    .getByRole("button", { name: "Conferir selecionados", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Confirmar e publicar selecionados",
      exact: true,
    }),
  ).toBeEnabled();
}
test("batch keeps each game result and retries only the command whose response was lost", async ({
  page,
}) => {
  const f = await fixture(page);
  await select(page);
  await page
    .getByRole("button", {
      name: "Confirmar e publicar selecionados",
      exact: true,
    })
    .click();
  const region = page.getByRole("region", {
    name: "Publicação de PDFs selecionados",
    exact: true,
  });
  await expect(
    region.getByRole("link", {
      name: `Ver resultado de ${pdfPublicationFixtures[0]}`,
      exact: true,
    }),
  ).toBeVisible();
  await region
    .getByRole("button", {
      name: `Repetir publicação de ${pdfPublicationFixtures[1]}`,
      exact: true,
    })
    .click();
  await expect(
    region.getByRole("link", {
      name: `Ver resultado de ${pdfPublicationFixtures[1]}`,
      exact: true,
    }),
  ).toBeVisible();
  expect(f.attempts.get(tid(60))).toHaveLength(1);
  expect(f.attempts.get(tid(61))).toHaveLength(2);
  expect(f.attempts.get(tid(61))?.[0]).toBe(f.attempts.get(tid(61))?.[1]);
  expect([...f.commits.values()]).toEqual([1, 1]);
});

test("batch rejects two prepared sources for the same game before any publication", async ({
  page,
}) => {
  const f = await fixture(page, "invalid");
  const second = f.commands.get(tid(61))!;
  f.commands.set(tid(61), { ...second, gameId: tid(8) });
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos/pdfs`,
  );
  for (const filename of [pdfPublicationFixtures[0], pdfPublicationFixtures[1]])
    await page
      .getByLabel(`Selecionar ${filename} para publicação`, { exact: true })
      .check();
  await page
    .getByRole("button", { name: "Conferir selecionados", exact: true })
    .click();
  const region = page.getByRole("region", {
    name: "Publicação de PDFs selecionados",
    exact: true,
  });
  await expect(
    region.getByRole("alert").filter({ hasText: "mais de uma preparação" }),
  ).toHaveCount(2);
  expect([...f.attempts.values()].flat()).toHaveLength(0);
  await page
    .getByLabel(`Selecionar ${pdfPublicationFixtures[1]} para publicação`, {
      exact: true,
    })
    .uncheck();
  await page
    .getByRole("button", { name: "Conferir selecionados", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Confirmar e publicar selecionados",
      exact: true,
    })
    .click();
  await expect(region.getByRole("status")).toContainText("1 publicado");
});

test("batch can recheck preparation after access expires during its read", async ({
  page,
}) => {
  await fixture(page, "expiredRead");
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos/pdfs`,
  );
  await page
    .getByLabel(`Selecionar ${pdfPublicationFixtures[0]} para publicação`, {
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Conferir selecionados", exact: true })
    .click();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Conferir selecionados", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Confirmar e publicar selecionados",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("region", {
        name: "Publicação de PDFs selecionados",
        exact: true,
      })
      .getByRole("status"),
  ).toContainText("1 publicado");
});
test("batch isolates a validation failure without declaring complete success", async ({
  page,
}) => {
  const f = await fixture(page, "invalid");
  await select(page);
  await page
    .getByRole("button", {
      name: "Confirmar e publicar selecionados",
      exact: true,
    })
    .click();
  const region = page.getByRole("region", {
    name: "Publicação de PDFs selecionados",
    exact: true,
  });
  await expect(
    region.getByRole("alert").filter({ hasText: "Confira os atletas" }),
  ).toBeVisible();
  await expect(
    region.getByRole("link", {
      name: `Ver resultado de ${pdfPublicationFixtures[0]}`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(region.getByRole("status")).toContainText("1 publicado");
  await expect(region.getByRole("status")).toContainText(
    "1 precisa de revisão",
  );
  expect(f.commits.get(tid(61))).toBeUndefined();
});
test("batch pauses on expired access and resumes the prepared commands after login", async ({
  page,
}) => {
  const f = await fixture(page, "expired");
  await select(page);
  await page
    .getByRole("button", {
      name: "Confirmar e publicar selecionados",
      exact: true,
    })
    .click();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  expect([...f.attempts.values()].flat()).toHaveLength(1);
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Continuar publicação", exact: true })
    .click();
  const region = page.getByRole("region", {
    name: "Publicação de PDFs selecionados",
    exact: true,
  });
  await expect(region.getByRole("status")).toContainText("2 publicados");
  expect([...f.commits.values()]).toEqual([1, 1]);
});
