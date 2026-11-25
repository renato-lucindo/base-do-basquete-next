import type { CSSProperties } from "react";

const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});
/** Reserve both formats from the unformatted projection, including large totals. */
export function metricColumnStyle(
  samples: { value: number | null; totalFactor?: number }[],
  percent = false,
): CSSProperties {
  const characters = Math.max(
    percent ? 7 : 8,
    ...samples.map(({ value, totalFactor = 1 }) => {
      if (value === null) return 0;
      const total = Math.abs(value) * Math.max(1, totalFactor);
      // Reserve a sign as well as the longest localized total/decimal representation.
      return (
        Math.max(
          decimal.format(Math.abs(value)).length,
          decimal.format(total).length,
        ) +
        1 +
        (percent ? 1 : 0)
      );
    }),
  );
  return { "--bb-number-width": `${characters}ch` } as CSSProperties;
}
