import { z } from "zod";
import { parseStatisticsQuery } from "../statistics/query-contract";
import { parseTeamsListQuery } from "../team-statistics/list-query";
import { safePublicReturn } from "../public-ui/navigation";
export const GENERAL_TABS = [
  { key: "resumo", label: "Visão geral" },
  { key: "competicoes", label: "Competições" },
  { key: "elencos", label: "Elencos" },
  { key: "jogos", label: "Jogos" },
  { key: "estatisticas", label: "Estatísticas" },
] as const;
export const DISPUTE_TABS = [
  GENERAL_TABS[0],
  { key: "jogadores", label: "Jogadores" },
  GENERAL_TABS[3],
] as const;
export function readTeamProfileLocation(hash: string) {
  const [id = "", search = ""] = hash.replace(/^#/, "").split("?", 2);
  const params = new URLSearchParams(search);
  const uuid = (v: string | null) =>
    z.uuid().safeParse(v).data?.toLowerCase() ?? null;
  const disputeId = uuid(params.get("disputeId"));
  const registrationId = uuid(params.get("registrationId"));
  const invalid =
    (params.has("disputeId") && !disputeId) ||
    (params.has("registrationId") && (!registrationId || !disputeId)) ||
    ["disputeId", "registrationId"].some((k) => params.getAll(k).length > 1);
  if (params.has("section")) {
    if (!params.has("jogadores")) {
      const query = new URLSearchParams();
      for (const k of ["mode", "scope"])
        if (params.has(k)) query.set(k, params.get(k)!);
      if (params.has("rosterPage"))
        query.set("page", params.get("rosterPage")!);
      if (query.size) params.set("jogadores", query.toString());
    }
    if (!params.has("coletivos")) {
      const query = new URLSearchParams();
      for (const k of ["mode", "scope"])
        if (params.has(k)) query.set(k, params.get(k)!);
      if (query.size) params.set("coletivos", query.toString());
    }
  }
  let section = params.get("secao") ?? params.get("section") ?? "resumo";
  if (section === "participantes") section = "jogadores";
  if (section === "estatisticas" && disputeId) section = "resumo";
  if (!(disputeId ? DISPUTE_TABS : GENERAL_TABS).some((t) => t.key === section))
    section = "resumo";
  return {
    teamId: invalid ? null : uuid(id),
    disputeId,
    registrationId,
    section,
    params,
  };
}
export type TeamProfileLocation = ReturnType<typeof readTeamProfileLocation>;
export function teamProfileHref(
  teamId: string,
  params = new URLSearchParams(),
) {
  return `/equipe.html#${teamId}${params.size ? `?${params}` : ""}`;
}
export function generalTeamReturn(
  source: string | null,
  teamId: string,
  year: number | null,
) {
  const safe = safePublicReturn(source, null);
  if (safe) {
    const url = new URL(safe, "https://public.example");
    const route = readTeamProfileLocation(url.hash);
    if (
      url.pathname === "/equipe.html" &&
      route.teamId === teamId &&
      !route.disputeId
    )
      return safe;
  }
  return teamProfileHref(
    teamId,
    new URLSearchParams({
      secao: "resumo",
      ...(year ? { ano: String(year) } : {}),
    }),
  );
}
export function profilePlayerQuery(raw: string, registrationId: string) {
  const params = new URLSearchParams(raw.slice(0, 8192));
  params.set("registrationId", registrationId);
  return {
    ...parseStatisticsQuery(params, "all"),
    registrationId,
    teams: null,
    pageSize: 30 as const,
    compare: [],
  };
}
export function profileCollectiveQuery(raw: string) {
  const params = new URLSearchParams(raw.slice(0, 8192));
  params.delete("registrationId");
  params.delete("selection");
  return parseTeamsListQuery(params);
}
