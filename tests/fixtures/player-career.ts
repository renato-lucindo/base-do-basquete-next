import { confirmedManualFixture } from "./statistics-publications";
import { normalizeConfirmedGame } from "../../src/statistics/confirmed-facts";
import { playerCareerSourceSchema } from "../../src/player-profile/career-source";
import { pubId } from "./publication";
export function playerCareerFixture() {
  const game = confirmedManualFixture(),
    fact = normalizeConfirmedGame(game)[0];
  const first = {
    kind: "confirmed-player-game-v1",
    statisticsVersion: 1,
    minimumSeconds: 600,
    game: game.game,
    fact,
  };
  const second = structuredClone(first);
  second.fact.gameId = pubId(9001);
  second.fact.disputeId = pubId(9002);
  second.fact.context.championshipId = pubId(9003);
  second.fact.context.seasonId = pubId(9004);
  second.fact.context.year = 2027;
  second.fact.publishedAt = "2027-02-01T12:00:00Z";
  second.fact.person.name = "Nome público recente";
  second.fact.registration.registrationId = pubId(9005);
  second.fact.registration.name = "Outra inscrição";
  second.game.home = structuredClone(second.fact.registration);
  second.fact.jersey = "77";
  second.fact.scoring = {
    origin: fact.scoring!.origin,
    points: 8,
    twoMade: 4,
    threeMade: 0,
    freeMade: 0,
  };
  return playerCareerSourceSchema.parse({
    kind: "confirmed-player-career-v1",
    personId: fact.person.id,
    profile: null,
    participations: [first, second],
    honors: [],
    teamPlacements: [],
  });
}
