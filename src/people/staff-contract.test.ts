import { describe, expect, it } from "vitest";
import { saveStaffSchema } from "./staff-contract";
const id = () => crypto.randomUUID();
describe("comissão ligada à pessoa e à inscrição", () => {
  it("aceita técnico e assistente sem incorporar escolhas de capitão de jogo", () => {
    const command = {
      commandId: id(),
      expectedVersion: 0,
      entry: {
        id: id(),
        registrationId: id(),
        personId: id(),
        role: "head",
        active: true,
      },
    };
    expect(saveStaffSchema.parse(command).entry.role).toBe("head");
    expect(
      saveStaffSchema.safeParse({
        ...command,
        entry: { ...command.entry, role: "assistant" },
      }).success,
    ).toBe(true);
    expect(
      saveStaffSchema.safeParse({
        ...command,
        entry: { ...command.entry, role: "captain" },
      }).success,
    ).toBe(false);
    expect(
      saveStaffSchema.safeParse({
        ...command,
        entry: { ...command.entry, disputeId: id() },
      }).success,
    ).toBe(false);
  });
});
