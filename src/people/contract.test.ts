import { describe, expect, it } from "vitest";
import { savePersonSchema, emptyPerson, publicPersonSchema } from "./contract";
const id = () => crypto.randomUUID();
describe("pessoas sem fusão e especializações", () => {
  it("exige sexo de novo atleta e permite técnico sem duplicar pessoa", () => {
    const person = { ...emptyPerson(id()), name: " Ana  Silva ", coach: true };
    const c = {
      commandId: id(),
      expectedVersion: 0,
      disputeId: null,
      confirmHomonym: false,
      person,
    };
    expect(savePersonSchema.parse(c).person.name).toBe("Ana Silva");
    expect(
      savePersonSchema.safeParse({ ...c, person: { ...person, coach: false } })
        .success,
    ).toBe(false);
    expect(
      savePersonSchema.parse({
        ...c,
        person: {
          ...person,
          athlete: {
            sex: "female",
            birthDate: null,
            federationRegistration: null,
          },
        },
      }).person.coach,
    ).toBe(true);
    expect(
      savePersonSchema.safeParse({
        ...c,
        person: {
          ...person,
          athlete: { sex: null, birthDate: null, federationRegistration: null },
        },
      }).success,
    ).toBe(false);
  });
  it("separa perfil público de dados privados e valida ano/data", () => {
    const person = {
      ...emptyPerson(id()),
      name: "João Silva",
      athlete: {
        sex: "male",
        birthDate: "2000-02-29",
        federationRegistration: "privado",
      },
    };
    const c = {
      commandId: id(),
      expectedVersion: 0,
      disputeId: id(),
      confirmHomonym: true,
      person,
    };
    expect(savePersonSchema.safeParse(c).success).toBe(true);
    expect(
      savePersonSchema.safeParse({
        ...c,
        person: { ...person, publicBirthYear: 0 },
      }).success,
    ).toBe(false);
    expect(
      savePersonSchema.safeParse({
        ...c,
        person: {
          ...person,
          athlete: { ...person.athlete, birthDate: "2001-02-29" },
        },
      }).success,
    ).toBe(false);
    const { athlete, coach, ...profile } = person;
    void athlete;
    void coach;
    expect(publicPersonSchema.parse(profile)).not.toHaveProperty("athlete");
    expect(publicPersonSchema.safeParse(person).success).toBe(false);
  });
});
