import { z } from "zod";
import { PROFILE_METRICS, type ProfileMetric } from "./public-model";
import { RECORD_METRICS, type RecordMetric } from "./presentation";

export const PROFILE_TABS = [
  { key: "resumo", label: "Visão geral" },
  { key: "estatisticas", label: "Estatísticas" },
  { key: "historico", label: "Carreira" },
  { key: "jogos", label: "Ver jogos" },
] as const;
export type ProfileView = {
  section: (typeof PROFILE_TABS)[number]["key"];
  year: string;
  championship: string;
  teams: string[] | null;
  mode: "per-game" | "total";
  scope: string;
  columns: ProfileMetric[];
  sort: string;
  direction: "asc" | "desc";
  statsPage: number;
  page: number;
  gameYear: string;
  gameChampionship: string;
  gameTeam: string;
  opponent: string;
  expanded: RecordMetric[];
};
const pageNumber = (raw: string | null) =>
  Math.max(1, Math.min(500, Math.floor(Number(raw)) || 1));
export function readProfileLocation(hash: string) {
  const [rawId = "", search = ""] = hash.replace(/^#/, "").split("?", 2);
  const p = new URLSearchParams(search);
  const rawSection = p.get("secao");
  const section = ["recordes", "conquistas"].includes(rawSection ?? "")
    ? "historico"
    : (PROFILE_TABS.find((t) => t.key === rawSection)?.key ?? "resumo");
  return {
    id: z.uuid().safeParse(rawId).success ? rawId.toLowerCase() : null,
    origin: z.uuid().safeParse(p.get("disputeId")).success
      ? p.get("disputeId")!.toLowerCase()
      : null,
    view: {
      section,
      year: p.get("anoPerfil") ?? "",
      championship: p.get("campeonatoPerfil") ?? "",
      teams: p.has("equipesPerfil")
        ? p.get("equipesPerfil")!.split(",").filter(Boolean)
        : null,
      mode: p.get("mode") === "total" ? "total" : "per-game",
      scope: ["regular", "playoffs"].includes(p.get("scope") ?? "")
        ? p.get("scope")!
        : "all",
      columns: p.has("colunasPerfil")
        ? PROFILE_METRICS.filter((m) =>
            p.get("colunasPerfil")!.split(",").includes(m),
          )
        : [...PROFILE_METRICS],
      sort: [
        "competition",
        "team",
        "jersey",
        "games",
        ...PROFILE_METRICS,
      ].includes(p.get("ordemPerfil") ?? "")
        ? p.get("ordemPerfil")!
        : "year",
      direction: p.get("direcaoPerfil") === "asc" ? "asc" : "desc",
      statsPage: pageNumber(p.get("paginaCampeonatos")),
      page: pageNumber(p.get("page")),
      gameYear: p.get("anoJogos") ?? "",
      gameChampionship: p.get("campeonatoJogos") ?? "",
      gameTeam: p.get("equipeJogos") ?? "",
      opponent: (p.get("adversario") ?? "").slice(0, 120),
      expanded: RECORD_METRICS.filter((m) =>
        (p.get("recordesPerfil") ?? "").split(",").includes(m),
      ),
    } as ProfileView,
  };
}
export function profileQuery(view: ProfileView, origin: string | null) {
  const p = new URLSearchParams({ secao: view.section, mode: view.mode });
  if (origin) p.set("disputeId", origin);
  if (view.year) p.set("anoPerfil", view.year);
  if (view.championship) p.set("campeonatoPerfil", view.championship);
  if (view.teams !== null) p.set("equipesPerfil", view.teams.join(","));
  if (view.scope !== "all") p.set("scope", view.scope);
  p.set("colunasPerfil", view.columns.join(","));
  if (view.page > 1) p.set("page", String(view.page));
  if (view.statsPage > 1) p.set("paginaCampeonatos", String(view.statsPage));
  if (view.sort !== "year") p.set("ordemPerfil", view.sort);
  p.set("direcaoPerfil", view.direction);
  if (view.gameYear) p.set("anoJogos", view.gameYear);
  if (view.gameChampionship) p.set("campeonatoJogos", view.gameChampionship);
  if (view.gameTeam) p.set("equipeJogos", view.gameTeam);
  if (view.opponent) p.set("adversario", view.opponent);
  if (view.expanded.length) p.set("recordesPerfil", view.expanded.join(","));
  return p.toString();
}
export function seasonAge(
  publicBirthYear: number | null | undefined,
  year: number,
) {
  return publicBirthYear != null &&
    Number.isInteger(publicBirthYear) &&
    publicBirthYear <= year &&
    year - publicBirthYear <= 120
    ? year - publicBirthYear
    : null;
}
