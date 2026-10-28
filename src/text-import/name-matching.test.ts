import { expect, it } from "vitest";
import { importNameSimilarity } from "./name-matching";

import { nameCases } from "../../tests/fixtures/name-matching";
it.each(nameCases)("plausible complete name: %s / %s", (a, b, matches) => {
  expect(importNameSimilarity(a, b) >= 0.78).toBe(matches);
  expect(importNameSimilarity(a, b)).toBe(importNameSimilarity(b, a));
});
