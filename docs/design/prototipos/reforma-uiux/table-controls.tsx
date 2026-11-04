import { useEffect, useRef, useState } from "react";
import { Icon } from "../../../../src/ui-system/components";
import { metricLabels, metricShort } from "./fixtures";
export function ColumnPicker({
  selected,
  onChange,
  options = Object.keys(metricLabels),
}: {
  selected: string[];
  options?: string[];
  onChange: (selected: string[]) => void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!details.current?.contains(event.target as Node) && details.current)
        details.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <details
      ref={details}
      className="bb-column-picker"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="bb-button">
        <Icon name="columns" />
        Colunas<span className="bb-count">{selected.length}</span>
      </summary>
      <div className="bb-column-menu">
        <strong>Colunas visíveis</strong>
        {options.map((key) => (
          <label key={key}>
            <input
              type="checkbox"
              name={`column-${key}`}
              checked={selected.includes(key)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? options.filter((k) => k === key || selected.includes(k))
                    : selected.filter((k) => k !== key),
                )
              }
            />
            <span>
              {metricShort[key]} <small>{metricLabels[key]}</small>
            </span>
          </label>
        ))}
      </div>
    </details>
  );
}

export function useMobile() {
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width: 639px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 639px)");
    const changed = () => setMobile(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  return mobile;
}
