import { api, ApiFailure } from "../competition/api";
import {
  catalogPageSchema,
  type CatalogGame,
} from "../public-ui/catalog-contract";
import { discoveryPageSchema } from "../public-ui/search-contract";
import { disputeStatusSchema } from "../competition/administration-contract";
import { publicStandingsSchema } from "../regulation/public-contract";
import { publicAchievementsSchema } from "../achievements/publication-contract";
import {
  participationPlacement,
  type TeamParticipation,
  type TeamProfile,
} from "./model";
import type { z } from "zod";
const capacity = () =>
  new ApiFailure(413, "O histórico excede a capacidade desta consulta.");
function validateCatalog(
  page: z.infer<typeof catalogPageSchema>,
  disputeId: string | null,
  after: string | null,
) {
  let previous = after;
  for (const game of page.games) {
    if (
      (previous && game.id <= previous) ||
      (disputeId && game.disputeId !== disputeId)
    )
      throw new ApiFailure(503, "O catálogo mudou. Atualize o perfil.");
    previous = game.id;
  }
  if (
    page.disputes.some((d) => disputeId && d.disputeId !== disputeId) ||
    (page.next && (!page.games.length || page.next !== previous))
  )
    throw new ApiFailure(503, "O catálogo mudou. Atualize o perfil.");
}
async function optional<T>(
  path: string,
  schema: z.ZodType<T>,
  signal: AbortSignal,
): Promise<T | null> {
  try {
    return await api(path, schema.nullable(), undefined, signal);
  } catch (error) {
    if (error instanceof ApiFailure && error.status === 404) return null;
    throw error;
  }
}
async function catalog(disputeId: string | null, signal: AbortSignal) {
  const games: CatalogGame[] = [];
  let after: string | null = null;
  let first: z.infer<typeof catalogPageSchema> | null = null;
  do {
    const params = new URLSearchParams();
    if (disputeId) params.set("disputeId", disputeId);
    if (after) params.set("after", after);
    const page = await api(
      `/api/public/catalog?${params}`,
      catalogPageSchema,
      undefined,
      signal,
    );
    first ??= page;
    validateCatalog(page, disputeId, after);
    if (
      page.next &&
      (!page.games.length || page.next !== page.games.at(-1)?.id)
    )
      throw new ApiFailure(503, "O catálogo mudou. Atualize o perfil.");
    if (
      (after && page.games.some((g) => g.id <= after!)) ||
      page.games.some((g) => disputeId && g.disputeId !== disputeId)
    )
      throw new ApiFailure(503, "O catálogo mudou. Atualize o perfil.");
    games.push(...page.games);
    if (games.length > 10000) throw capacity();
    after = page.next;
  } while (after);
  if (new Set(games.map((g) => g.id)).size !== games.length)
    throw new ApiFailure(503, "O catálogo mudou. Atualize o perfil.");
  return { games, disputes: first!.disputes };
}
/** Composes existing anonymous projections. Preview/site scope is never widened. */
export async function loadTeamProfile(
  teamId: string,
  signal: AbortSignal,
  scopeId: string | null,
): Promise<TeamProfile> {
  // The first catalog page contains the public dispute index; resolve identity
  // there before asking the identity-filtered search for the complete history.
  const first = await api(
    `/api/public/catalog?${scopeId ? `disputeId=${scopeId}` : ""}`,
    catalogPageSchema,
    undefined,
    signal,
  );
  validateCatalog(first, scopeId, null);
  let known = first.disputes.flatMap((d) =>
    d.registrations
      .filter((r) => r.team.id === teamId)
      .map((r) => ({
        disputeId: d.disputeId,
        context: d.context,
        registrationId: r.id,
        name: r.name,
        teamName: r.team.name,
        abbreviation: r.team.abbreviation ?? null,
      })),
  );
  let initialGames = first.games;
  if (!known.length) {
    if (first.next) {
      const full = await catalog(scopeId, signal);
      initialGames = full.games;
    }
    known = initialGames.flatMap((g) =>
      [g.game.home, g.game.away]
        .filter((r) => r.team.id === teamId)
        .map((r) => ({
          disputeId: g.disputeId,
          context: g.context,
          registrationId: r.registrationId,
          name: r.name,
          teamName: r.team.name,
          abbreviation: r.team.abbreviation ?? null,
        })),
    );
  }
  if (!known.length)
    throw new ApiFailure(
      404,
      "Nenhuma participação pública encontrada para esta equipe.",
    );
  let name = known[0].teamName,
    abbreviation = known[0].abbreviation;
  if (!scopeId) {
    const query = new URLSearchParams({
      q: name,
      type: "teams",
      entityId: teamId,
    });
    const result = await api(
      `/api/public/discovery?${query}`,
      discoveryPageSchema,
      undefined,
      signal,
    );
    if (result.entityId !== teamId || result.type !== "teams")
      throw new ApiFailure(
        503,
        "A identidade pública mudou. Atualize o perfil.",
      );
    const team = result.results.find(
      (r) => r.kind === "teams" && r.id === teamId,
    );
    if (!team || team.kind !== "teams")
      throw new ApiFailure(
        503,
        "A identidade pública mudou. Atualize o perfil.",
      );
    name = team.name;
    abbreviation = team.abbreviation;
    known = team.participations.map((p) => ({
      ...p,
      teamName: name,
      abbreviation,
    }));
  }
  const identities = [
    ...new Map(
      known
        .filter((p) => !scopeId || p.disputeId === scopeId)
        .map((p) => [`${p.disputeId}/${p.registrationId}`, p]),
    ).values(),
  ];
  if (identities.length > 1000) throw capacity();
  const disputeIds = [...new Set(identities.map((p) => p.disputeId))];
  const participations: TeamParticipation[] = [];
  const honors: TeamProfile["honors"] = [];
  let gameCount = 0;
  for (let offset = 0; offset < disputeIds.length; offset += 3) {
    const contexts = await Promise.all(
      disputeIds.slice(offset, offset + 3).map(async (id) => {
        const [publicCatalog, standings, awards, status] = await Promise.all([
          catalog(id, signal),
          optional(
            `/api/public/standings/${id}`,
            publicStandingsSchema,
            signal,
          ),
          optional(
            `/api/public/achievements/${id}`,
            publicAchievementsSchema,
            signal,
          ),
          api(
            `/api/public/dispute-status/${id}`,
            disputeStatusSchema.nullable(),
            undefined,
            signal,
          ),
        ]);
        if (
          (standings && standings.disputeId !== id) ||
          (awards && awards.disputeId !== id)
        )
          throw new ApiFailure(503, "Contexto público inconsistente.");
        return { id, publicCatalog, standings, awards, status };
      }),
    );
    for (const item of contexts) {
      const { id, publicCatalog, standings, awards, status } = item;
      const ownGames = publicCatalog.games.filter((g) =>
        [g.game.home.team.id, g.game.away.team.id].includes(teamId),
      );
      gameCount += ownGames.length;
      if (gameCount > 10000) throw capacity();
      const publicIds = new Set([
        ...publicCatalog.disputes.flatMap((d) =>
          d.registrations.filter((r) => r.team.id === teamId).map((r) => r.id),
        ),
        ...ownGames.flatMap((g) =>
          [g.game.home, g.game.away]
            .filter((r) => r.team.id === teamId)
            .map((r) => r.registrationId),
        ),
        ...(awards?.placements.flatMap((p) =>
          p.registrations
            .filter((r) => r.teamId === teamId)
            .map((r) => r.registrationId),
        ) ?? []),
      ]);
      for (const p of identities.filter(
        (p) => p.disputeId === id && publicIds.has(p.registrationId),
      )) {
        const placement = participationPlacement(awards, p.registrationId);
        participations.push({
          disputeId: id,
          registrationId: p.registrationId,
          name: p.name,
          context: p.context,
          status,
          standings,
          catalog: ownGames,
          placement,
        });
        if (placement)
          honors.push({
            ...p.context,
            disputeId: id,
            registrationId: p.registrationId,
            name: p.name,
            position: placement,
          });
      }
    }
  }
  if (!participations.length)
    throw new ApiFailure(
      404,
      "Nenhuma participação pública encontrada para esta equipe.",
    );
  return { teamId, name, abbreviation, participations, honors };
}
