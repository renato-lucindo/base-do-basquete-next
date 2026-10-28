import type { TextRow } from "./contract";
import type { ImportCandidate, MatchingResult } from "./matching-contract";
import { normalizePersonName } from "../boxscore/matching-reference";
import { importNameSimilarity } from "./name-matching";
import { matchingProbeSchema } from "./matching-contract";

export type MatchContext = {
  gender: "masculino" | "feminino";
  registrationId: string | null;
};
export function automaticImportMatch(
  row: TextRow,
  match: MatchingResult["items"][number],
  context: MatchContext,
): ImportCandidate | null {
  const { name, nickname, birthDate, birthYear, federationRegistration } =
    row.data;
  if (
    match.rowId !== row.id ||
    !matchingProbeSchema.safeParse({
      rowId: row.id,
      name,
      nickname,
      birthDate,
      birthYear,
      federationRegistration,
    }).success ||
    row.issues.some(
      (i) =>
        i.field !== null &&
        ["name", "birthDate", "birthYear", "federationRegistration"].includes(
          i.field,
        ),
    )
  )
    return null;

  // These are suggestions for the final batch confirmation, never permission to
  // overwrite global fields or bypass the writer's current eligibility checks.
  function compatible(c: ImportCandidate) {
    const existingYear =
      c.data.birthYear ??
      (c.data.birthDate ? Number(c.data.birthDate.slice(0, 4)) : null);
    const importedYear =
      birthYear ?? (birthDate ? Number(birthDate.slice(0, 4)) : null);
    return (
      (c.sex === null ||
        c.sex === (context.gender === "feminino" ? "female" : "male")) &&
      (c.activeRegistrationId === null ||
        c.activeRegistrationId === context.registrationId) &&
      (!federationRegistration ||
        c.data.federationRegistration === federationRegistration) &&
      (!birthDate || !c.data.birthDate || birthDate === c.data.birthDate) &&
      (importedYear === null ||
        existingYear === null ||
        importedYear === existingYear)
    );
  }
  if (federationRegistration) {
    const exact = match.candidates.filter(
      (c) => c.data.federationRegistration === federationRegistration,
    );
    return match.status === "registration" &&
      exact.length === 1 &&
      compatible(exact[0])
      ? exact[0]
      : null;
  }
  if (match.hasMore || !["name", "suggestion"].includes(match.status))
    return null;
  const normalized = normalizePersonName(name);
  const particles = new Set(["da", "das", "de", "do", "dos", "e"]);
  if (normalized.split(" ").filter((t) => t && !particles.has(t)).length < 2)
    return null;
  const exact = match.candidates.filter(
    (c) => normalizePersonName(c.data.name) === normalized,
  );
  if (exact.length > 0)
    return exact.length === 1 && compatible(exact[0]) ? exact[0] : null;
  if (!birthDate) return null;
  const high = match.candidates.filter(
    (c) =>
      c.data.birthDate === birthDate &&
      importNameSimilarity(name, c.data.name) >= 0.95,
  );
  return high.length === 1 && compatible(high[0]) ? high[0] : null;
}
