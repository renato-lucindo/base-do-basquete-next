import {
  validateSheet,
  type Sheet,
  type Side,
  type TeamStaff,
} from "../domain/scoresheet";

export function getTeamStaff(sheet: Sheet, side: Side): TeamStaff {
  return (
    sheet.staff?.[side] ?? {
      captainId: sheet.coachPlayer[side],
      captainIsCoach: true,
      coachName: "",
      assistantName: "",
    }
  );
}
export function withTeamStaff(
  sheet: Sheet,
  side: Side,
  patch: Partial<TeamStaff>,
): Sheet {
  const staff = {
    home: { ...getTeamStaff(sheet, "home") },
    away: { ...getTeamStaff(sheet, "away") },
  };
  staff[side] = { ...staff[side], ...patch };
  if (staff[side].captainIsCoach) {
    staff[side].coachName = "";
    staff[side].assistantName = "";
  }
  return validateSheet({
    ...sheet,
    staff,
    coachPlayer: {
      home: staff.home.captainIsCoach ? staff.home.captainId : null,
      away: staff.away.captainIsCoach ? staff.away.captainId : null,
    },
  });
}
export function assertStaffReady(sheet: Sheet) {
  for (const side of ["home", "away"] as const) {
    const staff = getTeamStaff(sheet, side);
    if (staff.captainIsCoach && staff.captainId === null)
      throw new Error(
        `Selecione o capitão da equipe ${side === "home" ? "A" : "B"} para assumir como técnico.`,
      );
    if (!staff.captainIsCoach && !staff.coachName.trim())
      throw new Error(
        `Informe o Técnico da equipe ${side === "home" ? "A" : "B"} ou indique que o capitão assume.`,
      );
  }
}
