import { it, expect } from "vitest";
import { suggestPdfPlayer } from "./matching";
import type { RosterSnapshot } from "../people/roster-contract";
const id = (n: number) =>
  `f8300000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const context = {
  disputeId: id(1),
  registrationId: id(2),
  registrationName: "Lobos",
  complete: true,
};
const candidate = (
  n: number,
  name: string,
  jersey: string | null,
): Pick<
  RosterSnapshot,
  | "id"
  | "personId"
  | "registrationId"
  | "disputeId"
  | "active"
  | "jersey"
  | "person"
> => ({
  id: id(n),
  personId: id(n + 100),
  registrationId: id(2),
  disputeId: id(1),
  active: true,
  jersey,
  person: { id: id(n + 100), name, nickname: null, publicBirthYear: null },
});
it("adapts supplied abbreviation matching back to complete UUID identities without assigning them", () => {
  const roster = [
    candidate(3, "João da Silva", "00"),
    candidate(4, "Carlos Silva", "0"),
  ];
  const r = suggestPdfPlayer("J. Silva", "00", "Lobos", roster, context);
  expect(r.kind).toBe("exact");
  expect(r.alternatives[0]).toMatchObject({
    rosterEntryId: id(3),
    personId: id(103),
    name: "João da Silva",
    jersey: "00",
  });
  expect(r).not.toHaveProperty("selectedId");
  expect(r).not.toHaveProperty("playerId");
});
it("leaves homonyms explicit and does not equate jerseys 0 and 00", () => {
  const roster = [
    candidate(3, "João Silva", "00"),
    candidate(4, "João Silva", "00"),
  ];
  const r = suggestPdfPlayer("João Silva", "00", "Lobos", roster, context);
  expect(r.kind).toBe("similar");
  expect(r.alternatives).toHaveLength(2);
  expect(
    suggestPdfPlayer(
      "J. Silva",
      "0",
      "Lobos",
      [candidate(3, "João Silva", "00")],
      context,
    ).kind,
  ).not.toBe("exact");
});
it("excludes other teams, disputes and inactive entries and downgrades incomplete pagination", () => {
  const own = candidate(3, "João Silva", "12");
  const roster = [
    own,
    { ...candidate(4, "João Silva", "12"), registrationId: id(9) },
    { ...candidate(5, "João Silva", "12"), disputeId: id(9) },
    { ...candidate(6, "João Silva", "12"), active: false },
  ];
  expect(
    suggestPdfPlayer(
      "João Silva",
      "12",
      "Lobos",
      roster,
      context,
    ).alternatives.map((r) => r.rosterEntryId),
  ).toEqual([id(3)]);
  expect(
    suggestPdfPlayer("João Silva", "12", "Lobos", roster, {
      ...context,
      complete: false,
    }).kind,
  ).toBe("similar");
  expect(
    suggestPdfPlayer("J. Silva", "12", "Outra equipe", [own], context).kind,
  ).not.toBe("exact");
});
