import { useEffect, useId, useRef, useState } from "react";
import { api, isSessionFailure } from "../competition/api";
import { useAnchoredOptions } from "../competition/anchored-options";
import {
  officialListingSchema,
  type Officiating,
  type OfficialRole,
  type OfficialSelection,
} from "./officiating-contract";
import "./officiating-editor.css";

export type OfficialNames = Record<OfficialRole, string>;
export const emptyOfficialNames = (): OfficialNames => ({
  referee: "",
  umpire1: "",
  umpire2: "",
  scorer: "",
  timer: "",
  shotClock: "",
});
const groups = [
  {
    title: "Oficiais de Quadra",
    roles: [
      ["referee", "Árbitro"],
      ["umpire1", "Fiscal 1"],
      ["umpire2", "Fiscal 2"],
    ],
  },
  {
    title: "Oficiais de Mesa",
    roles: [
      ["scorer", "Apontador"],
      ["timer", "Cronometrista"],
      ["shotClock", "Operador de 24s"],
    ],
  },
] as const;
const fold = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim()
    .replace(/\s+/gu, " ")
    .toLowerCase();
type Props = {
  slots: Officiating;
  names: OfficialNames;
  disabled: boolean;
  onChange: (slots: Officiating, names: OfficialNames) => void;
  onSessionLost: () => void;
};

export function OfficiatingEditor(props: Props) {
  function change(
    role: OfficialRole,
    selection: OfficialSelection | null,
    text: string,
  ) {
    if (props.disabled) return;
    const slots = { ...props.slots, [role]: selection },
      names = { ...props.names, [role]: text };
    if (!text) {
      const group = groups.find((g) => g.roles.some(([r]) => r === role))!;
      const following = group.roles.slice(
        group.roles.findIndex(([r]) => r === role) + 1,
      );
      if (following.some(([r]) => props.slots[r] || props.names[r])) {
        if (
          !window.confirm(
            "Limpar esta função também limpará as funções seguintes deste grupo. Continuar?",
          )
        )
          return;
        for (const [r] of following) {
          slots[r] = null;
          names[r] = "";
        }
      }
    }
    props.onChange(slots, names);
  }
  return (
    <fieldset className="officiating-section" disabled={props.disabled}>
      <legend>Arbitragem</legend>
      <div className="officiating-columns">
        {groups.map((group) => (
          <fieldset key={group.title} className="officiating-column">
            <legend>{group.title}</legend>
            {group.roles.map(([role, label], index) => (
              <OfficialPicker
                key={role}
                label={label}
                value={props.names[role]}
                selection={props.slots[role]}
                disabled={
                  props.disabled ||
                  (index > 0 && !props.slots[group.roles[index - 1][0]])
                }
                excluded={Object.entries(props.slots).flatMap(([r, s]) =>
                  r !== role && s ? [s.id.toLowerCase()] : [],
                )}
                draftNames={Object.entries(props.slots).flatMap(([r, s]) =>
                  r !== role && s?.kind === "new" ? [s.name] : [],
                )}
                onChange={(selection, text) => change(role, selection, text)}
                onSessionLost={props.onSessionLost}
              />
            ))}
          </fieldset>
        ))}
      </div>
    </fieldset>
  );
}

function OfficialPicker({
  label,
  value,
  selection,
  disabled,
  excluded,
  draftNames,
  onChange,
  onSessionLost,
}: {
  label: string;
  value: string;
  selection: OfficialSelection | null;
  disabled: boolean;
  excluded: string[];
  draftNames: string[];
  onChange: (selection: OfficialSelection | null, value: string) => void;
  onSessionLost: () => void;
}) {
  const id = useId(),
    anchor = useRef<HTMLInputElement>(null),
    menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false),
    [offset, setOffset] = useState(0),
    [active, setActive] = useState(-1);
  const [items, setItems] = useState<{ id: string; name: string }[]>([]),
    [more, setMore] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const style = useAnchoredOptions(anchor, menu, open && !disabled);
  useEffect(() => {
    if (!open || disabled) return;
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setError("");
    setActive(-1);
    const timer = setTimeout(() => {
      void api(
        `/api/games/officials?q=${encodeURIComponent(value)}&offset=${offset}`,
        officialListingSchema,
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
                "Não foi possível buscar oficiais. Feche e abra o campo para tentar novamente.",
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
  const name = value.trim().replace(/\s+/gu, " ");
  const homonym = [...items.map((i) => i.name), ...draftNames].some(
    (n) => fold(n) === fold(name),
  );
  const options: {
    key: string;
    label: string;
    selection: OfficialSelection;
  }[] = items
    .filter((item) => !excluded.includes(item.id.toLowerCase()))
    .map((item) => ({
      key: item.id,
      label: item.name,
      selection: { kind: "existing", id: item.id },
    }));
  if (name && (!selection || selection.kind === "new"))
    options.push({
      key: "new",
      label: homonym
        ? `Cadastrar homônimo: ${name}`
        : `Usar novo oficial: ${name}`,
      selection: {
        kind: "new",
        id: selection?.kind === "new" ? selection.id : "",
        name,
        confirmHomonym: homonym,
      },
    });
  function choose(index: number) {
    const option = options[index];
    if (!option || loading || disabled) return;
    let next = option.selection;
    if (next.kind === "new") {
      if (
        next.confirmHomonym &&
        !window.confirm(
          "Já existe um oficial com esse nome. Confirma que está cadastrando outra pessoa?",
        )
      )
        return;
      next = { ...next, id: next.id || crypto.randomUUID() };
    }
    onChange(
      next,
      option.selection.kind === "new" ? option.selection.name : option.label,
    );
    anchor.current?.focus();
    setOpen(false);
    setOffset(0);
    setActive(-1);
  }
  return (
    <div
      className="official-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="official-input">
        <input
          ref={anchor}
          id={id}
          name={label}
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
          disabled={disabled}
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(null, [...event.target.value].slice(0, 160).join(""));
            setOffset(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
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
              if (options[active]) choose(active);
            }
          }}
        />
        {value && (
          <button
            type="button"
            className="official-clear secondary"
            disabled={disabled}
            aria-label={`Limpar ${label}`}
            onClick={() => {
              onChange(null, "");
              setOffset(0);
              setOpen(false);
              anchor.current?.focus();
            }}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 16 16"
              width="14"
              height="14"
            >
              <path
                d="M4 4l8 8M4 12l8-8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>
        )}
      </div>
      {open && !disabled && (
        <div ref={menu} className="official-options" style={style}>
          <div
            role="listbox"
            id={`${id}-list`}
            aria-label={`Oficiais para ${label}`}
            aria-busy={loading}
          >
            {!loading &&
              !error &&
              options.map((option, index) => (
                <button
                  key={option.key}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={index === active}
                  id={`${id}-option-${index}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(index)}
                >
                  {option.label}
                </button>
              ))}
          </div>
          {loading ? (
            <p role="status">Buscando oficiais…</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : (
            <>
              {!options.length && (
                <p>Digite um nome para buscar ou cadastrar um oficial.</p>
              )}
              {(offset > 0 || more) && (
                <div className="official-pages">
                  <button
                    type="button"
                    disabled={!offset}
                    onClick={() => setOffset((n) => n - 20)}
                  >
                    Oficiais anteriores
                  </button>
                  <button
                    type="button"
                    disabled={!more || offset >= 100000}
                    onClick={() => setOffset((n) => n + 20)}
                  >
                    Mais oficiais
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
