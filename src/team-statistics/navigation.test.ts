import { expect, it } from "vitest";
import { teamStatisticsFixture } from "../../tests/fixtures/team-statistics";
import { pubId } from "../../tests/fixtures/publication";
import {
  readTeamRoute,
  serializeTeamRoute,
  teamRouteForResponse,
} from "./navigation";
import { buildTeamsPage } from "./domain";
import { buildTeamDetail } from "./detail";
it("somente clamp de página pode mudar consulta devolvida pelo backend", () => {
  const s = teamStatisticsFixture(),
    r = readTeamRoute("list", `#${s.disputeId}?page=999&scope=all`);
  if (r.kind !== "list") throw Error("lista esperada");
  const d = buildTeamsPage(s, r.query);
  expect(teamRouteForResponse(r, d).kind).toBe("list");
  expect(() =>
    teamRouteForResponse(r, { ...d, query: { ...d.query, scope: "regular" } }),
  ).toThrow();
  expect(() =>
    teamRouteForResponse(r, { ...d, disputeId: pubId(99) }),
  ).toThrow();
});
it("detalhe não troca inscrição em resposta válida e retorno não aceita URL externa", () => {
  const s = teamStatisticsFixture(),
    r = readTeamRoute(
      "detail",
      `#${pubId(9)}?disputeId=${s.disputeId}&registrationId=${pubId(5)}&listState=https://outside.example/path`,
    );
  if (r.kind !== "detail") throw Error("detalhe esperado");
  const d = buildTeamDetail(s, pubId(9), pubId(6), r.query)!;
  expect(() => teamRouteForResponse(r, d)).toThrow();
  expect(serializeTeamRoute(r)).not.toContain("outside.example");
  expect(readTeamRoute("detail", `#${pubId(9)}?disputeId=bad`).kind).toBe(
    "invalid",
  );
});
