import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./components";
import { normalizeSearch } from "./controls";

export type SearchType = "all" | "players" | "teams" | "competitions";
export type SearchItem = {
  id: string;
  type: Exclude<SearchType, "all">;
  label: string;
  description: string;
};
export type SearchGroup = {
  type: Exclude<SearchType, "all">;
  label: string;
  items: SearchItem[];
};
export type SearchProvider = (
  query: string,
  type: SearchType,
  signal: AbortSignal,
) => Promise<SearchGroup[]>;
const types: { key: SearchType; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "players", label: "Jogadores" },
  { key: "teams", label: "Equipes" },
  { key: "competitions", label: "Campeonatos" },
];

export function GlobalSearch({
  provider,
  onSelect,
}: {
  provider: SearchProvider;
  onSelect: (item: SearchItem) => void;
}) {
  const id = useId(),
    container = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(""),
    [type, setType] = useState<SearchType>("all"),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1),
    [attempt, setAttempt] = useState(0),
    [visible, setVisible] = useState(5);
  const [result, setResult] = useState<{
    key: string;
    groups: SearchGroup[];
    error?: boolean;
  } | null>(null);
  const normalized = normalizeSearch(query),
    key = `${normalized}/${type}/${attempt}`;
  const ready = result?.key === key,
    groups = ready
      ? result.groups.map((g) => ({ ...g, items: g.items.slice(0, visible) }))
      : [],
    items = groups.flatMap((g) => g.items);
  const expanded = open && normalized.length >= 2;
  useEffect(() => {
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void provider(normalized, type, controller.signal)
        .then((groups) => {
          if (!controller.signal.aborted) setResult({ key, groups });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setResult({ key, groups: [], error: true });
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [normalized, type, attempt, provider, key]);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  useEffect(() => {
    if (active >= 0)
      document
        .getElementById(`${id}-item-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, id]);
  function select(item: SearchItem) {
    setOpen(false);
    setActive(-1);
    onSelect(item);
  }
  return (
    <div
      className="bb-global-search"
      ref={container}
      onBlur={(e) => {
        if (
          e.relatedTarget &&
          !e.currentTarget.contains(e.relatedTarget as Node)
        )
          setOpen(false);
      }}
    >
      <label className="bb-sr-only" htmlFor={`${id}-input`}>
        Buscar jogadores, equipes ou campeonatos
      </label>
      <div className="bb-search-input">
        <Icon name="search" />
        <input
          ref={input}
          id={`${id}-input`}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? `${id}-list` : undefined}
          aria-activedescendant={
            expanded && active >= 0 && items[active]
              ? `${id}-item-${active}`
              : undefined
          }
          autoComplete="off"
          name="global-search"
          maxLength={120}
          placeholder="Jogadores, equipes ou campeonatos"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
            setVisible(5);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              setActive(-1);
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              if (items.length)
                setActive((index) =>
                  e.key === "ArrowDown"
                    ? (index + 1) % items.length
                    : index <= 0
                      ? items.length - 1
                      : index - 1,
                );
            }
            if (e.key === "Enter" && expanded && items[active]) {
              e.preventDefault();
              select(items[active]);
            }
          }}
        />
        {query && (
          <button
            type="button"
            className="bb-icon-button"
            aria-label="Limpar busca global"
            onClick={() => {
              setQuery("");
              setActive(-1);
              input.current?.focus();
            }}
          >
            <Icon name="close" />
          </button>
        )}
      </div>
      <span className="bb-sr-only" role="status">
        {expanded
          ? !ready
            ? "Buscando…"
            : result.error
              ? "Busca indisponível"
              : `${items.length} sugestões encontradas`
          : ""}
      </span>
      {expanded && (
        <div className="bb-search-panel">
          <div
            className="bb-search-types"
            role="group"
            aria-label="Tipo de resultado"
          >
            {types.map((t) => (
              <button
                type="button"
                key={t.key}
                aria-pressed={type === t.key}
                onClick={() => {
                  setType(t.key);
                  setActive(-1);
                  setVisible(5);
                  input.current?.focus();
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {ready &&
            result.groups.some((group) => group.items.length > visible) && (
              <button
                className="bb-search-more bb-text-button"
                type="button"
                onClick={() => setVisible((count) => count + 5)}
              >
                Ver mais resultados
              </button>
            )}
          {!ready && <p className="bb-search-message">Buscando…</p>}
          {ready && result.error && (
            <p className="bb-search-message">
              Não foi possível buscar.{" "}
              <button type="button" onClick={() => setAttempt((v) => v + 1)}>
                Tentar novamente
              </button>
            </p>
          )}
          {ready && !result.error && !items.length && (
            <p className="bb-search-message">
              Nenhum resultado para “{query}”.
            </p>
          )}
          <div
            className="bb-search-options"
            id={`${id}-list`}
            role="listbox"
            aria-label="Sugestões de busca"
          >
            {groups.map((group) => (
              <div role="group" aria-label={group.label} key={group.type}>
                <div className="bb-search-group" aria-hidden="true">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const index = items.indexOf(item);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      id={`${id}-item-${index}`}
                      role="option"
                      aria-selected={active === index}
                      tabIndex={-1}
                      onPointerMove={() => setActive(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => select(item)}
                    >
                      <Icon
                        name={
                          item.type === "players"
                            ? "player"
                            : item.type === "teams"
                              ? "teams"
                              : "trophy"
                        }
                      />
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                      <Icon name="chevron" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
