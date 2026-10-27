import { useId, useRef, useState, useEffect, type RefObject } from "react";
import type { z } from "zod";
import type { personListingSchema } from "./contract";
import { useAnchoredOptions } from "../competition/anchored-options";
type Candidate = z.infer<typeof personListingSchema>["items"][number];

export function PersonPicker({
  query,
  onQuery,
  items,
  loading,
  disabled,
  offset,
  hasMore,
  onPage,
  onUse,
  inputRef,
}: {
  query: string;
  onQuery: (value: string) => void;
  items: Candidate[];
  loading: boolean;
  disabled: boolean;
  offset: number;
  hasMore: boolean;
  onPage: (page: number) => void;
  onUse: (id: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const id = useId(),
    list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(-1);
  useEffect(() => {
    setActive(-1);
  }, [query, offset]);
  useEffect(() => {
    list.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);
  const visible = open && query.trim().length >= 2;
  const popup = useRef<HTMLDivElement>(null);
  const popupStyle = useAnchoredOptions(inputRef, popup, visible);
  return (
    <div
      className="person-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>Buscar pessoa</label>
      <input
        id={id}
        ref={inputRef}
        role="combobox"
        autoComplete="off"
        maxLength={120}
        value={query}
        disabled={disabled}
        aria-expanded={visible}
        aria-controls={`${id}-results`}
        aria-autocomplete="list"
        aria-describedby={`${id}-hint`}
        aria-activedescendant={
          visible && !loading && items[active] ? `${id}-${active}` : undefined
        }
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onQuery(event.target.value);
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
            if (!loading)
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
          if (event.key === "Enter" && visible) {
            event.preventDefault();
            if (!loading && items[active]) onUse(items[active].id);
          }
        }}
      />
      <p id={`${id}-hint`} className="person-search-hint">
        {query.trim().length < 2
          ? "Digite pelo menos 2 caracteres para buscar."
          : "Escolha uma identidade existente ou cadastre outra pessoa."}
      </p>
      {visible && (
        <div ref={popup} className="person-picker-options" style={popupStyle}>
          {loading ? (
            <p role="status">Buscando pessoas…</p>
          ) : (
            <>
              <div
                ref={list}
                id={`${id}-results`}
                role="listbox"
                aria-label="Pessoas encontradas"
              >
                {items.map((person, index) => (
                  <button
                    type="button"
                    key={person.id}
                    id={`${id}-${index}`}
                    role="option"
                    aria-selected={active === index}
                    tabIndex={-1}
                    disabled={disabled}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onUse(person.id)}
                  >
                    <strong>{person.name}</strong>
                    {person.nickname && ` · ${person.nickname}`}
                    {person.publicBirthYear && ` · ${person.publicBirthYear}`}
                    <small>
                      {person.contexts.length
                        ? `${person.contexts[0].teamName} · ${person.contexts[0].year} · ${person.contexts[0].category}${person.contexts.length > 1 ? ` · +${person.contexts.length - 1} vínculos` : ""}`
                        : "Sem participação registrada"}
                    </small>
                  </button>
                ))}
              </div>
              {!items.length && <p>Nenhuma pessoa encontrada.</p>}
              {items[active] && (
                <details key={items[active].id}>
                  <summary>Vínculos de {items[active].name}</summary>
                  <p>Referência do cadastro: {items[active].id.slice(-8)}</p>
                  {items[active].contexts.map((context) => (
                    <p key={`${context.registrationId}-${context.active}`}>
                      {context.active ? "Ativo" : "Histórico"}:{" "}
                      {context.teamName} · {context.year} ·{" "}
                      {context.gender === "feminino" ? "Feminino" : "Masculino"}{" "}
                      · {context.category}
                      {context.division && ` · ${context.division}`}
                    </p>
                  ))}
                </details>
              )}
              {(offset > 0 || hasMore) && (
                <div className="competition-actions">
                  <button
                    type="button"
                    disabled={disabled || offset === 0}
                    onClick={() => onPage(Math.max(0, offset - 20))}
                  >
                    Página anterior
                  </button>
                  <button
                    type="button"
                    disabled={disabled || !hasMore}
                    onClick={() => onPage(offset + 20)}
                  >
                    Próxima página
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
