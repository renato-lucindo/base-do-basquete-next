/* Fixtures fictícias. Nenhuma consulta a serviços do produto. */
(() => {
  const athlete = (
    jersey,
    name,
    starter,
    captain,
    two,
    three,
    free,
    fouls,
    extra = {},
  ) => ({
    jersey,
    name,
    starter,
    captain,
    played: true,
    two,
    three,
    free,
    points: 2 * two + 3 * three + free,
    fouls,
    personal: fouls,
    technical: 0,
    unsportsmanlike: 0,
    disqualifying: 0,
    status: "eligible",
    ...extra,
  });
  const bench = (jersey, name) => ({
    jersey,
    name,
    starter: false,
    captain: false,
    played: false,
    two: null,
    three: null,
    free: null,
    points: null,
    fouls: null,
    personal: null,
    technical: null,
    unsportsmanlike: null,
    disqualifying: null,
    status: null,
  });
  const game = {
    championship: "Copa da Base",
    season: 2026,
    category: "Sub-19 masculino",
    number: "024",
    date: "27/10/2026",
    time: "19h30",
    venue: "Ginásio Henrique Villaboim",
    scenario: "overtime",
    overtime: true,
    home: {
      name: "Pinheiros",
      abbreviation: "PIN",
      points: 88,
      periods: [19, 21, 17, 19, 12],
      foulsByPeriod: [3, 4, 4, 5, 2],
      freeTaken: 24,
      coach: "Ricardo Moreira",
      assistant: "André Lima",
      players: [
        athlete("0", "Rafael Andrade", true, false, 2, 1, 1, 1),
        bench("00", "Bruno Nascimento"),
        athlete(
          "4",
          "Matheus Henrique de Oliveira Santos",
          true,
          false,
          5,
          2,
          4,
          3,
        ),
        athlete("7", "Pedro Augusto Silva", true, false, 4, 3, 2, 2),
        athlete("11", "João Pedro Almeida", true, true, 6, 2, 5, 4),
        athlete("14", "Gabriel Nascimento", true, false, 3, 1, 3, 5, {
          personal: 4,
          technical: 0,
          unsportsmanlike: 1,
          status: "five",
          eliminationPeriod: 3,
        }),
        athlete("17", "Miguel Moreira", false, false, 0, 0, 0, 0),
        athlete("21", "Arthur Ribeiro", false, false, 1, 0, 2, 2),
        bench("22", "Henrique Carvalho"),
        athlete("35", "Lucas Ferreira", false, false, 1, 0, 0, 1),
      ],
    },
    away: {
      name: "Paulistano",
      abbreviation: "PAU",
      points: 83,
      periods: [18, 20, 20, 18, 7],
      foulsByPeriod: [4, 3, 5, 4, 2],
      freeTaken: 20,
      coach: "Marcos Azevedo",
      assistant: "Renato Barbosa",
      players: [
        athlete("0", "Rafael Costa", true, false, 5, 1, 2, 3),
        bench("00", "Caio Henrique"),
        athlete("5", "Felipe Araújo", true, false, 4, 2, 2, 2),
        athlete("8", "Davi Rodrigues", true, false, 3, 1, 2, 3),
        athlete("10", "Enzo Martins", true, false, 4, 1, 3, 4),
        athlete("12", "Thiago Lima", true, false, 2, 2, 1, 2),
        athlete("13", "Lucas Gabriel dos Santos", false, true, 3, 1, 1, 3, {
          personal: 1,
          technical: 2,
          status: "GD",
          eliminationPeriod: 3,
        }),
        athlete("18", "Bernardo Souza", false, false, 2, 0, 2, 1),
        athlete("21", "Vicente Teixeira", false, false, 0, 0, 0, 0),
        bench("23", "Gustavo Oliveira"),
      ],
    },
  };
  // Registros fictícios explícitos por quarto: [2P, 3P, LL], códigos de faltas e presença.
  const records = {
    home: {
      0: {
        shots: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 0],
          [1, 0, 1],
          [0, 0, 0],
        ],
        fouls: ["", "P", "", "", ""],
        active: [1, 1, 1, 1, 0],
      },
      4: {
        shots: [
          [1, 1, 1],
          [2, 0, 1],
          [1, 1, 0],
          [1, 0, 1],
          [0, 0, 1],
        ],
        fouls: ["P", "", "P", "P", ""],
        active: [1, 1, 1, 1, 1],
      },
      7: {
        shots: [
          [1, 0, 0],
          [1, 1, 1],
          [1, 1, 0],
          [0, 0, 1],
          [1, 1, 0],
        ],
        fouls: ["", "P", "", "P", ""],
        active: [1, 1, 1, 1, 1],
      },
      11: {
        shots: [
          [1, 1, 1],
          [1, 0, 1],
          [1, 0, 1],
          [1, 1, 1],
          [2, 0, 1],
        ],
        fouls: ["P", "P", "P", "", "P"],
        active: [1, 1, 1, 1, 1],
      },
      14: {
        shots: [
          [1, 0, 1],
          [0, 1, 1],
          [1, 0, 0],
          [1, 0, 1],
          [0, 0, 0],
        ],
        fouls: ["P", "P", "U", "PP", ""],
        active: [1, 1, 1, 1, 0],
      },
      17: {
        shots: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
        fouls: ["", "", "", "", ""],
        active: [0, 1, 0, 1, 0],
      },
      21: {
        shots: [
          [0, 0, 0],
          [0, 0, 0],
          [1, 0, 0],
          [0, 0, 1],
          [0, 0, 1],
        ],
        fouls: ["", "", "", "P", "P"],
        active: [0, 0, 1, 1, 1],
      },
      35: {
        shots: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
          [1, 0, 0],
          [0, 0, 0],
        ],
        fouls: ["", "", "P", "", ""],
        active: [0, 0, 1, 1, 0],
      },
    },
    away: {
      0: {
        shots: [
          [2, 0, 0],
          [1, 1, 0],
          [1, 0, 1],
          [1, 0, 1],
          [0, 0, 0],
        ],
        fouls: ["P", "P", "P", "", ""],
        active: [1, 1, 1, 1, 0],
      },
      5: {
        shots: [
          [1, 1, 0],
          [1, 0, 1],
          [1, 0, 0],
          [1, 1, 0],
          [0, 0, 1],
        ],
        fouls: ["P", "", "P", "", ""],
        active: [1, 1, 1, 1, 1],
      },
      8: {
        shots: [
          [1, 0, 1],
          [0, 0, 1],
          [1, 1, 0],
          [1, 0, 0],
          [0, 0, 0],
        ],
        fouls: ["P", "", "P", "P", ""],
        active: [1, 1, 1, 1, 0],
      },
      10: {
        shots: [
          [1, 0, 1],
          [1, 1, 0],
          [1, 0, 1],
          [1, 0, 1],
          [0, 0, 0],
        ],
        fouls: ["P", "P", "", "P", "P"],
        active: [1, 1, 1, 1, 1],
      },
      12: {
        shots: [
          [0, 1, 0],
          [1, 0, 0],
          [1, 0, 0],
          [0, 0, 1],
          [0, 1, 0],
        ],
        fouls: ["", "P", "P", "", ""],
        active: [1, 1, 1, 1, 1],
      },
      13: {
        shots: [
          [0, 0, 0],
          [1, 0, 1],
          [1, 1, 0],
          [1, 0, 0],
          [0, 0, 0],
        ],
        fouls: ["", "", "P", "TT", ""],
        active: [0, 1, 1, 1, 0],
      },
      18: {
        shots: [
          [0, 0, 0],
          [0, 0, 1],
          [0, 0, 0],
          [1, 0, 0],
          [1, 0, 1],
        ],
        fouls: ["", "", "", "", "P"],
        active: [0, 1, 0, 1, 1],
      },
      21: {
        shots: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
        fouls: ["", "", "", "", ""],
        active: [0, 1, 1, 0, 0],
      },
    },
  };
  // LL concedidos por cada falta, na mesma ordem de records.fouls. Zero significa sem LL.
  const penalties = {
    home: {
      0: [[], [0], [], [], []],
      4: [[1], [], [0], [1], []],
      7: [[], [2], [], [2], []],
      11: [[2], [2], [0], [], [1]],
      14: [[0], [2], [2], [2, 0], []],
      17: [[], [], [], [], []],
      21: [[], [], [], [0], [2]],
      35: [[], [], [1], [], []],
    },
    away: {
      0: [[2], [2], [0], [], []],
      5: [[0], [], [0], [], []],
      8: [[1], [], [0], [3], []],
      10: [[1], [2], [], [3], [2]],
      12: [[], [2], [2], [], []],
      13: [[], [], [0], [1, 1], []],
      18: [[], [], [], [], [2]],
      21: [[], [], [], [], []],
    },
  };
  const numeric = [
    "two",
    "three",
    "free",
    "points",
    "fouls",
    "personal",
    "technical",
    "unsportsmanlike",
    "disqualifying",
  ];
  function seedQuarters(result) {
    for (const side of ["home", "away"]) {
      const team = result[side];
      team.freeTakenByPeriod =
        side === "home" ? [4, 6, 2, 8, 4] : [3, 6, 3, 5, 3];
      for (const player of team.players) {
        const record = records[side][player.jersey];
        player.quarters = Array.from({ length: 5 }, (_, i) => {
          const played = Boolean(record?.active[i]);
          const status =
            player.status === null
              ? null
              : player.eliminationPeriod === undefined ||
                  i >= player.eliminationPeriod
                ? player.status
                : "eligible";
          if (!played)
            return {
              played: false,
              codes: [],
              foulEvents: [],
              ...Object.fromEntries(numeric.map((key) => [key, null])),
              status,
            };
          const [two, three, free] = record.shots[i],
            codes = [...record.fouls[i]];
          const awarded = penalties[side][player.jersey][i];
          if (awarded.length !== codes.length)
            throw Error("Fixture sem penalidade explícita para cada falta.");
          const foulEvents = codes.map((kind, j) => ({
            kind,
            period: i,
            freeThrows: awarded[j],
            compensated: false,
          }));
          const count = (code) => codes.filter((c) => c === code).length;
          return {
            played,
            codes,
            foulEvents,
            two,
            three,
            free,
            points: 2 * two + 3 * three + free,
            fouls: codes.length,
            personal: count("P"),
            technical: count("T"),
            unsportsmanlike: count("U"),
            disqualifying: count("D"),
            status,
          };
        });
      }
    }
  }
  function mergeOvertime(result) {
    result.overtime = false;
    for (const team of [result.home, result.away]) {
      for (const key of ["periods", "foulsByPeriod", "freeTakenByPeriod"])
        team[key] = [...team[key].slice(0, 3), team[key][3] + team[key][4]];
      for (const player of team.players) {
        const a = player.quarters[3],
          b = player.quarters[4],
          played = a.played || b.played;
        const merged = {
          played,
          codes: [...a.codes, ...b.codes],
          foulEvents: [...a.foulEvents, ...b.foulEvents].map((event) => ({
            ...event,
            period: 3,
          })),
          status: b.status,
          ...Object.fromEntries(
            numeric.map((key) => [
              key,
              played ? (a[key] ?? 0) + (b[key] ?? 0) : null,
            ]),
          ),
        };
        player.quarters = [...player.quarters.slice(0, 3), merged];
      }
    }
  }
  const create = (scenario) => {
    const result = structuredClone(game);
    result.scenario = scenario;
    seedQuarters(result);
    if (scenario === "regulation") {
      mergeOvertime(result);
    }
    if (scenario === "missing") {
      result.home.freeTaken = null;
      result.home.freeTakenByPeriod.fill(null);
      const player = result.home.players.find((p) => p.jersey === "21");
      for (const key of [
        "fouls",
        "personal",
        "technical",
        "unsportsmanlike",
        "disqualifying",
        "status",
      ])
        player[key] = null;
      for (const quarter of player.quarters)
        for (const key of [
          "fouls",
          "personal",
          "technical",
          "unsportsmanlike",
          "disqualifying",
          "status",
          "codes",
          "foulEvents",
        ])
          quarter[key] = null;
      result.away.foulsByPeriod = [null, null, null, null, null];
    }
    if (scenario === "no-free-throws") {
      mergeOvertime(result);
      for (const team of [result.home, result.away]) {
        team.freeTaken = 0;
        team.freeTakenByPeriod.fill(0);
        for (const player of team.players.filter((p) => p.played)) {
          player.free = 0;
          player.points = 2 * player.two + 3 * player.three;
          for (const quarter of player.quarters.filter((q) => q.played)) {
            quarter.free = 0;
            quarter.points = 2 * quarter.two + 3 * quarter.three;
            for (const event of quarter.foulEvents) {
              if (event.freeThrows > 0) {
                event.compensated = true;
                event.freeThrows = 0;
              }
            }
          }
        }
        team.points = team.players.reduce((sum, p) => sum + (p.points ?? 0), 0);
        team.periods = team.periods.map((_, i) =>
          team.players.reduce((sum, p) => sum + (p.quarters[i].points ?? 0), 0),
        );
      }
    }
    return result;
  };
  const total = (team, key) => {
    const players = team.players.filter((p) => p.played);
    return players.some((p) => p[key] === null)
      ? null
      : players.reduce((sum, p) => sum + p[key], 0);
  };
  const periodView = (team, index) =>
    index === "all"
      ? team
      : {
          ...team,
          points: team.periods[Number(index)],
          freeTaken: team.freeTakenByPeriod[Number(index)],
          players: team.players.map((p) => ({
            ...p,
            ...p.quarters[Number(index)],
          })),
        };
  window.ScoresheetData = Object.freeze({ create, total, periodView });
})();
