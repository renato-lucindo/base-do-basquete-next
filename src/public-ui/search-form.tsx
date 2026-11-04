import { useEffect, useId, useRef, useState } from "react";
import {
  discoveryQuerySchema,
  searchTypes,
  type SearchType,
} from "./search-contract";
import {
  searchHref,
  searchLabels,
  resultCount,
  usePublicSearch,
  PUBLIC_SEARCH_EVENT,
  readSearch,
} from "./search-state";
import { searchHitHref, searchHitDescription } from "./search-results";
import "./search.css";
export { PUBLIC_SEARCH_EVENT } from "./search-state";
const current = () =>
  location.pathname === "/publico.html" && location.hash.startsWith("#?")
    ? readSearch()
    : { q: "", type: "all" };
export function PublicSearchForm() {
  const id = useId(),
    form = useRef<HTMLFormElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(() => current().q),
    [type, setType] = useState<SearchType>(() => {
      const t = current().type;
      return searchTypes.includes(t as SearchType) ? (t as SearchType) : "all";
    }),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1),
    [attempt, setAttempt] = useState(0);
  const parsed = discoveryQuerySchema.safeParse({
      q: query,
      type,
      page: 1,
      entityId: null,
    }),
    valid = parsed.success ? parsed.data : null,
    state = usePublicSearch(valid, open, 300, attempt);
  const hits = [...(state.data?.results ?? [])].sort(
      (a, b) => searchTypes.indexOf(a.kind) - searchTypes.indexOf(b.kind),
    ),
    activeId =
      active >= 0 && hits[active] ? `${id}-option-${active}` : undefined;
  useEffect(() => {
    const read = () => {
      setQuery(current().q);
      const t = current().type;
      setType(
        searchTypes.includes(t as SearchType) ? (t as SearchType) : "all",
      );
      setOpen(false);
      setActive(-1);
    };
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!form.current?.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => {
    if (open && activeId)
      document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [open, activeId]);
  function submit() {
    if (query.trim() && !valid) {
      input.current?.focus();
      setOpen(true);
      return;
    }
    setOpen(false);
    setActive(-1);
    const target = searchHref(query.trim(), type);
    if (location.pathname === "/publico.html") {
      location.hash = target.split("#")[1];
      window.dispatchEvent(new Event(PUBLIC_SEARCH_EVENT));
    } else location.assign(target);
  }
  return (
    <form
      ref={form}
      role="search"
      aria-label="Busca pública"
      className="public-search public-header-search"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false);
          setActive(-1);
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          input.current?.focus();
          setOpen(false);
          setActive(-1);
          return;
        }
        if (e.target !== input.current) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          setOpen(true);
          if (hits.length)
            setActive((n) =>
              e.key === "ArrowDown"
                ? (n + 1) % hits.length
                : (n <= 0 ? hits.length : n) - 1,
            );
        } else if (
          open &&
          hits.length &&
          active >= 0 &&
          (e.key === "Home" || e.key === "End")
        ) {
          e.preventDefault();
          setActive(e.key === "Home" ? 0 : hits.length - 1);
        } else if (e.key === "Enter" && open && active >= 0 && hits[active]) {
          e.preventDefault();
          location.assign(searchHitHref(hits[active], query.trim()));
        }
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
        ref={input}
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? `${id}-listbox` : undefined}
        aria-activedescendant={activeId}
        name="q"
        type="search"
        maxLength={120}
        autoComplete="off"
        placeholder="Jogadores, equipes ou campeonatos"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
      />
      <button type="submit" aria-label="Buscar na base">
        Buscar
      </button>
      {open && (
        <div className="public-autocomplete">
          <div className="public-search-types" aria-label="Filtrar sugestões">
            {searchTypes.map((t) => (
              <button
                type="button"
                key={t}
                aria-pressed={type === t}
                onClick={() => {
                  setType(t);
                  setActive(-1);
                  input.current?.focus();
                }}
              >
                {searchLabels[t]}
              </button>
            ))}
          </div>
          <p role="status">
            {!valid
              ? "Digite pelo menos 2 caracteres para buscar."
              : state.loading
                ? "Buscando…"
                : state.data
                  ? resultCount(
                      Object.values(state.data.counts).reduce(
                        (a, b) => a + b,
                        0,
                      ),
                    )
                  : ""}
          </p>
          {state.error && (
            <p role="alert">
              {state.error}{" "}
              <button type="button" onClick={() => setAttempt((n) => n + 1)}>
                Tentar novamente
              </button>
            </p>
          )}
          <div
            id={`${id}-listbox`}
            role="listbox"
            aria-label="Sugestões da busca"
            className="public-suggestion-list"
          >
            {searchTypes
              .filter((t) => t !== "all")
              .map((t) => {
                const group = hits
                  .map((hit, index) => ({ hit, index }))
                  .filter(({ hit }) => hit.kind === t);
                return group.length ? (
                  <div key={t} role="group" aria-label={searchLabels[t]}>
                    <div
                      className="public-suggestion-heading"
                      aria-hidden="true"
                    >
                      {searchLabels[t]}
                    </div>
                    {group.map(({ hit, index }) => (
                      <a
                        role="option"
                        aria-selected={active === index}
                        id={`${id}-option-${index}`}
                        key={hit.id}
                        tabIndex={-1}
                        href={searchHitHref(hit, query.trim())}
                        onPointerMove={() => setActive(index)}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <strong>{hit.name}</strong>
                        {searchHitDescription(hit) && (
                          <small>{searchHitDescription(hit)}</small>
                        )}
                      </a>
                    ))}
                  </div>
                ) : null;
              })}
          </div>
          {state.data && hits.length === 0 && (
            <p>Nenhum resultado. Tente outro nome ou termo.</p>
          )}
          {valid && (
            <a className="public-search-all" href={searchHref(valid.q, type)}>
              Ver todos os resultados
            </a>
          )}
        </div>
      )}
    </form>
  );
}
