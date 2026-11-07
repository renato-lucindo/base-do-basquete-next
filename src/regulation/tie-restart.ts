import type { TieCriterion } from "./contract";

/** D.1.4: each partial separation starts a new mini-table for the remaining tie.
 * A split strictly reduces the group size; an exhausted/blocked group stays tied.
 */
export function restartTieCriteria<T>(
  groups: T[][],
  criteria: TieCriterion[],
  refine: (group: T[], criterion: TieCriterion) => T[][],
  blocked: (group: T[]) => boolean = () => false,
): T[][] {
  return groups.flatMap((group) => {
    if (group.length < 2) return [group];
    for (const criterion of criteria) {
      if (blocked(group)) break;
      const parts = refine(group, criterion);
      if (parts.length > 1)
        return restartTieCriteria(parts, criteria, refine, blocked);
    }
    return [group];
  });
}
