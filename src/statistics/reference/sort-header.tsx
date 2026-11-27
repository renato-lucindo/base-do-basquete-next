import { useState, type CSSProperties } from "react";
import { useNameTooltip } from "./tooltip";

export function StatisticsSortHeader({
  definition,
  active,
  direction,
  onSort,
  metricKey,
  style,
  metricAttribute = "data-public-metric",
}: {
  definition: { label: string; name: string };
  active: boolean;
  direction: "asc" | "desc";
  onSort: () => void;
  metricKey: string;
  style?: CSSProperties;
  metricAttribute?: "data-public-metric" | "data-team-metric";
}) {
  const tooltip = useNameTooltip(definition.name);
  // Retain the largest real format already seen while this column is mounted.
  // Sorting/pagination must not shrink a column when the next page has zeros.
  const [reserve, setReserve] = useState(style);
  const units = (value: CSSProperties | undefined) =>
    Number(
      (value as Record<string, unknown> | undefined)?.["--bb-reserve-units"] ??
        0,
    );
  if (units(style) > units(reserve)) setReserve(style);
  return (
    <th
      scope="col"
      style={
        {
          "--bb-header-width": `${definition.label.length * 0.8 + 1.5}ch`,
          ...style,
          ...reserve,
        } as CSSProperties
      }
      {...{ [metricAttribute]: metricKey }}
      aria-label={definition.name}
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
      className={`${active ? "reference-sorted active-column" : ""} ${["name", "player", "team"].includes(metricKey) ? "" : "bb-metric-column"}`}
      data-metric-kind={
        definition.label.includes("%")
          ? "percent"
          : ["difference", "plusMinus"].includes(metricKey)
            ? "signed"
            : undefined
      }
    >
      <button
        {...tooltip}
        type="button"
        className="statistics-sort sort"
        aria-label={`Ordenar por ${definition.label} (${definition.name})`}
        aria-pressed={active}
        onClick={(event) => {
          onSort();
          tooltip.onClick(event);
        }}
      >
        <span>{definition.label}</span>
        {active && (
          <span className="sort-arrow" aria-hidden="true">
            {direction === "asc" ? "↑" : "↓"}
          </span>
        )}
      </button>
    </th>
  );
}
