import {
  aggregate,
  type Sheet,
  type Side,
  type TeamStaff,
} from "../domain/scoresheet";
import { Field } from "../ui";
import { getTeamStaff, withTeamStaff } from "./staff";
import { orderedRoster } from "./lineup";

export function StaffEditor({
  sheet,
  side,
  team,
  playerName,
  onChange,
  onError,
}: {
  sheet: Sheet;
  side: Side;
  team: string;
  playerName: (id: number) => string;
  onChange: (next: Sheet) => boolean;
  onError: (message: string) => void;
}) {
  const staff = getTeamStaff(sheet, side);
  const captain = sheet.roster.find(
    (slot) => slot.side === side && slot.rosterEntryId === staff.captainId,
  );
  const changeStaff = (patch: Partial<TeamStaff>) => {
    try {
      onChange(withTeamStaff(sheet, side, patch));
    } catch (error) {
      onError((error as Error).message);
    }
  };
  const status = aggregate(sheet).teams[side].coachStatus;
  return (
    <fieldset
      className="staff-editor"
      aria-label={`Comissão técnica de ${team}`}
    >
      <legend>Capitão e comissão técnica</legend>
      <Field id={`captain-${side}`} label="Capitão">
        <select
          id={`captain-${side}`}
          value={staff.captainId ?? ""}
          onChange={(event) =>
            changeStaff({
              captainId: event.target.value ? Number(event.target.value) : null,
            })
          }
        >
          <option value="">Selecionar capitão relacionado</option>
          {orderedRoster(sheet.roster.filter((slot) => slot.side === side)).map(
            (slot) => (
              <option key={slot.rosterEntryId} value={slot.rosterEntryId}>
                #{slot.jersey} · {playerName(slot.rosterEntryId)}
              </option>
            ),
          )}
        </select>
      </Field>
      <label className="staff-fallback">
        <input
          type="checkbox"
          checked={staff.captainIsCoach}
          onChange={(event) =>
            changeStaff({ captainIsCoach: event.target.checked })
          }
        />{" "}
        Sem técnico: capitão assume
      </label>
      <Field id={`coach-${side}`} label="Técnico">
        <input
          id={`coach-${side}`}
          maxLength={120}
          readOnly={staff.captainIsCoach}
          value={
            staff.captainIsCoach
              ? captain
                ? playerName(captain.rosterEntryId)
                : ""
              : staff.coachName
          }
          onChange={(event) => changeStaff({ coachName: event.target.value })}
          placeholder={
            staff.captainIsCoach ? "Selecione o capitão" : "Nome do técnico"
          }
        />
      </Field>
      {!staff.captainIsCoach && (
        <Field id={`assistant-${side}`} label="Ass. Técnico">
          <input
            id={`assistant-${side}`}
            maxLength={120}
            value={staff.assistantName}
            onChange={(event) =>
              changeStaff({ assistantName: event.target.value })
            }
            placeholder="Nome do assistente (opcional)"
          />
        </Field>
      )}
      {staff.captainIsCoach && (
        <p className="muted">
          O capitão assume como técnico; não há assistente nesta condição.
        </p>
      )}
      <p>Situação do técnico: {status === "eligible" ? "Apto" : status}</p>
    </fieldset>
  );
}
