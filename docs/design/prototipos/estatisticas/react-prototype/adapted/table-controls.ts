// Functions extracted without logic changes from upstream/table-controls.ts.
export type SortDirection = "asc" | "desc";
export type StatisticsSortKey = string;

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function compareValues(
  left: number | string | null,
  right: number | string | null,
  direction: SortDirection,
): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const result =
    typeof left === "string" && typeof right === "string"
      ? left.localeCompare(right, "pt-BR", { sensitivity: "base" })
      : Number(left) - Number(right);
  return direction === "asc" ? result : -result;
}

export function nextSort(
  currentKey: StatisticsSortKey,
  currentDirection: SortDirection,
  requestedKey: StatisticsSortKey,
): { key: StatisticsSortKey; direction: SortDirection } {
  if (currentKey !== requestedKey) {
    return {
      key: requestedKey,
      direction: requestedKey === "player" ? "asc" : "desc",
    };
  }
  return {
    key: currentKey,
    direction: currentDirection === "asc" ? "desc" : "asc",
  };
}
