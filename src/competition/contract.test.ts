import { describe, expect, it } from "vitest";
import { saveCompetitionSchema } from "./contract";

const id = (n: number) =>
  `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const command = () => ({
  commandId: id(1),
  expectedVersion: 0,
  competition: {
    id: id(2),
    name: "  Liga   Regional  ",
    seasons: [
      {
        id: id(3),
        year: 2026,
        disputes: [
          {
            id: id(4),
            gender: "feminino",
            category: "  Adulto ",
            division: "",
          },
          { id: id(5), gender: "masculino", category: "Adulto", division: "B" },
        ],
      },
    ],
  },
});

describe("competition aggregate boundary", () => {
  it("normalizes labels without losing the optional division or independent contexts", () => {
    const result = saveCompetitionSchema.parse(command());
    expect(result.competition.name).toBe("Liga Regional");
    expect(result.competition.seasons[0].disputes[0]).toMatchObject({
      category: "Adulto",
      division: null,
    });
    expect(result.competition.seasons[0].disputes).toHaveLength(2);
  });
  it("rejects duplicate years and duplicate context labels case-insensitively", () => {
    const value = command();
    value.competition.seasons.push({
      ...value.competition.seasons[0],
      id: id(6),
    });
    expect(saveCompetitionSchema.safeParse(value).success).toBe(false);
    const duplicate = command();
    duplicate.competition.seasons[0].disputes.push({
      id: id(7),
      gender: "feminino",
      category: "adulto",
      division: " ",
    });
    expect(saveCompetitionSchema.safeParse(duplicate).success).toBe(false);
  });
  it("rejects reused identities, empty contexts, unbounded input and injected authority", () => {
    const value = command();
    value.competition.seasons[0].disputes[0].id = value.competition.id;
    expect(saveCompetitionSchema.safeParse(value).success).toBe(false);
    expect(
      saveCompetitionSchema.safeParse({ ...command(), actorId: id(90) })
        .success,
    ).toBe(false);
    const empty = command();
    empty.competition.seasons[0].disputes = [];
    expect(saveCompetitionSchema.safeParse(empty).success).toBe(false);
    const long = command();
    long.competition.name = "x".repeat(121);
    expect(saveCompetitionSchema.safeParse(long).success).toBe(false);
    const year = command();
    year.competition.seasons[0].year = 0;
    expect(saveCompetitionSchema.safeParse(year).success).toBe(false);
  });
});
