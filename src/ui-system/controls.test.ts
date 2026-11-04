import { describe, expect, it } from "vitest";
import { normalizeSearch, sortRows } from "./controls";

describe("compact list controls", () => {
  it("matches Portuguese names regardless of case or Unicode accent encoding", () => {
    expect(
      ["ÁLVARES CABRAL", "alvares cabral", "A\u0301lvares  Cabral"].map(
        normalizeSearch,
      ),
    ).toEqual(Array(3).fill("alvares cabral"));
    expect(normalizeSearch("  João Antônio  ")).toBe("joao antonio");
  });
  it("sorts the complete list numerically before taking a page", () => {
    const rows = ["100", "10", "2", "1", null].map((number, i) => ({
      id: String(i),
      number,
    }));
    const sorted = sortRows(
      rows,
      { key: "number", direction: "asc" },
      (row) => row.number,
      (row) => row.id,
    );
    expect(sorted.slice(0, 2).map((row) => row.number)).toEqual(["1", "2"]);
    expect(sorted.slice(2).map((row) => row.number)).toEqual([
      "10",
      "100",
      null,
    ]);
    expect(rows[0].number).toBe("100");
  });
  it("keeps missing dates last in either direction and ties deterministic", () => {
    const rows = [
      { id: "b", date: "2026-04-12" },
      { id: "c", date: null },
      { id: "a", date: "2026-04-12" },
      { id: "d", date: "2026-04-02" },
    ];
    for (const direction of ["asc", "desc"] as const) {
      const sorted = sortRows(
        rows,
        { key: "date", direction },
        (row) => row.date,
        (row) => row.id,
      );
      expect(sorted.at(-1)?.id).toBe("c");
      expect(
        sorted.filter((row) => row.date === "2026-04-12").map((row) => row.id),
      ).toEqual(["a", "b"]);
      expect(sorted[0].id).toBe(direction === "asc" ? "d" : "a");
    }
  });
  it("uses full precision for ordering values displayed with one decimal", () => {
    const rows = [
      { id: "b", value: 20.041 },
      { id: "a", value: 20.049 },
    ];
    expect(
      sortRows(
        rows,
        { key: "value", direction: "desc" },
        (row) => row.value,
        (row) => row.id,
      ).map((row) => row.id),
    ).toEqual(["a", "b"]);
  });
});
