import type { CSSProperties } from "react";

const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const average = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
/** Reserve the actual two display formats; no hypothetical signs or extra decimals. */
export function metricColumnStyle(
  samples: {
    value: number | null;
    totalFactor?: number;
    averageDivisor?: number;
  }[],
  percent = false,
  forceDecimal = false,
): CSSProperties {
  const width = (text: string) =>
    [...text].reduce(
      (sum, char) =>
        sum + (char === "." || char === "," ? 0.5 : char === "-" ? 0.6 : 1),
      0,
    );
  const formats = samples.flatMap(
    ({ value, totalFactor = 1, averageDivisor }) => {
      if (value === null) return [];
      const total = value * Math.max(1, totalFactor);
      const values = [(forceDecimal ? average : integer).format(total)];
      if (averageDivisor !== undefined)
        values.push(average.format(total / Math.max(1, averageDivisor)));
      return values.map((text) => text + (percent ? "%" : ""));
    },
  );
  const reserve = formats.reduce(
    (longest, text) => (width(text) > width(longest) ? text : longest),
    "",
  );
  return {
    "--bb-number-reserve": JSON.stringify(reserve),
    "--bb-reserve-units": width(reserve),
  } as CSSProperties;
}
