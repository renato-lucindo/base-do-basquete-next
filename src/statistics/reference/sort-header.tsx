import { useNameTooltip } from "./tooltip";

export function StatisticsSortHeader({
  definition,
  active,
  direction,
  onSort,
  metricKey,
  metricAttribute = "data-public-metric",
}: {
  definition: { label: string; name: string };
  active: boolean;
  direction: "asc" | "desc";
  onSort: () => void;
  metricKey: string;
  metricAttribute?: "data-public-metric" | "data-team-metric";
}) {
  const tooltip = useNameTooltip(definition.name);
  return (
    <th
      scope="col"
      {...{ [metricAttribute]: metricKey }}
      aria-label={definition.name}
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
      className={active ? "reference-sorted active-column" : undefined}
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
