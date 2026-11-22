import { describe, expect, it } from "vitest";
import {
  readTeamProfileLocation,
  profilePlayerQuery,
  profileCollectiveQuery,
} from "./view-state";
import {
  initialTeamYear,
  selectTeamHonors,
  chronologicalTeamGames,
} from "./model";
import { pubId } from "../../tests/fixtures/publication";
import { teamProfileFixture } from "../../tests/fixtures/team-profile";
import {
  participationCampaign,
  participationGames,
  type TeamParticipation,
} from "./model";

describe("perfil da equipe", () => {
  it("separa perfil geral e inscrição contextual, preservando links antigos", () => {
    expect(readTeamProfileLocation(`#${pubId(9)}`).disputeId).toBeNull();
    const old = readTeamProfileLocation(
      `#${pubId(9)}?disputeId=${pubId(1)}&registrationId=${pubId(5)}&section=participantes`,
    );
    expect(old.section).toBe("jogadores");
    expect(old.registrationId).toBe(pubId(5));
    expect(readTeamProfileLocation("#identidade-invalida").teamId).toBeNull();
  });
  it("abre ano atual quando disponível ou último ano de participação", () => {
    expect(initialTeamYear([2024, 2025], 2026)).toBe(2025);
    expect(initialTeamYear([2027, 2026, 2024], 2026)).toBe(2026);
    expect(initialTeamYear([], 2026)).toBeNull();
  });
  it("mantém modo, fase e paginação dos links antigos na tabela individual", () => {
    const v = readTeamProfileLocation(
      `#${pubId(9)}?disputeId=${pubId(801)}&registrationId=${pubId(5)}&section=participantes&mode=total&scope=playoffs&rosterPage=2`,
    );
    const q = new URLSearchParams(v.params.get("jogadores") ?? "");
    expect(q.get("mode")).toBe("total");
    expect(q.get("scope")).toBe("playoffs");
    expect(q.get("page")).toBe("2");
  });
  it("não amplia links com contexto ou inscrição inválidos para o perfil geral", () => {
    expect(
      readTeamProfileLocation(`#${pubId(9)}?disputeId=invalid`).teamId,
    ).toBeNull();
    expect(
      readTeamProfileLocation(
        `#${pubId(9)}?disputeId=${pubId(801)}&registrationId=invalid`,
      ).teamId,
    ).toBeNull();
  });
  it("não permite que filtros aninhados substituam a inscrição ou ocultem coletivos", () => {
    expect(
      profilePlayerQuery("registrationId=invalid&team=invalid", pubId(5))
        .registrationId,
    ).toBe(pubId(5));
    const q = profileCollectiveQuery("selection=none&registrationId=invalid");
    expect(q.selection).toBe("all");
    expect(q.registrationIds).toEqual([]);
  });
  it("recorta pódios por categoria+naipe sem limitar ano e divisão", () => {
    const awards = [
      {
        category: "Sub-17",
        gender: "masculino",
        position: 1,
        year: 2024,
        division: "Prata",
      },
      {
        category: "Sub-17",
        gender: "masculino",
        position: 2,
        year: 2026,
        division: "Ouro",
      },
      {
        category: "Sub-15",
        gender: "masculino",
        position: 1,
        year: 2026,
        division: null,
      },
      {
        category: "Sub-17",
        gender: "feminino",
        position: 1,
        year: 2026,
        division: null,
      },
      {
        category: "Sub-17",
        gender: "masculino",
        position: 4,
        year: 2026,
        division: null,
      },
    ];
    expect(selectTeamHonors(awards, "Sub-17", "masculino")).toHaveLength(2);
  });
  it("ordena por data e hora, mantém datas desconhecidas ao fim e deduplica jogos", () => {
    const games = [
      { id: "a", date: null, time: null },
      { id: "b", date: "2026-11-20", time: "19:00" },
      { id: "c", date: "2026-11-20", time: "18:00" },
    ];
    expect(
      chronologicalTeamGames([...games, games[1]]).map((g) => g.id),
    ).toEqual(["b", "c", "a"]);
  });
  it("usa resultados contabilizados para a campanha sem somar agenda ou outras inscrições", () => {
    const f = teamProfileFixture();
    const p: TeamParticipation = {
      disputeId: f.source.disputeId,
      registrationId: f.registrationId,
      name: "Lobos",
      context: f.catalog.disputes[0].context,
      status: "in_progress",
      standings: f.standings,
      catalog: f.catalog.games,
      placement: null,
    };
    const c = participationCampaign(p)!;
    expect(c.games).toBe(2);
    expect(c.wins + c.losses).toBe(2);
    const gs = participationGames(p);
    expect(gs).toHaveLength(3);
    expect(gs.filter((g) => g.counted)).toHaveLength(2);
    expect(gs.filter((g) => !g.counted)[0].score).toBeNull();
    const noStandings = { ...p, standings: null };
    expect(participationCampaign(noStandings)).toBeNull();
    expect(participationGames(noStandings)).toHaveLength(2);
  });
});
