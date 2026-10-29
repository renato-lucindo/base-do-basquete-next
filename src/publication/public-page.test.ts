import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicGameView } from "./public-page";
import {
  confirmedManualFixture,
  confirmedPdfFixture,
} from "../../tests/fixtures/statistics-publications";

it("does not pair manual free-throw makes with PDF attempts", async () => {
  const pdf = await confirmedPdfFixture();
  const normal = renderToStaticMarkup(
    createElement(PublicGameView, { result: pdf }),
  );
  expect(normal).toContain("LL da equipe:");

  const manualScore = structuredClone(pdf);
  manualScore.facts.origins.scorePoints = { kind: "sheet", version: 1 };
  const mixed = renderToStaticMarkup(
    createElement(PublicGameView, { result: manualScore }),
  );
  expect(mixed.match(/tentativas não informadas/g)).toHaveLength(2);
  expect(mixed).not.toContain("Infinity%");
  expect(mixed).not.toContain("NaN%");

  const sheet = renderToStaticMarkup(
    createElement(PublicGameView, { result: confirmedManualFixture() }),
  );
  expect(sheet).toContain("LL da equipe:");
  expect(sheet).not.toContain("tentativas não informadas");
});
