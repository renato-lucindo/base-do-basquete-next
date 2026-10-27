import { expect, it } from "vitest";
import { emptyImportPlayer, type TextRow } from "./contract";
import type { ImportCandidate, MatchingResult } from "./matching-contract";
import { automaticImportMatch } from "./automatic-match";

const id = (n: number) =>
  `a7200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const context = { gender: "masculino" as const, registrationId: id(1) };
const row = (): TextRow => ({
  id: id(2),
  line: 1,
  source: "12 - João da Silva - 001234",
  data: {
    ...emptyImportPlayer(),
    name: "João da Silva",
    jersey: "12",
    federationRegistration: "001234",
  },
  provided: ["name", "jersey", "federationRegistration"],
  issues: [],
  selected: true,
  decision: null,
  rosterId: id(3),
  rosterVersion: 0,
});
const person = (n = 10): ImportCandidate => ({
  id: id(n),
  version: 2,
  data: {
    ...emptyImportPlayer(),
    name: "João da Silva",
    federationRegistration: "001234",
  },
  sex: "male",
  hasAthlete: true,
  contexts: [],
  roster: null,
  activeRegistrationId: null,
});
const match = (
  candidates: ImportCandidate[],
  status: MatchingResult["items"][number]["status"] = "registration",
) => ({
  rowId: id(2),
  status,
  candidates,
  hasMore: false,
});

it("seleciona pelo registro único inclusive entre homônimos e preserva seus zeros", () => {
  const chosen = person(),
    other = person(11);
  other.data.federationRegistration = "001235";
  const result = automaticImportMatch(row(), match([other, chosen]), context);
  expect(result?.id).toBe(chosen.id);
  expect(result?.data.federationRegistration).toBe("001234");
  expect(row().decision).toBeNull();
});
it("seleciona nome completo exato e único com acentos, espaços e pontuação normalizados", () => {
  const r = row(),
    c = person();
  r.data.federationRegistration = null;
  c.data.name = "  JOAO DA SILVA ";
  expect(automaticImportMatch(r, match([c], "name"), context)?.id).toBe(c.id);
  r.data.name = "João D'Ávila";
  c.data.name = "Joao D-Avila";
  expect(automaticImportMatch(r, match([c], "name"), context)?.id).toBe(c.id);
});
it("não escolhe primeiro nome, homônimos sem registro ou uma lista incompleta", () => {
  const r = row(),
    c = person();
  r.data.federationRegistration = null;
  expect(
    automaticImportMatch(r, match([c, person(11)], "ambiguous"), context),
  ).toBeNull();
  expect(
    automaticImportMatch(r, { ...match([c], "name"), hasMore: true }, context),
  ).toBeNull();
  r.data.name = "João";
  c.data.name = "Joao";
  expect(automaticImportMatch(r, match([c], "name"), context)).toBeNull();
  c.data.name = "João da Silva";
  expect(automaticImportMatch(r, match([c], "suggestion"), context)).toBeNull();
});
it("grafia muito próxima só vira escolha com data completa coincidente e sem concorrentes", () => {
  const r = row(),
    c = person();
  r.data.federationRegistration = null;
  r.data.name = "Guilherme Cruz Santos";
  c.data.name = "Guilherme Cruz Santo";
  expect(automaticImportMatch(r, match([c], "suggestion"), context)).toBeNull();
  r.data.birthDate = c.data.birthDate = "1999-01-02";
  expect(automaticImportMatch(r, match([c], "suggestion"), context)?.id).toBe(
    c.id,
  );
  const other = { ...c, id: id(11) };
  expect(
    automaticImportMatch(r, match([c, other], "suggestion"), context),
  ).toBeNull();
});
it("divergências de registro ou nascimento e bloqueios de naipe/vínculo exigem revisão", () => {
  for (const change of [
    (c: ImportCandidate) => {
      c.data.federationRegistration = "001235";
    },
    (c: ImportCandidate) => {
      c.data.birthDate = "2000-01-02";
    },
    (c: ImportCandidate) => {
      c.sex = "female";
    },
    (c: ImportCandidate) => {
      c.activeRegistrationId = id(99);
    },
  ]) {
    const r = row(),
      c = person();
    r.data.birthDate = "1999-01-02";
    change(c);
    expect(automaticImportMatch(r, match([c]), context)).toBeNull();
  }
});
it("não confia em status solto, registro duplicado, linha trocada ou erro de interpretação de identidade", () => {
  const r = row(),
    c = person();
  expect(automaticImportMatch(r, match([c, person(11)]), context)).toBeNull();
  expect(
    automaticImportMatch(r, { ...match([c]), rowId: id(99) }, context),
  ).toBeNull();
  expect(automaticImportMatch(r, match([c], "new"), context)).toBeNull();
  r.issues.push({
    field: "federationRegistration",
    token: "001234",
    message: "Revisar",
  });
  expect(automaticImportMatch(r, match([c]), context)).toBeNull();
});
