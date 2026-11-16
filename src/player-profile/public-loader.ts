import { api, ApiFailure } from "../competition/api";
import {
  playerProfilePageSchema,
  type PlayerProfilePage,
} from "./page-contract";
import { parseProfileQuery, serializeProfileQuery } from "./query-contract";
import { validatePublicCareer } from "./public-model";
import { siteDisputeId } from "../public-ui/site";

const unavailable = () =>
  new ApiFailure(
    503,
    "As publicações mudaram ou a consulta ficou incompleta. Atualize o perfil.",
  );
const signature = (p: PlayerProfilePage) =>
  JSON.stringify([
    p.personId,
    p.identity.name,
    p.identity.nickname,
    p.identity.origin,
    p.identity.metadata,
    p.contexts,
    p.statistics,
    p.honors,
    p.teamPlacements,
    p.games.total,
    p.historyPagination.total,
  ]);

/** Uses the existing public paginated contract; no private or direct database access. */
export async function loadPublicCareer(id: string, signal: AbortSignal) {
  const base = parseProfileQuery(new URLSearchParams());
  if (siteDisputeId) base.disputeId = siteDisputeId;
  async function read(page: number, historyPage: number) {
    const query = { ...base, page, historyPage };
    const data = await api(
      `/api/public/players/${id}?${serializeProfileQuery(query)}&age=1`,
      playerProfilePageSchema,
      undefined,
      signal,
    );
    if (
      data.personId !== id ||
      serializeProfileQuery(data.query) !== serializeProfileQuery(query)
    )
      throw unavailable();
    return data;
  }
  const first = await read(1, 1);
  // Matches the existing source bound. Never silently truncate a career.
  if (first.games.total > 10000 || first.historyPagination.total > 10000)
    throw unavailable();
  const pages: PlayerProfilePage[] = [first];
  const count = Math.max(
    first.games.totalPages,
    first.historyPagination.totalPages,
  );
  // Bound concurrency and cancel the entire read on route changes or retry.
  for (let offset = 2; offset <= count; offset += 3) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(3, count - offset + 1) }, (_, i) =>
        read(
          Math.min(offset + i, first.games.totalPages),
          Math.min(offset + i, first.historyPagination.totalPages),
        ),
      ),
    );
    if (batch.some((p) => signature(p) !== signature(first)))
      throw unavailable();
    pages.push(...batch);
  }
  const games = [
    ...new Map(pages.map((p) => [p.games.page, p.games.items])).values(),
  ].flat();
  const history = [
    ...new Map(
      pages.map((p) => [p.historyPagination.page, p.history]),
    ).values(),
  ].flat();
  return validatePublicCareer({ page: first, games, history });
}
