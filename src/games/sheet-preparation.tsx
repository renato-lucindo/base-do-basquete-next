import { useState, useId, useEffect } from "react";
import { changeSheetJersey } from "./sheet-identity";
import type {
  PreparationCandidate,
  PreparationContext,
} from "./preparation-contract";
import type { PersistedSheet, SheetSnapshot } from "./sheet-contract";
import type { GameSnapshot } from "./contract";
import { shirtOrder } from "./preparation";
import type { Side } from "../domain/scoresheet";
function JerseyField({
  label,
  value,
  disabled,
  onCommit,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value),
    [error, setError] = useState("");
  const errorId = useId();
  useEffect(() => {
    setDraft(value);
    setError("");
  }, [value]);
  function commit() {
    if (draft === value) return;
    try {
      onCommit(draft);
      setError("");
    } catch (e) {
      setDraft(value);
      setError(
        e instanceof Error ? e.message : "Não foi possível alterar a camisa.",
      );
    }
  }
  return (
    <>
      <input
        aria-label={label}
        inputMode="numeric"
        name="jersey"
        autoComplete="off"
        spellCheck={false}
        maxLength={2}
        value={draft}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => {
          if (/^\d{0,2}$/u.test(e.target.value)) {
            setDraft(e.target.value);
            setError("");
          }
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setDraft(value);
            setError("");
          }
        }}
      />
      {error && (
        <small id={errorId} role="alert">
          {error}
        </small>
      )}
    </>
  );
}
function AthletePicker({
  label,
  value,
  candidates,
  disabled,
  onSelect,
}: {
  label: string;
  value: string;
  candidates: PreparationCandidate[];
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState<string | null>(null),
    [active, setActive] = useState(0),
    listId = useId();
  const folded = (s: string) =>
    s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const matches = candidates.filter((c) =>
    folded(
      `${c.person.name} ${c.person.nickname ?? ""} ${c.jersey ?? ""}`,
    ).includes(folded(query ?? "")),
  );
  const pick = (id: string) => {
    onSelect(id);
    setQuery(null);
    setActive(0);
  };
  return (
    <div className="sheet-athlete-picker">
      <input
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={query !== null}
        aria-controls={listId}
        aria-activedescendant={
          query !== null && matches[active] ? `${listId}-${active}` : undefined
        }
        disabled={disabled}
        value={query ?? value}
        placeholder="Buscar atleta"
        autoComplete="off"
        onFocus={() => {
          setQuery("");
          setActive(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget))
            setQuery(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setQuery(null);
          }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setQuery((q) => q ?? "");
            setActive((i) =>
              Math.max(
                0,
                Math.min(
                  matches.length - 1,
                  i + (e.key === "ArrowDown" ? 1 : -1),
                ),
              ),
            );
          }
          if (e.key === "Enter" && query !== null) {
            e.preventDefault();
            if (matches[active]) pick(matches[active].id);
          }
        }}
      />
      {query !== null && (
        <div
          role="listbox"
          id={listId}
          aria-label={label + " disponíveis"}
          className="sheet-athlete-options"
        >
          {matches.length ? (
            matches.map((c, i) => (
              <button
                type="button"
                role="option"
                aria-label={c.person.name}
                aria-selected={i === active}
                key={c.id}
                id={`${listId}-${i}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c.id)}
              >
                {c.person.name}
                {c.jersey !== null && <small> · #{c.jersey}</small>}
              </button>
            ))
          ) : (
            <p>Nenhum atleta disponível.</p>
          )}
        </div>
      )}
    </div>
  );
}
type Props = {
  document: PersistedSheet;
  context: PreparationContext;
  game: GameSnapshot;
  snapshot: SheetSnapshot | null;
  disabled: boolean;
  onChange: (d: PersistedSheet) => boolean;
  onError: (message: string) => void;
  onManage: (side: Side) => void;
};
export function SheetPreparation({
  document: d,
  context,
  game,
  snapshot,
  disabled,
  onChange,
  onError,
  onManage,
}: Props) {
  const selectedPeople = new Set(
    d.participants.flatMap((p) => {
      const person =
        context.sides[p.side].roster.find((r) => r.id === p.rosterEntryId)
          ?.personId ??
        snapshot?.participants.find((r) => r.rosterEntryId === p.rosterEntryId)
          ?.person.id;
      return person ? [person] : [];
    }),
  );
  return (
    <div className="sheet-desktop-teams">
      {(["home", "away"] as const).map((side) => {
        const letter = side === "home" ? "A" : "B",
          c = context.sides[side],
          rows = d.participants.filter((p) => p.side === side).sort(shirtOrder),
          reg = side === "home" ? game.home : game.away,
          staff = d.staff[side];
        const name = (id: string) =>
          c.roster.find((r) => r.id === id)?.person.name ??
          snapshot?.participants.find((r) => r.rosterEntryId === id)?.person
            .name ??
          "Atleta relacionado";
        const update = (
          id: string,
          patch: Partial<PersistedSheet["participants"][number]>,
        ) =>
          onChange({
            ...d,
            participants: d.participants.map((p) =>
              p.rosterEntryId === id ? { ...p, ...patch } : p,
            ),
          });
        const changeStaff = (patch: Partial<typeof staff>) =>
          onChange({
            ...d,
            staff: { ...d.staff, [side]: { ...staff, ...patch } },
          });
        return (
          <section
            className="sheet-team-card"
            key={side}
            aria-label={`Preparação da equipe ${letter}`}
          >
            <h4>
              Equipe {letter} · {reg.name}
            </h4>
            <p className="sheet-source">
              {snapshot
                ? "Preparação salva deste jogo."
                : c.previous
                  ? `Sugestão da última súmula salva${c.previous.date ? " · " + c.previous.date : ""}, versão ${c.previous.version}.`
                  : "Primeiro jogo: elenco preenchido por camisa."}{" "}
              {rows.filter((p) => p.starter).length}/5 titulares.
            </p>
            <table
              className="sheet-preparation-table"
              aria-label={`Preparação equipe ${letter}`}
            >
              <thead>
                <tr>
                  <th scope="col">Nº</th>
                  <th scope="col">Atleta</th>
                  <th scope="col">Titular</th>
                  <th scope="col">Capitão</th>
                  <th scope="col">Entrou</th>
                  <th scope="col">
                    <span className="sr-only">Remover</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => {
                  const row = rows[i],
                    id = row?.rosterEntryId,
                    currentName = row ? name(row.rosterEntryId) : "",
                    hasActions =
                      !!row &&
                      d.events.some(
                        (e) =>
                          e.side === side &&
                          (e.target === row.jersey ||
                            (!staff.coachStaffEntryId &&
                              staff.captainRosterEntryId === id &&
                              ["B", "C"].includes(e.target))),
                      );
                  const candidates = c.roster
                    .filter((r) => !selectedPeople.has(r.personId))
                    .map((r) => ({
                      ...r,
                      jersey: c.lastJerseys[r.id] ?? r.jersey,
                    }))
                    .sort(shirtOrder);
                  return (
                    <tr key={id ?? `empty-${i}`}>
                      <td>
                        {row && (
                          <JerseyField
                            label={`Camisa de ${currentName}`}
                            value={row.jersey}
                            disabled={disabled}
                            onCommit={(jersey) => {
                              if (
                                !onChange(
                                  changeSheetJersey(
                                    d,
                                    row.rosterEntryId,
                                    jersey,
                                  ),
                                )
                              )
                                throw Error(
                                  "Não foi possível alterar a camisa. Revise o aviso da súmula.",
                                );
                            }}
                          />
                        )}
                      </td>
                      <td>
                        <AthletePicker
                          label={`Atleta ${letter} vaga ${i + 1}`}
                          value={currentName}
                          candidates={candidates}
                          disabled={
                            disabled || !!snapshot?.confirmed || hasActions
                          }
                          onSelect={(selected) => {
                            if (selected === id) return;
                            const candidate = c.roster.find(
                              (r) => r.id === selected,
                            );
                            if (!candidate) return;
                            const remaining = d.participants.filter(
                              (p) => p.rosterEntryId !== id,
                            );
                            onChange({
                              ...d,
                              participants: [
                                ...remaining,
                                {
                                  rosterEntryId: selected,
                                  side,
                                  jersey:
                                    c.lastJerseys[selected] ??
                                    candidate.jersey ??
                                    "",
                                  starter: false,
                                  played: false,
                                },
                              ],
                              staff: {
                                ...d.staff,
                                [side]: {
                                  ...staff,
                                  captainRosterEntryId:
                                    staff.captainRosterEntryId === id
                                      ? null
                                      : staff.captainRosterEntryId,
                                },
                              },
                            });
                          }}
                        />
                      </td>
                      <td>
                        {row && (
                          <input
                            type="checkbox"
                            aria-label={`Titular ${currentName}`}
                            checked={row.starter}
                            disabled={disabled}
                            onChange={(e) => {
                              if (
                                e.target.checked &&
                                rows.filter((p) => p.starter).length === 5
                              ) {
                                onError(
                                  "Selecione no máximo 5 titulares por equipe.",
                                );
                                return;
                              }
                              update(row.rosterEntryId, {
                                starter: e.target.checked,
                                played: e.target.checked || row.played,
                              });
                            }}
                          />
                        )}
                      </td>
                      <td>
                        {row && (
                          <input
                            type="radio"
                            name={`captain-${side}`}
                            aria-label={`Capitão ${currentName}`}
                            checked={staff.captainRosterEntryId === id}
                            disabled={disabled}
                            onChange={() =>
                              changeStaff({ captainRosterEntryId: id! })
                            }
                          />
                        )}
                      </td>
                      <td>
                        {row && (
                          <input
                            type="checkbox"
                            aria-label={`Participou ${currentName}`}
                            checked={row.played}
                            disabled={disabled || row.starter || hasActions}
                            onChange={(e) =>
                              update(row.rosterEntryId, {
                                played: e.target.checked,
                              })
                            }
                          />
                        )}
                      </td>
                      <td>
                        {row && (
                          <button
                            type="button"
                            aria-label={`Remover ${currentName} deste jogo`}
                            disabled={
                              disabled || !!snapshot?.confirmed || hasActions
                            }
                            onClick={() =>
                              onChange({
                                ...d,
                                participants: d.participants.filter(
                                  (p) => p.rosterEntryId !== id,
                                ),
                                staff: {
                                  ...d.staff,
                                  [side]: {
                                    ...staff,
                                    captainRosterEntryId:
                                      staff.captainRosterEntryId === id
                                        ? null
                                        : staff.captainRosterEntryId,
                                  },
                                },
                              })
                            }
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="sheet-staff-footer">
              <label>
                Técnico {letter}
                <select
                  aria-label={`Técnico ${letter}`}
                  disabled={disabled}
                  value={staff.coachStaffEntryId ?? ""}
                  onChange={(e) =>
                    changeStaff({
                      coachStaffEntryId: e.target.value || null,
                      ...(!e.target.value
                        ? { assistantStaffEntryId: null }
                        : {}),
                    })
                  }
                >
                  <option value="">Sem técnico: capitão assume</option>
                  {staff.coachStaffEntryId &&
                    !c.staff.some((s) => s.id === staff.coachStaffEntryId) && (
                      <option value={staff.coachStaffEntryId}>
                        {snapshot?.staff[side].coach?.name ??
                          "Técnico salvo deste jogo"}
                      </option>
                    )}
                  {c.staff
                    .filter(
                      (s) =>
                        s.personId !==
                        c.staff.find(
                          (a) => a.id === staff.assistantStaffEntryId,
                        )?.personId,
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.person.name}
                      </option>
                    ))}
                </select>
              </label>
              {staff.coachStaffEntryId && (
                <label>
                  Ass. Técnico {letter}
                  <select
                    aria-label={`Ass. Técnico ${letter}`}
                    disabled={disabled}
                    value={staff.assistantStaffEntryId ?? ""}
                    onChange={(e) =>
                      changeStaff({
                        assistantStaffEntryId: e.target.value || null,
                      })
                    }
                  >
                    <option value="">Sem assistente</option>
                    {staff.assistantStaffEntryId &&
                      !c.staff.some(
                        (s) => s.id === staff.assistantStaffEntryId,
                      ) && (
                        <option value={staff.assistantStaffEntryId}>
                          {snapshot?.staff[side].assistant?.name ??
                            "Assistente salvo deste jogo"}
                        </option>
                      )}
                    {c.staff
                      .filter(
                        (s) =>
                          s.personId !==
                          c.staff.find((a) => a.id === staff.coachStaffEntryId)
                            ?.personId,
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.person.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {!staff.coachStaffEntryId && (
                <p>
                  Técnico:{" "}
                  {staff.captainRosterEntryId
                    ? name(staff.captainRosterEntryId)
                    : "selecione o capitão"}
                  .
                </p>
              )}
              <button
                id={`sheet-manage-${side}`}
                type="button"
                disabled={disabled}
                onClick={() => onManage(side)}
              >
                Editar elenco {letter} aqui
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
