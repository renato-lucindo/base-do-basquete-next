import { useEffect, useId, useState } from "react";

export const PUBLIC_SEARCH_EVENT = "public-search-submit";
const currentSearch = () =>
  window.location.pathname === "/publico.html" &&
  window.location.hash.startsWith("#?")
    ? (new URLSearchParams(window.location.hash.slice(2)).get("q") ?? "")
    : "";

/** Shared public entry. The following search unit adds server-backed autosuggest. */
export function PublicSearchForm() {
  const id = useId();
  const [query, setQuery] = useState(currentSearch);
  useEffect(() => {
    const read = () => setQuery(currentSearch());
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return (
    <form
      role="search"
      aria-label="Busca pública"
      className="public-search public-header-search"
      onSubmit={(e) => {
        e.preventDefault();
        const hash = `#?${new URLSearchParams({ q: query.trim() })}`;
        if (window.location.pathname === "/publico.html") {
          window.location.hash = hash;
          window.dispatchEvent(new Event(PUBLIC_SEARCH_EVENT));
        } else window.location.assign(`/publico.html${hash}`);
      }}
    >
      <label className="public-visually-hidden" htmlFor={id}>
        Buscar competições, disputas, equipes ou jogadores
      </label>
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </svg>
      <input
        id={id}
        name="q"
        type="search"
        maxLength={120}
        autoComplete="off"
        placeholder="Jogadores, equipes ou campeonatos"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" aria-label="Buscar na base">
        Buscar
      </button>
    </form>
  );
}
