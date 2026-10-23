import { describe, expect, it } from "vitest";
import { saveRosterSchema } from "./roster-contract";
const id = () => crypto.randomUUID();
describe("vínculo contextual e camisa textual", () => {
  it("preserva 0/00, valida 1–99 e recusa destino arbitrário", () => {
    const c = {
      commandId: id(),
      expectedVersion: 0,
      entry: {
        id: id(),
        registrationId: id(),
        personId: id(),
        jersey: "00",
        active: true,
      },
    };
    for (const jersey of ["0", "00", "1", "99"])
      expect(
        saveRosterSchema.parse({ ...c, entry: { ...c.entry, jersey } }).entry
          .jersey,
      ).toBe(jersey);
    for (const jersey of ["01", "100", "-1", "", "1.5"])
      expect(
        saveRosterSchema.safeParse({ ...c, entry: { ...c.entry, jersey } })
          .success,
      ).toBe(false);
    expect(
      saveRosterSchema.safeParse({
        ...c,
        entry: { ...c.entry, disputeId: id() },
      }).success,
    ).toBe(false);
  });
});
