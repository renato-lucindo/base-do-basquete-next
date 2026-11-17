import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { useAnchoredOptions } from "./anchored-options";
import { api, ApiFailure, isSessionFailure } from "./api";
import { listingSchema } from "./contract";

type Championship = { id: string; name: string };

export function ChampionshipPicker({
  value,
  onChange,
  onSessionLost,
  inputRef,
}: {
  value: Championship | null;
  onChange: (value: Championship | null) => void;
  onSessionLost: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const internalInput = useRef<HTMLInputElement>(null);
  const input = inputRef ?? internalInput;
  const popup = useRef<HTMLDivElement>(null);
  const change = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [items, setItems] = useState<Championship[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const visible = !value && open && query.trim().length >= 2;
  const style = useAnchoredOptions(input, popup, visible);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    setLoading(true);
    setActive(-1);
    setError("");
    const timer = setTimeout(() => {
      void api(
        "/api/competitions?q=" +
          encodeURIComponent(query.trim()) +
          "&offset=" +
          offset,
        listingSchema,
        undefined,
        controller.signal,
      )
        .then((result) => {
          if (!controller.signal.aborted) {
            setItems(result.items);
            setHasMore(result.hasMore);
          }
        })
        .catch((failure) => {
          if (controller.signal.aborted) return;
          if (isSessionFailure(failure)) onSessionLost();
          else
            setError(
              failure instanceof ApiFailure
                ? failure.message
                : "Não foi possível buscar campeonatos.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [visible, query, offset, onSessionLost]);

  useEffect(() => {
    popup.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function select(item: Championship) {
    setOpen(false);
    onChange(item);
    requestAnimationFrame(() => change.current?.focus({ preventScroll: true }));
  }

  return (
    <div
      className="championship-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {value ? (
        <div className="championship-selected">
          <span>
            <small>Campeonato</small>
            <span>{value.name}</span>
          </span>
          <button
            ref={change}
            type="button"
            className="secondary"
            aria-label="Alterar campeonato"
            onClick={() => {
              onChange(null);
              setQuery("");
              setOffset(0);
              setItems([]);
              requestAnimationFrame(() => input.current?.focus());
            }}
          >
            Alterar
          </button>
        </div>
      ) : (
        <>
          <label>
            Campeonato
            <input
              ref={input}
              role="combobox"
              autoComplete="off"
              name="championship-query"
              value={query}
              aria-controls={id}
              aria-expanded={visible}
              aria-autocomplete="list"
              aria-activedescendant={
                visible && !loading && items[active]
                  ? id + "-" + active
                  : undefined
              }
              maxLength={120}
              placeholder="Buscar campeonato…"
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setOffset(0);
                setItems([]);
                setOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && visible) {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                }
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setOpen(true);
                  if (!loading && items.length) {
                    setActive((index) =>
                      Math.max(
                        0,
                        Math.min(
                          items.length - 1,
                          index + (event.key === "ArrowDown" ? 1 : -1),
                        ),
                      ),
                    );
                  }
                }
                if (event.key === "Enter" && visible) {
                  event.preventDefault();
                  if (!loading && items[active]) select(items[active]);
                }
              }}
            />
          </label>
          {visible && (
            <div ref={popup} className="championship-results" style={style}>
              <div
                id={id}
                role="listbox"
                aria-label="Campeonatos encontrados"
                aria-busy={loading}
              >
                {!loading &&
                  !error &&
                  items.map((item, index) => (
                    <button
                      key={item.id}
                      id={id + "-" + index}
                      type="button"
                      role="option"
                      aria-selected={index === active}
                      tabIndex={-1}
                      className="secondary"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => select(item)}
                    >
                      {item.name}
                    </button>
                  ))}
              </div>
              {loading ? (
                <p role="status">Buscando…</p>
              ) : error ? (
                <p role="alert">{error}</p>
              ) : (
                !items.length && (
                  <p role="status">Nenhum campeonato encontrado.</p>
                )
              )}
              {(offset > 0 || hasMore) && (
                <div className="championship-pagination">
                  <button
                    type="button"
                    className="secondary"
                    disabled={loading || offset === 0}
                    onClick={() => setOffset(offset - 20)}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={loading || !hasMore}
                    onClick={() => setOffset(offset + 20)}
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
