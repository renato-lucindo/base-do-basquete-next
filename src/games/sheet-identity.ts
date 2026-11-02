import { validatePersistedSheet, type PersistedSheet } from "./sheet-contract";

/** Bind legacy numeric targets once, using the original side + exact jersey (0 != 00).
 * Never resolve an already identified action again by its shirt number. */
export function identifyPlayerEvents(document: PersistedSheet): PersistedSheet {
  return {
    ...document,
    events: document.events.map((event) => {
      if (!/^(00|0|[1-9][0-9]?)$/u.test(event.target)) {
        if (event.playerRosterEntryId)
          throw Error("Autoria de atleta em alvo de equipe ou comissão.");
        return event;
      }
      const matches = document.participants.filter(
        (p) => p.side === event.side && p.jersey === event.target,
      );
      if (
        matches.length !== 1 ||
        (event.playerRosterEntryId &&
          event.playerRosterEntryId !== matches[0].rosterEntryId)
      )
        throw Error(
          "Não foi possível identificar com segurança o atleta do lançamento.",
        );
      return { ...event, playerRosterEntryId: matches[0].rosterEntryId };
    }),
  };
}

export function changeSheetJersey(
  document: PersistedSheet,
  rosterEntryId: string,
  jersey: string,
): PersistedSheet {
  if (!/^(00|0|[1-9][0-9]?)$/u.test(jersey))
    throw Error("Informe 0, 00 ou uma camisa de 1 a 99.");
  const player = document.participants.find(
    (p) => p.rosterEntryId === rosterEntryId,
  );
  if (!player) throw Error("Atleta não relacionado neste jogo.");
  if (
    document.participants.some(
      (p) =>
        p.side === player.side &&
        p.rosterEntryId !== rosterEntryId &&
        p.jersey === jersey,
    )
  )
    throw Error(
      "Esta camisa já está ocupada na equipe. A alteração não foi aplicada.",
    );
  const identified = identifyPlayerEvents(document);
  const next = {
    ...identified,
    participants: identified.participants.map((p) =>
      p.rosterEntryId === rosterEntryId ? { ...p, jersey } : p,
    ),
    events: identified.events.map((e) =>
      e.playerRosterEntryId === rosterEntryId ? { ...e, target: jersey } : e,
    ),
  };
  // An incomplete preparation may still have empty jerseys in other rows.
  return next.events.length ? validatePersistedSheet(next) : next;
}
