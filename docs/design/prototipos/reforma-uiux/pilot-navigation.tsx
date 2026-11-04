import {
  useState,
  type AnchorHTMLAttributes,
  type SetStateAction,
} from "react";
export type Go = (route: string) => void;
export function PilotLink({
  to,
  go,
  children,
  ...props
}: { to: string; go: Go } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      href={`#${routeWithContext(to)}`}
      onClick={(event) => {
        if (
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey &&
          event.button === 0
        ) {
          event.preventDefault();
          go(to);
        }
      }}
    >
      {children}
    </a>
  );
}
// State is retained only in this fictional pilot's current browser session.
const retained = new Map<string, unknown>();
export function useRetainedState<T>(
  key: string,
  initial: T | (() => T),
): [T, (action: SetStateAction<T>) => void] {
  const [value, setValue] = useState<T>(() =>
    retained.has(key)
      ? (retained.get(key) as T)
      : typeof initial === "function"
        ? (initial as () => T)()
        : initial,
  );
  return [
    value,
    (action) =>
      setValue((previous) => {
        const next =
          typeof action === "function"
            ? (action as (value: T) => T)(previous)
            : action;
        retained.set(key, next);
        return next;
      }),
  ];
}

export const scrollPositions = new Map<string, number>();
type Visit = { route: string; back?: Visit };
let visit: Visit = { route: location.hash.slice(1) || "publico/jogadores" };
const visits = new Map<string, Visit>();
export function routeWithContext(next: string) {
  if (next.includes("?")) return next.endsWith("?") ? next.slice(0, -1) : next;
  if (next.startsWith("admin/") || next.includes("campeonatos")) return next;
  const params = new URLSearchParams(location.hash.split("?")[1]);
  for (const key of [
    "secao",
    "anoPerfil",
    "competicaoPerfil",
    "equipesPerfil",
    "modoPerfil",
  ])
    params.delete(key);
  return `${next}${params.size ? `?${params}` : ""}`;
}
export function rememberNavigation(from: string, to: string) {
  scrollPositions.set(from, window.scrollY);
  const source = { ...visit, route: from };
  visits.set(from, source);
  visit = source.back?.route === to ? source.back : { route: to, back: source };
  visits.set(to, visit);
}
export function returnRoute(route: string, fallback: string) {
  return visit.route.split("?")[0] === route.split("?")[0]
    ? (visit.back?.route ?? fallback)
    : fallback;
}
export function reconcileNavigation(route: string) {
  if (visit.route !== route) visit = visits.get(route) ?? { route };
}
export function syncProfileQuery(values: Record<string, string>) {
  const [path, query] = location.hash.slice(1).split("?");
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries(values)) {
    if (value === "all" || value === "resumo") params.delete(key);
    else params.set(key, value);
  }
  history.replaceState(null, "", `#${path}${params.size ? `?${params}` : ""}`);
}
