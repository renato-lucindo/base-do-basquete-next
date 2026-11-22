import { z } from "zod";
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
  let section = params.get("secao") ?? params.get("section") ?? "resumo";
  if (section === "participantes") section = "jogadores";
  if (section === "estatisticas" && disputeId) section = "resumo";
  if (!(disputeId ? DISPUTE_TABS : GENERAL_TABS).some((t) => t.key === section))
    section = "resumo";
  return {
    teamId: uuid(id),
    disputeId,
    registrationId: uuid(params.get("registrationId")),
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
