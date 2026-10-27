import { useEffect, useId, useState, useRef } from "react";
import { useAnchoredOptions } from "../competition/anchored-options";
import { api, isSessionFailure } from "../competition/api";
import { venueListingSchema } from "./contract";
import "./venue-picker.css";

export function VenuePicker({
  value,
  onChange,
  disabled,
  onSessionLost,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  onSessionLost: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null),
    popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false),
    [offset, setOffset] = useState(0),
    [active, setActive] = useState(-1);
  const [items, setItems] = useState<{ name: string }[]>([]),
    [more, setMore] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const popupStyle = useAnchoredOptions(input, popup, open && !disabled);
  useEffect(() => {
    if (!open || disabled) return;
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setError("");
    setActive(-1);
    const timer = setTimeout(() => {
      void api(
        `/api/games/venues?q=${encodeURIComponent(value)}&offset=${offset}`,
        venueListingSchema,
        undefined,
        controller.signal,
      )
        .then((result) => {
          if (current) {
            setItems(result.items);
            setMore(result.hasMore);
          }
        })
        .catch((failure) => {
          if (current) {
            if (isSessionFailure(failure)) onSessionLost();
            else
              setError(
                "Não foi possível buscar os locais. Feche e abra o campo para tentar novamente.",
              );
          }
        })
        .finally(() => {
          if (current) setLoading(false);
        });
    }, 150);
    return () => {
      current = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, disabled, value, offset, onSessionLost]);
  const fold = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .trim()
      .replace(/\s+/gu, " ")
      .toLowerCase();
  const newName = value.trim().replace(/\s+/gu, " ");
  const options = [
    ...items.map((item) => ({ value: item.name, label: item.name })),
    ...(newName && !items.some((item) => fold(item.name) === fold(newName))
      ? [{ value: newName, label: `Usar novo local: ${newName}` }]
      : []),
  ];
  function choose(name: string) {
    onChange(name);
    setOpen(false);
    setActive(-1);
    setOffset(0);
  }
  return (
    <div
      className="venue-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>Local</label>
      <input
        ref={input}
        id={id}
        role="combobox"
        aria-expanded={open && !disabled}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={
          open && !loading && options[active]
            ? `${id}-option-${active}`
            : undefined
        }
        autoComplete="off"
        maxLength={160}
        value={value}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOffset(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            if (!loading)
              setActive((index) =>
                Math.max(
                  0,
                  Math.min(
                    options.length - 1,
                    index + (event.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
              );
          }
          if (event.key === "Enter" && open) {
            event.preventDefault();
            if (!loading && options[active]) choose(options[active].value);
          }
        }}
      />
      {open && !disabled && (
        <div ref={popup} className="venue-options" style={popupStyle}>
          {loading ? (
            <p role="status">Buscando locais…</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : (
            <>
              <div role="listbox" id={`${id}-list`} aria-label="Locais salvos">
                {options.map((option, index) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    id={`${id}-option-${index}`}
                    key={option.label}
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {!options.length && (
                <p>
                  Nenhum local salvo. Digite um nome para usar um novo local.
                </p>
              )}
              {(offset > 0 || more) && (
                <div className="competition-actions">
                  <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() => setOffset((n) => n - 20)}
                  >
                    Locais anteriores
                  </button>
                  <button
                    type="button"
                    disabled={!more}
                    onClick={() => setOffset((n) => n + 20)}
                  >
                    Mais locais
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
