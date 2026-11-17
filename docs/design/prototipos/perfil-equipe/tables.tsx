import type { ReactNode } from "react";
import { STATISTICS_METRICS } from "../../../../src/statistics/metrics";
import { useNameTooltip } from "../../../../src/statistics/reference/tooltip";
import {
  TEAM_METRICS,
  sheetTeamMetric,
  type TeamMetric,
} from "../../../../src/team-statistics/metrics";
import { DataTable, type Column } from "../../../../src/ui-system/components";
import { RecentResultsCell } from "../../../../src/regulation/recent-results-cell";
import {
  gamesFor,
  participationContext,
  recentFor,
  rosterColumns,
  rosterFor,
  team,
  teamColumns,
  teamLabel,
  teamTotals,
  type Participation,
} from "./fixtures";
import { gameHref, standingsHref, type Mode } from "./navigation";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "UTC",
});
export const printDate = (day: string | null) =>
  day ? date.format(new Date(`${day}T00:00:00Z`)) : "A definir";

function HeaderHelp({ label, name }: { label: string; name: string }) {
  const tip = useNameTooltip(name);
  return (
    <button
      type="button"
      className="prototype-metric-help"
      aria-label={`${label}, ${name}`}
      {...tip}
    >
      {label}
    </button>
  );
}

function formatValue(
  key: TeamMetric,
  value: number | null | undefined,
  games: number,
  mode: Mode,
) {
  if (value == null) return "—";
  const adjusted =
    mode === "por-jogo" && TEAM_METRICS[key].normalizable && games > 0
      ? value / games
      : value;
  return (
    number.format(adjusted) + (TEAM_METRICS[key].label.endsWith("%") ? "%" : "")
  );
}

function MetricTable({
  label,
  identities,
  metrics,
  mode,
  definition,
  rows,
}: {
  label: string;
  identities: string;
  metrics: readonly TeamMetric[];
  mode: Mode;
  definition: (key: TeamMetric) => { label: string; name: string };
  rows: readonly {
    id: string;
    identity: ReactNode;
    totals: Partial<Record<TeamMetric, number | null>>;
  }[];
}) {
  return (
    <>
      <div
        className="bb-table-scroll prototype-metrics"
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        <table className="bb-table">
          <caption className="bb-sr-only">{label}</caption>
          <thead>
            <tr>
              <th scope="col" className="prototype-fixed">
                {identities}
              </th>
              {metrics.map((key) => (
                <th scope="col" className="bb-numeric" key={key}>
                  <HeaderHelp {...definition(key)} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row" className="prototype-fixed">
                  {row.identity}
                </th>
                {metrics.map((key) => (
                  <td className="bb-numeric" key={key}>
                    {formatValue(
                      key,
                      row.totals[key],
                      row.totals.games ?? 0,
                      mode,
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="reference-legend" aria-labelledby="metrica-legenda">
        <h2 id="metrica-legenda">Legenda</h2>
        <dl>
          {metrics.map((key) => {
            const metric = definition(key);
            return (
              <div key={key}>
                <dt>{metric.label}</dt>
                <dd>{metric.name}</dd>
              </div>
            );
          })}
        </dl>
      </section>
    </>
  );
}

export function TeamStats({ p, mode }: { p: Participation; mode: Mode }) {
  const totals = teamTotals(p);
  if (!totals.games)
    return (
      <p className="prototype-empty">
        Nenhuma estatística publicada nesta disputa.
      </p>
    );
  return (
    <MetricTable
      label="Estatísticas da equipe"
      identities="Equipe"
      metrics={teamColumns[p.source]}
      definition={
        p.source === "sheet" ? sheetTeamMetric : (key) => TEAM_METRICS[key]
      }
      mode={mode}
      rows={[{ id: p.id, identity: team.name, totals }]}
    />
  );
}

export function RosterTable({ p, mode }: { p: Participation; mode: Mode }) {
  const athletes = rosterFor(p);
  if (!athletes.length)
    return (
      <p className="prototype-empty">
        Nenhum atleta em jogos publicados nesta disputa.
      </p>
    );
  return (
    <MetricTable
      label="Jogadores e estatísticas do elenco"
      identities="Jogador"
      metrics={rosterColumns[p.source]}
      definition={(key) =>
        STATISTICS_METRICS[key as keyof typeof STATISTICS_METRICS]
      }
      mode={mode}
      rows={athletes.map(({ jersey, name, totals }) => ({
        id: jersey,
        identity: (
          <span className="prototype-athlete">
            <span aria-label={`Camisa ${jersey}`}>{jersey}</span>
            <span>{name}</span>
          </span>
        ),
        totals,
      }))}
    />
  );
}

export function Recent({ p }: { p: Participation }) {
  return (
    <RecentResultsCell
      results={recentFor(p)}
      teamName={team.name}
      label={teamLabel}
      compactLabel={(id) => teamLabel(id, true)}
    />
  );
}

export function position(p: Participation) {
  if (p.status === "closed")
    return p.finalPosition === undefined ? "—" : `${p.finalPosition}º lugar`;
  if (p.knockout) return p.knockout.name;
  return p.group?.position == null
    ? "—"
    : `${p.group.position}º · ${p.group.name}`;
}

const overviewColumns: Column<Participation>[] = [
  {
    key: "championship",
    label: "Campeonato",
    primary: true,
    render: (p) => (
      <div className="prototype-cell-name">
        <a href={standingsHref(p)}>{p.name}</a>
        <small>{participationContext(p)}</small>
      </div>
    ),
  },
  { key: "position", label: "Posição", render: position },
  { key: "recent", label: "Últimos jogos", render: (p) => <Recent p={p} /> },
];

export function ParticipationTable({
  title,
  entries,
}: {
  title: string;
  entries: readonly Participation[];
}) {
  return (
    <section className="prototype-overview-group">
      <h2>{title}</h2>
      <DataTable
        label={title}
        columns={overviewColumns}
        rows={entries}
        rowId={(row) => row.id}
      />
    </section>
  );
}

export function GameTable({ p, back }: { p: Participation; back: string }) {
  const games = gamesFor(p);
  type Game = (typeof games)[number];
  const columns: Column<Game>[] = [
    {
      key: "date",
      label: "Data",
      render: (g) => (
        <span className="prototype-date">
          {printDate(g.date)}
          {g.time && <small>{g.time}</small>}
        </span>
      ),
    },
    {
      key: "match",
      label: "Confronto",
      primary: true,
      render: (g) => (
        <div className="prototype-cell-name">
          {g.score ? (
            <a
              href={gameHref(p, g.id, back)}
              aria-label={`Ver partida: ${teamLabel(g.homeRegistrationId)} × ${teamLabel(g.awayRegistrationId)}, ${printDate(g.date)}`}
            >
              {teamLabel(g.homeRegistrationId)} ×{" "}
              {teamLabel(g.awayRegistrationId)}
            </a>
          ) : (
            <span>
              {teamLabel(g.homeRegistrationId)} ×{" "}
              {teamLabel(g.awayRegistrationId)}
            </span>
          )}
          {g.venue && <small>{g.venue}</small>}
        </div>
      ),
    },
    {
      key: "score",
      label: "Placar",
      render: (g) => (
        <span className="prototype-score">
          {g.score ? `${g.score.homePoints} × ${g.score.awayPoints}` : "—"}
        </span>
      ),
    },
  ];
  return (
    <div className="prototype-games">
      <DataTable
        label="Jogos da equipe"
        columns={columns}
        rows={games}
        rowId={(g) => g.id}
        empty="Nenhum jogo publicado nesta disputa."
      />
    </div>
  );
}
