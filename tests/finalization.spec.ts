import { test, expect } from "@playwright/test";
import { pdfPreparationFixture } from "./fixtures/pdf-preparation";
import { tid } from "./fixtures/text-import";
async function enable(page: import("@playwright/test").Page) {
  await page.route("**/foundation.html", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        "<head>",
        '<head><meta name="bb-flexible-competition" content="true">',
      ),
    });
  });
}
for (const lost of [false, true])
  test(`PDF conclui sem publicação separada; resposta perdida ${lost}`, async ({
    page,
  }) => {
    const f = await pdfPreparationFixture(page, true);
    await enable(page);
    await page.goto(
      `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos/pdfs`,
    );
    await page
      .getByRole("button", { name: "Revisar Boxscore-site.pdf", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Completar importação do PDF", exact: true })
      .click();
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
    if (lost) f.losePublish();
    await page
      .getByRole("button", {
        name: "Concluir importação e atualizar resultado",
        exact: true,
      })
      .click();
    if (lost)
      await page
        .getByRole("button", {
          name: "Repetir finalização do PDF",
          exact: true,
        })
        .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Resultado atualizado" }),
    ).toBeVisible();
    expect(f.saveAttempts).toHaveLength(0);
    expect(f.publishAttempts).toHaveLength(lost ? 2 : 1);
    if (lost) expect(f.publishAttempts[0]).toBe(f.publishAttempts[1]);
    expect(JSON.parse(f.publishAttempts[0]).reason).toBe("");
  });

for (const lost of [false, true])
  test(`súmula finaliza e corrige em uma ação; resposta perdida ${lost}`, async ({
    page,
    isMobile,
  }) => {
    test.skip(
      isMobile,
      "Súmula de lançamento mantém o escopo desktop vigente.",
    );
    const { desktopSheetFixture, openDesktopSheet, chooseFive } =
      await import("./fixtures/sheet-desktop");
    const { finalizeSheetSchema } =
      await import("../src/publication/finalization");
    const { publishedSheet } = await import("./fixtures/published-game");
    const f = await desktopSheetFixture(page);
    await enable(page);
    let projection: ReturnType<typeof publishedSheet> | null = null,
      version = 0,
      lose = lost;
    const attempts: unknown[] = [],
      receipts = new Map<string, unknown>();
    await page.route(`**/api/games/${tid(80)}/publication`, (route) =>
      route.fulfill({
        json: {
          gameId: tid(80),
          version,
          published: projection,
          history: [],
          hasMore: false,
          requiresFallback: false,
        },
      }),
    );
    await page.route(
      `**/api/games/${tid(80)}/publication/finalize-sheet`,
      async (route) => {
        const c = finalizeSheetSchema.parse(route.request().postDataJSON());
        attempts.push(c);
        if (receipts.has(c.requestId))
          return route.fulfill({ json: receipts.get(c.requestId) });
        const game = f.games.get(tid(80))!;
        version++;
        const sourceVersion = c.source.baseSheetVersion + 1;
        projection = {
          ...publishedSheet(
            c.source.document,
            game.id,
            game.home.id,
            game.away.id,
            version,
            sourceVersion,
            game.version + 1,
          ),
          disputeId: tid(3),
        };
        f.games.set(game.id, {
          ...game,
          version: game.version + 1,
          state: "finished",
        });
        f.setSnapshot({
          ...f.snapshot()!,
          gameVersion: game.version + 1,
          version: sourceVersion,
          confirmed: true,
          document: c.source.document,
        });
        const r = {
          requestId: c.requestId,
          gameId: game.id,
          gameVersion: game.version + 1,
          sourceVersion,
          version,
          publishedAt: "2026-11-07T18:00:00Z",
        };
        receipts.set(c.requestId, r);
        if (lose) {
          lose = false;
          return route.fulfill({
            status: 503,
            json: {
              error: {
                code: "access_unavailable",
                message: "Resposta perdida.",
              },
            },
          });
        }
        return route.fulfill({ json: r });
      },
    );
    await openDesktopSheet(page);
    await chooseFive(page);
    await page
      .getByRole("button", {
        name: "Concluir preparação e lançar ações",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Quarto ou prorrogação", { exact: true })
      .selectOption("4");
    const add = async (code: string) => {
      await page.getByLabel("Camisa ou alvo", { exact: true }).fill("1");
      await page.keyboard.press("Enter");
      await page.getByLabel("Ação", { exact: true }).fill(code);
      await page.keyboard.press("Enter");
    };
    await add("2");
    await page
      .getByRole("button", { name: "Finalizar jogo", exact: true })
      .click();
    if (lost)
      await page
        .getByRole("button", { name: "Repetir finalização", exact: true })
        .click();
    await expect(
      page.getByRole("button", {
        name: "Salvar correção e atualizar resultado",
        exact: true,
      }),
    ).toBeVisible();
    await add("3");
    await page
      .getByRole("button", {
        name: "Salvar correção e atualizar resultado",
        exact: true,
      })
      .click();
    await expect.poll(() => version).toBe(2);
    expect(attempts).toHaveLength(lost ? 3 : 2);
    if (lost) expect(attempts[0]).toEqual(attempts[1]);
    expect(attempts.every((c) => (c as { reason: string }).reason === "")).toBe(
      true,
    );
    expect(f.snapshot()?.document.events).toHaveLength(2);
  });
