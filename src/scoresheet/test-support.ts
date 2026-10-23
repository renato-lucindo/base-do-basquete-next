// Fixtures apenas dos testes de publicação; o produto não pré-seleciona titulares.
import { initialState } from "../prototype/model";
import { setStarter } from "./lineup";
export function readyPrototype() {
  const data = initialState();
  for (const side of ["home", "away"] as const) {
    for (const slot of data.sheet.present.roster
      .filter((slot) => slot.side === side)
      .slice(0, 5))
      data.sheet.present = setStarter(
        data.sheet.present,
        slot.rosterEntryId,
        true,
      );
  }
  return data;
}
