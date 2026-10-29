const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const crypto = require("node:crypto");
const output = path.join(__dirname, ".preview-artifacts");
fs.mkdirSync(output, { recursive: true });
async function main() {
  const browser = await chromium.launch();
  const measurements = [];
  try {
    for (const [name, file, selector, minimum] of [
      [
        "sumula",
        "prototipos/sumula/Sumula do jogo publicado.html",
        ".roster-table tbody tr",
        8,
      ],
      [
        "estatisticas",
        "prototipos/estatisticas/react-prototype/preview.html",
        "tr[data-athlete]",
        8,
      ],
    ]) {
      for (const [width, height] of [
        [1440, 900],
        [390, 844],
      ]) {
        const page = await browser.newPage({ viewport: { width, height } });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        const absolute = path.join(__dirname, file);
        await page.goto(pathToFileURL(absolute).href);
        await page.locator(selector).first().waitFor();
        const result = await page.locator(selector).evaluateAll((rows) => ({
          width: innerWidth,
          height: innerHeight,
          firstRowY: rows[0].getBoundingClientRect().y,
          visibleRows: rows.filter((row) => {
            const rect = row.getBoundingClientRect();
            return rect.y >= 0 && rect.bottom <= innerHeight;
          }).length,
          pageWidth: document.documentElement.scrollWidth,
        }));
        assert.ok(
          result.firstRowY <= height / 2,
          JSON.stringify({ name, ...result }),
        );
        assert.ok(
          result.visibleRows >= minimum,
          JSON.stringify({ name, ...result }),
        );
        assert.ok(
          result.pageWidth <= width,
          JSON.stringify({ name, ...result }),
        );
        assert.deepEqual(errors, []);
        measurements.push({
          name,
          ...result,
          htmlSha256: crypto
            .createHash("sha256")
            .update(fs.readFileSync(absolute))
            .digest("hex"),
        });
        await page.screenshot({
          path: path.join(output, name + "-" + width + ".png"),
        });
        await page.close();
      }
    }
    fs.writeFileSync(
      path.join(output, "hierarchy.json"),
      JSON.stringify(measurements, null, 2),
    );
    console.log(JSON.stringify(measurements, null, 2));
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
