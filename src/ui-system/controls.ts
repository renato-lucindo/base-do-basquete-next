export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/gu, " ")
    .trim();
}

const collator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
});
export type Sort = { key: string; direction: "asc" | "desc" };
export type SortValue = string | number | null | undefined;

/** Sort the complete collection before slicing a page; keep missing values last. */
export function sortRows<T>(
  rows: readonly T[],
  sort: Sort,
  value: (row: T, key: string) => SortValue,
  id: (row: T) => string,
): T[] {
  return [...rows].sort((a, b) => {
    const av = value(a, sort.key),
      bv = value(b, sort.key);
    const missingA = av === null || av === undefined || av === "";
    const missingB = bv === null || bv === undefined || bv === "";
    if (missingA !== missingB) return missingA ? 1 : -1;
    const compared = missingA
      ? 0
      : typeof av === "number" && typeof bv === "number"
        ? av - bv
        : collator.compare(String(av), String(bv));
    return (
      (sort.direction === "asc" ? compared : -compared) ||
      collator.compare(id(a), id(b))
    );
  });
}

export function nextSort(current: Sort, key: string): Sort {
  return {
    key,
    direction:
      current.key === key && current.direction === "asc" ? "desc" : "asc",
  };
}
