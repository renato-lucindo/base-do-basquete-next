import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "../ui-system/components";
import { api, isSessionFailure } from "./api";
import { useAnchoredOptions } from "./anchored-options";
import {
  organizerKindLabels,
  organizerListSchema,
  type Organizer,
  type OrganizerKind,
} from "./organizer-contract";

export type OrganizerChoice =
  | { mode: "existing"; value: Organizer }
  | {
      mode: "create";
      name: string;
      abbreviation: string;
      kind: OrganizerKind | "";
    };

export function OrganizerField({
  current,
  choice,
  onChange,
  onSessionLost,
  required,
  error,
}: {
  current: Organizer | null;
  choice: OrganizerChoice | null;
  onChange: (choice: OrganizerChoice | null) => void;
  onSessionLost: () => void;
  required: boolean;
  error: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const name = useRef<HTMLInputElement>(null);
  const change = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Organizer[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [active, setActive] = useState(-1);
  const draft = choice?.mode === "create" ? choice : null;
  const selected = choice?.mode === "existing" ? choice.value : current;
  const showSearch = !draft && (choosing || !selected);
  const visible = showSearch && open && query.trim().length >= 2;
  const style = useAnchoredOptions(input, popup, visible);
  const activeId =
    visible && options[active] ? id + options[active].id : undefined;

  useEffect(() => {
    if (!restoreFocus.current) return;
    (draft
      ? name.current
      : showSearch
        ? input.current
        : change.current
    )?.focus();
    restoreFocus.current = false;
  }, [draft, showSearch]);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    setLoading(true);
    setSearchError(false);
    const timer = window.setTimeout(() => {
      void api(
        "/api/competition-administration/organizers?" +
          new URLSearchParams({ q: query }),
        organizerListSchema,
        undefined,
        controller.signal,
      )
        .then((matches) => {
          if (!controller.signal.aborted) setOptions(matches);
        })
        .catch((failure) => {
          if (controller.signal.aborted) return;
          if (isSessionFailure(failure)) onSessionLost();
          setSearchError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 160);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [visible, query, onSessionLost]);

  useEffect(() => {
    if (activeId)
      document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  useEffect(() => {
    if (error) (name.current ?? input.current ?? change.current)?.focus();
  }, [error]);

  function pick(value: Organizer) {
    restoreFocus.current = true;
    onChange({ mode: "existing", value });
    setChoosing(false);
    setOpen(false);
    setActive(-1);
    setQuery("");
  }

  return (
    <div className="create-wide dispute-championship-picker">
      {draft ? (
        <div className="dispute-organizer-draft">
          <span className="dispute-field-label">Novo organizador</span>
          <label>
            Nome do organizador
            <input
              ref={name}
              value={draft.name}
              maxLength={120}
              required
              aria-invalid={!!error}
              aria-describedby={error ? id + "-error" : undefined}
              onChange={(event) =>
                onChange({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label>
            Sigla (opcional)
            <input
              value={draft.abbreviation}
              maxLength={24}
              onChange={(event) =>
                onChange({ ...draft, abbreviation: event.target.value })
              }
            />
          </label>
          <label>
            Tipo
            <select
              value={draft.kind}
              required
              onChange={(event) =>
                onChange({
                  ...draft,
                  kind: event.target.value as OrganizerKind,
                })
              }
            >
              <option value="">Selecione o tipo</option>
              {Object.entries(organizerKindLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : showSearch ? (
        <>
          <div className="dispute-organizer-heading">
            <label htmlFor={id}>
              Organizador {required && <span aria-hidden="true">*</span>}
            </label>
            <button
              className="dispute-text-action"
              type="button"
              onClick={() => {
                restoreFocus.current = true;
                setOpen(false);
                onChange({
                  mode: "create",
                  name: query,
                  abbreviation: "",
                  kind: "",
                });
              }}
            >
              <Icon name="plus" /> Cadastrar organizador
            </button>
          </div>
          <input
            ref={input}
            id={id}
            type="search"
            autoComplete="off"
            maxLength={120}
            placeholder="Pesquisar por nome ou sigla…"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={visible}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={error ? id + "-error" : undefined}
            aria-controls={id + "-options"}
            aria-activedescendant={loading ? undefined : activeId}
            value={query}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOptions([]);
              setLoading(false);
              setActive(-1);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && visible) {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
              } else if (event.key === "Enter") {
                event.preventDefault();
                if (visible && !loading && options[active])
                  pick(options[active]);
              } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
                setActive((index) =>
                  Math.min(
                    options.length - 1,
                    Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1)),
                  ),
                );
              }
            }}
          />
          <div
            id={id + "-options"}
            ref={popup}
            role="listbox"
            aria-label="Organizadores encontrados"
            hidden={!visible}
            style={style}
            className="dispute-championship-results"
          >
            {!loading &&
              options.map((option, index) => (
                <button
                  key={option.id}
                  id={id + option.id}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={active === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(option)}
                >
                  {option.name}
                  {option.abbreviation && " (" + option.abbreviation + ")"}
                </button>
              ))}
            {loading ? (
              <p role="status">Buscando organizadores…</p>
            ) : searchError ? (
              <p role="status">
                Busca indisponível. Digite novamente para tentar.
              </p>
            ) : (
              options.length === 0 && (
                <p role="status">Nenhum organizador encontrado.</p>
              )
            )}
          </div>
        </>
      ) : (
        <>
          <span className="dispute-field-label">Organizador</span>
          <div className="dispute-championship-selected">
            <span>{selected?.name}</span>
            <button
              ref={change}
              type="button"
              className="dispute-text-action"
              aria-label="Alterar organizador"
              onClick={() => {
                restoreFocus.current = true;
                onChange(null);
                setChoosing(true);
              }}
            >
              Alterar
            </button>
          </div>
        </>
      )}
      {draft && (
        <button
          className="dispute-text-action"
          type="button"
          onClick={() => {
            restoreFocus.current = true;
            setQuery(draft.name);
            setOptions([]);
            setActive(-1);
            onChange(null);
            setChoosing(true);
          }}
        >
          Selecionar organizador existente
        </button>
      )}
      {!required && <small>Vale para todas as disputas do campeonato.</small>}
      {error && (
        <small id={id + "-error"} className="error-text" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
