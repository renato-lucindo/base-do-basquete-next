// Fonte: docs/design/prototipos/estatisticas/react-prototype/adapted/column-picker.tsx
// Column-options JSX extracted from upstream/boxscore-statistics-explorer.tsx.
// Controlled adapter: responsive defaults, optional team and metrics, accessible popup/focus.
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
export function ColumnPicker({
  options,
  value,
  onChange,
  identityNote = "Atleta e posição ficam sempre visíveis.",
}: {
  options: readonly { key: string; label: string; name: string }[];
  value: string[];
  onChange: (keys: string[]) => void;
  identityNote?: string;
}) {
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<CSSProperties>({});
  const container = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const selectedColumns = value;
  const columnOptions = options.map((m) => ({
    label: m.name ? m.label + " · " + m.name : m.label,
    metrics: [m.key],
  }));
  useLayoutEffect(() => {
    if (!open) return;
    const resize = () => {
      if (!trigger.current || !panel.current) return;
      const anchor = trigger.current.getBoundingClientRect();
      const scale =
        parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
      const margin = 8 * scale,
        gap = 7 * scale;
      const below = innerHeight - anchor.bottom - gap - margin;
      const above = anchor.top - gap - margin;
      const opensAbove = below < 160 * scale && above > below;
      const next: CSSProperties = {
        position: "fixed",
        left: Math.max(
          margin,
          Math.min(
            anchor.right - panel.current.getBoundingClientRect().width,
            innerWidth - panel.current.getBoundingClientRect().width - margin,
          ),
        ),
        right: "auto",
        top: opensAbove ? "auto" : anchor.bottom + gap,
        bottom: opensAbove ? innerHeight - anchor.top + gap : "auto",
        maxHeight: Math.max(
          1,
          Math.min(560 * scale, opensAbove ? above : below),
        ),
      };
      setPanelPosition((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };
    resize();
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", resize, true);
    const observer = new ResizeObserver(resize);
    if (container.current) observer.observe(container.current);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", resize, true);
      observer.disconnect();
    };
  }, [open, value]);
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
          ref={panel}
          className="team-filter-panel column-picker-panel"
          style={panelPosition}
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
            <p className="column-picker-note">{identityNote}</p>
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
