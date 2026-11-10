import { describe, expect, it } from "vitest";
import { publicKnockoutFixture } from "../../tests/fixtures/public-regulation";
import { buildPublicStandings } from "./public";
import { publicBracket, standingsSelection } from "./public-bracket-model";

const fixture = () => buildPublicStandings(publicKnockoutFixture());
describe("public standings stages", () => {
  it("defaults to groups and exposes knockout once opponents resolve, without games", () => {
    const value = fixture();
    value.definition.series.forEach((s) => (s.games = []));
    const selected = standingsSelection(value, new URLSearchParams());
    expect(selected.stage).toBe("classificatoria");
    expect(selected.knockoutAvailable).toBe(true);
    value.projection.series.forEach((s) => {
      s.home.registrationId = null;
      s.away.registrationId = null;
    });
    expect(
      standingsSelection(value, new URLSearchParams("etapa=eliminatoria")),
    ).toMatchObject({ stage: "classificatoria", knockoutAvailable: false });
  });
  it("maps legacy phase links and respects explicit stage and grouped selections", () => {
    const value = fixture(),
      phase = value.definition.knockoutPhases[1];
    expect(
      standingsSelection(value, new URLSearchParams(`fase=${phase.id}`)).stage,
    ).toBe("eliminatoria");
    expect(
      standingsSelection(
        value,
        new URLSearchParams(`etapa=classificatoria&fase=${phase.id}`),
      ).stage,
    ).toBe("classificatoria");
    const group = value.definition.groupPhases[0].groups[1];
    expect(
      standingsSelection(value, new URLSearchParams(`grupo=${group.id}`)).group
        ?.id,
    ).toBe(group.id);
    value.definition.groupPhases = [];
    expect(standingsSelection(value, new URLSearchParams()).stage).toBe(
      "eliminatoria",
    );
  });
});

describe("public bracket view model", () => {
  it("does not duplicate a game's score when a conflicted series resolves both entries to the same registration", () => {
    const value = fixture(),
      node = value.projection.series[0];
    node.away.registrationId = node.home.registrationId;
    node.status = "conflict";
    expect(publicBracket(value).columns[0].cards[0].slots[0]).toMatchObject({
      homePoints: null,
      awayPoints: null,
      winnerId: null,
    });
  });
  it("follows actual winner/loser references and keeps the third-place match", () => {
    const value = fixture(),
      bracket = publicBracket(value);
    expect(bracket.columns.flatMap((c) => c.cards)).toHaveLength(4);
    expect(bracket.edges.map((e) => e.kind).sort()).toEqual([
      "series_loser",
      "series_loser",
      "series_winner",
      "series_winner",
    ]);
    expect(bracket.columns[1].cards.map((c) => c.name)).toEqual([
      "Final",
      "Terceiro lugar",
    ]);
    expect(
      bracket.columns[1].cards[1].row - bracket.columns[1].cards[0].row,
    ).toBeGreaterThanOrEqual(1);
  });
  it("uses explicit slots and orients scores by registration, preserving zero and missing games", () => {
    const value = fixture(),
      def = value.definition.series[0];
    def.format = "best_of_3";
    const game = value.games.find((g) => g.id === def.games[0].gameId)!;
    [game.homeRegistrationId, game.awayRegistrationId] = [
      game.awayRegistrationId,
      game.homeRegistrationId,
    ];
    game.score = { homePoints: 0, awayPoints: 100 };
    game.winnerRegistrationId = game.awayRegistrationId;
    def.games[0].slot = 2;
    const card = publicBracket(value).columns[0].cards[0];
    expect(card.slots).toHaveLength(3);
    expect(card.slots[0]).toMatchObject({ homePoints: null, awayPoints: null });
    expect(card.slots[1]).toMatchObject({
      homePoints: 100,
      awayPoints: 0,
      winnerId: card.homeId,
    });
    expect(card.slots[2]).toMatchObject({ homePoints: null, awayPoints: null });
  });
  it.each([
    ["single", 1],
    ["two_leg", 2],
    ["best_of_3", 3],
    ["best_of_5", 5],
    ["best_of_7", 7],
  ] as const)("supports %s without inventing results", (format, length) => {
    const value = fixture();
    value.definition.series[0].format = format;
    expect(publicBracket(value).columns[0].cards[0].slots).toHaveLength(length);
    if (format === "two_leg")
      expect(publicBracket(value).columns[0].cards[0].total).toEqual(
        value.projection.series[0].result?.totals ?? {
          homePoints: null,
          awayPoints: null,
        },
      );
  });
  it("does not attach an old game's scores to recalculated opponents or declare a conflicted winner", () => {
    const value = fixture(),
      node = value.projection.series[0];
    node.status = "conflict";
    node.home.registrationId = value.registrations[1].id;
    const card = publicBracket(value).columns[0].cards[0];
    expect(card.winnerId).toBeNull();
    expect(card.slots[0]).toMatchObject({
      homePoints: null,
      awayPoints: null,
      winnerId: null,
    });
  });
  it("keeps same-phase dependencies directed forward rather than connecting arbitrary neighbors", () => {
    const value = fixture();
    value.definition.series[2].phaseId = value.definition.series[0].phaseId;
    const bracket = publicBracket(value),
      cards = bracket.columns.flatMap((c) =>
        c.cards.map((card) => ({ id: card.id, column: c.index })),
      );
    for (const edge of bracket.edges)
      expect(cards.find((c) => c.id === edge.to)!.column).toBeGreaterThan(
        cards.find((c) => c.id === edge.from)!.column,
      );
  });
});
