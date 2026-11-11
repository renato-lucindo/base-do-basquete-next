import { describe, expect, it } from "vitest";
import { readProfileLocation, profileQuery, seasonAge } from "./view-state";

const id = "10000000-0000-4000-8000-000000000001";
describe("contexto do perfil v9", () => {
  it("preserva filtros independentes, seleção vazia e modo na ida e volta", () => {
    const route = readProfileLocation(
      `#${id}?secao=jogos&anoPerfil=2025&anoJogos=2026&colunasPerfil=&equipesPerfil=&mode=total&adversario=Vit%C3%B3ria&recordesPerfil=points,freeMade&historicoEquipes=1&page=2`,
    );
    expect(route.view.year).toBe("2025");
    expect(route.view.gameYear).toBe("2026");
    expect(route.view.columns).toEqual([]);
    expect(route.view.teams).toEqual([]);
    expect(route.view.expanded).toEqual(["points", "freeMade"]);
    expect(
      readProfileLocation(`#${id}?${profileQuery(route.view, route.origin)}`),
    ).toEqual(route);
  });
  it("encaminha recordes e conquistas antigos à Carreira e descarta Evolução", () => {
    expect(readProfileLocation(`#${id}?secao=recordes`).view.section).toBe(
      "historico",
    );
    expect(readProfileLocation(`#${id}?secao=conquistas`).view.section).toBe(
      "historico",
    );
    expect(readProfileLocation(`#${id}?secao=evolucao`).view.section).toBe(
      "resumo",
    );
    expect(readProfileLocation(`#${id}`).view.columns).toEqual([
      "points",
      "twoMade",
      "threeMade",
      "freeMade",
    ]);
  });
  it("rejeita identidade inválida e normaliza páginas sem fabricar estado", () => {
    expect(readProfileLocation("#invalido").id).toBeNull();
    expect(readProfileLocation(`#${id}?page=-2`).view.page).toBe(1);
    expect(readProfileLocation(`#${id}?page=5000`).view.page).toBe(500);
  });
  it("calcula idade pelo ano público, sem derivar da categoria", () => {
    expect(seasonAge(2009, 2026)).toBe(17);
    expect(seasonAge(null, 2026)).toBeNull();
    expect(seasonAge(2027, 2026)).toBeNull();
    expect(seasonAge(2009.5, 2026)).toBeNull();
  });
});
