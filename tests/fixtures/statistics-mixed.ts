import {
  confirmedManualFixture,
  confirmedPdfFixture,
} from "./statistics-publications";
import { pubId } from "./publication";
export async function mixedStatisticsFixture() {
  const manual = confirmedManualFixture(true),
    pdf = await confirmedPdfFixture();
  manual.game.away.team.id = pubId(10);
  pdf.game.away.team.id = pubId(10);
  manual.id = pubId(910);
  pdf.id = pubId(911);
  manual.facts.players.find((p) => p.person.id === pubId(7))!.person.name =
    "Reserva Só Manual";
  const person = manual.facts.players[0].person;
  person.name = "Atleta de comparação";
  pdf.facts.players[0].person = person;
  pdf.staff.home.captain = person;
  pdf.staff.home.coach = person;
  return {
    kind: "confirmed-statistics-v1" as const,
    disputeId: manual.disputeId,
    version: 1,
    confirmedAt: manual.publishedAt,
    minimumSeconds: 600,
    games: [
      { snapshot: manual, phase: null },
      { snapshot: pdf, phase: null },
    ],
  };
}
