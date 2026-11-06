import { describe, expect, it } from "vitest";
import { buildPublicStandings } from "./public";
import type { PublicStandings } from "./public-contract";
import { recentGroupResults } from "./recent-results";
import {
  publicRegulationFixture,
  publicKnockoutFixture,
} from "../../tests/fixtures/public-regulation";
import { regulationId as id } from "../../tests/fixtures/regulation";

const group = (v: PublicStandings) => v.projection.groupPhases[0].groups[0];
const results = (v: PublicStandings) =>
  recentGroupResults(
    v.games,
    group(v).standings.lineage.map((l) => l.gameId),
  );

describe("últimos resultados contabilizados no grupo", () => {
  it("retorna zero ou menos de cinco, identifica vitória e derrota por inscrição nas duas posições", () => {
    const s = publicRegulationFixture();
    const v = buildPublicStandings(s);
    const before = structuredClone(v);
    expect(
      results(v)
        .get(id(1))
        ?.map((r) => [r.game.id, r.won, r.opponentId]),
    ).toEqual([[id(100), true, id(2)]]);
    expect(
      results(v)
        .get(id(2))
        ?.map((r) => [r.won, r.opponentId]),
    ).toEqual([[false, id(1)]]);
    s.publishedGames[0].awayPoints = 90;
    const corrected = results(buildPublicStandings(s));
    expect(corrected.get(id(1))?.[0].won).toBe(false);
    expect(corrected.get(id(2))?.[0].won).toBe(true);
    s.publishedGames = [];
    expect(results(buildPublicStandings(s)).size).toBe(0);
    expect(v).toEqual(before);
  });
  it("prioriza datas conhecidas, ordena data/hora/ID e mantém só os cinco mais recentes sem alterar a entrada", () => {
    const v = buildPublicStandings(publicRegulationFixture());
    v.games = [
      [108, null, null],
      [107, "2026-11-10", "20:00"],
      [102, "2026-11-09", "20:00"],
      [101, "2026-11-10", "18:00"],
      [103, "2026-11-10", null],
      [106, "2026-11-10", "20:00"],
      [104, "2026-11-10", "18:00"],
    ].map(([n, date, time]) => ({
      ...v.games[0],
      id: id(Number(n)),
      date: date as string | null,
      time: time as string | null,
    }));
    const before = structuredClone(v.games);
    const ids = v.games.map((g) => g.id);
    expect(
      recentGroupResults(v.games, ids)
        .get(id(1))
        ?.map((r) => r.game.id),
    ).toEqual([id(103), id(101), id(104), id(106), id(107)]);
    expect(
      recentGroupResults([...v.games].reverse(), ids)
        .get(id(1))
        ?.map((r) => r.game.id),
    ).toEqual([id(103), id(101), id(104), id(106), id(107)]);
    expect(
      recentGroupResults(v.games, [id(108), id(107)])
        .get(id(1))
        ?.map((r) => r.game.date),
    ).toEqual([null, "2026-11-10"]);
    expect(v.games).toEqual(before);
  });
  it("inclui decisões administrativas confirmadas sem placar e exclui pendências, exclusões e conflitos", () => {
    const v = buildPublicStandings(publicRegulationFixture());
    v.games = ["played", "awarded", "pending", "excluded", "conflict"].map(
      (state, n) => ({
        ...v.games[0],
        id: id(100 + n),
        state: state as PublicStandings["games"][number]["state"],
        ...(state === "awarded"
          ? { score: null, sourceKind: "administrative" as const }
          : {}),
      }),
    );
    expect(
      recentGroupResults(
        v.games,
        v.games.map((g) => g.id),
      )
        .get(id(1))
        ?.map((r) => r.game.id),
    ).toEqual([id(100), id(101)]);
    expect(
      recentGroupResults(v.games, [id(101)]).get(id(1))?.[0].game.score,
    ).toBeNull();
  });
  it("isola o grupo da fase e nunca inclui jogos de outras fases, mesmo com a mesma equipe", () => {
    const v = buildPublicStandings(publicKnockoutFixture());
    expect(
      results(v)
        .get(id(1))
        ?.map((r) => r.game.id),
    ).toEqual([id(100)]);
    expect(results(v).has(id(3))).toBe(false);
    expect(recentGroupResults(v.games, [id(102)]).has(id(1))).toBe(false);
  });
  it("reage à correção e ao cancelamento da fonte pública real sem modificar os números ou desempates", () => {
    const s = publicRegulationFixture();
    s.publishedGames[0].homePoints = 60;
    s.publishedGames[0].publicationVersion++;
    s.games[0].version++;
    const v = buildPublicStandings(s),
      before = structuredClone(v.projection);
    expect(results(v).get(id(1))?.[0].won).toBe(false);
    expect(v.projection).toEqual(before);
    s.occurrences.push({
      id: id(200),
      version: 1,
      gameId: id(100),
      gameVersion: s.games[0].version,
      publicationVersion: s.publishedGames[0].publicationVersion,
      effect: { kind: "cancelled" },
    });
    expect(results(buildPublicStandings(s)).size).toBe(0);
  });
});
