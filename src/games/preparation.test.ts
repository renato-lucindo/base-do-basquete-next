import { expect, it } from "vitest";
import { suggestPreparation } from "./preparation";
import type { PreparationContext } from "./preparation-contract";
const id = (n: number) =>
  `fd000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const context = (count = 11): PreparationContext => ({
  gameId: id(1),
  gameVersion: 1,
  sides: Object.fromEntries(
    (["home", "away"] as const).map((s, side) => [
      s,
      {
        registrationId: id(2 + side),
        previous: null,
        lastJerseys: {},
        staff: [],
        roster: Array.from({ length: count }, (_, i) => ({
          id: id(100 + side * 100 + i),
          registrationId: id(2 + side),
          personId: id(500 + side * 100 + i),
          jersey: String(i),
          person: {
            id: id(500 + side * 100 + i),
            name: `Atleta ${i}`,
            nickname: null,
          },
        })),
      },
    ]),
  ) as unknown as PreparationContext["sides"],
});
it("first game automatically relates eleven, leaves the twelfth empty and does not invent roles", () => {
  const r = suggestPreparation(context());
  expect(r.participants.filter((p) => p.side === "home")).toHaveLength(11);
  expect(r.participants).toHaveLength(22);
  expect(r.participants.every((p) => !p.played && !p.starter)).toBe(true);
  expect(r.staff.home.captainRosterEntryId).toBeNull();
});
it("selects at most twelve across the complete roster by numeric shirt, preserving 0 and 00", () => {
  const c = context(23);
  c.sides.home.roster[1].jersey = "00";
  c.sides.home.roster.reverse();
  const r = suggestPreparation(c).participants.filter((p) => p.side === "home");
  expect(r).toHaveLength(12);
  expect(r.slice(0, 3).map((p) => p.jersey)).toEqual(["0", "00", "2"]);
  expect(r.at(-1)?.jersey).toBe("11");
});
it("reuses eligible identities, most recent jerseys and roles, not bench participation", () => {
  const c = context(13),
    h = c.sides.home;
  h.previous = {
    gameId: id(90),
    version: 2,
    date: "2026-10-20",
    time: null,
    savedAt: "2026-10-20T20:00:00Z",
    players: h.roster.slice(2, 13).map((r, i) => ({
      personId: r.personId,
      jersey: r.jersey!,
      starter: i < 5,
    })),
    captainPersonId: h.roster[3].personId,
    coachPersonId: null,
    assistantPersonId: null,
  };
  h.lastJerseys[h.roster[2].id] = "77";
  const r = suggestPreparation(c),
    own = r.participants.filter((p) => p.side === "home");
  expect(own).toHaveLength(12);
  expect(own.find((p) => p.rosterEntryId === h.roster[2].id)?.jersey).toBe(
    "77",
  );
  expect(own.filter((p) => p.starter && p.played)).toHaveLength(5);
  expect(own.filter((p) => !p.starter).every((p) => !p.played)).toBe(true);
  expect(r.staff.home.captainRosterEntryId).toBe(h.roster[3].id);
  h.roster = h.roster.filter((r) => r.personId !== h.previous!.captainPersonId);
  expect(suggestPreparation(c).staff.home.captainRosterEntryId).toBeNull();
});
it("never invents a missing jersey and retains a conflict for explicit correction", () => {
  const c = context(5);
  c.sides.home.roster[0].jersey = null;
  c.sides.home.lastJerseys[c.sides.home.roster[1].id] = "2";
  const h = suggestPreparation(c).participants.filter((p) => p.side === "home");
  expect(h.some((p) => p.jersey === "")).toBe(true);
  expect(h.filter((p) => p.jersey === "2")).toHaveLength(2);
});
