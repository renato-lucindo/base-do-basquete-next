import { expect, it } from "vitest";
import { normalizeConfirmedGame } from "./confirmed-facts";
import {
  confirmedManualFixture,
  confirmedPdfFixture,
} from "../../tests/fixtures/statistics-publications";
import { pubId } from "../../tests/fixtures/publication";
it("súmula conserva métricas conhecidas e não fabrica tentativas/minutos/fase", () => {
  const input = confirmedManualFixture(),
    before = structuredClone(input),
    rows = normalizeConfirmedGame(input),
    scorer = rows.find((r) => r.person.id === pubId(1))!;
  expect(scorer).toMatchObject({
    gameId: input.id,
    publicationVersion: 1,
    phase: null,
    played: true,
    jersey: "0",
    scoring: {
      origin: { kind: "sheet", version: 1 },
      points: 2,
      twoMade: 1,
      threeMade: 0,
      freeMade: 0,
    },
    advanced: null,
    foulsCommitted: { value: 0, origin: { kind: "sheet", version: 1 } },
    foulsReceived: null,
    discipline: "eligible",
  });
  expect(rows.find((r) => r.jersey === "00")?.scoring?.points).toBe(0);
  expect(input).toEqual(before);
});
it("DNP é identidade histórica sem observação; jogou sem ação possui zero conhecido", () => {
  const rows = normalizeConfirmedGame(confirmedManualFixture(true)),
    bench = rows.find((r) => r.jersey === "9")!,
    zero = rows.find((r) => r.person.id === pubId(2))!;
  expect(bench).toMatchObject({
    played: false,
    scoring: null,
    advanced: null,
    foulsCommitted: null,
    foulsReceived: null,
    discipline: null,
  });
  expect(zero.played).toBe(true);
  expect(zero.scoring?.points).toBe(0);
});
it.each(["Boxscore-site.pdf", "Box Score FIBA ALC vs AVA 09 maio.pdf"])(
  "%s mantém coberturas explícitas e minutos zero não viraDNP",
  async (file) => {
    const game = await confirmedPdfFixture(file),
      rows = normalizeConfirmedGame(game),
      played = rows.filter((r) => r.played);
    expect(played.length).toBeGreaterThan(0);
    expect(played[0].advanced).not.toBeNull();
    for (const r of rows) {
      expect(r.phase).toBeNull();
      if (!r.played) expect(r.scoring).toBeNull();
    }
    if (file === "Boxscore-site.pdf") {
      expect(
        played.every(
          (r) =>
            r.foulsReceived === null &&
            r.advanced?.statistics.plusMinus === null,
        ),
      ).toBe(true);
      const zero = game.facts.players.find(
        (p) => p.played && p.advanced?.secondsPlayed === 0,
      );
      expect(zero).toBeDefined();
      expect(rows.find((r) => r.person.id === zero!.person.id)?.played).toBe(
        true,
      );
    } else expect(played[0].foulsReceived).not.toBeNull();
  },
);
it("pontos oficiais de fallback não substituem arremessos/pontos avançados", async () => {
  const game = await confirmedPdfFixture(),
    p = game.facts.players.find((p) => p.side === "home" && p.played)!,
    advancedPoints = p.advanced!.points,
    add = Math.max(
      1,
      game.facts.teams.away.points - game.facts.teams.home.points + 1,
    );
  p.points += add;
  p.free += add;
  game.facts.teams.home.points += add;
  game.facts.origins.scorePoints = { kind: "sheet", version: 3 };
  const row = normalizeConfirmedGame(game).find(
    (r) => r.person.id === p.person.id,
  )!;
  expect(row.scoring).toMatchObject({
    points: p.points,
    origin: { kind: "sheet", version: 3 },
  });
  expect(row.advanced?.statistics.points).toBe(advancedPoints);
  expect(row.advanced?.origin.kind).toBe("pdf");
});
it("PDF sem domínio avançado escolhido não ganha cobertura pelo formato do arquivo", async () => {
  const game = await confirmedPdfFixture();
  game.facts.origins.playerAdvanced = null;
  for (const p of game.facts.players) p.advanced = null;
  const rows = normalizeConfirmedGame(game).filter((r) => r.played);
  expect(rows.length).toBeGreaterThan(0);
  expect(
    rows.every(
      (r) =>
        r.advanced === null && r.foulsCommitted === null && r.scoring !== null,
    ),
  ).toBe(true);
});
it("a mesma pessoa em jogos/inscrições/camisas distintos não perde contexto", () => {
  const first = confirmedManualFixture(),
    next = structuredClone(first);
  next.id = pubId(900);
  next.game.home.registrationId = pubId(55);
  next.game.home.name = "Outro nome público";
  for (const p of next.facts.players.filter((p) => p.side === "home"))
    p.registrationId = pubId(55);
  next.facts.players[0].jersey = "77";
  const a = normalizeConfirmedGame(first)[0],
    b = normalizeConfirmedGame(next)[0];
  expect(a.person.id).toBe(b.person.id);
  expect(a.registration.registrationId).not.toBe(b.registration.registrationId);
  expect([a.jersey, b.jersey]).toEqual(["0", "77"]);
  expect(b.registration.name).toBe("Outro nome público");
});
it("rascunhos, campos privados e identidade duplicada após normalizar UUID são recusados", () => {
  expect(() => normalizeConfirmedGame({})).toThrow();
  const leaked = confirmedManualFixture();
  Object.assign(leaked.facts.players[0].person, { birthDate: "1990-01-01" });
  expect(() => normalizeConfirmedGame(leaked)).toThrow();
  const duplicate = confirmedManualFixture();
  duplicate.facts.players[1].person.id =
    duplicate.facts.players[0].person.id.toUpperCase();
  expect(() => normalizeConfirmedGame(duplicate)).toThrow();
});
