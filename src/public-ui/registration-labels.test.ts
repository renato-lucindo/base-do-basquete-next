import { expect, it } from "vitest";
import { publishedRegistrationLabels } from "./registration-labels";
import { confirmedManualFixture } from "../../tests/fixtures/statistics-publications";
import { pubId } from "../../tests/fixtures/publication";

it("desempata por publicação/jogo sem juntar inscrições homônimas nem dividir barras", () => {
  const older = confirmedManualFixture(false);
  older.id = pubId(9000);
  older.game.home.name = "Nome anterior";
  const newer = structuredClone(older);
  newer.id = pubId(9001);
  newer.game.home.name = "IVV/Cetaf";
  newer.game.away.name = "IVV/Cetaf";
  const games = [older, newer].map((snapshot) => ({ snapshot, phase: null }));
  const frozen = JSON.stringify(games);
  const labels = publishedRegistrationLabels(games);
  expect(labels.size).toBe(2);
  expect(labels.get(newer.game.home.registrationId)?.name).toBe("IVV/Cetaf");
  expect(labels.get(newer.game.away.registrationId)?.name).toBe("IVV/Cetaf");
  expect(publishedRegistrationLabels([...games].reverse())).toEqual(labels);
  expect(JSON.stringify(games)).toBe(frozen);
});
