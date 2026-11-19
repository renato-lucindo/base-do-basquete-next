import { periodLabel } from "../domain/scoresheet";

export function sheetPeriodLabel(period: number): string {
  return periodLabel(period).replace(/^OT/u, "PE");
}
