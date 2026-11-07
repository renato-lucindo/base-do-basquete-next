import { useRef, useState } from "react";
import type { z } from "zod";
import type { regulationProjectionSchema } from "./view-contract";
import type { RegulationDefinition } from "./persistence-contract";
type Projection = z.infer<typeof regulationProjectionSchema>;
type Props = {
  value: Projection;
  definition: RegulationDefinition;
  names: Map<string, string>;
  change: (f: (d: RegulationDefinition) => void) => void;
  onEditingChange: (editing: boolean) => void;
};
function TieOrder({
  ids,
  names,
  apply,
}: {
  ids: string[];
  names: Map<string, string>;
  apply: (order: string[], comment: string) => void;
}) {
  const [order, setOrder] = useState(ids),
    [comment, setComment] = useState("");
  function move(index: number, offset: number) {
    setOrder((old) => {
      const next = [...old];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  }
  return (
    <fieldset className="reg-tie-order">
      <legend>Ordem definida pela administração</legend>
      <ol>
        {order.map((id, i) => (
          <li key={id}>
            <span>{names.get(id) ?? "Equipe"}</span>
            <div className="reg-actions">
              <button
                type="button"
                aria-label={`Subir ${names.get(id) ?? "Equipe"}`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                Subir
              </button>
              <button
                type="button"
                aria-label={`Descer ${names.get(id) ?? "Equipe"}`}
                disabled={i === order.length - 1}
                onClick={() => move(i, 1)}
              >
                Descer
              </button>
            </div>
          </li>
        ))}
      </ol>
      <label>
        Justificativa do desempate
        <textarea
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>
      <p>A justificativa fica visível apenas na administração.</p>
      <button
        type="button"
        disabled={!comment.trim()}
        onClick={() => apply(order, comment.trim())}
      >
        Aplicar decisão ao regulamento
      </button>
    </fieldset>
  );
}
export function TiePanel({
  value,
  definition,
  names,
  change,
  onEditingChange,
}: Props) {
  const [editing, setEditing] = useState("");
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const groups = value.groupPhases.flatMap((p) =>
    p.groups.map((g) => ({ ...g, phaseId: p.phaseId })),
  );
  if (
    !groups.some(
      (g) =>
        g.standings.unresolvedTies.length ||
        (g.appliedTieDecisionIds?.length ?? 0) ||
        (g.staleTieDecisionIds?.length ?? 0),
    )
  )
    return null;
  return (
    <section className="reg-tie-panel">
      <h4>Desempates administrativos</h4>
      <p>
        Você pode salvar e publicar com empates pendentes. Para definir quem
        fica à frente ou avança, escolha a ordem e justifique.
      </p>
      {groups.map((g) => {
        const group = definition.groupPhases
          .find((p) => p.phaseId === g.phaseId)
          ?.groups.find((v) => v.id === g.groupId);
        return (
          <section key={g.groupId}>
            <h5>{group?.name ?? "Grupo"}</h5>
            {!!g.staleTieDecisionIds?.length && (
              <p role="status">
                Os resultados ou as regras mudaram. Revise o desempate anterior;
                ele não está sendo aplicado.
              </p>
            )}
            {(definition.tieDecisions ?? [])
              .filter((d) => d.phaseId === g.phaseId && d.groupId === g.groupId)
              .map((d) => {
                const note = definition.tieNotes?.find((n) => n.id === d.id);
                return (
                  <div key={d.id}>
                    <p>
                      {d.order
                        .map((id) => names.get(id) ?? "Equipe")
                        .join(" → ")}
                    </p>
                    {note && (
                      <p>
                        Justificativa: {note.comment}
                        {note.decidedAt
                          ? ` · Registrada em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(note.decidedAt))}`
                          : ""}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        change((v) => {
                          v.tieDecisions = v.tieDecisions?.filter(
                            (x) => x.id !== d.id,
                          );
                          v.tieNotes = v.tieNotes?.filter((n) => n.id !== d.id);
                        })
                      }
                    >
                      Retirar decisão de desempate
                    </button>
                  </div>
                );
              })}
            {g.standings.unresolvedTies.map((ids) => {
              const key = g.phaseId + g.groupId + ids.join();
              return (
                <div key={key}>
                  <p>
                    Empate:{" "}
                    {ids.map((id) => names.get(id) ?? "Equipe").join(", ")}
                  </p>
                  {editing !== key ? (
                    <button
                      type="button"
                      disabled={!!editing}
                      ref={(node) => {
                        buttons.current[key] = node;
                      }}
                      onClick={() => {
                        setEditing(key);
                        onEditingChange(true);
                      }}
                    >
                      Definir desempate
                    </button>
                  ) : (
                    <>
                      <TieOrder
                        ids={ids}
                        names={names}
                        apply={(order, comment) => {
                          onEditingChange(false);
                          change((v) => {
                            const removed = new Set(
                              (v.tieDecisions ?? [])
                                .filter(
                                  (d) =>
                                    d.phaseId === g.phaseId &&
                                    d.groupId === g.groupId &&
                                    d.order.some((id) => ids.includes(id)),
                                )
                                .map((d) => d.id),
                            );
                            const id = crypto.randomUUID();
                            v.tieDecisions = [
                              ...(v.tieDecisions ?? []).filter(
                                (d) => !removed.has(d.id),
                              ),
                              {
                                id,
                                phaseId: g.phaseId,
                                groupId: g.groupId,
                                order,
                                basis: g.tieContext!,
                              },
                            ];
                            v.tieNotes = [
                              ...(v.tieNotes ?? []).filter(
                                (n) => !removed.has(n.id),
                              ),
                              { id, comment },
                            ];
                          });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditing("");
                          onEditingChange(false);
                          requestAnimationFrame(() =>
                            buttons.current[key]?.focus(),
                          );
                        }}
                      >
                        Cancelar edição do desempate
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </section>
  );
}
