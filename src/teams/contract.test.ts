import { describe, expect, it } from "vitest";
import { saveTeamSchema, saveRegistrationSchema } from "./contract";
const id = () => crypto.randomUUID();
describe("identidade de equipes e inscrições", () => {
  it("normaliza nome/sigla e recusa campos arbitrários ou versão negativa", () => {
    const command = {
      commandId: id(),
      expectedVersion: 0,
      team: { id: id(), name: "  Lobos   Clube ", abbreviation: " " },
    };
    expect(saveTeamSchema.parse(command).team).toMatchObject({
      name: "Lobos Clube",
      abbreviation: null,
    });
    expect(
      saveTeamSchema.safeParse({ ...command, ownerId: id() }).success,
    ).toBe(false);
    expect(
      saveTeamSchema.safeParse({ ...command, expectedVersion: -1 }).success,
    ).toBe(false);
    expect(
      saveTeamSchema.safeParse({
        ...command,
        team: { ...command.team, abbreviation: "x".repeat(13) },
      }).success,
    ).toBe(false);
  });
  it("separa equipe global do nome público e valida identidade/destino", () => {
    const command = {
      commandId: id(),
      expectedVersion: 0,
      registration: {
        id: id(),
        disputeId: id(),
        teamId: id(),
        name: "Lobos B",
      },
    };
    expect(saveRegistrationSchema.parse(command).registration.name).toBe(
      "Lobos B",
    );
    expect(
      saveRegistrationSchema.safeParse({
        ...command,
        registration: { ...command.registration, disputeId: "outro" },
      }).success,
    ).toBe(false);
    expect(
      saveRegistrationSchema.safeParse({
        ...command,
        registration: { ...command.registration, name: " " },
      }).success,
    ).toBe(false);
  });
});
