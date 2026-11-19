import { test, expect } from "@playwright/test";
import { gamesFixture } from "./fixtures/games";
import { tid } from "./fixtures/text-import";
import { scanAccessibility } from "./fixtures/accessibility";

test("navegação do campeonato tem estados visíveis e links públicos em outra aba", async ({
  page,
}, info) => {
  await gamesFixture(page);
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  const nav = page.getByRole("navigation", { name: "Áreas do campeonato" });
  const teams = nav.getByRole("button", { name: "Equipes e elencos" });
  const games = nav.getByRole("button", { name: "Jogos", exact: true });
  const regulation = nav.getByRole("button", { name: "Regulamento" });
  const statistics = nav.getByRole("link", { name: "Estatísticas publicadas" });
  const publicTeams = nav.getByRole("link", { name: "Equipes publicadas" });
  const back = page.getByRole("button", { name: "Voltar aos campeonatos" });
  await expect(games).toHaveAttribute("aria-current", "page");
  await expect(games).toHaveCSS("font-weight", "700");
  await expect(games).toHaveCSS("background-color", "rgb(238, 245, 255)");
  for (const control of [teams, regulation, statistics, publicTeams])
    await expect(control).toHaveCSS("border-top-width", "1px");

  if (info.project.name === "desktop") {
    for (const control of [teams, statistics, back]) {
      await control.hover();
      await expect(control).toHaveCSS("background-color", "rgb(238, 245, 255)");
      await page.mouse.down();
      await expect(control).not.toHaveCSS("box-shadow", "none");
      await page.mouse.move(1, 1);
      await page.mouse.up();
    }
  }

  await teams.focus();
  for (const control of [games, regulation, statistics, publicTeams]) {
    await page.keyboard.press("Tab");
    await expect(control).toBeFocused();
    await expect(control).toHaveCSS("outline-style", "solid");
  }
  await page.context().route(/\/(estatisticas|equipes)\.html$/, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Consulta pública</title>",
    }),
  );
  for (const [link, path] of [
    [publicTeams, "equipes"],
    [statistics, "estatisticas"],
  ] as const) {
    await link.focus();
    const opened = page.waitForEvent("popup");
    await page.keyboard.press("Enter");
    const popup = await opened;
    await popup.waitForURL(`**/${path}.html#${tid(3)}?scope=all`);
    await popup.close();
  }
  await expect(games).toHaveAttribute("aria-current", "page");
  await teams.focus();
  await page.keyboard.press("Enter");
  await expect(teams).toHaveAttribute("aria-current", "page");
});

for (const area of ["jogos", "equipes"])
  test(`reflow e geometria ${area}`, async ({ page }, info) => {
    const f = await gamesFixture(page),
      home = f.registrations.get(tid(5))!,
      away = f.registrations.get(tid(6))!;
    const longName =
      "Clube de Basquete de Albuquerque e Vasconcelos da Regiao Metropolitana";
    home.name = longName;
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
      if (area === "jogos") {
        home.name = "Lobos";
        f.games.get(tid(501))!.venue = "Quadra";
      }
      await page.goto("about:blank");
      await page.setViewportSize({ width, height: width > 1000 ? 900 : 844 });
      await page.goto(
        `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/${area}`,
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
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (area === "jogos" && width >= 1366) {
        const size = await page
          .getByRole("region", { name: "Tabela de jogos" })
          .evaluate((region) => ({
            width: region.clientWidth,
            table: region.querySelector("table")!.getBoundingClientRect().width,
          }));
        expect(size.table).toBeCloseTo(size.width, 0);
      }
      if (area === "jogos") {
        home.name = longName;
        f.games.get(tid(501))!.venue =
          "Centro Municipal de Esportes e Cultura da Regiao Metropolitana";
        await page.reload();
        await expect(
          page.getByRole("button", {
            name: `Editar jogo ${longName} × ${away.name}`,
            exact: true,
          }),
        ).toBeVisible();
        const sizes = await page
          .getByRole("region", { name: "Tabela de jogos" })
          .evaluate((region) => {
            const table = region
              .querySelector("table")!
              .getBoundingClientRect();
            return {
              left: table.left - region.getBoundingClientRect().left,
              border: region.clientLeft,
              width: region.clientWidth,
              tableWidth: table.width,
            };
          });
        expect(sizes.left).toBeCloseTo(sizes.border, 0);
        if (width >= 1366)
          expect(sizes.tableWidth).toBeLessThanOrEqual(sizes.width + 1);
        await expect(
          page.getByRole("button", { name: "Jogos", exact: true }),
        ).toHaveCSS("font-size", "16px");
        await expect(
          page.getByRole("button", {
            name: "Voltar aos campeonatos",
            exact: true,
          }),
        ).toHaveCSS("font-size", "16px");
        if (width >= 1366) {
          const [regulation, statistics, dispute, back] = await Promise.all([
            page.getByRole("button", { name: "Regulamento" }).boundingBox(),
            page
              .getByRole("link", { name: "Estatísticas publicadas" })
              .boundingBox(),
            page.getByRole("combobox", { name: "Disputa atual" }).boundingBox(),
            page
              .getByRole("button", { name: "Voltar aos campeonatos" })
              .boundingBox(),
          ]);
          expect(regulation!.y).toBeCloseTo(statistics!.y, 0);
          expect(statistics!.x).toBeGreaterThan(
            regulation!.x + regulation!.width,
          );
          expect(back!.x).toBeGreaterThan(dispute!.x + dispute!.width);
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
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
