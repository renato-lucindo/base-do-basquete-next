import { participations, type Participation } from "./fixtures";

export const tabs = [
  { key: "visao-geral", label: "Visão geral" },
  { key: "estatisticas", label: "Estatísticas" },
  { key: "elencos", label: "Elencos" },
  { key: "jogos", label: "Jogos" },
] as const;
export type Tab = (typeof tabs)[number]["key"];
export type Mode = "por-jogo" | "totais";
export type TeamRoute = {
  view: "equipe";
  tab: Tab;
  registration: Participation | null;
  rosterList: boolean;
  mode: Mode;
  back: string;
};
export type TournamentRoute = {
  view: "classificacao";
  registration: Participation;
  phase: string;
  group: string | null;
};
export type Route =
  | TeamRoute
  | TournamentRoute
  | { view: "busca"; q: string }
  | {
      view: "partida";
      registration: Participation;
      gameId: string;
      back: string;
    };

const find = (id: string | null) =>
  participations.find((p) => p.id === id) ?? null;
function fragment(view: string, params: URLSearchParams) {
  return `#${view}${params.size ? `?${params}` : ""}`;
}
function safeBack(
  value: string | null,
  fallback: string,
  allowed: readonly string[],
) {
  const name = value?.slice(1).split("?")[0];
  return value?.startsWith("#") && name && allowed.includes(name)
    ? value
    : fallback;
}
export function searchHref(q = "") {
  return fragment("busca", new URLSearchParams(q ? { q } : undefined));
}
export function teamHref(route: Omit<TeamRoute, "view">) {
  const params = new URLSearchParams({ aba: route.tab });
  if (route.registration) {
    params.set("disputa", route.registration.dispute);
    params.set("inscricao", route.registration.id);
  }
  if (route.rosterList) params.set("elenco", "lista");
  if (route.mode === "totais") params.set("modo", "totais");
  if (route.back !== "#busca") params.set("voltar", route.back);
  return fragment("equipe", params);
}
export function openTeam(
  back: string,
  registration: Participation | null = null,
) {
  return teamHref({
    tab: registration ? "estatisticas" : "visao-geral",
    registration,
    mode: "por-jogo",
    back,
    rosterList: false,
  });
}
export function standingsHref(
  p: Participation,
  phase = p.knockout?.phase ?? p.group?.phase ?? "classificatoria",
  group = phase === p.group?.phase ? p.group.id : null,
) {
  return fragment(
    "classificacao",
    new URLSearchParams({
      disputa: p.dispute,
      inscricao: p.id,
      fase: phase,
      ...(group ? { grupo: group } : {}),
    }),
  );
}
export function gameHref(p: Participation, gameId: string, back: string) {
  return fragment(
    "partida",
    new URLSearchParams({ inscricao: p.id, jogo: gameId, voltar: back }),
  );
}
export function readRoute(hash: string): Route {
  const [view, query] = hash.slice(1).split("?", 2);
  const p = new URLSearchParams(query);
  const registration = find(p.get("inscricao"));
  if (view === "equipe") {
    const matchingRegistration =
      registration?.dispute === p.get("disputa") ? registration : null;
    const tab =
      tabs.find((item) => item.key === p.get("aba"))?.key ?? "visao-geral";
    return {
      view,
      tab,
      registration: matchingRegistration,
      rosterList: p.get("elenco") === "lista",
      mode: p.get("modo") === "totais" ? "totais" : "por-jogo",
      back: safeBack(p.get("voltar"), "#busca", ["busca", "classificacao"]),
    };
  }
  if (view === "classificacao") {
    if (!registration || registration.dispute !== p.get("disputa"))
      return { view: "busca", q: "" };
    const current = registration;
    const isGroup = current.group && p.get("fase") === current.group.phase;
    const phase = isGroup
      ? current.group!.phase
      : (current.knockout?.phase ?? current.group?.phase ?? "classificatoria");
    const group = phase === current.group?.phase ? current.group.id : null;
    return { view, registration: current, phase, group };
  }
  if (view === "partida" && registration && p.has("jogo"))
    return {
      view,
      registration,
      gameId: p.get("jogo")!,
      back: safeBack(p.get("voltar"), openTeam("#busca", registration), [
        "equipe",
      ]),
    };
  return { view: "busca", q: p.get("q") ?? "" };
}
