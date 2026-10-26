import { expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
export async function scanAccessibility(
  page: Page,
  info: TestInfo,
  state: string,
) {
  const stem = `.preview-artifacts/a11y-${state}-${info.project.name}`;
  await page.screenshot({ path: `${stem}.png`, fullPage: true });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const report = {
    state,
    project: info.project.name,
    url: page.url(),
    violations: result.violations,
    incomplete: result.incomplete,
    passes: result.passes.map((p) => p.id),
    testEngine: result.testEngine,
  };
  await writeFile(`${stem}.json`, JSON.stringify(report, null, 2));
  await info.attach(`${state}-axe`, {
    body: JSON.stringify(report),
    contentType: "application/json",
  });
  expect
    .soft(
      result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      state,
    )
    .toEqual([]);
}
