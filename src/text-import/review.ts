import type { TextRow, TextRowResult } from "./contract";

/** Local guidance; PostgreSQL independently revalidates every confirmed item. */
export function reviewIssues(
  rows: TextRow[],
  results: TextRowResult[] = [],
): Map<string, string[]> {
  const applied = new Set(results.map((r) => r.rowId));
  const issues = new Map<string, string[]>();
  const shirts = new Map<string, string[]>(),
    people = new Map<string, string[]>();
  const add = (id: string, message: string) => {
    if (!applied.has(id)) issues.set(id, [...(issues.get(id) ?? []), message]);
  };
  for (const row of rows) {
    if (applied.has(row.id)) continue;
    if (!row.name.trim() || row.name.trim().length > 120)
      add(row.id, "Informe um nome com até 120 caracteres.");
    if (row.kind === "team") {
      if (!row.resolution)
        add(
          row.id,
          "Escolha equipe/inscrição existente ou criação de outra inscrição.",
        );
    } else {
      const team = rows.find(
        (r) => r.id === row.teamRowId && r.kind === "team",
      );
      if (!team || team.kind !== "team" || !team.resolution)
        add(row.id, "Resolva a inscrição de destino.");
      else if (!team.selected && !applied.has(team.id))
        add(row.id, "Selecione ou confirme a inscrição de destino.");
      if (!/^(00|0|[1-9][0-9]?)$/u.test(row.jersey))
        add(row.id, "Camisa inválida: use 0, 00 ou 1–99.");
      if (!row.person)
        add(row.id, "Escolha uma identidade existente ou crie outra pessoa.");
    }
  }
  for (const row of rows) {
    if (row.kind !== "athlete" || (!row.selected && !applied.has(row.id)))
      continue;
    const team = rows.find((r) => r.id === row.teamRowId);
    const destination =
      team?.kind === "team" ? team.resolution?.registrationId : undefined;
    if (destination && /^(00|0|[1-9][0-9]?)$/u.test(row.jersey)) {
      const key = `${destination}:${row.jersey}`;
      shirts.set(key, [...(shirts.get(key) ?? []), row.id]);
    }
    if (row.person) {
      const key = row.person.personId;
      people.set(key, [...(people.get(key) ?? []), row.id]);
    }
  }
  for (const matches of shirts.values())
    if (matches.length > 1)
      for (const id of matches)
        add(id, "Camisa repetida nos itens selecionados deste destino.");
  for (const matches of people.values())
    if (matches.length > 1)
      for (const id of matches)
        add(
          id,
          "A mesma identidade está em mais de um vínculo selecionado nesta disputa.",
        );
  return issues;
}
