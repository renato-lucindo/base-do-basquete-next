import { publicationSheet, pubId } from "./publication";
import { deriveManualFacts } from "../../src/publication/manual";
import { publicGameSchema } from "../../src/publication/contract";
import { publicPdfGameSchema } from "../../src/publication/pdf-contract";
import { pdfPublicationFixture } from "./pdf-publication";
import { preparePdfFacts } from "../../src/publication/pdf-authority";
export function publishedGameShell() {
  const person = (id: string) => ({ id, name: "Atleta", nickname: null });
  const team = (n: number) => ({
    registrationId: pubId(n),
    name: n === 5 ? "Lobos" : "Lobos B",
    team: { id: pubId(9), name: "Equipe global", abbreviation: null },
  });
  return {
    person,
    base: {
      id: pubId(800),
      disputeId: pubId(801),
      version: 1,
      publishedAt: "2026-10-25T13:00:00Z",
      gameVersion: 2,
      context: {
        championshipId: pubId(802),
        seasonId: pubId(803),
        name: "Final no nome não define fase",
        year: 2026,
        gender: "masculino" as const,
        category: "Adulto",
        division: null,
      },
      game: {
        date: null,
        time: null,
        timeZone: "America/Sao_Paulo" as const,
        venue: null,
        number: null,
        home: team(5),
        away: team(6),
      },
    },
  };
}
export function confirmedManualFixture(withBench = false) {
  const doc = publicationSheet();
  if (withBench)
    doc.participants.push({
      rosterEntryId: pubId(7),
      side: "home",
      jersey: "9",
      played: false,
      starter: false,
    });
  const f = deriveManualFacts(doc),
    { base, person } = publishedGameShell();
  const players = f.players.map(({ rosterEntryId, ...r }) => ({
    ...r,
    person: person(rosterEntryId),
    registrationId: r.side === "home" ? pubId(5) : pubId(6),
  }));
  const staff = Object.fromEntries(
    (["home", "away"] as const).map((side) => {
      const cap = players.find((p) => p.side === side && p.captain)!.person;
      return [
        side,
        { captain: cap, coach: cap, assistant: null, captainIsCoach: true },
      ];
    }),
  );
  return publicGameSchema.parse({
    ...base,
    source: { kind: "sheet", version: 1, rulesVersion: "FIBA_2024" },
    staff,
    facts: { ...f, players },
  });
}
export async function confirmedPdfFixture(filename = "Boxscore-site.pdf") {
  const { review, supplement, authority } =
      await pdfPublicationFixture(filename),
    f = preparePdfFacts(review, supplement, authority),
    { base, person } = publishedGameShell();
  const players = f.players.map((p) => {
    const { sourceSide, sourceIndex, sourceMarkers, rosterEntryId, ...r } = p;
    void sourceSide;
    void sourceIndex;
    void sourceMarkers;
    return {
      ...r,
      person: person(rosterEntryId),
      registrationId: r.side === "home" ? pubId(5) : pubId(6),
    };
  });
  const staff = Object.fromEntries(
    (["home", "away"] as const).map((side) => {
      const cap = players.find((p) => p.side === side && p.captain)!.person;
      return [
        side,
        { captain: cap, coach: cap, assistant: null, captainIsCoach: true },
      ];
    }),
  );
  return publicPdfGameSchema.parse({
    ...base,
    source: {
      kind: "pdf",
      version: review.source.version,
      format: review.source.parsed.format,
      parserVersion: review.source.parsed.parserVersion,
    },
    staff,
    facts: {
      teams: f.teams,
      players,
      gameAdvanced: f.gameAdvanced,
      origins: Object.fromEntries(
        Object.entries(f.origins).map(([key, value]) => [
          key,
          value === null
            ? null
            : {
                kind: value.kind,
                version:
                  value.kind === "pdf" ? value.sourceVersion : value.version,
              },
        ]),
      ),
    },
  });
}
