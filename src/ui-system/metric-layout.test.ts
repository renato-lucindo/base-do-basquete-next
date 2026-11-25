import { describe, expect, it } from "vitest";
import { metricColumnStyle } from "./metric-layout";

describe("reserva compacta entre modos estatísticos", () => {
  it("não acrescenta precisão ao total reconstruído de médias fracionárias", () => {
    const totals = [45, 14, 0, null];
    const total = metricColumnStyle(
      totals.map((value) => ({ value, averageDivisor: 9 })),
    );
    const perGame = metricColumnStyle(
      totals.map((value) => ({
        value: value === null ? null : value / 9,
        totalFactor: 9,
        averageDivisor: 9,
      })),
    );
    expect(perGame).toEqual(total);
    expect(total).toHaveProperty("--bb-number-reserve", '"5,0"');
  });

  it("mantém precisão real, sinal e percentual sem transformar ausências em zero", () => {
    expect(
      metricColumnStyle([{ value: 1 }, { value: 1.5 }, { value: null }]),
    ).toHaveProperty("--bb-number-reserve", '"1,0"');
    expect(metricColumnStyle([{ value: -10 }], true, true)).toHaveProperty(
      "--bb-number-reserve",
      '"-10,0%"',
    );
    expect(metricColumnStyle([{ value: null }])).toHaveProperty(
      "--bb-number-reserve",
      '""',
    );
  });
});
