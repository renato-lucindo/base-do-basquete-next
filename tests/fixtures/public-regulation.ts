import { regulationFixture, regulationId as id } from "./regulation";
export function publicRegulationFixture() {
  const r = regulationFixture();
  return {
    schemaVersion: "public-standings-source-v1" as const,
    disputeId: r.disputeId,
    publicationVersion: 1,
    regulationVersion: 1,
    publishedAt: "2026-10-25T02:00:00Z",
    context: {
      championshipId: id(600),
      name: "Campeonato confirmado",
      seasonId: id(601),
      year: 2026,
      gender: "feminino" as const,
      category: "Adulto",
      division: null as string | null,
    },
    definition: r.definition!,
    registrations: [
      {
        id: id(1),
        name: "Lobos",
        team: { id: id(701), name: "Lobos Clube", abbreviation: "LOB" },
      },
      {
        id: id(2),
        name: "Águias",
        team: {
          id: id(702),
          name: "Águias Clube",
          abbreviation: null as string | null,
        },
      },
    ],
    games: r.context.games.map((g) => ({
      ...g,
      date: "2026-11-10" as string | null,
      time: null as string | null,
      venue: null as string | null,
      number: null as string | null,
      timeZone: "America/Sao_Paulo" as const,
    })),
    publishedGames: r.context.publishedGames,
    occurrences: r.context.occurrences.map(({ reason: _, ...o }) => {
      void _;
      return o;
    }),
    withdrawals: r.context.withdrawals.map(({ reason: _, ...w }) => {
      void _;
      return w;
    }),
  };
}

export function publicKnockoutFixture() {
  const s = publicRegulationFixture(),
    rank = (groupId: string, position: number) => ({
      kind: "group_rank" as const,
      phaseId: id(10),
      groupId,
      position,
    });
  for (const n of [3, 4]) {
    s.definition.registrationIds.push(id(n));
    s.registrations.push({
      ...s.registrations[0],
      id: id(n),
      name: `Inscrição ${n}`,
      team: { ...s.registrations[0].team, id: id(700 + n) },
    });
  }
  s.definition.groupPhases[0].groups.push({
    id: id(12),
    name: "Grupo B",
    registrationIds: [id(3), id(4)],
    gameIds: [id(102)],
  });
  s.definition.knockoutPhases = [
    { id: id(30), name: "Semifinais" },
    { id: id(31), name: "Finais" },
  ];
  s.definition.series = [
    {
      id: id(20),
      phaseId: id(30),
      name: "Semifinal A",
      format: "single",
      home: rank(id(11), 1),
      away: rank(id(12), 2),
      games: [{ slot: 1, gameId: id(103) }],
    },
    {
      id: id(21),
      phaseId: id(30),
      name: "Semifinal B",
      format: "single",
      home: rank(id(12), 1),
      away: rank(id(11), 2),
      games: [{ slot: 1, gameId: id(104) }],
    },
    {
      id: id(22),
      phaseId: id(31),
      name: "Final",
      format: "single",
      home: { kind: "series_winner", seriesId: id(20) },
      away: { kind: "series_winner", seriesId: id(21) },
      games: [{ slot: 1, gameId: id(105) }],
    },
    {
      id: id(23),
      phaseId: id(31),
      name: "Terceiro lugar",
      format: "single",
      home: { kind: "series_loser", seriesId: id(20) },
      away: { kind: "series_loser", seriesId: id(21) },
      games: [{ slot: 1, gameId: id(106) }],
    },
  ];
  for (const [n, home, away] of [
    [102, 3, 4],
    [103, 1, 4],
    [104, 3, 2],
    [105, 1, 3],
    [106, 4, 2],
  ]) {
    s.games.push({
      ...s.games[0],
      id: id(n),
      homeRegistrationId: id(home),
      awayRegistrationId: id(away),
    });
    if (n <= 104)
      s.publishedGames.push({
        ...s.publishedGames[0],
        gameId: id(n),
        homeRegistrationId: id(home),
        awayRegistrationId: id(away),
      });
  }
  return s;
}
