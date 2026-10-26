import { useState } from "react";
import { periodLabel, periodColor } from "../domain/scoresheet";
import {
  selectActionHistory,
  type AnnotatedAction,
  type HistoryQuery,
} from "../scoresheet/projection";
const defaults = (): HistoryQuery => ({
  mode: "recent",
  periods: Array.from({ length: 12 }, (_, i) => i + 1),
  sides: ["home", "away"],
  kinds: ["points", "fouls"],
  order: "entry",
  page: 0,
});
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
  const [q, setQ] = useState<HistoryQuery>(defaults),
    result = selectActionHistory(actions, q);
  const toggle = <K extends "periods" | "sides" | "kinds">(
    key: K,
    value: HistoryQuery[K][number],
  ) =>
    setQ((old) => ({
      ...old,
      mode: "history",
      page: 0,
      [key]: old[key].includes(value as never)
        ? old[key].filter((v) => v !== value)
        : [...old[key], value],
    }));
  return (
    <section className="sheet-history" aria-label="Conferência das ações">
      <h4>Ações registradas</h4>
      <fieldset disabled={disabled} className="sheet-history-filters">
        <legend>Pesquisar ações</legend>
        <fieldset>
          <legend>Quartos</legend>
          {Array.from({ length: periods }, (_, i) => (
            <label key={i}>
              <input
                type="checkbox"
                checked={q.periods.includes(i + 1)}
                onChange={() => toggle("periods", i + 1)}
              />
              {periodLabel(i + 1)}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Equipes</legend>
          {(["home", "away"] as const).map((side) => (
            <label key={side}>
              <input
                type="checkbox"
                checked={q.sides.includes(side)}
                onChange={() => toggle("sides", side)}
              />
              {side === "home" ? "Equipe A" : "Equipe B"}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Tipo</legend>
          {(["points", "fouls"] as const).map((kind) => (
            <label key={kind}>
              <input
                type="checkbox"
                checked={q.kinds.includes(kind)}
                onChange={() => toggle("kinds", kind)}
              />
              {kind === "points" ? "Pontos" : "Faltas"}
            </label>
          ))}
        </fieldset>
        <label>
          Ordem das ações
          <select
            aria-label="Ordem das ações"
            value={q.order}
            onChange={(e) =>
              setQ((old) => ({
                ...old,
                order: e.target.value as HistoryQuery["order"],
                page: 0,
              }))
            }
          >
            <option value="entry">Ordem de lançamento</option>
            <option value="period">Quarto Q1 → Q2 → Q3 → Q4 → OT</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setQ((old) => ({ ...old, mode: "history", page: 0 }))}
        >
          Consultar histórico
        </button>
        <button type="button" onClick={() => setQ(defaults())}>
          Últimas 10
        </button>
      </fieldset>
      <p role="status">
        {q.mode === "recent"
          ? `Últimas ${result.items.length} ações de ${actions.length}`
          : `${result.total} ações encontradas · página ${result.page + 1}`}
      </p>
      {result.items.length ? (
        (["points", "fouls"] as const).map((kind) => (
          <section
            key={kind}
            aria-label={
              kind === "points" ? "Ações de pontos" : "Ações de faltas"
            }
          >
            <h5>{kind === "points" ? "Pontos" : "Faltas"}</h5>
            <ol className="sheet-actions">
              {result.items
                .filter((a) => a.kind === kind)
                .map((a) => (
                  <li
                    key={a.event.id}
                    className={`sheet-period-${periodColor(a.event.period)}`}
                  >
                    <span>
                      {a.sequence}. {periodLabel(a.event.period)} -{" "}
                      {a.event.side === "home" ? "A" : "B"} -{" "}
                      {/^[0-9]/u.test(a.event.target)
                        ? "#" + a.event.target
                        : a.event.target === "C"
                          ? "Técnico"
                          : "Banco"}{" "}
                      - {a.annotation}
                    </span>
                    <div className="competition-actions">
                      <button
                        disabled={disabled}
                        aria-label={`Editar ação ${a.sequence}`}
                        onClick={() => onEdit(a)}
                      >
                        Editar
                      </button>
                      <button
                        disabled={disabled}
                        aria-label={`Excluir ação ${a.sequence}`}
                        onClick={() => onDelete(a.event.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
            </ol>
          </section>
        ))
      ) : (
        <p>
          {actions.length
            ? "Nenhuma ação corresponde aos filtros."
            : "Sem ações registradas."}
        </p>
      )}
      {q.mode === "history" && (
        <div className="competition-actions">
          <button
            disabled={disabled || result.page === 0}
            onClick={() => setQ((old) => ({ ...old, page: result.page - 1 }))}
          >
            Ações anteriores
          </button>
          <button
            disabled={disabled || !result.hasMore}
            onClick={() => setQ((old) => ({ ...old, page: result.page + 1 }))}
          >
            Próximas ações
          </button>
        </div>
      )}
    </section>
  );
}
