import { z } from "zod";
import { teamsPageSchema, type TeamsPage } from "./contract";
import { teamDetailPageSchema, type TeamDetailPage } from "./detail-contract";
import {
  parseTeamsQuery,
  serializeTeamsQuery,
  type TeamsQuery,
} from "./query-contract";
import {
  parseTeamDetailQuery,
  serializeTeamDetailQuery,
  type TeamDetailQuery,
} from "./detail-query";
export type TeamRoute =
  | { kind: "invalid" }
  | { kind: "list"; disputeId: string; query: TeamsQuery }
  | {
      kind: "detail";
      disputeId: string;
      teamId: string;
      registrationId: string | null;
      query: TeamDetailQuery;
      listState: TeamsQuery | null;
    };
export const teamPublicResponseSchema = z.union([
  teamsPageSchema,
  teamDetailPageSchema,
]);
export type TeamPublicResponse = TeamsPage | TeamDetailPage;
const uuid = (v: string | null) => z.uuid().parse(v).toLowerCase();
export function readTeamRoute(
  kind: "list" | "detail",
  hash: string,
): TeamRoute {
  const [id = "", search = ""] = hash.replace(/^#/u, "").split("?", 2),
    p = new URLSearchParams(search);
  try {
    if (kind === "list")
      return { kind, disputeId: uuid(id), query: parseTeamsQuery(p) };
    const from = p.get("listState");
    return {
      kind,
      teamId: uuid(id),
      disputeId: uuid(p.get("disputeId")),
      registrationId: p.has("registrationId")
        ? uuid(p.get("registrationId"))
        : null,
      query: parseTeamDetailQuery(p),
      listState: from
        ? parseTeamsQuery(new URLSearchParams(from.slice(0, 1000)))
        : null,
    };
  } catch {
    return { kind: "invalid" };
  }
}
export function serializeTeamRoute(r: TeamRoute): string {
  if (r.kind === "invalid") return "#";
  if (r.kind === "list")
    return `#${r.disputeId}?${serializeTeamsQuery(r.query)}`;
  const p = new URLSearchParams(serializeTeamDetailQuery(r.query));
  p.set("disputeId", r.disputeId);
  if (r.registrationId) p.set("registrationId", r.registrationId);
  if (r.listState) p.set("listState", serializeTeamsQuery(r.listState));
  return `#${r.teamId}?${p}`;
}
export function teamApiPath(
  r: Exclude<TeamRoute, { kind: "invalid" }>,
): string {
  if (r.kind === "list")
    return `/api/public/teams/${r.disputeId}?${serializeTeamsQuery(r.query)}`;
  const p = new URLSearchParams(serializeTeamDetailQuery(r.query));
  if (r.registrationId) p.set("registrationId", r.registrationId);
  return `/api/public/teams/${r.disputeId}/${r.teamId}?${p}`;
}
export function teamRouteForResponse(
  r: TeamRoute,
  d: TeamPublicResponse,
): TeamRoute {
  if (r.kind === "invalid" || r.disputeId !== d.disputeId)
    throw Error("Consulta incompatível.");
  if (r.kind === "list") {
    if (
      d.kind !== "confirmed-teams-page-v1" ||
      d.query.page > r.query.page ||
      serializeTeamsQuery({ ...d.query, page: r.query.page }) !==
        serializeTeamsQuery(r.query)
    )
      throw Error("Consulta incompatível.");
    return { ...r, query: d.query };
  }
  if (
    d.kind === "confirmed-teams-page-v1" ||
    d.teamId !== r.teamId ||
    d.query.page > r.query.page ||
    d.query.rosterPage > r.query.rosterPage ||
    serializeTeamDetailQuery({
      ...d.query,
      page: r.query.page,
      rosterPage: r.query.rosterPage,
    }) !== serializeTeamDetailQuery(r.query) ||
    (r.registrationId !== null &&
      (d.kind !== "confirmed-team-detail-v1" ||
        d.registrationId !== r.registrationId))
  )
    throw Error("Consulta incompatível.");
  return {
    ...r,
    query: d.query,
    registrationId:
      d.kind === "confirmed-team-detail-v1" ? d.registrationId : null,
  };
}
export function teamDetailLink(
  disputeId: string,
  teamId: string,
  registrationId: string,
  listState: TeamsQuery | null = null,
): string {
  const q = parseTeamDetailQuery(new URLSearchParams());
  return (
    "/equipe.html" +
    serializeTeamRoute({
      kind: "detail",
      disputeId,
      teamId,
      registrationId,
      query: {
        ...q,
        mode: listState?.mode ?? q.mode,
        scope: listState?.scope ?? q.scope,
      },
      listState,
    })
  );
}
