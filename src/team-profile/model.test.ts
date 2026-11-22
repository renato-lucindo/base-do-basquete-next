import { describe, expect, it } from "vitest";
import { readTeamProfileLocation } from "./view-state";
import {
  initialTeamYear,
  selectTeamHonors,
  chronologicalTeamGames,
} from "./model";
import { pubId } from "../../tests/fixtures/publication";

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
});
