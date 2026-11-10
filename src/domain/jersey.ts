/** Shared shirt order: 0, 1…99, 00, then unassigned. Never coerce 00 to 0. */
export function compareJerseys(a: string | null, b: string | null): number {
  const rank = (value: string | null) =>
    value === null || value === "" ? 101 : value === "00" ? 100 : Number(value);
  return rank(a) - rank(b);
}
