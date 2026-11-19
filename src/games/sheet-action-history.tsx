import { sheetPeriodLabel } from "./sheet-period-label";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../ui-system/components";
import { parseFoul, periodColor, type Foul } from "../domain/scoresheet";
import type { AnnotatedAction, HistoryQuery } from "../scoresheet/projection";

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

const foulLabels: Record<Foul["kind"], string> = {
  P: "Falta pessoal",
  T: "Falta técnica",
  U: "Falta antidesportiva",
  D: "Falta desqualificante",
  B: "Falta de banco",
  C: "Falta do técnico",
};

function actionLabel({ annotation, event, kind }: AnnotatedAction) {
  if (kind === "timeouts") return annotation.replace(/^TO ·/u, "TD ·");
  if (kind === "points")
    return annotation.replace(/^([123])p\b/u, (_, points: string) =>
      points === "1" ? "1 ponto" : points + " pontos",
    );
  const foul = parseFoul(event.code, event.target);
  if (!foul) return annotation;
  const description =
    event.code.toUpperCase() === "B2"
      ? "Desqualificante no banco"
      : foulLabels[foul.kind];
  return annotation.replace(/^\S+/u, (code) => `${code} - ${description}`);
}

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
  const [order, setOrder] = useState<HistoryQuery["order"]>("entry");
  const region = useRef<HTMLDivElement>(null);
  const selectedPeriod = Number(period) > periods ? "" : period;
  const rows = useMemo(() => {
    const matches = actions.filter(
      ({ event, kind: actionKind }) =>
        (!side || side === event.side) &&
        (!selectedPeriod || Number(selectedPeriod) === event.period) &&
        (!kind || kind === actionKind),
    );
    return order === "entry"
      ? matches.reverse()
      : matches.sort(
          (a, b) => a.event.period - b.event.period || a.sequence - b.sequence,
        );
  }, [actions, kind, order, selectedPeriod, side]);

  useEffect(() => {
    if (region.current) region.current.scrollTop = 0;
  }, [side, selectedPeriod, kind, order]);

  return (
    <section className="sheet-history" aria-labelledby="sheet-history-title">
      <h4 className="sheet-section-heading" id="sheet-history-title">
        Últimas ações
      </h4>
      <fieldset disabled={disabled} className="sheet-history-filters">
        <legend className="sr-only">Filtrar ações</legend>
        <label>
          Equipe
          <select
            aria-label="Filtrar ações por equipe"
            value={side}
            onChange={(e) => {
              setSide(e.target.value);
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
            value={selectedPeriod}
            onChange={(e) => {
              setPeriod(e.target.value);
            }}
          >
            <option value="">Todos</option>
            {Array.from({ length: periods }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {sheetPeriodLabel(i + 1)}
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
            }}
          >
            <option value="entry">Ordem de lançamento</option>
            <option value="period">Por período</option>
          </select>
        </label>
      </fieldset>
      <div
        className="sheet-history-scroll"
        ref={region}
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
                    {sheetPeriodLabel(event.period)}
                  </td>
                  <td>{event.side === "home" ? "A" : "B"}</td>
                  <td>{targets[event.target] ?? "#" + event.target}</td>
                  <td>{actionLabel(action)}</td>
                  <td>
                    <div className="sheet-row-actions">
                      <button
                        type="button"
                        disabled={disabled}
                        className="sheet-row-action"
                        aria-label={`Editar ação ${sequence}`}
                        onClick={() => onEdit(action)}
                      >
                        <Icon name="edit" /> Editar
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        className="sheet-row-action sheet-remove-action"
                        aria-label={`Excluir ação ${sequence}`}
                        onClick={() => onDelete(event.id)}
                      >
                        <Icon name="trash" /> Excluir
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
    </section>
  );
}
