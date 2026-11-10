import { publicKnockoutFixture } from "./public-regulation";
import { regulationId as id } from "./regulation";

/** Dedicated browser/preview fixture. No database, credentials or publication writes. */
export function publicGamesFixture() {
  const source = publicKnockoutFixture();
  Object.assign(source.context, {
    name: "Copa Metropolitana",
    gender: "masculino",
    division: "Série Ouro",
  });
  source.registrations[0].name =
    "Associação Atlética Universitária de São Francisco";
  source.registrations[1].name =
    "Clube de Regatas e Basquete Nossa Senhora da Conceição";
  source.registrations[2].name = "Estrela do Norte";
  source.registrations[3].name = "Meninos do Amanhã";
  source.definition.knockoutPhases[0].name = "Quartas de final";
  source.definition.series[0].format = "best_of_3";
  source.definition.series[0].games[0].slot = 2;
  source.definition.occurrenceRules.wo = {
    winnerLeaguePoints: 2,
    loserLeaguePoints: 0,
    score: { winner: 20, loser: 0 },
  };
  for (const [n, number, winner] of [
    [103, "134", 4],
    [104, "135", 3],
  ] as const) {
    const game = source.games.find((g) => g.id === id(n))!;
    game.number = number;
    game.date = n === 103 ? "2026-11-01" : "2026-11-02";
    game.time = "20:00";
    game.venue = "Quadra das Águas";
    source.occurrences.push({
      id: id(8000 + n),
      version: 1,
      gameId: game.id,
      gameVersion: game.version,
      publicationVersion: 1,
      effect: { kind: "wo", winnerRegistrationId: id(winner) },
    });
  }
  source.publishedGames[0].homePoints = 20;
  source.publishedGames[0].awayPoints = 0;
  const seed = source.games[0];
  const extras = Array.from({ length: 35 }, (_, i) => ({
    ...seed,
    id: id(870000 + i),
    number: i === 34 ? null : String(200 + i),
    date:
      i === 33
        ? "2027-01-01"
        : i === 34
          ? null
          : `2026-10-${String((i % 28) + 1).padStart(2, "0")}`,
    time: i % 4 === 0 || i === 34 ? null : "19:00",
    venue:
      i === 31
        ? "Centro Poliesportivo Professor José Antônio de Albuquerque"
        : i % 4 === 0
          ? null
          : "Quadra Azul",
  }));
  source.games.push(...extras);
  source.definition.groupPhases[0].groups[0].gameIds.push(
    ...extras.map((g) => g.id),
  );
  return source;
}
