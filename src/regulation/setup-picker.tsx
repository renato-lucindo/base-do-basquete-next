import { useId, useState } from "react";
type Option = { value: string; label: string };
const normalize = (v: string) =>
  v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
export function SetupPicker({
  label,
  value,
  options,
  onChange,
  disabled = false,
  empty = "Automático",
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
  empty?: string;
}) {
  const id = useId(),
    [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(0);
  const selected = options.find((o) => o.value === value),
    rows = query.trim()
      ? options
          .filter((o) => normalize(o.label).includes(normalize(query)))
          .slice(0, 10)
      : [];
  if (options.length <= 10)
    return (
      <label className="setup-field">
        {label}
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{empty}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  return (
    <div className="setup-picker">
      <label htmlFor={id}>{label}</label>
      <div className="setup-picker-input">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={
            open && rows[active] ? `${id}-option-${active}` : undefined
          }
          autoComplete="off"
          disabled={disabled}
          placeholder={open ? "Buscar…" : empty}
          value={open ? query : (selected?.label ?? "")}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setActive(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              e.preventDefault();
            } else if (e.key === "ArrowDown") {
              setOpen(true);
              setActive((i) => Math.min(i + 1, rows.length - 1));
              e.preventDefault();
            } else if (e.key === "ArrowUp") {
              setActive((i) => Math.max(0, i - 1));
              e.preventDefault();
            } else if (e.key === "Enter" && open) {
              e.preventDefault();
              if (rows[active]) {
                onChange(rows[active].value);
                setOpen(false);
              }
            }
          }}
        />
        {value && (
          <button
            type="button"
            disabled={disabled}
            className="setup-link"
            aria-label={`Limpar ${label}`}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Limpar
          </button>
        )}
      </div>
      {open && (
        <div id={`${id}-list`} role="listbox" className="setup-picker-options">
          {!query.trim() ? (
            <p>Digite para buscar.</p>
          ) : !rows.length ? (
            <p>Nenhuma opção encontrada.</p>
          ) : (
            rows.map((o, i) => (
              <button
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={active === i}
                key={o.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
