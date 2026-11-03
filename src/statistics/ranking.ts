/** Competition ranking after filtering and sorting, before pagination; never round ties. */
export function rankSortedRows<T>(
  rows: T[],
  value: (row: T) => number | string | null,
) {
  let previous: number | null = null;
  return rows.map((row, i) => {
    const current = value(row);
    const rank =
      current === null
        ? null
        : i > 0 && current === value(rows[i - 1])
          ? previous
          : i + 1;
    if (rank !== null) previous = rank;
    return { ...row, rank };
  });
}
