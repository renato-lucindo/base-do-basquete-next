import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { extractSupportedPdf, validatePdfBytes } from "./extract";
const root =
  "especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/docs/plan/referencias/modelos-boxscore/";
describe("new PDF adapter against supplied artifacts", () => {
  for (const [name, score, pages] of [
    ["Box Score FIBA ALC vs AVA 09 maio.pdf", [58, 67], 1],
    ["Box Score FIBA IVV vs CAC 06 maio.pdf", [93, 39], 1],
    ["Box Score FIBA SAL vs SAN 09 maio.pdf", [59, 40], 1],
    ["Boxscore-site.pdf", [98, 57], 2],
  ] as const)
    it(`extracts and reconciles ${name}`, async () => {
      const bytes = new Uint8Array(await readFile(root + name)),
        before = Uint8Array.from(bytes);
      const result = await extractSupportedPdf(bytes, name, "application/pdf");
      expect(result.parsed.teams.map((t) => t.score)).toEqual(score);
      expect(result.pageCount).toBe(pages);
      expect(result.sha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(bytes).toEqual(before);
      expect(result.textItemCount).toBeGreaterThan(100);
      if (result.parsed.format === "BASKETBALL_SITE") {
        expect(result.parsed.teams.every((t) => t.periodScores === null)).toBe(
          true,
        );
        expect(result.parsed.teams[1].players).toHaveLength(12);
      } else
        expect(
          result.parsed.teams.every(
            (t) =>
              t.periodScores?.length === 4 && t.teamStatistics !== undefined,
          ),
        ).toBe(true);
    }, 15000);
  it("rejects excessive size, type, unsafe names and invalid signature before extraction", () => {
    const bytes = new TextEncoder().encode("%PDF-fixture");
    expect(() =>
      validatePdfBytes(bytes, "valid.pdf", "application/pdf"),
    ).not.toThrow();
    for (const [b, n, m] of [
      [bytes, "valid.txt", "application/pdf"],
      [bytes, "valid.pdf", "text/plain"],
      [bytes, "../private.pdf", "application/pdf"],
      [new Uint8Array(5), "valid.pdf", "application/pdf"],
      [new Uint8Array(10 * 1024 * 1024 + 1), "valid.pdf", "application/pdf"],
    ] as const)
      expect(() => validatePdfBytes(b, n, m)).toThrow();
  });
});
