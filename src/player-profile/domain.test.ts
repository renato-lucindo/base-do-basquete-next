import { expect, it } from "vitest";
import { playerCareerFixture } from "../../tests/fixtures/player-career";
import { pubId } from "../../tests/fixtures/publication";
import { emptyPerson } from "../people/contract";
import { buildPlayerProfile } from "./domain";
import {
  parseProfileQuery,
  serializeProfileQuery,
  PROFILE_SECTIONS,
} from "./query-contract";
const query = () => parseProfileQuery(new URLSearchParams());
it("cinco seções e URL recuperável preservam recorte, modo e página", () => {
  expect(PROFILE_SECTIONS.map((s) => s.id)).toEqual([
    "resumo",
    "estatisticas",
    "conquistas",
    "jogos",
    "historico",
  ]);
  const q = parseProfileQuery(
    new URLSearchParams(
      `secao=jogos&mode=total&scope=all&page=2&championshipId=${pubId(1)}`,
    ),
  );
  expect(
    parseProfileQuery(new URLSearchParams(serializeProfileQuery(q))),
  ).toEqual(q);
});
it("identidade vem da última ocasião pública sem inventar metadados ou equipe atual", () => {
  const s = playerCareerFixture(),
    page = buildPlayerProfile(s, query());
  expect(page.identity.name).toBe("Nome público recente");
  expect(page.identity.origin.kind).toBe("game");
  expect(page.identity.metadata).toBeNull();
  expect(page.identity).not.toHaveProperty("currentTeam");
  expect(page.statistics.summary?.gamesPlayed).toBe(2);
  expect(page.statistics.summary?.metrics.points.value).toBe(5);
  expect(page.history.map((h) => h.jerseys)).toContainEqual(["77"]);
  expect(
    page.games.items.find(
      (g) => g.fact.gameId === s.participations[0].fact.gameId,
    )?.fact.person.name,
  ).toBe("Atleta");
  const scoped = buildPlayerProfile(s, {
    ...query(),
    championshipId: s.participations[0].fact.context.championshipId,
  });
  expect(scoped.statistics.summary?.gamesPlayed).toBe(1);
  expect(scoped.history).toHaveLength(1);
});
it("perfil confirmado prevalece e atleta sem jogos não recebe números fictícios", () => {
  const s = playerCareerFixture(),
    { athlete, coach, ...person } = emptyPerson(s.personId);
  void athlete;
  void coach;
  s.profile = {
    kind: "confirmed-player-profile-v1",
    personId: s.personId,
    version: 1,
    confirmedAt: "2026-01-01T12:00:00Z",
    person: { ...person, name: "Nome escolhido no perfil" },
  };
  expect(buildPlayerProfile(s, query()).identity.name).toBe(
    "Nome escolhido no perfil",
  );
  s.participations = [];
  const empty = buildPlayerProfile(s, query());
  expect(empty.identity.metadata?.publicBirthYear).toBeNull();
  expect(empty.statistics.status).toBe("no-played-games");
  expect(empty.statistics.summary).toBeNull();
  expect(empty.games.items).toEqual([]);
  expect(empty.history).toEqual([]);
});
it("fases desconhecidas sóparticipam de all e mínimos misturados bloqueiam por30", () => {
  const s = playerCareerFixture();
  expect(
    buildPlayerProfile(s, { ...query(), scope: "regular" }).statistics.status,
  ).toBe("no-played-games");
  s.participations[0].fact.phase = "round_robin";
  s.participations[1].fact.phase = "knockout";
  expect(
    buildPlayerProfile(s, { ...query(), scope: "regular" }).statistics.summary
      ?.gamesPlayed,
  ).toBe(1);
  s.participations[1].minimumSeconds = 900;
  const mixed = buildPlayerProfile(s, { ...query(), mode: "per-30" });
  expect(mixed.statistics.status).toBe("mixed-minimums");
  expect(mixed.statistics.summary).toBeNull();
  expect(mixed.statistics.minimumSeconds).toBeNull();
  expect(
    buildPlayerProfile(s, { ...query(), mode: "total" }).statistics.summary
      ?.gamesPlayed,
  ).toBe(2);
});
it("paginação de jogos não reduz totais e histórico não inventa datas de vínculo", () => {
  const s = playerCareerFixture(),
    row = s.participations[0];
  s.participations = Array.from({ length: 25 }, (_, i) => {
    const p = structuredClone(row);
    p.fact.gameId = pubId(10000 + i);
    return p;
  });
  const p = buildPlayerProfile(s, { ...query(), section: "jogos", page: 2 });
  expect(p.games.items).toHaveLength(5);
  expect(p.games.total).toBe(25);
  expect(p.statistics.summary?.gamesPlayed).toBe(25);
  expect(p.history[0].firstGameDate).toBeNull();
  expect(p.history[0]).not.toHaveProperty("membershipStart");
  expect(p.history[0].relatedGames).toBe(25);
  const clamped = buildPlayerProfile(s, { ...query(), page: 999 });
  expect(clamped.games.page).toBe(2);
  expect(clamped.query.page).toBe(2);
});
it("valida origens também fora do recorte escolhido", () => {
  const s = playerCareerFixture();
  s.participations[1].fact.scoring!.origin = { kind: "pdf", version: 2 };
  expect(() =>
    buildPlayerProfile(s, {
      ...query(),
      championshipId: s.participations[0].fact.context.championshipId,
    }),
  ).toThrow("Origem estatística incompatível");
});
it("honraria fornece identidade com proveniência, sem virar metadado de perfil", () => {
  const s = playerCareerFixture(),
    fact = s.participations[0].fact;
  s.honors = [
    {
      disputeId: fact.disputeId,
      version: 1,
      confirmedAt: "2028-01-01T12:00:00Z",
      context: fact.context,
      honor: { id: pubId(999), title: "MVP" },
      recipient: {
        personId: s.personId,
        name: "Nome na premiação",
        nickname: "Prêmio",
        publicBirthYear: 1997,
      },
    },
  ];
  const page = buildPlayerProfile(s, query());
  expect(page.identity.name).toBe("Nome na premiação");
  expect(page.identity.origin.kind).toBe("honor");
  expect(page.identity.metadata).toBeNull();
  expect(page.honors).toHaveLength(1);
});
it("DNP permanece nos jogos e histórico sem criar uma linha estatística", () => {
  const s = playerCareerFixture();
  for (const p of s.participations) {
    Object.assign(p.fact, {
      played: false,
      starter: false,
      captain: false,
      scoring: null,
      advanced: null,
      foulsCommitted: null,
      foulsReceived: null,
      discipline: null,
    });
  }
  const page = buildPlayerProfile(s, query());
  expect(page.games.total).toBe(2);
  expect(page.statistics.status).toBe("no-played-games");
  expect(page.statistics.summary).toBeNull();
  expect(
    page.history.every((h) => h.playedGames === 0 && h.relatedGames === 1),
  ).toBe(true);
});
