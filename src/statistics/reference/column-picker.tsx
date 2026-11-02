// Fonte: docs/design/prototipos/estatisticas/react-prototype/adapted/column-picker.tsx
// Column-options JSX extracted from upstream/boxscore-statistics-explorer.tsx.
// Controlled adapter: responsive defaults, optional team and metrics, accessible popup/focus.
import { useEffect, useRef, useState } from "react";
export function ColumnPicker({
  options,
  value,
  onChange,
}: {
  options: readonly { key: string; label: string; name: string }[];
  value: string[];
  onChange: (keys: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(560);
  const container = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const selectedColumns = value;
  const columnOptions = options.map((m) => ({
    label: m.name ? m.label + " · " + m.name : m.label,
    metrics: [m.key],
  }));
  useEffect(() => {
    if (!open) return;
    const resize = () =>
      setPanelHeight(
        Math.max(
          160,
          Math.min(
            560,
            window.innerHeight -
              (trigger.current?.getBoundingClientRect().bottom ?? 0) -
              24,
          ),
        ),
      );
    resize();
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", resize);
    };
  }, [open]);
  return (
    <div
      className="column-picker"
      ref={container}
      data-source-component="ColumnPicker"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (
          e.relatedTarget &&
          !e.currentTarget.contains(e.relatedTarget as Node)
        )
          setOpen(false);
      }}
    >
      <button
        id="column-picker-toggle"
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="column-picker-panel"
        onClick={() => setOpen((v) => !v)}
      >
        Colunas · {value.length} de {options.length}
        <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div
          id="column-picker-panel"
          className="team-filter-panel column-picker-panel"
          style={{ maxHeight: panelHeight }}
        >
          <fieldset className="column-picker-fieldset">
            <legend>Colunas da tabela</legend>
            <div className="column-actions">
              <button
                type="button"
                onClick={() => onChange(options.map((m) => m.key))}
              >
                Todas
              </button>
              <button type="button" onClick={() => onChange([])}>
                Nenhuma
              </button>
            </div>
            <p className="column-picker-note">
              Atleta e posição ficam sempre visíveis.
            </p>
            <div className="column-options">
              {columnOptions.map((option) => (
                <label key={option.label}>
                  <input
                    data-column-choice={option.metrics[0]}
                    checked={option.metrics.every((metric) =>
                      selectedColumns.includes(metric),
                    )}

                    onChange={(event) => {
                      const selected = new Set(selectedColumns);
                      for (const metric of option.metrics) {
                        if (event.target.checked) selected.add(metric);
                        else selected.delete(metric);
                      }
                      onChange(
                        options
                          .filter((m) => selected.has(m.key))
                          .map((m) => m.key),
                      );
                    }}
                    type="checkbox"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
