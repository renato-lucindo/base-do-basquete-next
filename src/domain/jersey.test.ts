import { expect, it } from "vitest";
import { compareJerseys } from "./jersey";

it("ordena 00 depois de todos os números e antes de camisas ausentes", () => {
  const values = ["00", "12", null, "0", "99", "2", "1", ""];
  expect([...values].sort(compareJerseys)).toEqual([
    "0",
    "1",
    "2",
    "12",
    "99",
    "00",
    null,
    "",
  ]);
  expect(values[0]).toBe("00");
  for (const a of values)
    for (const b of values)
      expect(
        Math.sign(compareJerseys(a, b)) + Math.sign(compareJerseys(b, a)),
      ).toBe(0);
});
