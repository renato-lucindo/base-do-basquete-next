// Fictional match-level data retained from prototype revision 2.
const teams = {
  pinheiros: { name: "Pinheiros", color: "#215fbe" },
  paulistano: { name: "Paulistano", color: "#c04243" },
  franca: { name: "Franca", color: "#bb7521" },
  saoJose: { name: "São José", color: "#338a90" },
  bauru: { name: "Bauru", color: "#367449" },
  mogi: { name: "Mogi das Cruzes", color: "#8057ac" },
};
// Each line belongs to one athlete/team. Only games with actual participation
// are represented. Null fields model incomplete coverage, never a known zero.
const seeds = [
  [
    "joao",
    "João Pedro Almeida",
    "pinheiros",
    11,
    10,
    75,
    25,
    20,
    24,
    1,
    0,
    756,
  ],
  ["rafael", "Rafael Costa", "paulistano", 7, 10, 80, 20, 25, 21, 0, 0, 810],
  ["gabriel", "Gabriel Nascimento", "franca", 9, 8, 52, 26, 22, 22, 1, 0, 640],
  [
    "matheus",
    "Matheus Henrique de Oliveira Santos",
    "saoJose",
    14,
    9,
    60,
    16,
    30,
    27,
    2,
    0,
    708,
  ],
  ["lucas", "Lucas Ferreira", "bauru", 5, 6, 38, 24, 18, 16, 1, 0, 475],
  ["davi", "Davi Rodrigues", "mogi", 10, 10, 48, 18, 21, 28, 2, 1, 769],
  [
    "pedro",
    "Pedro Augusto Silva",
    "pinheiros",
    8,
    9,
    51,
    12,
    24,
    18,
    0,
    0,
    688,
  ],
  ["arthur", "Arthur Ribeiro", "paulistano", 4, 7, 39, 20, 19, 23, 1, 0, 566],
  ["enzo", "Enzo Martins", "franca", 6, 8, 45, 10, 23, 20, 1, 0, 640],
  ["bernardo", "Bernardo Souza", "bauru", 12, 9, 41, 13, 17, 29, 2, 0, 710],
  ["thiago", "Thiago Lima", "saoJose", 15, 5, 30, 10, 15, 13, 0, 0, 396],
  ["felipe", "Felipe Araújo", "mogi", 13, 8, 31, 14, 12, 18, 0, 0, null],
  ["lucas", "Lucas Ferreira", "pinheiros", 5, 3, 16, 12, 8, 8, 0, 0, 231],
  [
    "henrique",
    "Henrique Carvalho",
    "paulistano",
    18,
    4,
    22,
    0,
    9,
    null,
    null,
    0,
    324,
  ],
  ["miguel", "Miguel Moreira", "franca", 20, 2, 6, 3, 3, 4, 0, 0, 157],
  ["vicente", "Vicente Teixeira", "bauru", 3, 1, 0, 0, 0, 0, 0, 0, 76],
];
function distribute(total, n, offset = 0) {
  if (total === null) return Array(n).fill(null);
  const parts = Array(n).fill(0);
  for (let i = 0; i < total; i++) parts[(i + offset) % n]++;
  return parts;
}
const athletes = seeds.map(
  ([
    id,
    name,
    team,
    jersey,
    j,
    two,
    three,
    ft,
    fouls,
    five,
    gd,
    teamPoints,
  ]) => {
    const twos = distribute(two, j),
      threes = distribute(three, j, 2),
      fts = distribute(ft, j, 4);
    const teamScores = distribute(teamPoints, j);
    // Place exactly five fouls in the designated games, then distribute the
    // remaining fouls among the others without creating extra five-foul games.
    const foulScores = fouls === null ? Array(j).fill(null) : Array(j).fill(0);
    if (fouls !== null) {
      for (let i = 0; i < five; i++) foulScores[i] = 5;
      let left = fouls - five * 5;
      for (let i = five; left > 0; i = i + 1 < j ? i + 1 : five) {
        if (foulScores[i] < 4) {
          foulScores[i]++;
          left--;
        }
      }
    }
    const games = Array.from({ length: j }, (_, i) => ({
      two: twos[i],
      three: threes[i],
      ft: fts[i],
      fouls: foulScores[i],
      five: five === null ? null : Number(i < five),
      gd: Number(i < gd),
      teamPoints: teamScores[i],
      // Fixtures deliberately include both a most-used shirt and a tie.
      jersey:
        id === "joao"
          ? i < 7
            ? 11
            : 12
          : id === "lucas" && team === "bauru"
            ? i < 3
              ? 5
              : 12
            : jersey,
    }));
    return { id: `${id}-${team}`, personId: id, name, team, jersey, games };
  },
);

// Fictional disciplinary breakdowns are subsets of F, not additions to it.
const discipline = {
  "joao-pinheiros": [2, 1],
  "rafael-paulistano": [2, 0],
  "gabriel-franca": [3, 2],
  "matheus-saoJose": [0, 1],
  "lucas-bauru": [2, 1],
  "davi-mogi": [1, 1],
  "pedro-pinheiros": [0, 0],
  "arthur-paulistano": [1, 1],
  "enzo-franca": [1, 0],
  "bernardo-bauru": [0, 2],
  "thiago-saoJose": [1, 0],
  "felipe-mogi": [1, 1],
  "lucas-pinheiros": [2, 1],
  "henrique-paulistano": [0, 0],
  "miguel-franca": [0, 0],
  "vicente-bauru": [0, 0],
};
for (const a of athletes) {
  for (const g of a.games) {
    g.technical = 0;
    g.unsportsmanlike = 0;
  }
  const totals = discipline[a.id];
  const existingGD = a.games.findIndex((g) => g.gd === 1);
  const unsportOffset = existingGD >= 0 ? existingGD : totals[0];
  for (const [field, amount, offset] of [
    ["technical", totals[0], 0],
    ["unsportsmanlike", totals[1], unsportOffset],
  ]) {
    for (let n = 0; n < amount; n++) {
      const game = Array.from(
        { length: a.games.length },
        (_, i) => a.games[(i + n + offset) % a.games.length],
      ).find(
        (g) =>
          (g.fouls === null || g.technical + g.unsportsmanlike < g.fouls) &&
          (g.gd === 1 || g.technical + g.unsportsmanlike === 0),
      );
      if (!game) throw new Error("Disciplinary fixture exceeds F: " + a.id);
      game[field]++;
    }
  }
  if (a.id === "felipe-mogi") a.games.at(-1).technical = null;
  if (a.id === "matheus-saoJose") a.games.at(-1).unsportsmanlike = null;
}
export { teams, athletes };
