import { aggregate, parseFoul } from "../../src/domain/scoresheet";
import {
  toEngineSheet,
  type PersistedSheet,
} from "../../src/games/sheet-contract";
import { publishedSheet } from "./published-game";
import { publicationSheet, pubId } from "./publication";
import type { GameDetail } from "../../src/publication/game-detail-contract";

export function withGameDetails(document: PersistedSheet) {
  const result = publishedSheet(document);
  const engine = toEngineSheet(document);
  let previous = aggregate({ ...engine, events: [] });
  const periods: GameDetail["periods"] = [];
  for (let period = 1; period <= document.periods; period++) {
    const current = aggregate({
      ...engine,
      events: engine.events.filter((e) => e.period <= period),
    });
    periods.push({
      players: current.players.map((p, i) => {
        const old = previous.players[i],
          roster = engine.roster[i];
        const played =
          !roster.played || old.status !== "eligible"
            ? false
            : (period === 1 && roster.starter) ||
                engine.events.some(
                  (e) =>
                    e.side === p.side &&
                    e.target === p.jersey &&
                    e.period === period,
                )
              ? true
              : null;
        return {
          side: p.side,
          jersey: p.jersey,
          played,
          points: p.points - old.points,
          two: p.two - old.two,
          three: p.three - old.three,
          free: p.free - old.free,
          fouls: p.fouls - old.fouls,
          technical: p.technical - old.technical,
          unsportsmanlike: p.unsportsmanlike - old.unsportsmanlike,
          status: p.status,
        };
      }),
      teams: Object.fromEntries(
        (["home", "away"] as const).map((side) => [
          side,
          {
            points: current.teams[side].points - previous.teams[side].points,
            freeMade:
              current.teams[side].freeMade - previous.teams[side].freeMade,
            freeTaken:
              current.teams[side].freeTaken - previous.teams[side].freeTaken,
            fouls:
              current.players
                .filter((p) => p.side === side)
                .reduce((n, p) => n + p.fouls, 0) -
              previous.players
                .filter((p) => p.side === side)
                .reduce((n, p) => n + p.fouls, 0),
          },
        ]),
      ) as GameDetail["periods"][number]["teams"],
    });
    previous = current;
  }
  const fouls = document.events.flatMap((e) =>
    parseFoul(e.code, e.target) && /^(00|0|[1-9][0-9]?)$/u.test(e.target)
      ? [{ side: e.side, jersey: e.target, period: e.period, code: e.code }]
      : [],
  );
  return {
    ...result,
    details: { periods, fouls: fouls.sort((a, b) => a.period - b.period) },
  };
}
export function publicGameDetailFixture() {
  const d = publicationSheet();
  d.periods = 5;
  for (const [side, n] of [
    ["home", 10],
    ["away", 12],
  ] as const) {
    const existing = d.participants.filter((p) => p.side === side).length;
    for (let i = existing; i < n; i++)
      d.participants.push({
        rosterEntryId: pubId((side === "home" ? 1000 : 1100) + i),
        side,
        jersey: String(i + 1),
        played: i !== n - 1,
        starter: false,
      });
  }
  d.events = [];
  let id = 20000;
  const add = (
    side: "home" | "away",
    target: string,
    period: number,
    code: string,
  ) => d.events.push({ id: pubId(id++), side, target, period, code });
  add("home", "0", 1, "2");
  add("away", "0", 1, "2");
  add("home", "2", 2, "3");
  add("away", "2", 2, "3");
  add("home", "3", 3, "2");
  add("away", "3", 3, "2");
  add("home", "4", 4, "2");
  add("away", "4", 4, "2");
  add("home", "0", 5, "3");
  add("home", "4", 2, "1");
  add("away", "4", 2, "1");
  add("home", "0", 5, "1");
  for (const period of [1, 2, 3, 4, 4])
    add("home", "2", period, period === 2 ? "P2" : "P");
  add("away", "2", 2, "T1");
  add("away", "2", 4, "T1");
  add("away", "3", 1, "P");
  add("away", "3", 2, "P");
  add("away", "3", 3, "U2");
  add("away", "3", 4, "P");
  add("away", "3", 5, "U2");
  const result = withGameDetails(d);
  result.facts.players.find(
    (p) => p.side === "home" && p.jersey === "4",
  )!.person.name = "Matheus Henrique de Oliveira Santos";
  result.facts.players.find(
    (p) => p.side === "away" && p.jersey === "4",
  )!.person.name = "Luís Eduardo de Albuquerque Vasconcelos";
  return result;
}
