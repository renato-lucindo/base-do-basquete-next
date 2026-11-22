import { expect, it } from "vitest";
import { buildStatisticsPage } from "../statistics/query";
import {
  parseStatisticsQuery,
  serializeStatisticsQuery,
} from "../statistics/query-contract";
import { teamStatisticsFixture } from "../../tests/fixtures/team-statistics";
import { pubId } from "../../tests/fixtures/publication";
it("restringe fatos à inscrição antes de calcular estatísticas e ranking", () => {
  const q = parseStatisticsQuery(
    new URLSearchParams(`registrationId=${pubId(5)}`),
  );
  const page = buildStatisticsPage(teamStatisticsFixture(), q);
  expect(page.rows.length).toBeGreaterThan(0);
  expect(page.rows.every((r) => r.registrationId === pubId(5))).toBe(true);
  expect(serializeStatisticsQuery(q).toString()).toContain(
    `registrationId=${pubId(5)}`,
  );
});
it("recusa uma inscrição inválida em vez de ampliar o recorte", () => {
  expect(() =>
    parseStatisticsQuery(new URLSearchParams("registrationId=invalid")),
  ).toThrow();
});
