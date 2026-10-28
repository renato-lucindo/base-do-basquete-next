import { publicGameSchema } from "../../src/publication/contract";
import { publicPdfGameSchema } from "../../src/publication/pdf-contract";
import { deriveManualFacts } from "../../src/publication/manual";
import { publicationSheet, pubId } from "./publication";
import type { PersistedSheet } from "../../src/games/sheet-contract";
import { pdfPublicationFixture } from "./pdf-publication";
import { preparePdfFacts } from "../../src/publication/pdf-authority";
export function publishedSheet(
  document: PersistedSheet = publicationSheet(),
  id = pubId(8),
  homeId = pubId(5),
  awayId = pubId(6),
  version = 1,
  sourceVersion = 1,
  gameVersion = 2,
) {
  const f = deriveManualFacts(document),
    people = document.participants.map((p, i) => ({
      id: pubId(2000 + i),
      name: `Atleta ${p.side} ${i}`,
      nickname: null,
    }));
  const players = f.players.map((p, i) => {
    const { rosterEntryId, ...facts } = p;
    void rosterEntryId;
    return {
      ...facts,
      person: people[i],
      registrationId: p.side === "home" ? homeId : awayId,
    };
  });
  const staff = Object.fromEntries(
    (["home", "away"] as const).map((side) => {
      const captain = players.find((p) => p.side === side && p.captain)!.person;
      return [
        side,
        { captain, coach: captain, assistant: null, captainIsCoach: true },
      ];
    }),
  );
  const team = (registrationId: string, name: string) => ({
    registrationId,
    name,
    team: { id: pubId(9), name: "Global", abbreviation: null },
  });
  return publicGameSchema.parse({
    id,
    disputeId: pubId(3),
    version,
    publishedAt: "2026-10-24T09:00:00Z",
    gameVersion,
    context: {
      championshipId: pubId(1),
      name: "Campeonato teste",
      seasonId: pubId(2),
      year: 2026,
      gender: "masculino",
      category: "Adulto",
      division: null,
    },
    game: {
      date: null,
      time: null,
      timeZone: "America/Sao_Paulo",
      venue: null,
      number: null,
      home: team(homeId, "Lobos"),
      away: team(awayId, "Águias"),
    },
    source: {
      kind: "sheet",
      version: sourceVersion,
      rulesVersion: "FIBA_2024",
    },
    staff,
    facts: { ...f, players },
  });
}
export async function publishedSite() {
  const { review, supplement, authority } = await pdfPublicationFixture(),
    f = preparePdfFacts(review, supplement, authority),
    base = publishedSheet();
  const players = f.players.map((p, i) => {
    const { sourceSide, sourceIndex, sourceMarkers, rosterEntryId, ...facts } =
      p;
    void sourceSide;
    void sourceIndex;
    void sourceMarkers;
    void rosterEntryId;
    return {
      ...facts,
      person: { id: pubId(2000 + i), name: `Atleta ${i}`, nickname: null },
      registrationId: p.side === "home" ? pubId(5) : pubId(6),
    };
  });
  const staff = Object.fromEntries(
    (["home", "away"] as const).map((side) => {
      const captain = players.find((p) => p.side === side && p.captain)!.person;
      return [
        side,
        { captain, coach: captain, assistant: null, captainIsCoach: true },
      ];
    }),
  );
  return publicPdfGameSchema.parse({
    ...base,
    source: {
      kind: "pdf",
      version: 1,
      format: "BASKETBALL_SITE",
      parserVersion: "basketball-site-v1",
    },
    staff,
    facts: {
      teams: f.teams,
      players,
      gameAdvanced: f.gameAdvanced,
      origins: Object.fromEntries(
        Object.entries(authority).map(([key, value]) => [
          key,
          value === "none" ? null : { kind: "pdf", version: 1 },
        ]),
      ),
    },
  });
}
