import type { Page } from "@playwright/test";
export async function selectStarters(page: Page) {
  for (const side of ["A", "B"]) {
    const boxes = await page
      .getByRole("region", { name: `Relacionados ${side}`, exact: true })
      .getByRole("checkbox", { name: / titular$/ })
      .all();
    for (const box of boxes.slice(0, 5)) await box.check();
  }
}
