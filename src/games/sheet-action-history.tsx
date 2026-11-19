import { useState } from "react";
import { periodColor, periodLabel } from "../domain/scoresheet";
import {
  selectActionHistory,
  type AnnotatedAction,
  type HistoryQuery,
} from "../scoresheet/projection";

const actionKinds = {
  points: "Pontos",
  fouls: "Faltas",
  timeouts: "Tempos debitados",
} as const;

const targets: Record<string, string> = {
  C: "Técnico",
  AT: "Assistente",
  B: "Banco",
  TO: "TD",
};

export function SheetActionHistory({
  actions,
  periods,
  disabled,
  onEdit,
  onDelete,
}: {
  actions: AnnotatedAction[];
  periods: number;
  disabled: boolean;
  onEdit: (action: AnnotatedAction) => void;
  onDelete: (id: string) => void;
}) {
  const [side, setSide] = useState("");
  const [period, setPeriod] = useState("");
  const [kind, setKind] = useState("");
  const [full, setFull] = useState(false);
  const [order, setOrder] = useState<HistoryQuery["order"]>("entry");
  const [page, setPage] = useState(0);
  const matches = actions.filter(
    (action) =>
      (!side || side === action.event.side) &&
      (!period || Number(period) === action.event.period) &&
      (!kind || kind === action.kind),
  );
  const result = selectActionHistory(matches, {
    mode: full ? "history" : "recent",
    sides: ["home", "away"],
    periods: Array.from({ length: periods }, (_, i) => i + 1),
    kinds: ["points", "fouls", "timeouts"],
    order,
    page,
  });
  const rows =
    !full && order === "entry" ? [...result.items].reverse() : result.items;

  return (
    <section className="sheet-history" aria-label="Conferência das ações">
      <div className="sheet-history-heading">
        <h4>{full ? "Histórico de ações" : "Últimas ações"}</h4>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setFull(!full);
            setPage(0);
          }}
        >
          {full ? "Últimas 10" : "Histórico completo"}
        </button>
      </div>
      <fieldset disabled={disabled} className="sheet-history-filters">
        <legend className="sr-only">Filtrar ações</legend>
        <label>
          Equipe
          <select
            aria-label="Filtrar ações por equipe"
            value={side}
            onChange={(e) => {
              setSide(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todas</option>
            <option value="home">Equipe A</option>
            <option value="away">Equipe B</option>
          </select>
        </label>
        <label>
          Período
          <select
            aria-label="Filtrar ações por período"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {Array.from({ length: periods }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {periodLabel(i + 1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select
            aria-label="Filtrar ações por tipo"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(actionKinds).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ordem das ações
          <select
            aria-label="Ordem das ações"
            value={order}
            onChange={(e) => {
              setOrder(e.target.value as HistoryQuery["order"]);
              setPage(0);
            }}
          >
            <option value="entry">Ordem de lançamento</option>
            <option value="period">Por período</option>
          </select>
        </label>
      </fieldset>
      <div
        className="sheet-history-scroll"
        role="region"
        aria-label="Registro de ações"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Nº</th>
              <th scope="col">Período</th>
              <th scope="col">Equipe</th>
              <th scope="col">Alvo</th>
              <th scope="col">Ação</th>
              <th scope="col">Operações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((action) => {
              const { event, sequence } = action;
              return (
                <tr key={event.id}>
                  <td>{sequence}</td>
                  <td className={`sheet-period-${periodColor(event.period)}`}>
                    {periodLabel(event.period)}
                  </td>
                  <td>{event.side === "home" ? "A" : "B"}</td>
                  <td>{targets[event.target] ?? "#" + event.target}</td>
                  <td>{action.annotation.replace(/^TO ·/u, "TD ·")}</td>
                  <td>
                    <div className="competition-actions">
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`Editar ação ${sequence}`}
                        onClick={() => onEdit(action)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`Excluir ação ${sequence}`}
                        onClick={() => onDelete(event.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={6}>
                  {actions.length
                    ? "Nenhuma ação corresponde aos filtros."
                    : "Sem ações registradas."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {full && matches.length > 10 && (
        <div className="competition-actions">
          <button
            type="button"
            disabled={disabled || result.page === 0}
            onClick={() => setPage(result.page - 1)}
          >
            Ações anteriores
          </button>
          <span>Página {result.page + 1}</span>
          <button
            type="button"
            disabled={disabled || !result.hasMore}
            onClick={() => setPage(result.page + 1)}
          >
            Próximas ações
          </button>
        </div>
      )}
    </section>
  );
}
