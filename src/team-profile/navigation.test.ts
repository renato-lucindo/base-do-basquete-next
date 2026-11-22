import { expect, it } from "vitest";
import { safePublicReturn } from "../public-ui/navigation";
import { searchHitHref } from "../public-ui/search-results";
import { pubId } from "../../tests/fixtures/publication";
it("abre a identidade geral pela busca sem escolher uma inscrição", () => {
  const href = searchHitHref(
    {
      kind: "teams",
      id: pubId(9),
      name: "Lobos",
      abbreviation: null,
      participations: [],
    },
    "Lobos",
  );
  expect(href).toBe(`/equipe.html#${pubId(9)}`);
});
it("aceita o retorno ao perfil geral entre jogos de disputas diferentes", () => {
  const href = `/equipe.html#${pubId(9)}?secao=jogos&ano=2025`;
  expect(safePublicReturn(href, pubId(801))).toBe(href);
  expect(
    safePublicReturn(
      `/equipe.html#${pubId(9)}?disputeId=${pubId(802)}`,
      pubId(801),
    ),
  ).toBeNull();
});
