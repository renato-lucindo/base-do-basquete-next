import { useEffect, useId, useRef, useState } from "react";
import { useAnchoredOptions } from "../competition/anchored-options";
import { api, isSessionFailure } from "../competition/api";
import {
  registrationListingSchema,
  type RegistrationSnapshot,
} from "../teams/contract";
import { roundListingSchema } from "./contract";

type Option = {
  value: string;
  label: string;
  registration?: RegistrationSnapshot;
};
type Props = {
  kind: "registration" | "round" | "stage";
  label: string;
  accessibleLabel?: string;
  value: string;
  disputeId: string;
  excludedId?: string;
  disabled: boolean;
  invalid?: string;
  onChange: (value: string, registration?: RegistrationSnapshot) => void;
  onSessionLost: () => void;
};
const stages = [
  "Oitavas de final",
  "Quartas de final",
  "Semifinal",
  "Final",
  "Disputa de 3º lugar",
];
const fold = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function GamePicker(props: Props) {
  const id = useId(),
    input = useRef<HTMLInputElement>(null),
    popup = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState<string | null>(null),
    [open, setOpen] = useState(false),
    [offset, setOffset] = useState(0),
    [items, setItems] = useState<Option[]>([]),
    [more, setMore] = useState(false),
    [active, setActive] = useState(-1),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const text = query ?? props.value,
    registration = props.kind === "registration";
  const popupStyle = useAnchoredOptions(input, popup, open && !props.disabled);
  useEffect(() => {
    if (open && active >= 0)
      popup.current
        ?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')
        ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);
  useEffect(() => {
    if (!open || props.disabled) return;
    const controller = new AbortController();
    let current = true;
    setActive(-1);
    setError("");
    setItems([]);
    setMore(false);
    if (registration && text.trim().length < 2) {
      setLoading(false);
      return;
    }
    if (props.kind === "round" && !/^\d{0,10}$/u.test(text)) {
      setLoading(false);
      return;
    }
    if (props.kind === "stage") {
      setItems(
        stages
          .filter((s) => fold(s).includes(fold(text)))
          .map((s) => ({ value: s, label: s })),
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      const request = registration
        ? api(
            `/api/registrations?disputeId=${props.disputeId}&q=${encodeURIComponent(text)}&offset=${offset}`,
            registrationListingSchema,
            undefined,
            controller.signal,
          ).then((r) => ({
            items: r.items
              .filter((r) => r.id !== props.excludedId)
              .map((r) => ({ value: r.id, label: r.name, registration: r })),
            hasMore: r.hasMore,
          }))
        : api(
            `/api/games/rounds?disputeId=${props.disputeId}&q=${encodeURIComponent(text)}&offset=${offset}`,
            roundListingSchema,
            undefined,
            controller.signal,
          ).then((r) => ({
            items: r.items.map((r) => ({
              value: String(r.round),
              label: `${r.round}ª rodada`,
            })),
            hasMore: r.hasMore,
          }));
      void request
        .then((r) => {
          if (current) {
            setItems(r.items);
            setMore(r.hasMore);
          }
        })
        .catch((e) => {
          if (current) {
            if (isSessionFailure(e)) props.onSessionLost();
            else
              setError(
                "Não foi possível buscar. Feche e abra o campo para tentar novamente.",
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
  }, [
    open,
    text,
    offset,
    props.kind,
    props.disputeId,
    props.excludedId,
    props.disabled,
    registration,
    props.onSessionLost,
  ]);
  function close() {
    setOpen(false);
    setActive(-1);
    setQuery(null);
  }
  function choose(option: Option) {
    props.onChange(option.value, option.registration);
    close();
    setOffset(0);
  }
  const options =
    !registration &&
    text.trim() &&
    !items.some((o) => o.value === text.trim()) &&
    !loading &&
    !error &&
    (props.kind !== "round" ||
      (/^\d+$/u.test(text) && Number(text) > 0 && Number(text) <= 2147483647))
      ? [
          ...items,
          {
            value: text.trim(),
            label: `Usar ${props.kind === "round" ? "rodada " : "etapa: "}${text.trim()}`,
          },
        ]
      : items;
  return (
    <div
      className="game-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <label htmlFor={id}>{props.label}</label>
      <div className="game-picker-input">
        <input
          ref={input}
          id={id}
          name={props.accessibleLabel ?? props.label}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-label={props.accessibleLabel}
          aria-expanded={open && !props.disabled}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={
            open && !loading && options[active] ? `${id}-${active}` : undefined
          }
          aria-invalid={!!props.invalid}
          aria-describedby={props.invalid ? `${id}-error` : undefined}
          value={text}
          disabled={props.disabled}
          inputMode={props.kind === "round" ? "numeric" : undefined}
          maxLength={
            props.kind === "round" ? 10 : props.kind === "stage" ? 100 : 120
          }
          placeholder={
            registration
              ? "Buscar equipe…"
              : props.kind === "round"
                ? "Ex.: 3…"
                : "Selecione ou digite…"
          }
          onFocus={() => {
            setOpen(true);
            setOffset(0);
          }}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            setOffset(0);
            setOpen(true);
            if (!registration) props.onChange(value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              if (!loading)
                setActive((n) =>
                  Math.max(
                    0,
                    Math.min(
                      options.length - 1,
                      n + (event.key === "ArrowDown" ? 1 : -1),
                    ),
                  ),
                );
            }
            if (event.key === "Enter" && open) {
              event.preventDefault();
              if (!loading && options[active]) choose(options[active]);
            }
          }}
        />
        {!!props.value && (
          <button
            type="button"
            className="game-picker-clear"
            aria-label={`Limpar ${props.label}`}
            disabled={props.disabled}
            onClick={() => {
              props.onChange("");
              setQuery(null);
              setOffset(0);
              setOpen(false);
              input.current?.focus();
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="m4 4 8 8M4 12l8-8" />
            </svg>
          </button>
        )}
      </div>
      {props.invalid && (
        <p id={`${id}-error`} className="game-field-error">
          {props.invalid}
        </p>
      )}
      {open && !props.disabled && (
        <div
          ref={popup}
          className="venue-options game-picker-options"
          style={popupStyle}
        >
          {loading ? (
            <p role="status">Buscando…</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : (
            <>
              <div role="listbox" id={`${id}-list`} aria-label={props.label}>
                {options.map((option, index) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    id={`${id}-${index}`}
                    key={option.value}
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {!options.length && (
                <p>
                  {registration
                    ? text.trim().length < 2
                      ? "Digite pelo menos 2 caracteres para buscar uma equipe."
                      : "Nenhuma inscrição encontrada. Você pode adicionar uma inscrição nesta disputa."
                    : "Digite um valor para informar."}
                </p>
              )}
              {(offset > 0 || more) && (
                <div className="competition-actions">
                  <button
                    type="button"
                    disabled={!offset}
                    onClick={() => setOffset((n) => Math.max(0, n - 20))}
                  >
                    Anteriores
                  </button>
                  <button
                    type="button"
                    disabled={!more}
                    onClick={() => setOffset((n) => n + 20)}
                  >
                    Mais opções
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
