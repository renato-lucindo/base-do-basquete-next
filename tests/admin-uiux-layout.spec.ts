import { test, expect } from "@playwright/test";
import { gamesFixture } from "./fixtures/games";
import { tid } from "./fixtures/text-import";
import { scanAccessibility } from "./fixtures/accessibility";
for (const area of ["jogos", "equipes", "informacoes"])
  test(`reflow e geometria ${area}`, async ({ page }, info) => {
    const f = await gamesFixture(page),
      home = f.registrations.get(tid(5))!,
      away = f.registrations.get(tid(6))!;
    home.name =
      "Clube de Basquete de Albuquerque e Vasconcelos da Regiao Metropolitana";
    f.games.set(tid(501), {
      id: tid(501),
      disputeId: tid(3),
      homeRegistrationId: home.id,
      awayRegistrationId: away.id,
      home,
      away,
      date: "2026-11-01",
      time: "19:30",
      venue: "Centro Municipal de Esportes e Cultura da Regiao Metropolitana",
      number: "00",
      version: 1,
      savedAt: "2026-10-23T19:00:00Z",
      state: "scheduled",
      timeZone: "America/Sao_Paulo",
      scheduledAt: "2026-11-01T22:30:00Z",
    });
    const widths = info.project.name === "desktop" ? [1366, 1920] : [320, 390];
    for (const width of widths) {
      await page.goto("about:blank");
      await page.setViewportSize({ width, height: width > 1000 ? 900 : 844 });
      await page.goto(
        `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}${area === "informacoes" ? "" : "/" + area}`,
      );
      if (area === "jogos")
        await expect(
          page
            .getByRole("table", { name: "Jogos da disputa", exact: true })
            .locator("tbody tr"),
        ).toHaveCount(1);
      else if (area === "equipes")
        await page
          .getByRole("button", { name: "Expandir " + home.name, exact: true })
          .click();
      else
        await expect(
          page.getByRole("textbox", {
            name: "Categoria da disputa 1.1",
            exact: true,
          }),
        ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (area === "jogos" && width >= 1366) {
        const region = await page
            .getByRole("region", { name: "Tabela de jogos", exact: true })
            .boundingBox(),
          table = await page
            .getByRole("table", { name: "Jogos da disputa", exact: true })
            .boundingBox();
        expect(table!.x).toBe(region!.x);
        expect(table!.width).toBeLessThan(region!.width - 30);
      }
      await page.screenshot({
        path: `.preview-artifacts/admin-reform-${area}-${width}.png`,
        fullPage: true,
      });
      await page.addStyleTag({ content: "html {font-size:200% !important}" });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `.preview-artifacts/admin-reform-${area}-${width}-text200.png`,
        fullPage: true,
      });
    }
    await scanAccessibility(page, info, `admin-reform-${area}-text200`);
  });
