import { it, expect } from "vitest";
import {
  finalizeSheetSchema,
  finalizePdfSchema,
  auditFinalizationReason,
  prepareFinalSheet,
} from "./finalization";
import { publicationSheet, pubId } from "../../tests/fixtures/publication";
import { publishSheetSchema } from "./contract";
it("finalizes a correction with an optional comment while keeping legacy reasons and sheet validation", () => {
  const input = {
    requestId: pubId(1),
    gameId: pubId(8),
    gameVersion: 2,
    basePublicationVersion: 1,
    source: {
      kind: "sheet" as const,
      baseSheetVersion: 1,
      document: publicationSheet(),
    },
    reason: "",
    fallback: false,
  };
  expect(publishSheetSchema.safeParse(input).success).toBe(false);
  const c = prepareFinalSheet(input);
  expect(finalizeSheetSchema.parse(c).reason).toBe("");
  expect(c.source.teamReview?.home.disqualifications).toBe(0);
  expect(() =>
    prepareFinalSheet({
      ...input,
      source: {
        ...input.source,
        document: { ...input.source.document, participants: [] },
      },
    }),
  ).toThrow();
  expect(auditFinalizationReason("")).toContain("não informado");
});
it("does not relax PDF source/version consistency or comment bounds", () => {
  expect(finalizePdfSchema.safeParse({}).success).toBe(false);
  expect(
    finalizeSheetSchema.safeParse({ reason: "x".repeat(501) }).success,
  ).toBe(false);
});
