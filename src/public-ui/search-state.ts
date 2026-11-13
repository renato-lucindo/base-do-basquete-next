import { useEffect, useState } from "react";
import { api } from "../competition/api";
import {
  discoveryPageSchema,
  discoveryQuerySchema,
  type DiscoveryQuery,
  type DiscoveryPage,
  type SearchType,
} from "./search-contract";
const searchNumber = new Intl.NumberFormat("pt-BR");
export const resultCount = (n: number) =>
  `${searchNumber.format(n)} ${n === 1 ? "resultado" : "resultados"}`;
export const PUBLIC_SEARCH_EVENT = "public-search-submit";
export const searchLabels = {
  all: "Todos",
  players: "Jogadores",
  teams: "Equipes",
  competitions: "Campeonatos",
};
export function readSearch() {
  const p = new URLSearchParams(location.hash.split("?")[1] ?? "");
  return {
    q: (p.get("q") ?? "").trim(),
    type: p.get("type") ?? "all",
    page: p.has("page") ? Number(p.get("page")) : 1,
    entityId: p.get("entityId"),
  };
}
export function searchHref(
  q: string,
  type: SearchType = "all",
  page = 1,
  entityId: string | null = null,
) {
  const p = new URLSearchParams({ q });
  if (type !== "all") p.set("type", type);
  if (page > 1) p.set("page", String(page));
  if (entityId) p.set("entityId", entityId);
  return `/publico.html#?${p}`;
}
export function usePublicSearch(
  query: DiscoveryQuery | null,
  enabled = true,
  delay = 0,
  attempt = 0,
) {
  const key = query ? JSON.stringify(query) : "";
  const [state, setState] = useState<{
    key: string;
    data: DiscoveryPage | null;
    error: string;
    loading: boolean;
  }>({ key: "", data: null, error: "", loading: false });
  useEffect(() => {
    if (!key || !enabled) return;
    const q: DiscoveryQuery = JSON.parse(key),
      c = new AbortController();
    setState({ key, data: null, error: "", loading: true });
    const timer = setTimeout(() => {
      const p = new URLSearchParams({
        q: q.q,
        type: q.type,
        page: String(q.page),
      });
      if (q.entityId) p.set("entityId", q.entityId);
      if (q.view) p.set("view", q.view);
      void api(
        `/api/public/discovery?${p}`,
        discoveryPageSchema,
        undefined,
        c.signal,
      )
        .then((data) => {
          if (
            data.query !== q.q ||
            data.type !== q.type ||
            data.entityId !== q.entityId ||
            data.view !== q.view ||
            data.page !== Math.min(q.page, data.totalPages)
          )
            throw Error("Uncorrelated search");
          if (!c.signal.aborted)
            setState({ key, data, error: "", loading: false });
        })
        .catch(() => {
          if (!c.signal.aborted)
            setState({
              key,
              data: null,
              error: "Não foi possível buscar agora. Tente novamente.",
              loading: false,
            });
        });
    }, delay);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [key, enabled, delay, attempt]);
  return enabled && key && state.key === key
    ? state
    : { key, data: null, error: "", loading: !!key && enabled };
}
export function useSearchRoute() {
  const [raw, setRaw] = useState(readSearch),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const read = () => setRaw(readSearch()),
      submit = () => {
        read();
        setAttempt((n) => n + 1);
      };
    window.addEventListener("hashchange", read);
    window.addEventListener(PUBLIC_SEARCH_EVENT, submit);
    return () => {
      window.removeEventListener("hashchange", read);
      window.removeEventListener(PUBLIC_SEARCH_EVENT, submit);
    };
  }, []);
  const parsed = discoveryQuerySchema.safeParse({ ...raw, view: "results" });
  return {
    raw,
    query: parsed.success ? parsed.data : null,
    attempt,
    retry: () => setAttempt((n) => n + 1),
  };
}
