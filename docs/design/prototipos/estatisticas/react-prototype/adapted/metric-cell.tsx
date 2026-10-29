import {
  definition,
  formatMetric,
  metricValue,
  type PlayerRow,
  type Mode,
} from "../model";
import { useNameTooltip } from "./tooltip";
function MissingValue() {
  const tooltip = useNameTooltip("Informação ausente");
  return (
    <span
      {...tooltip}
      className="missing"
      tabIndex={0}
      aria-label="Informação ausente ou incompleta"
    >
      —
    </span>
  );
}
export function MetricCell({
  player,
  metric,
  mode,
  sortKey,
}: {
  player: PlayerRow;
  metric: string;
  mode: Mode;
  sortKey: string;
}) {
  const def = definition(metric);
  return (
    <td
      data-value={def.code}
      className={
        sortKey === def.key ? "reference-sorted active-column" : undefined
      }
    >
      {metricValue(player, metric, mode) === null ? (
        <MissingValue />
      ) : (
        formatMetric(player, metric, mode)
      )}
    </td>
  );
}
