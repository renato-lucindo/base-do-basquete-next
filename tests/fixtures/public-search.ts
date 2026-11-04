import type { Page } from "@playwright/test";
import type { CatalogGame } from "../../src/public-ui/catalog-contract";
import type { PublicDispute } from "../../src/regulation/publication-contract";
import {
  discoveryPageSchema,
  foldSearch,
  type SearchHit,
} from "../../src/public-ui/search-contract";
// Browser-only responses. Normalization/ranking/visibility have independent real SQL tests.
export function searchFixtureHits(
  games: CatalogGame[],
  confirmed: PublicDispute[],
  players: SearchHit[],
): SearchHit[] {
  const teams = new Map<string, Extract<SearchHit, { kind: "teams" }>>(),
    comps = new Map<string, Extract<SearchHit, { kind: "competitions" }>>();
  for (const source of [
    ...games.map((g) => ({
      disputeId: g.disputeId,
      context: g.context,
      registrations: [g.game.home, g.game.away].map((r) => ({
        ...r,
        id: r.registrationId,
      })),
      hasResults: true,
    })),
    ...confirmed.map((d) => ({ ...d, hasResults: false })),
  ]) {
    const { disputeId, context, hasResults } = source;
    let comp = comps.get(context.championshipId);
    if (!comp) {
      comp = {
        kind: "competitions",
        id: context.championshipId,
        name: context.name,
        disputes: [],
      };
      comps.set(comp.id, comp);
    }
    if (!comp.disputes.some((s) => s.disputeId === disputeId))
      comp.disputes.push({ disputeId, context });
    for (const r of source.registrations) {
      let team = teams.get(r.team.id);
      if (!team) {
        team = {
          kind: "teams",
          id: r.team.id,
          name: r.team.name,
          abbreviation: r.team.abbreviation,
          participations: [],
        };
        teams.set(team.id, team);
      }
      if (
        !team.participations.some(
          (s) => s.disputeId === disputeId && s.registrationId === r.id,
        )
      )
        team.participations.push({
          disputeId,
          context,
          registrationId: r.id,
          name: r.name,
          hasResults,
        });
    }
  }
  return [...players, ...teams.values(), ...comps.values()];
}
export function fixtureSearchPage(hits: SearchHit[], p: URLSearchParams) {
  const q = p.get("q") ?? "",
    type = p.get("type") ?? "all",
    entityId = p.get("entityId"),
    needle = foldSearch(q),
    size = type === "all" ? 5 : 20;
  const aliases = (hit: SearchHit) =>
    [
      hit.name,
      ...(hit.kind === "players"
        ? [hit.nickname ?? ""]
        : hit.kind === "teams"
          ? [hit.abbreviation ?? "", ...hit.participations.map((s) => s.name)]
          : hit.disputes.flatMap((d) => [
              d.context.name,
              `${d.context.name} ${d.context.year} ${d.context.gender === "masculino" ? "Masculino" : "Feminino"} ${d.context.category} ${d.context.division ?? ""}`,
            ])),
    ].map(foldSearch);
  const rank = (hit: SearchHit) =>
    Math.min(
      ...aliases(hit).map((s) =>
        s === needle
          ? 0
          : s.startsWith(needle)
            ? 1
            : s.includes(needle)
              ? 2
              : 3,
      ),
    );
  const matches = hits
    .filter(
      (h) =>
        (type === "all" || type === h.kind) &&
        (!entityId || entityId === h.id) &&
        rank(h) < 3,
    )
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        foldSearch(a.name).localeCompare(foldSearch(b.name)) ||
        a.id.localeCompare(b.id),
    );
  const kinds = ["competitions", "players", "teams"] as const,
    counts = { players: 0, teams: 0, competitions: 0 };
  for (const h of matches) counts[h.kind]++;
  const totalPages = Math.max(
      1,
      ...Object.values(counts).map((n) => Math.ceil(n / size)),
    ),
    page = Math.min(Number(p.get("page") ?? 1), totalPages);
  return discoveryPageSchema.parse({
    query: q,
    type,
    entityId,
    page,
    totalPages,
    counts,
    results: kinds.flatMap((k) =>
      matches
        .filter((h) => h.kind === k)
        .slice((page - 1) * size, page * size)
        .map((h) => {
          if (h.kind !== "competitions" || foldSearch(h.name).includes(needle))
            return h;
          const scopes = h.disputes.filter((d) =>
            foldSearch(
              `${d.context.name} ${d.context.year} ${d.context.gender === "masculino" ? "Masculino" : "Feminino"} ${d.context.category} ${d.context.division ?? ""}`,
            ).includes(needle),
          );
          return {
            ...h,
            directDisputeId: scopes.length === 1 ? scopes[0].disputeId : null,
          };
        }),
    ),
  });
}
export async function publicSearchFixture(
  page: Page,
  getHits: () => SearchHit[],
) {
  const state = {
    calls: [] as URLSearchParams[],
    failNext: false,
    delayNext: 0,
  };
  await page.route("**/api/public/discovery?*", async (route) => {
    const p = new URL(route.request().url()).searchParams;
    state.calls.push(p);
    const delay = state.delayNext;
    state.delayNext = 0;
    const fail = state.failNext;
    state.failNext = false;
    if (delay) await new Promise((r) => setTimeout(r, delay));
    if (fail)
      return route.fulfill({
        status: 503,
        json: { error: { message: "Indisponível" } },
      });
    return route.fulfill({ json: fixtureSearchPage(getHits(), p) });
  });
  return state;
}
