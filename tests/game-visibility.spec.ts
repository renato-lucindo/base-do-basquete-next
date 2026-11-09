import { expect, test } from "@playwright/test";
import {
  competitionSetupFixture,
} from "./fixtures/competition-setup";
import { selectGameRegistration } from "./fixtures/games";
import { tid } from "./fixtures/text-import";
import { saveGameVisibilitySchema } from "../src/games/visibility-contract";

test("published semifinal becomes a private draft and can be republished without deleting its result", async ({
  page,
}) => {
  const fixture = await competitionSetupFixture(page);
  let visibility: "draft" | "published" = "published";
  let version = 0;
  const reasons: string[] = [];

  await page.route(/\/api\/games\/[^/]+\/visibility$/, async (route) => {
    const gameId = new URL(route.request().url()).pathname.split("/")[3];
    const game = fixture.games.get(gameId);
    if (!game) return route.fulfill({ status: 404, json: {} });
    if (route.request().method() === "GET") {
      return route.fulfill({
        json: {
          gameId,
          disputeId: tid(3),
          version,
          gameVersion: game.version,
          publicationVersion: 1,
          visibility,
          reason: version ? reasons[version - 1] : null,
          savedAt: version ? "2026-11-09T15:00:00Z" : null,
        },
      });
    }
    const command = saveGameVisibilitySchema.parse(
      route.request().postDataJSON(),
    );
    expect(command.expectedVersion).toBe(version);
    expect(command.expectedGameVersion).toBe(game.version);
    expect(command.expectedPublicationVersion).toBe(1);
    visibility = command.visibility;
    reasons.push(command.reason);
    version++;
    return route.fulfill({
      json: {
        commandId: command.commandId,
        gameId,
        version,
        visibility,
        savedAt: "2026-11-09T15:00:00Z",
      },
    });
  });
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("http://127.0.0.1:5174/foundation.html#/jogos?disputa=" + tid(3));
  await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
  await selectGameRegistration(page, "mandante", "Lobos");
  await selectGameRegistration(page, "visitante", "Lobos B");
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect.poll(() => fixture.games.size).toBe(1);

  const panel = page.getByRole("region", { name: "Visibilidade do jogo" });
  await expect(panel.getByRole("status")).toContainText("Publicado");
  await panel
    .getByRole("textbox", { name: "Motivo da alteração" })
    .fill("Semifinal antecipada: classificação ainda incompleta");
  await panel.getByRole("button", { name: "Mover para rascunho" }).click();
  await expect(panel.getByRole("status")).toContainText("Rascunho privado");
  expect(visibility).toBe("draft");
  expect(fixture.games.size).toBe(1);

  await panel
    .getByRole("textbox", { name: "Motivo da alteração" })
    .fill("Classificatória concluída e confrontos validados");
  await panel.getByRole("button", { name: "Publicar jogo" }).click();
  await expect(panel.getByRole("status")).toContainText("Publicado");
  expect(visibility).toBe("published");
  expect(version).toBe(2);
  expect(reasons).toHaveLength(2);
});
