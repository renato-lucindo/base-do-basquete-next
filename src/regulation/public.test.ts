import { describe, it, expect } from "vitest";
import {
  publicRegulationFixture as fixture,
  publicKnockoutFixture,
} from "../../tests/fixtures/public-regulation";
import { regulationId as id } from "../../tests/fixtures/regulation";
import {
  publicStandingsSourceSchema,
  publicStandingsSchema,
} from "./public-contract";
import { buildPublicStandings } from "./public";
describe("fonte e classificação públicas mínimas", () => {
  it("aceita o limite de mil inscrições e dez mil jogos sem truncar cobertura", () => {
    const s = fixture(),
      count = 1000,
      gameCount = 10000;
    s.registrations = Array.from({ length: count }, (_, i) => ({
      ...s.registrations[0],
      id: id(i + 1),
      name: `Equipe ${i + 1}`,
    }));
    s.definition.registrationIds = s.registrations.map((r) => r.id);
    s.definition.groupPhases[0].groups[0].registrationIds = [
      ...s.definition.registrationIds,
    ];
    s.games = Array.from({ length: gameCount }, (_, i) => ({
      ...s.games[0],
      id: id(10000 + i),
      homeRegistrationId: id((i % count) + 1),
      awayRegistrationId: id(((i + 1) % count) + 1),
    }));
    s.definition.groupPhases[0].groups[0].gameIds = s.games.map((g) => g.id);
    s.publishedGames = s.games.map((g) => ({
      ...s.publishedGames[0],
      gameId: g.id,
      homeRegistrationId: g.homeRegistrationId,
      awayRegistrationId: g.awayRegistrationId,
    }));
    const v = buildPublicStandings(s),
      standings = v.projection.groupPhases[0].groups[0].standings;
    expect(v.games).toHaveLength(gameCount);
    expect(v.projection.lineage).toHaveLength(gameCount);
    expect(standings.rows).toHaveLength(count);
    expect(standings.lineage).toHaveLength(gameCount);
    expect(
      standings.rows.every((r) => r.games === 20 && r.scoreGamesCovered === 20),
    ).toBe(true);
    expect(
      publicStandingsSourceSchema.safeParse({
        ...s,
        games: [...s.games, { ...s.games[0], id: id(30000) }],
      }).success,
    ).toBe(false);
  }, 20000);
  it("resolve semifinal, final e perdedores, preservando adversários após correção", () => {
    const s = publicKnockoutFixture(),
      before = structuredClone(s),
      v = buildPublicStandings(s);
    expect(v.projection.series.find((n) => n.id === id(22))).toMatchObject({
      status: "ready",
      home: { registrationId: id(1) },
      away: { registrationId: id(3) },
    });
    expect(v.projection.series.find((n) => n.id === id(23))).toMatchObject({
      status: "ready",
      home: { registrationId: id(4) },
      away: { registrationId: id(2) },
    });
    expect(
      v.games.filter((g) => g.state === "pending").map((g) => g.id),
    ).toEqual([id(105), id(106)]);
    expect(s).toEqual(before);
    const semi = s.publishedGames.find((g) => g.gameId === id(103))!;
    semi.publicationVersion = 2;
    semi.homePoints = 50;
    semi.awayPoints = 60;
    s.games.find((g) => g.id === id(103))!.version += 1;
    const corrected = buildPublicStandings(s);
    for (const n of [22, 23])
      expect(
        corrected.projection.series.find((s) => s.id === id(n))?.status,
      ).toBe("conflict");
    expect(corrected.games.find((g) => g.id === id(105))).toMatchObject({
      homeRegistrationId: id(1),
      awayRegistrationId: id(3),
      score: null,
    });
  });
  it("calcula somente fatos confirmados e recalcula após correçãoG4", () => {
    const s = fixture(),
      first = buildPublicStandings(s);
    expect(
      first.projection.groupPhases[0].groups[0].standings.rows.find(
        (r) => r.registrationId === id(1),
      ),
    ).toMatchObject({ games: 1, wins: 1, pointsFor: 80 });
    s.publishedGames[0].homePoints = 90;
    s.publishedGames[0].publicationVersion = 2;
    s.games[0].version = 3;
    const next = buildPublicStandings(s);
    expect(next.games[0]).toMatchObject({
      state: "played",
      score: { homePoints: 90, awayPoints: 70 },
      publicationVersion: 2,
    });
    expect(
      next.projection.groupPhases[0].groups[0].standings.rows.find(
        (r) => r.registrationId === id(1),
      ),
    ).toMatchObject({ pointsFor: 90 });
    expect(next.projection.status).toBe("provisional");
    expect(publicStandingsSchema.safeParse(next).success).toBe(true);
  });
  it("agenda confirmada sem resultado mantém placar e vencedor ausentes", () => {
    const s = fixture();
    s.publishedGames = [];
    const v = buildPublicStandings(s);
    expect(v.games[0]).toMatchObject({
      state: "pending",
      score: null,
      winnerRegistrationId: null,
      date: "2026-11-10",
      time: null,
    });
    expect(v.projection.groupPhases[0].groups[0].pendingGameIds).toEqual([
      id(100),
    ]);
  });
  it("recusa qualquer metadado privado na fonte ou no DTO final", () => {
    const s = fixture();
    for (const extra of [
      { actorId: id(900) },
      { reason: "MOTIVO_PRIVADO" },
      { contextFingerprint: "a".repeat(64) },
      { history: [] },
    ])
      expect(
        publicStandingsSourceSchema.safeParse({ ...s, ...extra }).success,
      ).toBe(false);
    expect(
      publicStandingsSourceSchema.safeParse({
        ...s,
        registrations: [
          { ...s.registrations[0], sex: "female", birthDate: "1997-01-01" },
          s.registrations[1],
        ],
      }).success,
    ).toBe(false);
    expect(
      publicStandingsSourceSchema.safeParse({
        ...s,
        games: [{ ...s.games[0], draft: true }],
      }).success,
    ).toBe(false);
    const v = buildPublicStandings(s);
    expect(
      publicStandingsSchema.safeParse({ ...v, reason: "MOTIVO_PRIVADO" })
        .success,
    ).toBe(false);
    expect(JSON.stringify(v)).not.toMatch(
      /actorId|birthDate|private|contextFingerprint|Decisão publicada/u,
    );
  });
  it("recusa inscrição/jogo extra, contexto trocado e fato não atribuído", () => {
    const s = fixture();
    const invalid = [
      { ...s, registrations: [...s.registrations, s.registrations[0]] },
      {
        ...s,
        registrations: [
          ...s.registrations,
          { ...s.registrations[0], id: id(999) },
        ],
      },
      { ...s, games: [{ ...s.games[0], disputeId: id(999) }] },
      { ...s, games: [...s.games, { ...s.games[0], id: id(999) }] },
      {
        ...s,
        publishedGames: [
          ...s.publishedGames,
          { ...s.publishedGames[0], gameId: id(999) },
        ],
      },
      { ...s, games: [{ ...s.games[0], awayRegistrationId: id(999) }] },
      {
        ...s,
        publishedGames: [{ ...s.publishedGames[0], disputeId: id(999) }],
      },
      {
        ...s,
        occurrences: [
          {
            id: id(200),
            version: 1,
            gameId: id(999),
            gameVersion: 1,
            publicationVersion: 0,
            effect: { kind: "cancelled" },
          },
        ],
      },
      {
        ...s,
        withdrawals: [
          {
            id: id(300),
            version: 1,
            registrationId: id(1),
            policy: "keep_results",
            previousGameIds: [id(999)],
          },
        ],
      },
      { ...s, games: [] },
    ];
    for (const value of invalid) {
      expect(publicStandingsSourceSchema.safeParse(value).success).toBe(false);
      expect(() => buildPublicStandings(value)).toThrow();
    }
  });
  it("W.O. usa a regra publicada, sem motivo privado ou placar inventado", () => {
    const s = fixture();
    s.definition.occurrenceRules.wo = {
      winnerLeaguePoints: 2,
      loserLeaguePoints: 0,
      score: null,
    };
    s.occurrences.push({
      id: id(200),
      version: 1,
      gameId: id(100),
      gameVersion: 2,
      publicationVersion: 1,
      effect: { kind: "wo", winnerRegistrationId: id(1) },
    });
    const v = buildPublicStandings(s);
    expect(v.games[0]).toMatchObject({
      state: "awarded",
      score: null,
      winnerRegistrationId: id(1),
      sourceKind: "administrative",
    });
    expect(
      v.projection.groupPhases[0].groups[0].standings.rows[0],
    ).toMatchObject({ awardedGames: 1, scoreGamesCovered: 0, pointsFor: null });
    expect(
      publicStandingsSourceSchema.safeParse({
        ...s,
        occurrences: [{ ...s.occurrences[0], reason: "MOTIVO_PRIVADO" }],
      }).success,
    ).toBe(false);
  });
  it("fonte corrigida torna efeito publicado antigo uma revisão pendente", () => {
    const s = fixture();
    s.definition.occurrenceRules.wo = {
      winnerLeaguePoints: 2,
      loserLeaguePoints: 0,
      score: null,
    };
    s.occurrences.push({
      id: id(200),
      version: 1,
      gameId: id(100),
      gameVersion: 2,
      publicationVersion: 1,
      effect: { kind: "wo", winnerRegistrationId: id(1) },
    });
    s.games[0].version = 3;
    s.publishedGames[0].publicationVersion = 2;
    const v = buildPublicStandings(s);
    expect(v.games[0]).toMatchObject({
      state: "conflict",
      needs: "occurrence_review",
      score: null,
      winnerRegistrationId: null,
    });
    expect(v.projection.groupPhases[0].groups[0].pendingGameIds).toEqual([
      id(100),
    ]);
  });
  it("desistência afeta a classificação, preserva a fonte e detecta resultado novo", () => {
    const s = fixture();
    s.withdrawals.push({
      id: id(300),
      version: 1,
      registrationId: id(1),
      policy: "exclude_results",
      previousGameIds: [id(100)],
    });
    expect(buildPublicStandings(s).games[0]).toMatchObject({
      state: "excluded",
      score: null,
    });
    expect(s.publishedGames[0]).toMatchObject({
      homePoints: 80,
      awayPoints: 70,
    });
    s.games.push({ ...s.games[0], id: id(101) });
    s.definition.groupPhases[0].groups[0].gameIds.push(id(101));
    s.publishedGames.push({ ...s.publishedGames[0], gameId: id(101) });
    expect(
      buildPublicStandings(s).games.some(
        (g) => g.needs === "withdrawal_review",
      ),
    ).toBe(true);
  });
  it("valida agenda sem meia-noite inventada e rejeita horário sem data", () => {
    const s = fixture();
    s.publishedGames = [];
    s.games[0].time = "18:00";
    s.games[0].date = null;
    expect(publicStandingsSourceSchema.safeParse(s).success).toBe(false);
    s.games[0].date = "2026-02-30";
    expect(publicStandingsSourceSchema.safeParse(s).success).toBe(false);
  });

  it.each([
    "single",
    "two_leg",
    "best_of_3",
    "best_of_5",
    "best_of_7",
  ] as const)(
    "reutiliza grupo e série %s sem expor o contexto intermediário",
    (format) => {
      const s = fixture();
      s.definition.registrationIds.push(id(3));
      s.registrations.push({
        ...s.registrations[0],
        id: id(3),
        name: "Terceira inscrição",
      });
      s.definition.knockoutPhases = [{ id: id(30), name: "Final" }];
      s.definition.series = [
        {
          id: id(20),
          phaseId: id(30),
          name: "Série final",
          format,
          home: {
            kind: "group_rank",
            phaseId: id(10),
            groupId: id(11),
            position: 1,
          },
          away: { kind: "registration", registrationId: id(3) },
          games: [{ slot: 1, gameId: id(101) }],
        },
      ];
      s.games.push({ ...s.games[0], id: id(101), awayRegistrationId: id(3) });
      s.publishedGames.push({
        ...s.publishedGames[0],
        gameId: id(101),
        awayRegistrationId: id(3),
        pointsSource: { kind: "pdf", version: 4 },
      });
      const before = structuredClone(s),
        result = buildPublicStandings(s),
        series = result.projection.series[0];
      expect(series.home.registrationId).toBe(id(1));
      expect(series.result).toMatchObject({
        status: format === "single" ? "complete" : "pending",
        playedGames: 1,
        awardedGames: 0,
      });
      expect(result.games.find((g) => g.id === id(101))?.sourceKind).toBe(
        "pdf",
      );
      expect(result.projection).not.toHaveProperty("games");
      expect(s).toEqual(before);
      s.publishedGames[0].homePoints = 60;
      s.publishedGames[0].awayPoints = 80;
      s.publishedGames[0].publicationVersion = 2;
      s.games[0].version = 3;
      const corrected = buildPublicStandings(s);
      expect(corrected.projection.series[0]).toMatchObject({
        status: "conflict",
        conflicts: [{ code: "opponents_changed", gameIds: [id(101)] }],
      });
      expect(
        corrected.games.find((g) => g.id === id(101))?.homeRegistrationId,
      ).toBe(id(1));
    },
  );

  it("empate e cobertura parcial não inventam classificado nem honraria", () => {
    const s = fixture();
    s.definition.knockoutPhases = [{ id: id(30), name: "Final" }];
    s.definition.series = [
      {
        id: id(20),
        phaseId: id(30),
        name: "Final",
        format: "single",
        home: {
          kind: "group_rank",
          phaseId: id(10),
          groupId: id(11),
          position: 1,
        },
        away: {
          kind: "group_rank",
          phaseId: id(10),
          groupId: id(11),
          position: 2,
        },
        games: [],
      },
    ];
    s.definition.groupPhases[0].groups[0].gameIds.push(id(101));
    s.games.push({
      ...s.games[0],
      id: id(101),
      homeRegistrationId: id(2),
      awayRegistrationId: id(1),
    });
    expect(buildPublicStandings(s).projection.series[0].home).toMatchObject({
      registrationId: null,
      needs: "group_results",
    });
    s.publishedGames.push({
      ...s.publishedGames[0],
      gameId: id(101),
      homeRegistrationId: id(2),
      awayRegistrationId: id(1),
    });
    const v = buildPublicStandings(s);
    expect(v.projection.series[0]).toMatchObject({
      home: { registrationId: null, needs: "group_tie" },
      away: { registrationId: null, needs: "group_tie" },
    });
    expect(
      v.projection.groupPhases[0].groups[0].standings.rows.every(
        (r) => r.tied && r.position === 1,
      ),
    ).toBe(true);
    expect(v).not.toHaveProperty("honors");
  });

  it("recusa DTO com linhagem antiga, cobertura duplicada ou referência de outra fase", () => {
    const original = buildPublicStandings(fixture());
    const changes: ((v: typeof original) => void)[] = [
      (v) => {
        v.projection.lineage[0].gameVersion += 1;
      },
      (v) => {
        v.projection.lineage[0].publicationVersion += 1;
      },
      (v) => {
        v.projection.groupPhases[0].groups[0].pendingGameIds.push(id(100));
      },
      (v) => {
        v.projection.groupPhases[0].groups[0].standings.lineage.push(
          v.projection.groupPhases[0].groups[0].standings.lineage[0],
        );
      },
    ];
    for (const mutate of changes) {
      const v = structuredClone(original);
      mutate(v);
      expect(publicStandingsSchema.safeParse(v).success).toBe(false);
    }
    const s = fixture();
    s.definition.knockoutPhases = [{ id: id(30), name: "Final" }];
    s.definition.series = [
      {
        id: id(20),
        phaseId: id(30),
        name: "Final",
        format: "single",
        home: { kind: "registration", registrationId: id(1) },
        away: { kind: "registration", registrationId: id(2) },
        games: [],
      },
    ];
    const result = buildPublicStandings(s);
    result.projection.series[0].home.reference = {
      kind: "registration",
      registrationId: id(999),
    };
    expect(publicStandingsSchema.safeParse(result).success).toBe(false);
  });
});
