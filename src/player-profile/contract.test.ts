import { describe, expect, it } from "vitest";
import { emptyPerson } from "../people/contract";
import {
  confirmPlayerProfileSchema,
  publicPlayerProfileSchema,
  playerProfileProposalSchema,
  playerProfileStateSchema,
  playerProfileAckSchema,
  playerProfileVersionSchema,
} from "./contract";

const id = (n: number) =>
  `f9400000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const person = () => {
  const { athlete, coach, ...p } = emptyPerson(id(1));
  void athlete;
  void coach;
  return { ...p, name: "Ana Silva" };
};
const stamp = "2026-10-25T22:00:00Z";
const publication = () => ({
  kind: "confirmed-player-profile-v1",
  personId: id(1),
  version: 1,
  confirmedAt: stamp,
  person: person(),
});
const command = () => ({
  commandId: id(2),
  personId: id(1),
  expectedPersonVersion: 3,
  expectedPublicationVersion: 0,
  reason: "",
  acknowledgeImpact: true,
});
describe("metadados do perfil exigem confirmação própria", () => {
  it("publica só nome e campos opcionais confirmados, sem inventar jogos", () => {
    const p = publicPlayerProfileSchema.parse(publication());
    expect(p.person.name).toBe("Ana Silva");
    expect(p.person.publicBirthYear).toBeNull();
    expect(p.person.heightCm).toBeNull();
    expect(p).not.toHaveProperty("games");
    for (const extra of [
      { actorId: id(3) },
      { reason: "privado" },
      { personVersion: 3 },
      { birthDate: "2001-01-01" },
      { games: [] },
    ])
      expect(
        publicPlayerProfileSchema.safeParse({ ...publication(), ...extra })
          .success,
      ).toBe(false);
    for (const extra of [
      {
        athlete: {
          sex: "female",
          birthDate: "2001-01-01",
          federationRegistration: "001234",
        },
      },
      { sex: "female" },
      { birthDate: "2001-01-01" },
      { federationRegistration: "001234" },
      { coach: true },
    ])
      expect(
        publicPlayerProfileSchema.safeParse({
          ...publication(),
          person: { ...person(), ...extra },
        }).success,
      ).toBe(false);
  });
  it("preserva identidade estável de homônimos e recusa correlação adulterada", () => {
    const a = publicPlayerProfileSchema.parse(publication());
    const b = publicPlayerProfileSchema.parse({
      ...publication(),
      personId: id(4),
      person: { ...person(), id: id(4) },
    });
    expect(a.person.name).toBe(b.person.name);
    expect(a.personId).not.toBe(b.personId);
    expect(
      publicPlayerProfileSchema.safeParse({ ...publication(), personId: id(4) })
        .success,
    ).toBe(false);
    const proposal = { personId: id(1), personVersion: 3, person: person() };
    expect(playerProfileProposalSchema.safeParse(proposal).success).toBe(true);
    expect(
      playerProfileProposalSchema.safeParse({ ...proposal, personId: id(4) })
        .success,
    ).toBe(false);
  });
  it("comando envia referências e versões, nunca snapshot escolhido pelo browser", () => {
    expect(confirmPlayerProfileSchema.safeParse(command()).success).toBe(true);
    for (const extra of [
      { person: person() },
      { personVersion: 3 },
      { sourceChanged: false },
      { acknowledgeImpact: false },
      { expectedPersonVersion: 0 },
      { expectedPublicationVersion: -1 },
      { expectedPublicationVersion: 2147483647 },
    ]) {
      expect(
        confirmPlayerProfileSchema.safeParse({ ...command(), ...extra })
          .success,
      ).toBe(false);
    }
    expect(
      confirmPlayerProfileSchema.safeParse({
        ...command(),
        expectedPublicationVersion: 1,
      }).success,
    ).toBe(false);
    expect(
      confirmPlayerProfileSchema.parse({
        ...command(),
        expectedPublicationVersion: 1,
        reason: "  Revisão conferida  ",
      }).reason,
    ).toBe("Revisão conferida");
    for (const reason of [
      "ab",
      "\u0000abc",
      "\ud800abc",
      "x".repeat(2001),
      "🏀".repeat(1001),
    ]) {
      expect(
        confirmPlayerProfileSchema.safeParse({ ...command(), reason }).success,
      ).toBe(false);
    }
    expect(
      confirmPlayerProfileSchema.safeParse({
        ...command(),
        expectedPublicationVersion: 1,
        reason: "🏀🏀🏀",
      }).success,
    ).toBe(true);
  });
  it("valida limites dos metadados e Unicode sem derivar ano de nascimento privado", () => {
    for (const extra of [
      { name: " " },
      { name: "🏀".repeat(61) },
      { name: "\ud800" },
      { biography: "abc\u0000" },
      { biography: "x".repeat(4001) },
      { publicBirthYear: 0 },
      { heightCm: 0 },
      { weightKg: 1001 },
      { dominantHand: "unknown" },
    ]) {
      expect(
        publicPlayerProfileSchema.safeParse({
          ...publication(),
          person: { ...person(), ...extra },
        }).success,
      ).toBe(false);
    }
    expect(
      publicPlayerProfileSchema.parse({
        ...publication(),
        person: {
          ...person(),
          biography: "  História 🏀\nLinha seguinte  ",
          publicBirthYear: 1997,
        },
      }).person.biography,
    ).toBe("História 🏀\nLinha seguinte");
  });
  it("estado privado distingue fonte alterada, primeira publicação e histórico paginado", () => {
    const header = {
      version: 1,
      personVersion: 2,
      confirmedAt: stamp,
      actorId: id(3),
      reason: "",
    };
    const state = {
      personId: id(1),
      personVersion: 3,
      version: 1,
      confirmedPersonVersion: 2,
      sourceChanged: true,
      published: publication(),
      history: [header],
      hasMore: false,
    };
    expect(playerProfileStateSchema.safeParse(state).success).toBe(true);
    expect(
      playerProfileStateSchema.safeParse({ ...state, sourceChanged: false })
        .success,
    ).toBe(false);
    expect(
      playerProfileStateSchema.safeParse({
        ...state,
        published: {
          ...publication(),
          personId: id(4),
          person: { ...person(), id: id(4) },
        },
      }).success,
    ).toBe(false);
    expect(
      playerProfileStateSchema.safeParse({
        ...state,
        history: [header, header],
      }).success,
    ).toBe(false);
    expect(
      playerProfileStateSchema.safeParse({
        ...state,
        version: 0,
        confirmedPersonVersion: null,
        sourceChanged: false,
        published: null,
        history: [],
      }).success,
    ).toBe(true);
    const version = { personId: id(1), ...header, snapshot: publication() };
    expect(playerProfileVersionSchema.safeParse(version).success).toBe(true);
    expect(
      playerProfileVersionSchema.safeParse({ ...version, version: 2 }).success,
    ).toBe(false);
    expect(
      playerProfileAckSchema.safeParse({
        commandId: id(2),
        personId: id(1),
        version: 1,
        personVersion: 2,
        confirmedAt: stamp,
      }).success,
    ).toBe(true);
  });
});
