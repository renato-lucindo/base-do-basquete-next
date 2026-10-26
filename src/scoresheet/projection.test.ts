import { it, expect } from "vitest";
import { projectSheet, selectActionHistory } from "./projection";
import { initialState } from "../prototype/model";
import type { Entry } from "../domain/scoresheet";
const event = (
  side: Entry["side"],
  target: string,
  code: string,
  period = 1,
): Entry => ({ id: crypto.randomUUID(), side, target, code, period });
it("projects cumulative team points and the third compensated foul then GD from the full replay", () => {
  const s = initialState().sheet.present;
  s.roster.forEach((p) => (p.played = true));
  const a = s.roster.find((p) => p.side === "home")!,
    b = s.roster.find((p) => p.side === "away")!;
  s.events = [
    event("home", a.jersey, "3"),
    event("away", b.jersey, "P"),
    event("home", a.jersey, "2"),
    event("away", b.jersey, "P"),
    event("away", b.jersey, "TC", 3),
    event("away", b.jersey, "U2", 3),
  ];
  const r = projectSheet(s);
  expect(r.actions[2].annotation).toBe("2p (5)");
  expect(r.actions[4].annotation).toBe("Tc (3)");
  expect(r.actions[5].annotation).toBe("U2 (GD)");
  expect(
    r.players
      .find((p) => p.rosterEntryId === b.rosterEntryId)
      ?.fouls.map((f) => f.firstHalf),
  ).toEqual([true, true, false, false]);
  expect(
    r.totals.players.find((p) => p.rosterEntryId === b.rosterEntryId)?.fouls,
  ).toBe(4);
});
it("folds every overtime into player Q4 exactly once while team periods remain separate", () => {
  const s = initialState().sheet.present;
  s.periods = 6;
  s.roster.forEach((p) => (p.played = true));
  const p = s.roster[0];
  s.events = [
    event(p.side, p.jersey, "2", 4),
    event(p.side, p.jersey, "3", 5),
    event(p.side, p.jersey, "1", 6),
  ];
  const r = projectSheet(s),
    player = r.players.find((x) => x.rosterEntryId === p.rosterEntryId)!;
  expect(player.pointsByQuarter).toEqual([0, 0, 0, 6]);
  expect(r.totals.teams[p.side].periods).toEqual([0, 0, 0, 2, 3, 1]);
  expect(r.totals.teams[p.side].points).toBe(6);
});
it("filters full history before pagination and retains original sequence and counters", () => {
  const s = initialState().sheet.present;
  s.roster.forEach((p) => (p.played = true));
  const p = s.roster[0];
  s.events = Array.from({ length: 25 }, (_, i) =>
    event(p.side, p.jersey, "1", i < 12 ? 1 : 3),
  );
  const r = projectSheet(s),
    base = {
      mode: "recent" as "recent" | "history",
      periods: [1, 2, 3, 4],
      sides: ["home", "away"] as Entry["side"][],
      kinds: ["points", "fouls"] as ("points" | "fouls")[],
      order: "entry" as "entry" | "period",
      page: 0,
    };
  expect(
    selectActionHistory(r.actions, base).items.map((a) => a.sequence),
  ).toEqual([16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
  const filtered = selectActionHistory(r.actions, {
    ...base,
    mode: "history",
    periods: [1],
    page: 1,
  });
  expect(filtered.total).toBe(12);
  expect(filtered.items.map((a) => a.sequence)).toEqual([11, 12]);
  expect(filtered.items[1].annotation).toBe("1p (12)");
  expect(
    selectActionHistory(r.actions, { ...base, mode: "history", sides: [] })
      .total,
  ).toBe(0);
  s.events.splice(0, 1);
  expect(projectSheet(s).actions.at(-1)?.annotation).toBe("1p (24)");
});
