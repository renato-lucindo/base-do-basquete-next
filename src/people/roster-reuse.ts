import {
  REUSE_LIMIT,
  reuseContextSchema,
  reuseSelectionSchema,
  type ReuseContext,
} from "./roster-reuse-contract";
import { rosterEntrySchema } from "./roster-contract";

export function previewRosterReuse(input: unknown, selection: unknown = []) {
  const context = reuseContextSchema.parse(input),
    choices = reuseSelectionSchema.parse(selection);
  const sourceIds = new Set(context.candidates.map((r) => r.sourceEntryId));
  if (choices.some((c) => !sourceIds.has(c.sourceEntryId)))
    throw Error("A seleção não pertence à origem.");
  const bySource = new Map(choices.map((c) => [c.sourceEntryId, c]));
  const existing = new Map(context.targetRoster.map((r) => [r.personId, r]));
  const rows = context.candidates.map((candidate) => {
    const current = existing.get(candidate.person.id),
      choice = bySource.get(candidate.sourceEntryId);
    const status:
      ReuseContext["candidates"][number]["eligibility"] | "already_included" =
      current ? "already_included" : candidate.eligibility;
    if (choice?.selected && status !== "eligible")
      throw Error("Atleta indisponível para inclusão.");
    if (current && choice && choice.jersey !== current.jersey)
      throw Error("A camisa existente é preservada.");
    const jersey = current
      ? current.jersey
      : choice
        ? choice.jersey
        : candidate.jersey;
    const selected = status === "eligible" && (choice?.selected ?? true);
    const errors: ("jersey_conflict" | "invalid_jersey")[] = [];
    if (selected && !rosterEntrySchema.shape.jersey.safeParse(jersey).success)
      errors.push("invalid_jersey");
    return {
      sourceEntryId: candidate.sourceEntryId,
      sourceVersion: candidate.sourceVersion,
      personId: candidate.person.id,
      name: candidate.person.name,
      nickname: candidate.person.nickname,
      status,
      selected,
      jersey,
      errors,
    };
  });
  const shirts = new Map<string, number>();
  for (const r of context.targetRoster)
    if (r.jersey !== null) shirts.set(r.jersey, 1);
  for (const r of rows)
    if (r.selected && r.jersey !== null)
      shirts.set(r.jersey, (shirts.get(r.jersey) ?? 0) + 1);
  for (const r of rows)
    if (r.selected && r.jersey !== null && shirts.get(r.jersey)! > 1)
      r.errors.push("jersey_conflict");
  const selectedCount = rows.filter((r) => r.selected).length;
  const errors: ("no_selection" | "selection_limit")[] =
    selectedCount === 0
      ? ["no_selection"]
      : selectedCount > REUSE_LIMIT
        ? ["selection_limit"]
        : [];
  return {
    rows,
    selectedCount,
    alreadyIncludedCount: rows.filter((r) => r.status === "already_included")
      .length,
    ready:
      errors.length === 0 &&
      !rows.some((r) => r.selected && r.errors.length > 0),
    errors,
  };
}
