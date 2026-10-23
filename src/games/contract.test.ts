import { describe, it, expect } from "vitest";
import { gameSchema, saveGameSchema } from "./contract";
const id = () => crypto.randomUUID();
const game = () => ({
  id: id(),
  disputeId: id(),
  homeRegistrationId: id(),
  awayRegistrationId: id(),
  date: null,
  time: null,
  venue: null,
  number: null,
});
describe("direct game registration", () => {
  it("allows missing schedule without inventing midnight or score", () => {
    expect(gameSchema.parse(game())).not.toHaveProperty("score");
    expect(gameSchema.parse({ ...game(), date: "2026-10-23" }).time).toBeNull();
  });
  it("requires distinct registrations and a real date before a time", () => {
    const g = game();
    expect(
      gameSchema.safeParse({ ...g, awayRegistrationId: g.homeRegistrationId })
        .success,
    ).toBe(false);
    for (const extra of [
      { date: "2026-02-30" },
      { date: "0000-01-01" },
      { time: "15:30" },
      { date: "2026-10-23", time: "24:00" },
    ])
      expect(gameSchema.safeParse({ ...g, ...extra }).success).toBe(false);
    expect(
      gameSchema.safeParse({ ...g, date: "2026-10-23", time: "15:30" }).success,
    ).toBe(true);
  });
  it("bounds and normalizes metadata, rejects status/score/context supplied outside contract", () => {
    expect(
      gameSchema.parse({
        ...game(),
        venue: "  Quadra   Azul ",
        number: "  01 ",
      }),
    ).toMatchObject({ venue: "Quadra Azul", number: "01" });
    expect(
      gameSchema.safeParse({ ...game(), venue: "x".repeat(161) }).success,
    ).toBe(false);
    expect(
      gameSchema.safeParse({ ...game(), state: "published" }).success,
    ).toBe(false);
    expect(
      saveGameSchema.safeParse({
        commandId: id(),
        expectedVersion: -1,
        game: game(),
      }).success,
    ).toBe(false);
  });
});
