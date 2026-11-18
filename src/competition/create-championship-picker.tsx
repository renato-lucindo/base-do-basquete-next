import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Icon } from "../ui-system/components";
import { useAnchoredOptions } from "./anchored-options";
import type { ChampionshipOption } from "./catalog-contract";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

export function CreateChampionshipPicker({
  championships,
  chosen,
  creating,
  disabled,
  input,
  onChoose,
  onCreate,
  onClear,
}: {
  championships: ChampionshipOption[];
  chosen: ChampionshipOption | undefined;
  creating: boolean;
  disabled: boolean;
  input: RefObject<HTMLInputElement | null>;
  onChoose: (id: string) => void;
  onCreate: () => void;
  onClear: () => void;
}) {
  const id = useId();
  const popup = useRef<HTMLDivElement>(null);
  const change = useRef<HTMLButtonElement>(null);
  const requestedFocus = useRef(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const search = normalize(query);
  const visible = !!search && open && !chosen && !creating && !disabled;
  const options = championships.filter((item) =>
    normalize(item.name).includes(search),
  );
  const style = useAnchoredOptions(input, popup, visible);

  useEffect(() => {
    if (!requestedFocus.current) return;
    (chosen ? change.current : input.current)?.focus();
    requestedFocus.current = false;
  }, [chosen, creating, input]);

  const activeId =
    visible && options[active] ? id + "-" + options[active].id : undefined;
  useEffect(() => {
    if (activeId)
      document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function choose(option: ChampionshipOption) {
    setOpen(false);
    setQuery("");
    setActive(-1);
    requestedFocus.current = true;
    onChoose(option.id);
  }

  return (
    <div className="create-wide dispute-championship-picker">
      {chosen ? (
        <>
          <span className="dispute-field-label">Campeonato</span>
          <div className="dispute-championship-selected">
            <span>{chosen.name}</span>
            <button
              ref={change}
              type="button"
              className="dispute-text-action"
              aria-label="Alterar campeonato"
              onClick={() => {
                requestedFocus.current = true;
                onClear();
              }}
            >
              Alterar
            </button>
          </div>
        </>
      ) : creating ? null : (
        <>
          <label htmlFor={id}>Campeonato</label>
          <input
            ref={input}
            id={id}
            type="search"
            autoComplete="off"
            placeholder="Pesquisar campeonato…"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={visible}
            aria-controls={id + "-options"}
            aria-activedescendant={activeId}
            value={query}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onChange={(event) => {
              setQuery(event.target.value);
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
                if (visible && options[active]) choose(options[active]);
              } else if (
                search &&
                (event.key === "ArrowDown" || event.key === "ArrowUp")
              ) {
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
            aria-label="Campeonatos encontrados"
            hidden={!visible}
            style={style}
            className="dispute-championship-results"
          >
            {options.map((option, index) => (
              <button
                key={option.id}
                id={id + "-" + option.id}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                {option.name}
              </button>
            ))}
            {options.length === 0 && (
              <p role="status">Nenhum campeonato encontrado.</p>
            )}
          </div>
        </>
      )}
      <button
        type="button"
        className="dispute-text-action"
        onClick={() => {
          if (creating) {
            requestedFocus.current = true;
            onClear();
          } else {
            setQuery("");
            setActive(-1);
            onCreate();
          }
        }}
      >
        {creating ? (
          "Selecionar campeonato existente"
        ) : (
          <>
            <Icon name="plus" /> Criar novo campeonato
          </>
        )}
      </button>
    </div>
  );
}
