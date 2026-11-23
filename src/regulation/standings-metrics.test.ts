import { describe, expect, it } from "vitest";
import { basketAverage } from "./standings-metrics";

describe("cesta average por divisão", () => {
  it("divide os totais e apresenta três casas em português", () => {
    expect(basketAverage(575, 439)).toBe("1,310");
    expect(basketAverage(60, 80)).toBe("0,750");
    expect(basketAverage(0, 80)).toBe("0,000");
  });
  it("não transforma cobertura ausente ou divisor zero em número", () => {
    expect(basketAverage(null, 80)).toBe("—");
    expect(basketAverage(80, null)).toBe("—");
    expect(basketAverage(0, 0)).toBe("—");
    expect(basketAverage(20, 0)).toBe("—");
  });
});
