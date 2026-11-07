import { expect, it } from "vitest";
import { buildCompetitionDefinition, defaultCompetitionSetup } from "./format";
import { previewRegulationDefinition } from "./persistence-contract";
const id = (n: number) =>
  `f1900000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const disputeId = id(100),
  registrationIds = [1, 2, 3, 4].map(id);
const game = (
  n: number,
  home: number,
  away: number,
  stageKind: "round_robin" | "knockout" = "round_robin",
) => ({
  id: id(n),
  disputeId,
  version: 1,
  homeRegistrationId: id(home),
  awayRegistrationId: id(away),
  stageKind,
});
const context = {
  registrationIds,
  games: [game(10, 1, 2)],
  publishedGames: [],
  occurrences: [],
  withdrawals: [],
};
const normalized = (ctx: typeof context) => ({
  ...ctx,
  games: ctx.games.map((g) => ({
    id: g.id,
    disputeId: g.disputeId,
    version: g.version,
    homeRegistrationId: g.homeRegistrationId,
    awayRegistrationId: g.awayRegistrationId,
  })),
});
it("keeps legacy structures usable when new games arrive or opponents change", async () => {
  const initial = await buildCompetitionDefinition(
    disputeId,
    defaultCompetitionSetup(),
    context,
  );
  const setup = {
    ...defaultCompetitionSetup(),
    mode: "custom" as const,
    customDefinition: initial.definition,
  };
  const additional = { ...context, games: [...context.games, game(11, 3, 4)] };
  const built = await buildCompetitionDefinition(disputeId, setup, additional);
  expect(built.definition.groupPhases[0].groups[0].gameIds).toContain(id(11));
  setup.customDefinition.groupPhases[0].groups[0].registrationIds = [
    id(1),
    id(2),
  ];
  const changed = { ...context, games: [game(10, 1, 3)] };
  const after = await buildCompetitionDefinition(disputeId, setup, changed);
  expect(after.organizationPendingGameIds).toEqual([id(10)]);
  expect(() =>
    previewRegulationDefinition(
      after.definition,
      normalized(changed),
      disputeId,
      1,
    ),
  ).not.toThrow();
  expect(setup.customDefinition.groupPhases[0].groups[0].gameIds).toContain(
    id(10),
  );
});
it("starts with FIBA, one group, one turn, four seeds and single games", async () => {
  const setup = defaultCompetitionSetup();
  const built = await buildCompetitionDefinition(disputeId, setup, context);
  expect(built.definition.groupPhases[0].rules).toMatchObject({
    calculationPolicy: "fiba-2026",
    turns: 1,
    points: { win: 2, loss: 1 },
  });
  expect(built.definition.groupPhases[0].groups[0]).toMatchObject({
    registrationIds,
    gameIds: [id(10)],
  });
  expect(built.definition.series).toHaveLength(3);
  expect(built.definition.series[0]).toMatchObject({
    format: "single",
    home: { kind: "qualification_rank", position: 1 },
    away: { kind: "qualification_rank", position: 4 },
  });
  const projection = previewRegulationDefinition(
    built.definition,
    normalized(context),
    disputeId,
    1,
  );
  expect(projection.series.every((s) => s.status === "pending")).toBe(true);
  expect(projection.games).toHaveLength(1);
});
it("keeps identifiers stable across edits and supports different series by phase", async () => {
  const a = defaultCompetitionSetup();
  a.knockoutSize = 8;
  const first = await buildCompetitionDefinition(disputeId, a, context);
  a.turns = 2;
  a.seriesFormat = "best_of_5";
  a.roundFormats = { "8": "best_of_3", "2": "best_of_7" };
  const second = await buildCompetitionDefinition(disputeId, a, context);
  expect(second.definition.series.map((s) => s.id)).toEqual(
    first.definition.series.map((s) => s.id),
  );
  expect(second.definition.series.map((s) => s.format)).toEqual([
    "best_of_3",
    "best_of_3",
    "best_of_3",
    "best_of_3",
    "best_of_5",
    "best_of_5",
    "best_of_7",
  ]);
});
it("keeps unorganized games available to the result projection", async () => {
  const setup = defaultCompetitionSetup();
  setup.groupCount = 3;
  setup.knockoutSize = 8;
  setup.directPerGroup = 2;
  setup.extras = [{ position: 3, count: 2 }];
  const built = await buildCompetitionDefinition(disputeId, setup, context);
  expect(built.organizationPendingGameIds).toEqual([id(10)]);
  expect(
    previewRegulationDefinition(
      built.definition,
      normalized(context),
      disputeId,
      1,
    ).games,
  ).toHaveLength(1);
});
it("accepts manually assigned knockout games without resolved qualifiers", async () => {
  const setup = defaultCompetitionSetup();
  const initial = await buildCompetitionDefinition(disputeId, setup, context),
    seriesId = initial.definition.series[0].id;
  setup.assignments = [{ gameId: id(11), kind: "series", seriesId, slot: 1 }];
  const ctx = {
    ...context,
    games: [...context.games, game(11, 1, 3, "knockout")],
  };
  const built = await buildCompetitionDefinition(disputeId, setup, ctx);
  expect(built.definition.series[0].games).toEqual([
    { gameId: id(11), slot: 1 },
  ]);
  expect(built.organizationPendingGameIds).toEqual([]);
  expect(
    previewRegulationDefinition(
      built.definition,
      normalized(ctx),
      disputeId,
      1,
    ).series.find((s) => s.id === seriesId)?.status,
  ).toBe("conflict");
});
it("does not assign an explicitly unorganized game back to the default group", async () => {
  const setup = defaultCompetitionSetup();
  setup.assignments = [{ gameId: id(10), kind: "unassigned" }];
  const built = await buildCompetitionDefinition(disputeId, setup, context);
  expect(built.organizationPendingGameIds).toEqual([id(10)]);
});
