import { expect, it } from "vitest";
import { publicationSheet, pubId } from "../../tests/fixtures/publication";
import { prepareManualPublication } from "./manual";
import { publishSheetSchema } from "./contract";
const command = () => ({
  requestId: pubId(900),
  gameId: pubId(901),
  gameVersion: 1,
  basePublicationVersion: 0,
  source: {
    kind: "sheet" as const,
    baseSheetVersion: 0,
    document: publicationSheet(),
  },
  reason: "",
  fallback: false,
});
it("produces manual facts from the supplied engine without invented advanced metrics", () => {
  const c = command(),
    facts = prepareManualPublication(c).facts;
  expect(facts.teams.home.points).toBe(2);
  expect(facts.teams.home.periods).toEqual([0, 0, 0, 2]);
  expect(facts.players[0]).toMatchObject({
    rosterEntryId: pubId(1),
    points: 2,
    two: 1,
  });
  expect(facts).not.toHaveProperty("secondsPlayed");
  expect(facts.players[0]).not.toHaveProperty("fieldGoalAttempted");
});
it("enforces closure, starting five and explicit captains", () => {
  const c = command();
  c.source.document.events[0].code = "1";
  expect(() => prepareManualPublication(c)).toThrow();
  c.source.document = publicationSheet();
  c.source.document.participants[0].starter = false;
  expect(() => prepareManualPublication(c)).toThrow(/5 titulares/);
  c.source.document = publicationSheet();
  c.source.document.staff.home.captainRosterEntryId = null;
  expect(() => prepareManualPublication(c)).toThrow(/capitão/);
});
it("requires a real revision or fallback reason and rejects extra authorization fields", () => {
  expect(
    publishSheetSchema.safeParse({ ...command(), actorId: pubId(1) }).success,
  ).toBe(false);
  expect(() =>
    prepareManualPublication({ ...command(), basePublicationVersion: 1 }),
  ).toThrow();
  expect(() => prepareManualPublication(command(), undefined, true)).toThrow();
  expect(() =>
    prepareManualPublication(
      {
        ...command(),
        fallback: true,
        reason: "Fonte manual escolhida após divergência.",
      },
      undefined,
      true,
    ),
  ).not.toThrow();
});
it("keeps confirmed membership and occasion jerseys immutable while allowing participation correction", () => {
  const previous = publicationSheet();
  previous.participants.push({
    rosterEntryId: pubId(7),
    side: "home",
    jersey: "9",
    played: false,
    starter: false,
  });
  const c = {
    ...command(),
    reason: "Correção da participação sem alterar relacionados.",
    basePublicationVersion: 1,
  };
  c.source.document = structuredClone(previous);
  c.source.document.participants[10].played = true;
  expect(() => prepareManualPublication(c, previous)).not.toThrow();
  c.source.document.participants[10].jersey = "8";
  expect(() => prepareManualPublication(c, previous)).toThrow(/camisas/);
});
