import { expect, it } from "vitest";
import { initialState } from "../prototype/model";
import { change, undo, validateSheet } from "../domain/scoresheet";
import { orderedRoster, setStarter, assertStartingFive } from "./lineup";
import { preparePublication } from "./publication";

it("ordena camisas numericamente e distingue 0 de 00 sem alterar o documento", () => {
  const roster = initialState()
    .sheet.present.roster.slice(0, 3)
    .map((slot, index) => ({ ...slot, jersey: ["12", "00", "0"][index] }));
  expect(orderedRoster(roster).map((slot) => slot.jersey)).toEqual([
    "0",
    "00",
    "12",
  ]);
  expect(roster.map((slot) => slot.jersey)).toEqual(["12", "00", "0"]);
});
it("titular marca participação, limita cinco por equipe e conserva participação ao desmarcar", () => {
  let sheet = initialState().sheet.present;
  const ids = sheet.roster
    .filter((slot) => slot.side === "home")
    .map((slot) => slot.rosterEntryId);
  expect(ids.length).toBeGreaterThan(5);
  for (const id of ids.slice(0, 5)) sheet = setStarter(sheet, id, true);
  expect(() => setStarter(sheet, ids[5], true)).toThrow("5 titulares");
  const first = sheet.roster.find((slot) => slot.rosterEntryId === ids[0])!;
  expect(first.played).toBe(true);
  const next = setStarter(sheet, ids[0], false);
  expect(
    next.roster.find((slot) => slot.rosterEntryId === ids[0]),
  ).toMatchObject({ starter: false, played: true });
  expect(
    undo(change({ present: sheet, past: [], future: [] }, next)).present,
  ).toEqual(sheet);
  expect(() =>
    validateSheet({
      ...sheet,
      roster: sheet.roster.map((slot) =>
        slot.rosterEntryId === ids[0] ? { ...slot, played: false } : slot,
      ),
    }),
  ).toThrow("Titular");
});
it("publicação exige cinco titulares de cada equipe; rascunho legado incompleto permanece editável", () => {
  const data = initialState();
  data.sheet.present.roster[0].played = true;
  data.sheet.present.events = [
    {
      id: crypto.randomUUID(),
      side: "home",
      target: "7",
      period: 1,
      code: "2",
    },
  ];
  expect(() => validateSheet(data.sheet.present)).not.toThrow();
  expect(() => preparePublication(data, "")).toThrow("5 titulares");
  for (const side of ["home", "away"] as const) {
    for (const slot of data.sheet.present.roster
      .filter((slot) => slot.side === side)
      .slice(0, 5))
      data.sheet.present = setStarter(
        data.sheet.present,
        slot.rosterEntryId,
        true,
      );
  }
  expect(() => assertStartingFive(data.sheet.present)).not.toThrow();
  expect(
    preparePublication(data, "").publications[0].document?.roster.filter(
      (slot) => slot.starter,
    ),
  ).toHaveLength(10);
});
