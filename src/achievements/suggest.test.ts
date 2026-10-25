import { expect, it } from "vitest";
import {
  achievementFixture,
  podiumFixture,
  achievementId as id,
} from "../../tests/fixtures/achievements";
import { suggestPlacements } from "./suggest";
import { achievementDraftSchema, placementSuggestionSchema } from "./contract";

it("sugere posições de um grupo escolhido sem publicar ou alterar a fonte", () => {
  const { state, request } = achievementFixture(),
    before = structuredClone(state),
    result = suggestPlacements(request, state);
  expect(result).toMatchObject({
    status: "suggestion",
    ready: true,
    needs: null,
    requiresConfirmation: true,
    placements: [
      { position: 1, registrationIds: [id(1)] },
      { position: 2, registrationIds: [id(2)] },
    ],
  });
  expect(placementSuggestionSchema.safeParse(result).success).toBe(true);
  expect(state).toEqual(before);
  expect(JSON.stringify(result)).not.toContain("actorId");
  expect(result).not.toHaveProperty("history");
  expect(result).not.toHaveProperty("publishedAt");
});
it.each(["pending", "empty", "withdrawn"] as const)(
  "não inventa colocação quando grupo está %s",
  (mode) => {
    const { state, request } = achievementFixture();
    if (mode === "pending") state.context.publishedGames = [];
    if (mode === "empty")
      state.definition!.groupPhases[0].groups[0].gameIds = [];
    if (mode === "withdrawn")
      state.context.withdrawals = [
        {
          id: id(500),
          version: 1,
          registrationId: id(2),
          policy: "exclude_results",
          previousGameIds: [id(100)],
          reason: "Desistência confirmada",
        },
      ];
    expect(suggestPlacements(request, state)).toMatchObject({
      ready: false,
      needs: "group_results",
      placements: [],
    });
  },
);
it("empate não vira campeão por ordem ou UUID", () => {
  const { state, request } = achievementFixture();
  state.definition!.groupPhases[0].groups[0].gameIds.push(id(101));
  state.context.games.push({ ...state.context.games[0], id: id(101) });
  state.context.publishedGames.push({
    ...state.context.publishedGames[0],
    gameId: id(101),
    homePoints: 70,
    awayPoints: 80,
  });
  expect(suggestPlacements(request, state)).toMatchObject({
    ready: false,
    needs: "group_tie",
    placements: [],
  });
});
it("fonte ausente, regra ausente e conflito exigem escolha/atualização explícitas", () => {
  const { state, request } = achievementFixture();
  expect(suggestPlacements({ ...request, source: null }, state)).toMatchObject({
    ready: false,
    needs: "source_required",
  });
  expect(
    suggestPlacements(
      { ...request, source: { ...request.source, groupId: id(999) } },
      state,
    ),
  ).toMatchObject({ ready: false, needs: "source_missing" });
  expect(
    suggestPlacements({ ...request, expectedRegulationVersion: 2 }, state),
  ).toMatchObject({ ready: false, needs: "context_changed" });
  expect(
    suggestPlacements(
      { ...request, expectedContextFingerprint: "b".repeat(64) },
      state,
    ),
  ).toMatchObject({ ready: false, needs: "context_changed" });
  state.version = 0;
  state.definition = null;
  state.savedAt = null;
  state.history = [];
  expect(
    suggestPlacements({ ...request, expectedRegulationVersion: 0 }, state),
  ).toMatchObject({
    ready: false,
    needs: "regulation_required",
    placements: [],
  });
});
it("recusa disputa trocada e derivados/autor forjados no pedido", () => {
  const { state, request } = achievementFixture();
  for (const c of [
    { ...request, disputeId: id(999) },
    { ...request, actorId: id(999) },
    { ...request, placements: [] },
    { ...request, projection: {} },
    { ...request, source: { ...request.source, position: 1 } },
  ])
    expect(() => suggestPlacements(c, state)).toThrow();
});
it("final e bronze explícitos sugerem quatro inscrições preservando seus IDs", () => {
  const { state, request } = podiumFixture();
  expect(suggestPlacements(request, state)).toMatchObject({
    ready: true,
    placements: [
      { position: 1, registrationIds: [id(1)] },
      { position: 2, registrationIds: [id(2)] },
      { position: 3, registrationIds: [id(4)] },
      { position: 4, registrationIds: [id(3)] },
    ],
  });
});
it("sem bronze selecionado não inventa terceiro nem escolhe pelo nome do confronto", () => {
  const { state, request } = podiumFixture();
  expect(
    suggestPlacements(
      { ...request, source: { ...request.source, bronzeSeriesId: null } },
      state,
    ),
  ).toMatchObject({
    ready: true,
    placements: [
      { position: 1, registrationIds: [id(1)] },
      { position: 2, registrationIds: [id(2)] },
    ],
  });
  expect(
    suggestPlacements(
      { ...request, source: { ...request.source, finalSeriesId: id(999) } },
      state,
    ),
  ).toMatchObject({ ready: false, needs: "source_missing", placements: [] });
});
it.each(["final", "bronze"] as const)(
  "%s pendente não recebe vencedor inventado",
  (which) => {
    const { state, request } = podiumFixture();
    state.context.publishedGames = state.context.publishedGames.filter(
      (g) => g.gameId !== (which === "final" ? id(100) : id(101)),
    );
    const s = suggestPlacements(request, state);
    expect(s).toMatchObject({ ready: false, needs: "series_pending" });
    expect(s.placements.map((p) => p.position)).toEqual(
      which === "final" ? [] : [1, 2],
    );
  },
);
it("IDs de final/bronze repetidos ou participantes sobrepostos são recusados", () => {
  const { state, request } = podiumFixture();
  expect(() =>
    suggestPlacements(
      {
        ...request,
        source: {
          ...request.source,
          bronzeSeriesId: request.source.finalSeriesId,
        },
      },
      state,
    ),
  ).toThrow();
  const bronze = state.definition!.series[1];
  bronze.home = { kind: "registration", registrationId: id(1) };
  bronze.away = { kind: "registration", registrationId: id(2) };
  state.context.games[1].homeRegistrationId = id(1);
  state.context.games[1].awayRegistrationId = id(2);
  state.context.publishedGames[1].homeRegistrationId = id(1);
  state.context.publishedGames[1].awayRegistrationId = id(2);
  expect(suggestPlacements(request, state)).toMatchObject({
    ready: false,
    needs: "podium_conflict",
    placements: [],
  });
});
it("W.O. administrativo sem placar sugere vencedor sem fabricar estatística", () => {
  const { state, request } = achievementFixture();
  state.context.publishedGames = [];
  state.definition!.occurrenceRules.wo = {
    winnerLeaguePoints: 2,
    loserLeaguePoints: -1,
    score: null,
  };
  state.context.occurrences = [
    {
      id: id(700),
      version: 1,
      gameId: id(100),
      gameVersion: 2,
      publicationVersion: 0,
      reason: "W.O. confirmado",
      effect: { kind: "wo", winnerRegistrationId: id(2) },
    },
  ];
  expect(suggestPlacements(request, state)).toMatchObject({
    ready: true,
    placements: [
      { position: 1, registrationIds: [id(2)] },
      { position: 2, registrationIds: [id(1)] },
    ],
  });
  expect(state.context.publishedGames).toEqual([]);
});
it("ida e volta empatada exige decisão, sem campeão por saldo inexistente", () => {
  const { state, request } = podiumFixture();
  const final = state.definition!.series[0];
  final.format = "two_leg";
  final.games.push({ slot: 2, gameId: id(102) });
  state.context.games.push({
    ...state.context.games[0],
    id: id(102),
    homeRegistrationId: id(2),
    awayRegistrationId: id(1),
  });
  state.context.publishedGames.push({
    ...state.context.publishedGames[0],
    gameId: id(102),
    homeRegistrationId: id(2),
    awayRegistrationId: id(1),
  });
  expect(suggestPlacements(request, state)).toMatchObject({
    ready: false,
    needs: "series_pending",
    placements: [],
  });
});
it("publicação extra depois de decidir série bloqueia a premiação para revisão", () => {
  const { state, request } = podiumFixture();
  const final = state.definition!.series[0];
  final.format = "best_of_3";
  for (const [slot, n] of [
    [2, 102],
    [3, 103],
  ]) {
    final.games.push({ slot, gameId: id(n) });
    state.context.games.push({ ...state.context.games[0], id: id(n) });
    state.context.publishedGames.push({
      ...state.context.publishedGames[0],
      gameId: id(n),
    });
  }
  expect(suggestPlacements(request, state)).toMatchObject({
    ready: false,
    needs: "series_conflict",
    placements: [],
  });
});
it("título Unicode é limitado por pontos de código e IDs normalizados não se duplicam", () => {
  const base = {
    disputeId: id(90),
    placements: [],
    honors: [{ id: id(600), title: "🙂".repeat(80), personIds: [id(500)] }],
  };
  expect(achievementDraftSchema.safeParse(base).success).toBe(true);
  expect(
    achievementDraftSchema.safeParse({
      ...base,
      honors: [
        { ...base.honors[0], personIds: [id(500), id(500).toUpperCase()] },
      ],
    }).success,
  ).toBe(false);
});
it("rascunho aceita colocação compartilhada explícita e honrarias sem escolher atleta automaticamente", () => {
  const draft = {
    disputeId: id(90),
    placements: [
      { position: 1, registrationIds: [id(1)] },
      { position: 3, registrationIds: [id(2), id(3)] },
    ],
    honors: [
      { id: id(600), title: " MVP ", personIds: [id(500)] },
      {
        id: id(601),
        title: "Seleção do campeonato",
        personIds: [id(500), id(501)],
      },
    ],
  };
  expect(achievementDraftSchema.parse(draft).honors[0].title).toBe("MVP");
  for (const bad of [
    { ...draft, actorId: id(1) },
    { ...draft, confirmed: true },
    { ...draft, placements: [{ position: 0, registrationIds: [id(1)] }] },
    {
      ...draft,
      placements: [{ position: 1, registrationIds: [id(1), id(1)] }],
    },
    {
      ...draft,
      placements: [
        ...draft.placements,
        { position: 1, registrationIds: [id(4)] },
      ],
    },
    {
      ...draft,
      placements: [
        ...draft.placements,
        { position: 4, registrationIds: [id(1)] },
      ],
    },
    { ...draft, honors: [{ ...draft.honors[0], personIds: [] }] },
    {
      ...draft,
      honors: [{ ...draft.honors[0], personIds: [id(500), id(500)] }],
    },
    { ...draft, honors: [draft.honors[0], draft.honors[0]] },
    { ...draft, honors: [{ ...draft.honors[0], title: "🙂".repeat(81) }] },
    { ...draft, honors: [{ ...draft.honors[0], title: "MVP\u0000" }] },
    { ...draft, honors: [{ ...draft.honors[0], title: "MVP\ud800" }] },
  ])
    expect(achievementDraftSchema.safeParse(bad).success).toBe(false);
});
