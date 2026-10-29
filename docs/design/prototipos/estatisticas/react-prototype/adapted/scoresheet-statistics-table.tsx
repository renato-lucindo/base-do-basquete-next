// Adapted from upstream/statistics-explorer.tsx: extracted declarations, not a new HTML renderer.
import { ScrollableTable } from "../upstream/scrollable-table";
import { useNameTooltip } from "./tooltip";
import { MetricCell } from "./metric-cell";
import { metricName, metricCode, type PlayerRow, type Mode } from "../model";
import type { SortDirection, StatisticsSortKey } from "./table-controls";

function SortButton({
  active,
  direction,
  label,
  onClick,
  sortKey,
}: {
  active: boolean;
  direction: SortDirection;
  label: string;
  onClick: () => void;
  sortKey: string;
}) {
  const tooltip = useNameTooltip(metricName(sortKey, label));
  return (
    <button
      {...tooltip}
      className="statistics-sort sort"
      data-sort={metricCode(sortKey)}
      aria-label={`Ordenar por ${label}`}
      aria-pressed={active}
      onClick={(event) => {
        onClick();
        tooltip.onClick(event);
      }}
      type="button"
    >
      <span>{label}</span>
      {active ? (
        <span className="sort-arrow" aria-hidden="true">
          {direction === "asc" ? "↑" : "↓"}
        </span>
      ) : null}
      <span className="sr-only">
        {active
          ? `Ordenação ${direction === "asc" ? "crescente" : "decrescente"}`
          : "Sem ordenação"}
      </span>
    </button>
  );
}

function SortHeader({
  activeKey,
  direction,
  label,
  onSort,
  sortKey,
}: {
  activeKey: StatisticsSortKey;
  direction: SortDirection;
  label: string;
  onSort: (key: StatisticsSortKey) => void;
  sortKey: StatisticsSortKey;
}) {
  return (
    <th
      aria-sort={
        activeKey === sortKey
          ? direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      data-column={metricCode(sortKey)}
      className={
        activeKey === sortKey ? "reference-sorted active-column" : undefined
      }
      scope="col"
    >
      <SortButton
        sortKey={sortKey}
        active={activeKey === sortKey}
        direction={direction}
        label={label}
        onClick={() => onSort(sortKey)}
      />
    </th>
  );
}

export function ScoresheetStatisticsTable({
  direction,
  mode,
  visibleColumns,
  onSort,
  players,
  sortKey,
}: {
  direction: SortDirection;
  mode: Mode;
  visibleColumns: string[];
  onSort: (key: StatisticsSortKey) => void;
  players: PlayerRow[];
  sortKey: StatisticsSortKey;
}) {
  const showDisqualifications = visibleColumns.includes("disqualifications");
  const showTeam = visibleColumns.includes("team");
  const metricCount = visibleColumns.length - Number(showTeam);
  return (
    <ScrollableTable label="Estatísticas de súmula dos jogadores">
      <table
        className="statistics-table statistics-table-scoresheet"
        style={{
          minWidth: `calc(var(--identity-columns, 450px) - ${showTeam ? "0px" : "var(--team-column, 135px)"} + ${metricCount * 68}px)`,
        }}
      >
        <caption className="sr-only">
          Copa da Base 2026, Sub-19 masculino.{" "}
          {metricCount > 0
            ? "Selecione um cabeçalho numérico para ordenar. Legenda ao final da tabela."
            : "Ordem do ranking preservada."}
        </caption>
        <colgroup>
          <col className="column-position" />
          <col className="column-player" />
          {showTeam ? <col className="column-team" /> : null}
          {metricCount > 0 ? (
            <col span={metricCount} className="column-metric" />
          ) : null}
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Pos.</th>
            <th scope="col">Atleta</th>
            {showTeam ? (
              <th className="team-column-header" scope="col">
                Equipe
              </th>
            ) : null}
            {visibleColumns.includes("games") ? (
              <SortHeader
                activeKey={sortKey}
                direction={direction}
                label="J"
                onSort={onSort}
                sortKey="games"
              />
            ) : null}
            {visibleColumns.includes("points") ? (
              <SortHeader
                activeKey={sortKey}
                direction={direction}
                label="PTS"
                onSort={onSort}
                sortKey="points"
              />
            ) : null}
            {visibleColumns.includes("pointsPerGame") ? (
              <SortHeader
                activeKey={sortKey}
                direction={direction}
                label="PPJ"
                onSort={onSort}
                sortKey="pointsPerGame"
              />
            ) : null}
            {visibleColumns.includes("pointShare") ? (
              <SortHeader
                activeKey={sortKey}
                direction={direction}
                label="PP%"
                onSort={onSort}
                sortKey="pointShare"
              />
            ) : null}
            {visibleColumns.includes("twoPointMade") ? (
              <SortHeader
                activeKey={sortKey}
                direction={direction}
                label={mode === "averages" ? "2P/J" : "2P"}
                onSort={onSort}
                sortKey="twoPointMade"
              />
            ) : null}
            {visibleColumns.includes("threePointMade") ? (
              <SortHeader
                activeKey={sortKey}
                direction={direction}
                label={mode === "averages" ? "3P/J" : "3P"}
                onSort={onSort}
                sortKey="threePointMade"
              />
            ) : null}
            {visibleColumns.includes("freeThrowMade") ? (
              <SortHeader
                activeKey={sortKey}
                direction={direction}
                label={mode === "averages" ? "LL/J" : "LL"}
                onSort={onSort}
                sortKey="freeThrowMade"
              />
            ) : null}
            {visibleColumns.includes("fouls") ? (
              <SortHeader
                activeKey={sortKey}
                direction={direction}
                label={mode === "averages" ? "F/J" : "F"}
                onSort={onSort}
                sortKey="fouls"
              />
            ) : null}
            {visibleColumns.includes("technical") ? (
              <SortHeader
                activeKey={sortKey}
                direction={direction}
                label={mode === "averages" ? "T/J" : "T"}
                onSort={onSort}
                sortKey="technical"
              />
            ) : null}
            {visibleColumns.includes("unsportsmanlike") ? (
              <SortHeader
                activeKey={sortKey}
                direction={direction}
                label={mode === "averages" ? "U/J" : "U"}
                onSort={onSort}
                sortKey="unsportsmanlike"
              />
            ) : null}
            {visibleColumns.includes("fiveFoulGames") ? (
              <SortHeader
                activeKey={sortKey}
                direction={direction}
                label="5F"
                onSort={onSort}
                sortKey="fiveFoulGames"
              />
            ) : null}
            {showDisqualifications ? (
              <SortHeader
                activeKey={sortKey}
                direction={direction}
                label="GD"
                onSort={onSort}
                sortKey="disqualifications"
              />
            ) : null}
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id} data-athlete={player.id}>
              <td>{player.rank ?? "—"}</td>
              <th scope="row" className="reference-player">
                <span className="player">
                  <span className="player-name">{player.playerName}</span>{" "}
                  <span
                    className="player-jersey"
                    aria-label={`Camisa ${player.jersey ?? "não informada"}`}
                  >
                    {player.jersey === null ? "—" : `#${player.jersey}`}
                  </span>
                </span>
              </th>
              {showTeam ? (
                <td className="team-name">{player.teamName}</td>
              ) : null}
              {visibleColumns.includes("games") ? (
                <MetricCell
                  player={player}
                  metric="gamesPlayed"
                  mode={mode}
                  sortKey={sortKey}
                />
              ) : null}
              {visibleColumns.includes("points") ? (
                <MetricCell
                  player={player}
                  metric="points"
                  mode={mode}
                  sortKey={sortKey}
                />
              ) : null}
              {visibleColumns.includes("pointsPerGame") ? (
                <MetricCell
                  player={player}
                  metric="pointsPerGame"
                  mode={mode}
                  sortKey={sortKey}
                />
              ) : null}
              {visibleColumns.includes("pointShare") ? (
                <MetricCell
                  player={player}
                  metric="pointShare"
                  mode={mode}
                  sortKey={sortKey}
                />
              ) : null}
              {visibleColumns.includes("twoPointMade") ? (
                <MetricCell
                  player={player}
                  metric="twoPointMade"
                  mode={mode}
                  sortKey={sortKey}
                />
              ) : null}
              {visibleColumns.includes("threePointMade") ? (
                <MetricCell
                  player={player}
                  metric="threePointMade"
                  mode={mode}
                  sortKey={sortKey}
                />
              ) : null}
              {visibleColumns.includes("freeThrowMade") ? (
                <MetricCell
                  player={player}
                  metric="freeThrowMade"
                  mode={mode}
                  sortKey={sortKey}
                />
              ) : null}
              {visibleColumns.includes("fouls") ? (
                <MetricCell
                  player={player}
                  metric="fouls"
                  mode={mode}
                  sortKey={sortKey}
                />
              ) : null}
              {visibleColumns.includes("technical") ? (
                <MetricCell
                  player={player}
                  metric="technical"
                  mode={mode}
                  sortKey={sortKey}
                />
              ) : null}
              {visibleColumns.includes("unsportsmanlike") ? (
                <MetricCell
                  player={player}
                  metric="unsportsmanlike"
                  mode={mode}
                  sortKey={sortKey}
                />
              ) : null}
              {visibleColumns.includes("fiveFoulGames") ? (
                <MetricCell
                  player={player}
                  metric="fiveFoulGames"
                  mode={mode}
                  sortKey={sortKey}
                />
              ) : null}
              {showDisqualifications ? (
                <MetricCell
                  player={player}
                  metric="disqualifications"
                  mode={mode}
                  sortKey={sortKey}
                />
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTable>
  );
}
