import { describe, expect, it } from "vitest";
import { generateRegularSchedule } from "./regular-schedule";
import { defaultCompetitionSetup } from "./format";

const ids = Array.from(
  { length: 8 },
  (_, i) => `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
);
const input = (count = 4, turns: 1 | 2 = 1) => ({
  setup: { ...defaultCompetitionSetup(), turns },
  registrationIds: ids.slice(0, count),
  teamCount: count,
  games: [],
});
const pair = (a: string, b: string) => [a, b].sort().join(":");

describe("confrontos da fase regular", () => {
  for (const count of [2, 3, 4, 5, 8]) {
    it(`gera todos os pares de ${count} equipes sem repetir equipe na rodada`, () => {
      const games = generateRegularSchedule(input(count));
      expect(games).toHaveLength((count * (count - 1)) / 2);
      expect(
        new Set(
          games.map((g) => pair(g.homeRegistrationId, g.awayRegistrationId)),
        ).size,
      ).toBe(games.length);
      for (const round of new Set(games.map((g) => g.round))) {
        const teams = games
          .filter((g) => g.round === round)
          .flatMap((g) => [g.homeRegistrationId, g.awayRegistrationId]);
        expect(new Set(teams).size).toBe(teams.length);
      }
      expect(generateRegularSchedule(input(count))).toEqual(games);
    });
  }
  it("inverte o mando e continua as rodadas no segundo turno", () => {
    const games = generateRegularSchedule(input(4, 2));
    expect(games).toHaveLength(12);
    for (const game of games.slice(0, 6))
      expect(games).toContainEqual({
        ...game,
        homeRegistrationId: game.awayRegistrationId,
        awayRegistrationId: game.homeRegistrationId,
        round: game.round + 3,
      });
  });
  it("gera somente dentro dos grupos definidos", () => {
    const data = input(5);
    data.setup.groupCount = 2;
    data.setup.memberships = Object.fromEntries(
      ids.slice(0, 5).map((id, i) => [id, i < 2 ? 0 : 1]),
    );
    const games = generateRegularSchedule(data);
    expect(games).toHaveLength(4);
    expect(
      games.every(
        (g) =>
          data.setup.memberships[g.homeRegistrationId] ===
          data.setup.memberships[g.awayRegistrationId],
      ),
    ).toBe(true);
  });
  it("não repete jogo existente, mesmo com mando invertido, e completa o returno", () => {
    const existing = [
      {
        homeRegistrationId: ids[1],
        awayRegistrationId: ids[0],
        stageKind: "round_robin" as const,
      },
    ];
    expect(generateRegularSchedule({ ...input(2), games: existing })).toEqual(
      [],
    );
    expect(
      generateRegularSchedule({ ...input(2, 2), games: existing }),
    ).toEqual([
      {
        homeRegistrationId: ids[0],
        awayRegistrationId: ids[1],
        round: 2,
        groupIndex: 0,
      },
    ]);
    expect(
      generateRegularSchedule({
        ...input(2, 2),
        games: [...existing, ...existing],
      }),
    ).toEqual([]);
    expect(
      generateRegularSchedule({
        ...input(2),
        games: [{ ...existing[0], stageKind: "knockout" }],
      }),
    ).toHaveLength(1);
  });
  it("recusa quantidade inválida, inscrições repetidas, grupos incompletos e prévia excessiva", () => {
    for (const teamCount of [NaN, 0, 1, 2.5, 3, 1001])
      expect(() =>
        generateRegularSchedule({ ...input(), teamCount }),
      ).toThrow();
    expect(() =>
      generateRegularSchedule({
        ...input(),
        registrationIds: [ids[0], ids[0], ids[2], ids[3]],
      }),
    ).toThrow();
    expect(() =>
      generateRegularSchedule({
        ...input(),
        setup: { ...input().setup, groupCount: 0 },
      }),
    ).toThrow();
    expect(() =>
      generateRegularSchedule({
        ...input(),
        setup: { ...input().setup, groupCount: 2 },
      }),
    ).toThrow();
    expect(() =>
      generateRegularSchedule({
        ...input(),
        setup: { ...input().setup, mode: "custom" },
      }),
    ).toThrow();
    expect(() =>
      generateRegularSchedule({
        ...input(),
        teamCount: 200,
        registrationIds: Array.from({ length: 200 }, (_, i) => String(i)),
      }),
    ).toThrow();
  });
});
