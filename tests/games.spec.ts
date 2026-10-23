import { test, expect, type Page } from "@playwright/test";
import { textImportFixture, tid } from "./fixtures/text-import";
import { saveGameSchema, type GameSnapshot } from "../src/games/contract";
async function fixture(page: Page) {
  await textImportFixture(page);
  const savedAt = "2026-10-23T19:00:00Z",
    games = new Map<string, GameSnapshot>(),
    receipts = new Map<string, unknown>();
  let uncertain = false,
    conflict = false,
    expired = false;
  const attempts: string[] = [];
  const team = {
    id: tid(4),
    name: "Lobos Clube",
    abbreviation: "LOB",
    version: 1,
    savedAt,
  };
  const registration = (id: string) => ({
    id,
    name: id === tid(5) ? "Lobos" : "Lobos B",
    teamId: team.id,
    team,
    disputeId: tid(3),
    version: 1,
    savedAt,
  });
  await page.route(/\/api\/games(\?|\/|$)/, async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      id = url.pathname.split("/")[3];
    if (expired && request.method() === "POST") {
      expired = false;
      return route.fulfill({
        status: 401,
        json: {
          error: { code: "invalid_session", message: "Entre novamente." },
        },
      });
    }
    if (request.method() === "GET") {
      if (id)
        return route.fulfill({
          status: games.has(id) ? 200 : 404,
          json: games.get(id) ?? {
            error: {
              code: "context_not_found",
              message: "Jogo não encontrado.",
            },
          },
        });
      const query = url.searchParams.get("q") ?? "";
      return route.fulfill({
        json: {
          items: [...games.values()].filter((g) =>
            (g.home.name + g.away.name + (g.venue ?? "")).includes(query),
          ),
          hasMore: false,
        },
      });
    }
    const command = saveGameSchema.parse(request.postDataJSON());
    attempts.push(command.commandId);
    if (receipts.has(command.commandId))
      return route.fulfill({ json: receipts.get(command.commandId) });
    const old = games.get(command.game.id);
    if (conflict && old) {
      conflict = false;
      old.version++;
      old.venue = "Servidor atualizado";
      return route.fulfill({
        status: 409,
        json: {
          error: {
            code: "version_conflict",
            message: "O jogo foi alterado. Recarregue.",
          },
        },
      });
    }
    const g = command.game,
      snapshot: GameSnapshot = {
        ...g,
        version: command.expectedVersion + 1,
        savedAt,
        state: "scheduled",
        timeZone: "America/Sao_Paulo",
        scheduledAt: g.date && g.time ? `${g.date}T${g.time}:00-03:00` : null,
        home: registration(g.homeRegistrationId),
        away: registration(g.awayRegistrationId),
      };
    games.set(g.id, snapshot);
    const result = { id: g.id, version: snapshot.version };
    receipts.set(command.commandId, result);
    if (uncertain) {
      uncertain = false;
      return route.fulfill({
        status: 503,
        json: {
          error: {
            code: "access_unavailable",
            message: "Envio não confirmado.",
          },
        },
      });
    }
    return route.fulfill({ json: result });
  });
  return {
    games,
    attempts,
    expire: () => {
      expired = true;
    },
    uncertain: () => {
      uncertain = true;
      attempts.length = 0;
    },
    conflict: () => {
      conflict = true;
    },
  };
}
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
test("preserva cadastro do jogo após sessão expirada e bloqueia saída acidental", async ({
  page,
}) => {
  const f = await fixture(page);
  await open(page);
  await page.getByLabel("Local", { exact: true }).fill("Quadra preservada");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Voltar aos campeonatos", exact: true })
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
}) => {
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
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
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
