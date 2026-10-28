import { it, expect } from "vitest";
import { publishPdfSchema, publicPdfGameSchema } from "./pdf-contract";
import { pdfPublicationFixture } from "../../tests/fixtures/pdf-publication";
import { pubId } from "../../tests/fixtures/publication";
import { preparePdfFacts } from "./pdf-authority";
it("accepts only PDF source/version references and explicit decisions, never browser-calculated facts", async () => {
  const { supplement, authority } = await pdfPublicationFixture();
  const command = {
    requestId: pubId(1),
    gameId: pubId(3),
    gameVersion: 1,
    basePublicationVersion: 0,
    source: {
      kind: "pdf",
      sourceId: pubId(8),
      sourceVersion: 2,
      reviewVersion: 1,
    },
    supplement,
    authority,
    sheetVersion: null,
    reason: "",
    acceptDivergence: false,
  };
  expect(publishPdfSchema.safeParse(command).success).toBe(true);
  for (const extra of [{ facts: {} }, { actorId: pubId(9) }, { parsed: {} }])
    expect(publishPdfSchema.safeParse({ ...command, ...extra }).success).toBe(
      false,
    );
  expect(
    publishPdfSchema.safeParse({ ...command, basePublicationVersion: 1 })
      .success,
  ).toBe(false);
  expect(
    publishPdfSchema.safeParse({
      ...command,
      authority: { ...authority, scorePoints: "sheet" },
    }).success,
  ).toBe(false);
  expect(
    publishPdfSchema.safeParse({
      ...command,
      authority: { ...authority, scorePoints: "sheet" },
      sheetVersion: 3,
      reason: "Conferência manual explícita",
      acceptDivergence: true,
    }).success,
  ).toBe(true);
  expect(
    publishPdfSchema.safeParse({ ...command, sheetVersion: 0 }).success,
  ).toBe(false);
  expect(
    publishPdfSchema.safeParse({
      ...command,
      source: { ...command.source, reviewVersion: 0 },
    }).success,
  ).toBe(false);
});
it("exposes a minimal PDF projection with real coverage and rejects private origin IDs or missing facts masquerading as zeros", async () => {
  const { review, supplement, authority } = await pdfPublicationFixture();
  const f = preparePdfFacts(review, supplement, authority),
    person = (id: string) => ({ id, name: "Atleta", nickname: null });
  const team = (n: number) => ({
    registrationId: pubId(n),
    name: "Equipe",
    team: { id: pubId(9), name: "Global", abbreviation: null },
  });
  const players = f.players.map((r, i) => {
    const { sourceSide, sourceIndex, sourceMarkers, rosterEntryId, ...facts } =
      r;
    void sourceSide;
    void sourceIndex;
    void sourceMarkers;
    return {
      ...facts,
      person: person(rosterEntryId),
      registrationId: pubId(
        i < review.source.parsed.teams[0].players.length ? 5 : 6,
      ),
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
  const origins = Object.fromEntries(
    Object.entries(authority).map(([k, v]) => [
      k,
      v === "none" ? null : { kind: "pdf", version: 1 },
    ]),
  );
  const snapshot = {
    id: pubId(3),
    disputeId: pubId(2),
    version: 1,
    publishedAt: "2026-10-24T09:00:00Z",
    gameVersion: 2,
    context: {
      championshipId: pubId(10),
      name: "Campeonato",
      seasonId: pubId(11),
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
      home: team(5),
      away: team(6),
    },
    source: {
      kind: "pdf",
      version: 1,
      format: "BASKETBALL_SITE",
      parserVersion: "basketball-site-v1",
    },
    staff,
    facts: { teams: f.teams, players, gameAdvanced: f.gameAdvanced, origins },
  };
  expect(publicPdfGameSchema.safeParse(snapshot).success).toBe(true);
  const privateOrigin = structuredClone(snapshot);
  privateOrigin.facts.origins.playerAdvanced = {
    kind: "pdf",
    version: 1,
    sourceId: pubId(8),
  } as typeof origins.playerAdvanced;
  expect(publicPdfGameSchema.safeParse(privateOrigin).success).toBe(false);
  const fake = structuredClone(snapshot);
  fake.facts.teams.home.periods = [0, 0, 0, fake.facts.teams.home.points];
  expect(publicPdfGameSchema.safeParse(fake).success).toBe(false);
  const leak = structuredClone(snapshot);
  Object.assign(leak.facts.players[0].person, { birthDate: "1990-01-01" });
  expect(publicPdfGameSchema.safeParse(leak).success).toBe(false);
});
