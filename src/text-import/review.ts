import type { TextRow, TextRowResult } from "./contract";
import { normalizeName, readyPlayerSchema } from "./contract";
/** Guidance for the table; SQL independently checks approved values and current context. */
export function reviewIssues(
  rows: TextRow[],
  results: TextRowResult[] = [],
): Map<string, string[]> {
  const applied = new Set(results.map((r) => r.rowId)),
    issues = new Map<string, string[]>();
  const add = (id: string, message: string) => {
    if (!applied.has(id)) issues.set(id, [...(issues.get(id) ?? []), message]);
  };
  const shirts = new Map<string, string[]>(),
    people = new Map<string, string[]>(),
    registrations = new Map<string, string[]>(),
    newNames = new Map<string, TextRow[]>();
  const collect = (map: Map<string, string[]>, key: string, id: string) =>
    map.set(key, [...(map.get(key) ?? []), id]);
  for (const row of rows) {
    if (!applied.has(row.id)) {
      for (const issue of row.issues) add(row.id, issue.message);
      const valid = readyPlayerSchema.safeParse(row.data);
      if (!valid.success)
        for (const issue of valid.error.issues)
          add(
            row.id,
            `Revise ${String(issue.path[0] ?? "dados")}: ${issue.message}`,
          );
      if (!row.decision) add(row.id, "Resolva a identidade deste atleta.");
    }
    if (!row.selected && !applied.has(row.id)) continue;
    if (row.data.jersey !== null) collect(shirts, row.data.jersey, row.id);
    if (row.decision) collect(people, row.decision.personId, row.id);
    if (row.data.federationRegistration)
      collect(registrations, row.data.federationRegistration, row.id);
    if (row.decision?.kind === "new") {
      const key = normalizeName(row.data.name);
      newNames.set(key, [...(newNames.get(key) ?? []), row]);
    }
  }
  for (const matches of shirts.values())
    if (matches.length > 1)
      for (const id of matches)
        add(id, "Camisa repetida nos itens selecionados.");
  for (const matches of people.values())
    if (matches.length > 1)
      for (const id of matches)
        add(id, "A mesma identidade está selecionada em mais de uma linha.");
  for (const matches of registrations.values())
    if (matches.length > 1)
      for (const id of matches)
        add(id, "Registro federativo repetido nos itens selecionados.");
  for (const matches of newNames.values())
    if (matches.length > 1)
      for (const row of matches)
        if (row.decision?.kind === "new" && !row.decision.confirmHomonym)
          add(row.id, "Confirme identidades distintas para os nomes iguais.");
  return issues;
}
