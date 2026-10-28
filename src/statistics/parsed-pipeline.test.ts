import { expect, it } from "vitest";
import { publicResultSchema } from "../publication/pdf-contract";
import * as normalizer from "./confirmed-facts";
import * as aggregation from "./aggregate";
import {
  confirmedManualFixture,
  confirmedPdfFixture,
} from "../../tests/fixtures/statistics-publications";
import { pdfPublicationFixtures } from "../../tests/fixtures/pdf-publication";
it("caminho interno após parse conserva exatamente a matriz manual/PDF e suas coberturas", async () => {
  const inputs = [
    confirmedManualFixture(),
    confirmedManualFixture(true),
    ...(await Promise.all(
      pdfPublicationFixtures.map((file) => confirmedPdfFixture(file)),
    )),
  ];
  for (const input of inputs) {
    const before = structuredClone(input),
      parsed = publicResultSchema.parse(input);
    const rows = normalizer.normalizeParsedConfirmedGame(parsed);
    expect(rows).toEqual(normalizer.normalizeConfirmedGame(input));
    expect(aggregation.validateParsedConfirmedFacts(rows)).toEqual(
      aggregation.validateConfirmedFacts(rows),
    );
    expect(input).toEqual(before);
  }
});
it("guardas cruzadas continuam recusando origem, dupla participação e inscrição trocada", () => {
  const rows = normalizer.normalizeConfirmedGame(confirmedManualFixture());
  for (const mutate of [
    (r: typeof rows) => {
      r[0].scoring!.origin.version++;
    },
    (r: typeof rows) => {
      r.push(structuredClone(r[0]));
    },
    (r: typeof rows) => {
      r[1].registration.team.id = "10000000-0000-4000-8000-000000000099";
    },
  ]) {
    const corrupt = structuredClone(rows);
    mutate(corrupt);
    expect(() => aggregation.validateConfirmedFacts(corrupt)).toThrow();
    expect(() => aggregation.validateParsedConfirmedFacts(corrupt)).toThrow();
  }
});
