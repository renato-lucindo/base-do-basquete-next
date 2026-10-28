import {
  nameSimilarity,
  normalizePersonName,
} from "../boxscore/matching-reference";

const particles = new Set(["da", "das", "de", "do", "dos", "e"]);
const tokens = (name: string) =>
  normalizePersonName(name)
    .split(" ")
    .filter((t) => t && !particles.has(t));

/** Adapted from the supplied comparator. A shared given name is not identity evidence. */
export function importNameSimilarity(left: string, right: string): number {
  if (Array.from(left).length > 120 || Array.from(right).length > 120) return 0;
  const a = normalizePersonName(left),
    b = normalizePersonName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const at = tokens(a),
    bt = tokens(b);
  if (at.length < 2 || at.length !== bt.length) return 0;
  for (let i = 0; i < at.length; i++) {
    if (at[i].length < 2 || bt[i].length < 2) return 0;
    const similarity = nameSimilarity(at[i], bt[i]);
    const distance = Math.round(
      (1 - similarity) * Math.max(at[i].length, bt[i].length),
    );
    if (
      distance > 1 &&
      !(at[i].length >= 8 && bt[i].length >= 8 && similarity >= 0.78)
    )
      return 0;
  }
  const similarity = nameSimilarity(at.join(" "), bt.join(" "));
  return similarity >= 0.78 ? similarity : 0;
}
