import {
  regulationStateSchema,
  previewRegulationDefinition,
} from "../regulation/persistence-contract";
import {
  placementSuggestionRequestSchema,
  placementSuggestionSchema,
  type PlacementSuggestion,
} from "./contract";

/** Private read-only suggestion from a server-derived state. It never confirms an award. */
export function suggestPlacements(
  requestInput: unknown,
  stateInput: unknown,
): PlacementSuggestion {
  const c = placementSuggestionRequestSchema.parse(requestInput),
    s = regulationStateSchema.parse(stateInput);
  if (c.disputeId !== s.disputeId)
    throw Error("A fonte não pertence à disputa selecionada.");
  const base = {
    algorithmVersion: "placement-suggestion-v1" as const,
    status: "suggestion" as const,
    requiresConfirmation: true as const,
    disputeId: s.disputeId,
    regulationVersion: s.version,
    contextFingerprint: s.contextFingerprint,
    source: c.source,
  };
  const result = (
    needs: PlacementSuggestion["needs"],
    placements: PlacementSuggestion["placements"] = [],
  ) =>
    placementSuggestionSchema.parse({
      ...base,
      ready: needs === null,
      needs,
      placements,
    });
  if (!s.definition) return result("regulation_required");
  if (
    c.expectedRegulationVersion !== s.version ||
    c.expectedContextFingerprint !== s.contextFingerprint
  )
    return result("context_changed");
  if (!c.source) return result("source_required");
  // Reuse the authoritative rule engine, including administrative outcomes,
  // unresolved ties and entrant conflicts. Do not maintain another ranking formula.
  const projection = previewRegulationDefinition(
      s.definition,
      s.context,
      s.disputeId,
      s.version,
    ),
    source = c.source;
  if (source.kind === "group") {
    const group = projection.groupPhases
      .find((p) => p.phaseId === source.phaseId)
      ?.groups.find((g) => g.groupId === source.groupId);
    if (!group) return result("source_missing");
    if (
      group.pendingGameIds.length ||
      group.standings.status === "empty" ||
      !group.standings.rows.length
    )
      return result("group_results");
    if (
      group.standings.unresolvedTies.length ||
      group.standings.rows.some((r) => r.tied || r.position === null)
    )
      return result("group_tie");
    return result(
      null,
      group.standings.rows
        .map((r) => ({
          position: r.position!,
          registrationIds: [r.registrationId],
        }))
        .sort((a, b) => a.position - b.position),
    );
  }
  const final = projection.series.find((n) => n.id === source.finalSeriesId),
    bronze =
      source.bronzeSeriesId === null
        ? null
        : projection.series.find((n) => n.id === source.bronzeSeriesId);
  if (!final || (source.bronzeSeriesId !== null && !bronze))
    return result("source_missing");
  type Series = typeof final;
  const pair = (n: Series): [string, string] | null => {
    const home = n.home.registrationId,
      away = n.away.registrationId,
      winner = n.result?.winnerRegistrationId;
    if (
      n.status !== "complete" ||
      n.result?.status !== "complete" ||
      n.conflicts.length ||
      n.home.status !== "ready" ||
      n.away.status !== "ready" ||
      !home ||
      !away ||
      home === away ||
      ![home, away].includes(winner ?? "")
    )
      return null;
    return [winner!, winner === home ? away : home];
  };
  const finalPair = pair(final);
  if (!finalPair)
    return result(
      final.status === "conflict" ? "series_conflict" : "series_pending",
    );
  const placements = finalPair.map((r, i) => ({
    position: i + 1,
    registrationIds: [r],
  }));
  if (bronze) {
    const bronzePair = pair(bronze);
    if (!bronzePair)
      return result(
        bronze.status === "conflict" ? "series_conflict" : "series_pending",
        placements,
      );
    if (bronzePair.some((r) => finalPair.includes(r)))
      return result("podium_conflict");
    placements.push(
      ...bronzePair.map((r, i) => ({ position: i + 3, registrationIds: [r] })),
    );
  }
  return result(null, placements);
}
