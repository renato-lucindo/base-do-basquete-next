import { expect, it } from "vitest";
import {
  regulationFixture,
  regulationId as id,
} from "../../tests/fixtures/regulation";
import {
  achievementContextSchema,
  achievementCandidateListingSchema,
} from "./context-contract";
function fixture() {
  const regulation = regulationFixture();
  regulation.history = [];
  regulation.hasMore = false;
  return {
    disputeId: id(90),
    scope: {
      championshipId: id(91),
      name: "Liga",
      seasonId: id(92),
      year: 2026,
      gender: "masculino",
      category: "Adulto",
      division: null,
    },
    regulation,
    registrations: [1, 2].map((n) => ({
      id: id(n),
      disputeId: id(90),
      teamId: id(80),
      name: `Inscrição ${n}`,
      version: 1,
    })),
    eligibleAthletes: [{ personId: id(500), version: 1 }],
    contextFingerprint: "a".repeat(64),
  };
}
it("fonte privada recusa catálogo de outra disputa, identidades duplicadas e auditoria desnecessária", () => {
  const c = fixture();
  expect(achievementContextSchema.safeParse(c).success).toBe(true);
  for (const invalid of [
    { ...c, disputeId: id(999) },
    { ...c, registrations: c.registrations.slice(0, 1) },
    { ...c, eligibleAthletes: [...c.eligibleAthletes, ...c.eligibleAthletes] },
    {
      ...c,
      regulation: { ...c.regulation, history: regulationFixture().history },
    },
    { ...c, actorId: id(9) },
  ])
    expect(achievementContextSchema.safeParse(invalid).success).toBe(false);
});
it("pesquisa conserva homônimos distintos, contexto e somente campos de escolha", () => {
  const person = {
      personId: id(500),
      version: 1,
      name: "João Silva",
      nickname: null,
      publicBirthYear: null,
      registrationIds: [id(1)],
    },
    c = {
      disputeId: id(90),
      items: [person, { ...person, personId: id(501) }],
      hasMore: false,
    };
  expect(achievementCandidateListingSchema.safeParse(c).success).toBe(true);
  for (const items of [
    [person, person],
    [{ ...person, registrationIds: [id(1), id(1)] }],
    [{ ...person, birthDate: "1990-01-01" }],
  ])
    expect(
      achievementCandidateListingSchema.safeParse({ ...c, items }).success,
    ).toBe(false);
});
