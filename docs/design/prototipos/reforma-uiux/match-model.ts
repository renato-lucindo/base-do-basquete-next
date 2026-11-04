// The approved scoresheet reference supplies explicit period/penalty fixtures.
// Only its local data factory is reused; no production data or renderer is loaded.
import "../sumula/data.js";

export type Penalty = {
  kind: "P" | "T" | "U" | "D";
  period: number;
  freeThrows: number | null;
  compensated: boolean;
};
export type StatKey = "points" | "two" | "three" | "free" | "fouls";
export type PeriodStats = Record<StatKey, number | null> & {
  played: boolean;
  foulEvents: Penalty[];
  status: "eligible" | "five" | "GD" | "D" | null;
};
export type SheetPlayer = PeriodStats & {
  id: string;
  name: string;
  jersey: string;
  starter: boolean;
  captain: boolean;
  quarters: PeriodStats[];
};
export type SheetTeam = {
  id: string;
  name: string;
  points: number;
  periods: number[];
  foulsByPeriod: (number | null)[];
  freeTaken: number | null;
  freeTakenByPeriod: (number | null)[];
  coach: string;
  assistant: string;
  players: SheetPlayer[];
};
export type Sheet = { home: SheetTeam; away: SheetTeam };
export type Identity = { id: string; name: string; shirt: string };
export const statKeys: StatKey[] = ["points", "two", "three", "free", "fouls"];
const reference = (
  window as unknown as {
    ScoresheetData: { create: (scenario: string) => Sheet };
  }
).ScoresheetData;

export function makeSheet(
  index: number,
  home: { id: string; name: string },
  away: { id: string; name: string },
  roster: (teamId: string) => Identity[],
): Sheet {
  const sheet = reference.create(
    index === 1
      ? "missing"
      : index === 2
        ? "no-free-throws"
        : index % 3 === 0
          ? "overtime"
          : "regulation",
  );
  for (const [side, identity] of [
    ["home", home],
    ["away", away],
  ] as const) {
    const team = sheet[side];
    team.id = identity.id;
    team.name = identity.name;
    const identities = roster(identity.id);
    team.players = identities.map((person, i) => {
      const template = team.players[i];
      if (!template)
        return {
          id: person.id,
          name: person.name,
          jersey: person.shirt,
          starter: false,
          captain: false,
          played: false,
          points: null,
          two: null,
          three: null,
          free: null,
          fouls: null,
          foulEvents: [],
          status: null,
          quarters: team.periods.map(() => ({
            played: false,
            points: null,
            two: null,
            three: null,
            free: null,
            fouls: null,
            foulEvents: [],
            status: null,
          })),
        };
      return {
        ...template,
        quarters: template.quarters.map((quarter) => ({
          ...quarter,
          foulEvents: quarter.foulEvents ?? [],
        })),
        id: person.id,
        name: person.name,
        jersey: person.shirt,
        foulEvents: template.quarters.flatMap((q) => q.foulEvents ?? []),
      };
    });
  }
  return sheet;
}

export function periodTeam(team: SheetTeam, period: string): SheetTeam {
  if (period === "all") return team;
  const index = Number(period);
  return {
    ...team,
    points: team.periods[index],
    freeTaken: team.freeTakenByPeriod[index],
    players: team.players.map((player) => ({
      ...player,
      ...player.quarters[index],
    })),
  };
}

export function total(team: SheetTeam, key: StatKey): number | null {
  const played = team.players.filter((p) => p.played);
  return played.some((p) => p[key] === null)
    ? null
    : played.reduce((sum, p) => sum + (p[key] ?? 0), 0);
}
export function periodLabel(index: number) {
  return index < 4 ? `${index + 1}º Q` : `${index - 3}ª PR`;
}
