const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const esbuild = require("esbuild");
const code = esbuild.buildSync({
  entryPoints: [path.join(__dirname, "model.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
}).outputFiles[0].text;
const subject = new Module(path.join(__dirname, "model-tests.cjs"), module);
subject._compile(code, path.join(__dirname, "model-tests.cjs"));
const m = subject.exports;
const allTeams = m.teamOptions.map((t) => t.id);
const query = (patch = {}) => ({
  search: "",
  teams: allTeams,
  minimum: "",
  sort: "points",
  direction: "desc",
  mode: "totals",
  ...patch,
});
test("nenhuma equipe não retorna atletas; seleção une equipes e combina busca e mínimo", () => {
  assert.equal(m.queryPlayers(query({ teams: [] })).length, 0);
  assert.equal(m.queryPlayers(query({ teams: ["pinheiros"] })).length, 3);
  assert.equal(
    m.queryPlayers(query({ teams: ["pinheiros", "bauru"] })).length,
    6,
  );
  assert.deepEqual(
    m
      .queryPlayers(
        query({ teams: ["pinheiros", "bauru"], search: "lucas", minimum: "4" }),
      )
      .map((r) => r.id),
    ["lucas-bauru"],
  );
  assert.equal(
    m.queryPlayers(query({ teams: ["pinheiros", "bauru"], minimum: "7" }))
      .length,
    3,
  );
});
test("posição considera apenas equipes selecionadas e preserva empates", () => {
  assert.deepEqual(
    m.queryPlayers(query({ teams: ["pinheiros"] })).map((r) => r.rank),
    [1, 2, 3],
  );
  assert.deepEqual(
    m
      .queryPlayers(query({ teams: ["pinheiros", "paulistano"] }))
      .slice(0, 3)
      .map((r) => r.rank),
    [1, 1, 3],
  );
});
test("T e U têm cobertura independente e não aumentam F ou mudam5F/GD", () => {
  assert.equal(m.metricDefinitions.length, 12);
  const rows = m.queryPlayers(query());
  const joao = rows.find((r) => r.id === "joao-pinheiros");
  assert.equal(joao.technical, 2);
  assert.equal(joao.unsportsmanlike, 1);
  assert.equal(joao.fouls, 24);
  assert.equal(joao.fiveFoulGames, 1);
  assert.equal(joao.disqualifications, 0);
  const felipe = rows.find((r) => r.id === "felipe-mogi");
  assert.equal(felipe.technical, null);
  assert.equal(felipe.unsportsmanlike, 1);
  assert.equal(felipe.fouls, 18);
  const matheus = rows.find((r) => r.id === "matheus-saoJose");
  assert.equal(matheus.technical, 0);
  assert.equal(matheus.unsportsmanlike, null);
  const zero = rows.find((r) => r.id === "vicente-bauru");
  assert.equal(m.formatMetric(zero, "technical", "totals"), "0");
  assert.equal(m.formatMetric(zero, "unsportsmanlike", "averages"), "0,0");
  assert.equal(m.formatMetric(felipe, "technical", "averages"), "—");
  assert.equal(m.formatMetric(joao, "technical", "averages"), "0,2");
  for (const a of m.athletes)
    for (const g of a.games) {
      assert.ok(
        g.technical === null ||
          (Number.isInteger(g.technical) && g.technical >= 0),
      );
      assert.ok(
        g.unsportsmanlike === null ||
          (Number.isInteger(g.unsportsmanlike) && g.unsportsmanlike >= 0),
      );
      if (
        g.fouls !== null &&
        g.technical !== null &&
        g.unsportsmanlike !== null
      )
        assert.ok(g.technical + g.unsportsmanlike <= g.fouls);
      if (
        g.technical !== null &&
        g.unsportsmanlike !== null &&
        g.technical + g.unsportsmanlike >= 2
      )
        assert.equal(
          g.gd,
          1,
          "Fixture with multiple T/U must match its existing GD fact",
        );
    }
});
test("T/U reordenam por média e mantêm empates e ausentes ao final nas duas direções", () => {
  const totals = m.queryPlayers(query({ sort: "technical" }));
  assert.equal(totals[0].id, "gabriel-franca");
  assert.equal(totals[1].rank, 2);
  assert.equal(totals[2].rank, 2);
  const averages = m.queryPlayers(
    query({ sort: "technical", mode: "averages" }),
  );
  assert.deepEqual(
    averages.slice(0, 3).map((r) => r.id),
    ["lucas-pinheiros", "gabriel-franca", "lucas-bauru"],
  );
  assert.equal(averages.at(-1).id, "felipe-mogi");
  assert.equal(averages.at(-1).rank, null);
  assert.equal(
    m.queryPlayers(query({ sort: "technical", direction: "asc" })).at(-1).id,
    "felipe-mogi",
  );
  assert.equal(
    m.queryPlayers(query({ sort: "unsportsmanlike", mode: "averages" }))[0].id,
    "lucas-pinheiros",
  );
});
test("apenas seis métricas alternam e nomes dos tooltips são curtos", () => {
  assert.deepEqual(
    m.metricDefinitions.filter((d) => d.perGame).map((d) => d.code),
    ["two", "three", "ft", "fouls", "t", "u"],
  );
  assert.equal(m.metricName("technical", "T"), "Faltas técnicas");
  assert.equal(
    m.metricName("unsportsmanlike", "U/J"),
    "Faltas antidesportivas por jogo",
  );
});
