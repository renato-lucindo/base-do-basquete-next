import { it, expect } from "vitest";
import {
  regulationDefinitionSchema,
  regulationStateSchema,
  regulationVersionSchema,
  saveRegulationSchema,
  regulationSaveResultSchema,
  previewRegulationDefinition,
  type RegulationDefinition,
} from "./persistence-contract";
const id = (n: number) =>
  `f2000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1),
  B = id(2),
  disputeId = id(90),
  stamp = "2026-10-24T20:00:00Z",
  hash = "a".repeat(64);
const definition = (): RegulationDefinition => ({
  registrationIds: [A, B],
  occurrenceRules: { wo: null },
  groupPhases: [
    {
      phaseId: id(10),
      name: "Fase inicial",
      rules: {
        format: "round_robin",
        points: { win: 2, loss: 1 },
        tieBreakers: ["point_difference"],
      },
      groups: [
        {
          id: id(11),
          name: "Grupo A",
          registrationIds: [A, B],
          gameIds: [id(100)],
        },
      ],
    },
  ],
  knockoutPhases: [{ id: id(20), name: "Final" }],
  series: [],
});
const context = () => ({
  registrationIds: [A, B],
  games: [
    {
      id: id(100),
      version: 1,
      disputeId,
      homeRegistrationId: A,
      awayRegistrationId: B,
    },
  ],
  publishedGames: [
    {
      gameId: id(100),
      publicationVersion: 2,
      disputeId,
      homeRegistrationId: A,
      awayRegistrationId: B,
      homePoints: 80,
      awayPoints: 70,
      status: "played",
      pointsSource: { kind: "pdf", version: 3 },
    },
  ],
  occurrences: [],
  withdrawals: [],
});
const state = () => ({
  disputeId,
  version: 1,
  definition: definition(),
  savedAt: stamp,
  contextFingerprint: hash,
  context: context(),
  history: [
    {
      version: 1,
      savedAt: stamp,
      actorId: id(500),
      reason: "Regulamento conferido com resultados existentes",
    },
  ],
  hasMore: false,
});
const command = () => ({
  commandId: id(600),
  disputeId,
  expectedVersion: 1,
  expectedContextFingerprint: hash,
  definition: definition(),
  reason: "Atualização depois da prévia de impacto",
  acknowledgeImpact: true,
});
it("adapts labels and declared structure to official-context preview without accepting browser facts", () => {
  const result = previewRegulationDefinition(
    definition(),
    context(),
    disputeId,
    2,
  );
  expect(result).toMatchObject({ regulationVersion: 2, status: "preview" });
  expect(result.groupPhases[0].groups[0].standings.rows[0]).toMatchObject({
    registrationId: A,
    leaguePoints: 2,
  });
  expect(result.lineage[0]).toMatchObject({ publicationVersion: 2 });
  expect(() =>
    regulationDefinitionSchema.parse({
      ...definition(),
      publishedGames: context().publishedGames,
    }),
  ).toThrow();
});
it("rejects undeclared phases, foreign selections, names used as executable rules and graph cycles", () => {
  const node = {
    id: id(30),
    phaseId: id(20),
    name: "Confronto",
    format: "single",
    home: { kind: "registration", registrationId: A },
    away: { kind: "registration", registrationId: B },
    games: [],
  };
  for (const value of [
    { ...definition(), formula: "rank()" },
    { ...definition(), registrationIds: [A] },
    { ...definition(), series: [{ ...node, phaseId: id(999) }] },
    {
      ...definition(),
      series: [{ ...node, home: { kind: "series_winner", seriesId: id(30) } }],
    },
    {
      ...definition(),
      knockoutPhases: [{ id: id(10), name: "Nome não muda formato" }],
    },
    {
      ...definition(),
      groupPhases: [{ ...definition().groupPhases[0], name: "\n" }],
    },
    {
      ...definition(),
      series: [{ ...node, games: [{ slot: 1, gameId: id(100) }] }],
    },
  ])
    expect(regulationDefinitionSchema.safeParse(value).success).toBe(false);
});
it("requires unique assignments and side slots without inventing game existence during definition editing", () => {
  const d = definition();
  expect(
    regulationDefinitionSchema.parse(d).groupPhases[0].groups[0].gameIds,
  ).toEqual([id(100)]);
  expect(() =>
    previewRegulationDefinition(
      d,
      { ...context(), games: [], publishedGames: [] },
      disputeId,
      1,
    ),
  ).toThrow();
  expect(() =>
    previewRegulationDefinition(
      d,
      { ...context(), registrationIds: [A] },
      disputeId,
      1,
    ),
  ).toThrow();
  expect(() => previewRegulationDefinition(d, context(), id(999), 1)).toThrow();
});
it("accepts a saved state or an empty state and correlates version/context rather than replacing tokens", () => {
  expect(regulationStateSchema.parse(state()).version).toBe(1);
  expect(
    regulationStateSchema.parse({
      ...state(),
      version: 0,
      definition: null,
      savedAt: null,
      history: [],
    }).version,
  ).toBe(0);
  for (const value of [
    { ...state(), definition: null },
    { ...state(), version: 0 },
    { ...state(), contextFingerprint: "bad" },
    { ...state(), context: { ...context(), games: [] } },
  ])
    expect(regulationStateSchema.safeParse(value).success).toBe(false);
});
it("keeps the historical authoritative context and a fixed algorithm version", () => {
  const value = {
    disputeId,
    version: 1,
    definition: definition(),
    savedAt: stamp,
    actorId: id(500),
    reason: "Regra original",
    contextFingerprint: hash,
    context: context(),
    algorithmVersion: "organized-v1",
  };
  expect(
    regulationVersionSchema.parse(value).context.publishedGames[0]
      .publicationVersion,
  ).toBe(2);
  expect(
    regulationVersionSchema.safeParse({ ...value, algorithmVersion: "latest" })
      .success,
  ).toBe(false);
});
it("bounds the save command and ACK, refuses injected authority and requires an explicit impact choice", () => {
  expect(
    saveRegulationSchema.parse(command()).definition.registrationIds,
  ).toEqual([A, B]);
  for (const value of [
    { ...command(), actorId: id(500) },
    { ...command(), expectedVersion: -1 },
    { ...command(), expectedContextFingerprint: "bad" },
    { ...command(), acknowledgeImpact: undefined },
    {
      ...command(),
      definition: { ...definition(), facts: context().publishedGames },
    },
  ])
    expect(saveRegulationSchema.safeParse(value).success).toBe(false);
  expect(
    regulationSaveResultSchema.parse({
      commandId: id(600),
      disputeId,
      version: 2,
      savedAt: stamp,
      contextFingerprint: hash,
    }).version,
  ).toBe(2);
});
it("allows empty/partial configuration without producing positions or a qualifier", () => {
  const d = {
    registrationIds: [],
    occurrenceRules: { wo: null },
    groupPhases: [],
    knockoutPhases: [],
    series: [],
  };
  expect(regulationDefinitionSchema.parse(d)).toEqual(d);
  const result = previewRegulationDefinition(
    d,
    {
      registrationIds: [],
      games: [],
      publishedGames: [],
      occurrences: [],
      withdrawals: [],
    },
    disputeId,
    1,
  );
  expect(result).toMatchObject({
    groupPhases: [],
    series: [],
    status: "preview",
  });
});

it("reads a monotonic decision revision while keeping pre-occurrence historical contexts compatible", () => {
  const c = context();
  expect(
    previewRegulationDefinition(
      definition(),
      { ...c, decisionVersion: 4 },
      disputeId,
      1,
    ).status,
  ).toBe("preview");
  expect(
    previewRegulationDefinition(definition(), c, disputeId, 1).status,
  ).toBe("preview");
  expect(() =>
    previewRegulationDefinition(
      definition(),
      { ...c, decisionVersion: -1 },
      disputeId,
      1,
    ),
  ).toThrow();
});
