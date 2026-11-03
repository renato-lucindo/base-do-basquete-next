import { test, expect } from "@playwright/test";
import { regulationBrowserFixture } from "./fixtures/regulation-browser";
import { publicRegulationFixture } from "./fixtures/public-regulation";
import { tid } from "./fixtures/text-import";
import { regulationId } from "./fixtures/regulation";

test("prévia nominal exige confirmação e repete o mesmo comando após resposta perdida", async ({
  page,
}, info) => {
  const f = await regulationBrowserFixture(page);
  const s = JSON.parse(
    JSON.stringify(publicRegulationFixture())
      .replaceAll(regulationId(90), tid(3))
      .replaceAll(regulationId(1), tid(5))
      .replaceAll(regulationId(2), tid(6))
      .replaceAll(regulationId(100), tid(8)),
  ) as ReturnType<typeof publicRegulationFixture>;
  Object.assign(f.getState(), {
    version: 1,
    definition: s.definition,
    savedAt: s.publishedAt,
  });
  const attempts: string[] = [];
  let lost = true;
  await page.route(
    `**/api/regulations/${tid(3)}/publication`,
    async (route) => {
      if (route.request().method() === "GET")
        return route.fulfill({
          json: { fingerprint: "a".repeat(64), source: s },
        });
      attempts.push(route.request().postData()!);
      if (lost) {
        lost = false;
        return route.abort();
      }
      const c = route.request().postDataJSON();
      return route.fulfill({
        json: {
          commandId: c.commandId,
          disputeId: c.disputeId,
          publicationVersion: 1,
          publishedAt: s.publishedAt,
        },
      });
    },
  );
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`,
  );
  await page
    .getByRole("button", { name: "Conferir publicação pública", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Prévia do conjunto que ficará público",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Jogos vinculados (1)" }),
  ).toBeVisible();
  const confirm = page.getByRole("button", {
    name: "Confirmar publicação pública",
    exact: true,
  });
  await expect(confirm).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: /Conferi os participantes, jogos e efeitos/,
    })
    .check();
  await page.screenshot({
    path: `.preview-artifacts/standings-publication-review-after-${info.project.name}.png`,
    fullPage: true,
  });
  await confirm.click();
  await expect(
    page.getByLabel("Nome da fase", { exact: true }).first(),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir envio da publicação", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Publicação v1 confirmada" }),
  ).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toBe(attempts[1]);
  await expect(
    page.getByLabel("Nome da fase", { exact: true }).first(),
  ).toBeEnabled();
});

test("prévia identifica vencedor e pontuação do W.O.; conflito exige nova conferência", async ({
  page,
}) => {
  const f = await regulationBrowserFixture(page);
  const s = JSON.parse(
    JSON.stringify(publicRegulationFixture())
      .replaceAll(regulationId(90), tid(3))
      .replaceAll(regulationId(1), tid(5))
      .replaceAll(regulationId(2), tid(6))
      .replaceAll(regulationId(100), tid(8)),
  ) as ReturnType<typeof publicRegulationFixture>;
  s.definition.occurrenceRules.wo = {
    winnerLeaguePoints: 2,
    loserLeaguePoints: 0,
    score: null,
  };
  s.occurrences.push({
    id: regulationId(200),
    version: 1,
    gameId: tid(8),
    gameVersion: 2,
    publicationVersion: 1,
    effect: { kind: "wo", winnerRegistrationId: tid(5) },
  });
  Object.assign(f.getState(), {
    version: 1,
    definition: s.definition,
    savedAt: s.publishedAt,
  });
  await page.route(`**/api/regulations/${tid(3)}/publication`, (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: { fingerprint: "a".repeat(64), source: s } })
      : route.fulfill({
          status: 409,
          json: {
            error: {
              code: "public_scope_conflict",
              message: "As fontes mudaram. Confira uma nova prévia.",
            },
          },
        }),
  );
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`,
  );
  await page
    .getByRole("button", { name: "Conferir publicação pública", exact: true })
    .click();
  await expect(
    page.getByText(
      /Vencedor: Lobos · Pontos de classificação: 2 para o vencedor e 0 para o perdedor/,
    ),
  ).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: /Conferi os participantes, jogos e efeitos/,
    })
    .check();
  await page
    .getByRole("button", { name: "Confirmar publicação pública", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("As fontes mudaram");
  await expect(
    page.getByRole("heading", {
      name: "Prévia do conjunto que ficará público",
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Conferir publicação pública",
      exact: true,
    }),
  ).toBeEnabled();
});
