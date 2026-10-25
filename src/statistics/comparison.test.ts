import { expect, it } from "vitest";
import { aggregateComparedStatistics } from "./aggregate";
import { normalizeConfirmedGame } from "./confirmed-facts";
import { confirmedManualFixture } from "../../tests/fixtures/statistics-publications";
import { pubId } from "../../tests/fixtures/publication";
it("comparação resume todas inscrições por identidade sem média de médias nem primeiro vínculo", () => {
  const a = normalizeConfirmedGame(confirmedManualFixture())[0],
    b = structuredClone(a),
    homonym = structuredClone(a);
  b.gameId = pubId(901);
  b.registration.registrationId = pubId(55);
  b.person.name = "Outro nome da ocasião";
  b.scoring = {
    origin: a.scoring!.origin,
    points: 3,
    twoMade: 0,
    threeMade: 1,
    freeMade: 0,
  };
  homonym.person.id = pubId(77);
  homonym.gameId = pubId(902);
  const [summary] = aggregateComparedStatistics(
    [a, b, homonym],
    [a.person.id],
    { mode: "per-game", minimumSeconds: 600 },
  );
  expect(summary.personId).toBe(a.person.id);
  expect(summary.gamesPlayed).toBe(2);
  expect(summary.registrationIds).toEqual([pubId(5), pubId(55)]);
  expect(summary.names).toEqual(["Atleta", "Outro nome da ocasião"]);
  expect(summary.metrics.points).toEqual({ status: "available", value: 2.5 });
  expect(summary.metrics.minutes.value).toBeNull();
});
it("comparação não aceita revisão repetida, mistura de contextos ou mais de duas identidades", () => {
  const a = normalizeConfirmedGame(confirmedManualFixture())[0];
  expect(() => aggregateComparedStatistics([a, a], [a.person.id])).toThrow();
  expect(() =>
    aggregateComparedStatistics([a], [pubId(1), pubId(2), pubId(3)]),
  ).toThrow();
  expect(aggregateComparedStatistics([a], [pubId(99)])).toEqual([]);
});
