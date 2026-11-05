import { expect, test } from "@playwright/test";
import { statisticsBrowserFixture } from "./fixtures/statistics-browser";

test.use({ video: { mode: "on", size: { width: 390, height: 844 } } });

test("arrastes diagonais e prolongados param nas quatro bordas", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url);
  await expect(page.locator(".statistics-table tbody tr")).toHaveCount(30);
  const region = page.getByRole("region", {
    name: "Tabela estatística rolável",
  });
  await region.scrollIntoViewIfNeeded();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  const limits = await region.evaluate((el) => ({
    x: el.scrollWidth - el.clientWidth,
    y: el.scrollHeight - el.clientHeight,
  }));
  for (const [x, y, xDistance, yDistance] of [
    [0, 0, 320, 320],
    [limits.x, 0, -320, 320],
    [limits.x, limits.y, -320, -320],
    [0, limits.y, 320, -320],
  ]) {
    await region.evaluate((el, p) => el.scrollTo(p.x, p.y), { x, y });
    const box = (await region.boundingBox())!;
    await cdp.send("Input.synthesizeScrollGesture", {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      xDistance,
      yDistance,
      speed: 240,
      gestureSourceType: "touch",
    });
    await expect
      .poll(() =>
        region.evaluate((el) => ({ x: el.scrollLeft, y: el.scrollTop })),
      )
      .toEqual({ x, y });
  }
  await cdp.detach();
  await page.screenshot({
    path: `.preview-artifacts/bordas-touch-after-${info.project.name}.png`,
  });
});
