import { expect, it } from "vitest";
import { applyTieDecisions, tieDecisionContext } from "./tie-decisions";
import { calculateOutcomeStandings } from "./outcome-standings";
import { createFibaRules } from "./defaults";
const id = (n: number) =>
  `f2700000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [A, B] = [id(1), id(2)];
const rules = createFibaRules();
const table = () =>
  calculateOutcomeStandings({
    disputeId: id(90),
    registrationIds: [A, B],
    rules,
    outcomes: [],
  });
const basis = () => tieDecisionContext(rules, [A, B], [], []);
const decision = () => ({
  id: id(3),
  phaseId: id(4),
  groupId: id(5),
  order: [B, A],
  basis: basis(),
});
it("keeps an unresolved tie publishable and applies an explicit order without altering metrics", () => {
  expect(
    applyTieDecisions(table(), [], basis()).standings.unresolvedTies,
  ).toEqual([[A, B]]);
  const result = applyTieDecisions(table(), [decision()], basis());
  expect(
    result.standings.rows.map((r) => [
      r.registrationId,
      r.position,
      r.tied,
      r.leaguePoints,
    ]),
  ).toEqual([
    [B, 1, false, 0],
    [A, 2, false, 0],
  ]);
  expect(result.appliedTieDecisionIds).toEqual([id(3)]);
  expect(result.standings.unresolvedTies).toEqual([]);
});
it("ignores a stale decision and reports review without preventing the projection", () => {
  const result = applyTieDecisions(table(), [decision()], basis() + "changed");
  expect(result.staleTieDecisionIds).toEqual([id(3)]);
  expect(result.standings.unresolvedTies).toEqual([[A, B]]);
});
it("never accepts a partial, duplicated or foreign order", () => {
  for (const order of [[A], [A, A], [A, id(8)]]) {
    expect(
      applyTieDecisions(table(), [{ ...decision(), order }], basis())
        .appliedTieDecisionIds,
    ).toEqual([]);
  }
});
it("context ignores catalog ordering but detects relevant rules and assignment changes", () => {
  expect(tieDecisionContext(rules, [B, A], [], [])).toBe(basis());
  expect(
    tieDecisionContext(
      { ...rules, points: { win: 3, loss: 0 } },
      [A, B],
      [],
      [],
    ),
  ).not.toBe(basis());
  expect(tieDecisionContext(rules, [A, B], [id(99)], [])).not.toBe(basis());
});
