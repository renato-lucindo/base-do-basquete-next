import { test, expect } from "@playwright/test";
import { gamesFixture } from "./fixtures/games";
import { tid } from "./fixtures/text-import";

for (const width of [1366, 1920])
  for (const area of ["jogos", "equipes"])
    test(`busca e ações não se sobrepõem em ${area} ${width}`, async ({
      page,
    }, info) => {
      test.skip(info.project.name !== "desktop", "Recorte desktop");
      await page.setViewportSize({
        width,
        height: width === 1366 ? 768 : 1080,
      });
      await gamesFixture(page);
      await page.goto(
        `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/${area}`,
      );
      const input = page.getByLabel(
        area === "jogos" ? "Buscar jogo" : "Buscar inscrição ou equipe",
        { exact: true },
      );
      await expect(input).toBeVisible();
      const action = page.getByRole("button", {
        name: area === "jogos" ? "Novo jogo" : "Adicionar inscrição",
        exact: true,
      });
      const box = await input.boundingBox(),
        button = await action.boundingBox();
      expect(box).not.toBeNull();
      expect(button).not.toBeNull();
      if (box && button) {
        const separateRows =
          box.y + box.height <= button.y || button.y + button.height <= box.y;
        expect(
          separateRows ||
            box.x + box.width <= button.x ||
            button.x + button.width <= box.x,
        ).toBe(true);
      }
      await input.fill("Lobos");
      await expect(input).toHaveValue("Lobos");
    });
