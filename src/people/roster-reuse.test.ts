import { expect, it } from "vitest";
import { previewRosterReuse } from "./roster-reuse";

const id = (n: number) =>
  `a7100000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function context() {
  const shared = {
    teamId: id(1),
    championshipId: id(2),
    seasonId: id(3),
    version: 1,
    name: "Lobos",
    gender: "masculino",
    year: 2026,
    division: null,
  };
  return {
    target: { ...shared, id: id(4), disputeId: id(5), category: "Adulto" },
    source: { ...shared, id: id(6), disputeId: id(7), category: "Sub-23" },
    contextFingerprint: "a".repeat(64),
    targetRoster: [] as {
      id: string;
      personId: string;
      jersey: string | null;
      version: number;
    }[],
    candidates: Array.from({ length: 11 }, (_, n) => ({
      sourceEntryId: id(100 + n),
      sourceVersion: 1,
      person: { id: id(200 + n), name: `Atleta ${n + 1}`, nickname: null },
      jersey: n === 0 ? "0" : n === 1 ? "00" : n === 10 ? null : String(n + 1),
      eligibility: "eligible",
    })),
  };
}

it("sugere os11atletas da mesma equipe em outra disputa sem criar outra identidade", () => {
  const c = context(),
    result = previewRosterReuse(c);
  expect(result.rows).toHaveLength(11);
  expect(result.rows.map((r) => r.personId)).toEqual(
    c.candidates.map((r) => r.person.id),
  );
  expect(result.rows.slice(0, 2).map((r) => r.jersey)).toEqual(["0", "00"]);
  expect(result.rows[10].jersey).toBeNull();
  expect(result.selectedCount).toBe(11);
  expect(result.ready).toBe(true);
  expect(c.targetRoster).toEqual([]);
});

it("reconhece pessoa já incluída e preserva a camisa salva no destino", () => {
  const c = context();
  c.targetRoster.push({
    id: id(800),
    personId: id(200),
    jersey: "99",
    version: 3,
  });
  const before = structuredClone(c),
    result = previewRosterReuse(c);
  expect(result.rows[0]).toMatchObject({
    personId: id(200),
    status: "already_included",
    selected: false,
    jersey: "99",
  });
  expect(result.selectedCount).toBe(10);
  expect(result.ready).toBe(true);
  expect(c).toEqual(before);
});

it("conflito de camisa pede correção explícita, sem confundir0e00", () => {
  const c = context();
  c.targetRoster.push({
    id: id(800),
    personId: id(801),
    jersey: "0",
    version: 1,
  });
  const blocked = previewRosterReuse(c);
  expect(blocked.ready).toBe(false);
  expect(blocked.rows[0].errors).toContain("jersey_conflict");
  expect(blocked.rows[1].errors).toEqual([]);
  const fixed = previewRosterReuse(c, [
    { sourceEntryId: id(100), selected: true, jersey: "23" },
    { sourceEntryId: id(101), selected: true, jersey: "00" },
  ]);
  expect(fixed.ready).toBe(true);
  const duplicate = previewRosterReuse(c, [
    { sourceEntryId: id(100), selected: true, jersey: "23" },
    { sourceEntryId: id(101), selected: true, jersey: "23" },
  ]);
  expect(
    duplicate.rows
      .slice(0, 2)
      .every((r) => r.errors.includes("jersey_conflict")),
  ).toBe(true);
  expect(duplicate.ready).toBe(false);
});

it("naipes e vínculos bloqueados continuam identificados sem selecionar ou esconder atletas", () => {
  const c = context();
  c.candidates[0].eligibility = "gender_mismatch";
  c.candidates[1].eligibility = "registered_elsewhere";
  c.candidates[2].eligibility = "transfer_required";
  const result = previewRosterReuse(c);
  expect(result.rows).toHaveLength(11);
  expect(result.rows.slice(0, 3).map((r) => r.status)).toEqual([
    "gender_mismatch",
    "registered_elsewhere",
    "transfer_required",
  ]);
  expect(result.rows.slice(0, 3).every((r) => !r.selected)).toBe(true);
  expect(result.selectedCount).toBe(8);
  expect(result.ready).toBe(true);
  expect(() =>
    previewRosterReuse(c, [
      { sourceEntryId: id(100), selected: true, jersey: "0" },
    ]),
  ).toThrow();
});

it("recusa trocar equipe, temporada, campeonato ou disputa para fugir do contexto", () => {
  for (const key of ["teamId", "seasonId", "championshipId"] as const) {
    const c = context();
    c.source[key] = id(999);
    expect(() => previewRosterReuse(c)).toThrow();
  }
  const c = context();
  c.source.disputeId = c.target.disputeId;
  expect(() => previewRosterReuse(c)).toThrow();
});

it("recusa identidades duplicadas, seleção não pertencente à origem e campos inesperados", () => {
  const c = context();
  c.candidates[1].person.id = c.candidates[0].person.id;
  expect(() => previewRosterReuse(c)).toThrow();
  expect(() =>
    previewRosterReuse(context(), [
      { sourceEntryId: id(999), selected: true, jersey: "1" },
    ]),
  ).toThrow();
  expect(() => previewRosterReuse({ ...context(), confirmed: true })).toThrow();
});

it("permite corrigir entrada inválida e não trunca uma seleção acima do limite", () => {
  const c = context();
  const invalid = previewRosterReuse(c, [
    { sourceEntryId: id(100), selected: true, jersey: "003" },
  ]);
  expect(invalid.rows[0].errors).toContain("invalid_jersey");
  expect(invalid.ready).toBe(false);
  c.candidates = Array.from({ length: 201 }, (_, n) => ({
    ...c.candidates[10],
    sourceEntryId: id(1000 + n),
    person: { id: id(2000 + n), name: `Atleta ${n}`, nickname: null },
    jersey: null,
  }));
  const large = previewRosterReuse(c);
  expect(large.rows).toHaveLength(201);
  expect(large.selectedCount).toBe(201);
  expect(large.errors).toEqual(["selection_limit"]);
  expect(large.ready).toBe(false);
  const limited = previewRosterReuse(c, [
    { sourceEntryId: id(1200), selected: false, jersey: null },
  ]);
  expect(limited.selectedCount).toBe(200);
  expect(limited.ready).toBe(true);
});
