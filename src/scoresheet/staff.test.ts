import { expect, it } from "vitest";
import { initialState } from "../prototype/model";
import { aggregate, change, undo, validateSheet } from "../domain/scoresheet";
import { getTeamStaff, withTeamStaff, assertStaffReady } from "./staff";
import { preparePublication } from "./publication";
import { readyPrototype } from "./test-support";

it("sem técnico, somente o capitão relacionado assume e recebe as faltas nos dois papéis", () => {
  let s = initialState().sheet.present;
  s = withTeamStaff(s, "home", { captainId: 2, captainIsCoach: true });
  expect(s.coachPlayer.home).toBe(2);
  expect(() => withTeamStaff(s, "home", { captainId: 4 })).toThrow("capitão");
  s.roster[1].played = true;
  s.events = [
    {
      id: crypto.randomUUID(),
      side: "home",
      target: "00",
      period: 1,
      code: "T1",
    },
    {
      id: crypto.randomUUID(),
      side: "home",
      target: "C",
      period: 1,
      code: "C1",
    },
  ];
  expect(aggregate(s).players.find((p) => p.rosterEntryId === 2)?.status).toBe(
    "GD",
  );
  expect(aggregate(s).teams.home.coachStatus).toBe("GD");
  expect(() =>
    validateSheet({
      ...s,
      events: [
        ...s.events,
        {
          id: crypto.randomUUID(),
          side: "home",
          target: "00",
          period: 1,
          code: "2",
        },
      ],
    }),
  ).toThrow("Cesta posterior");
});
it("técnico próprio libera assistente e mantém o capitão como papel separado", () => {
  const base = initialState().sheet.present;
  const real = withTeamStaff(base, "home", {
    captainId: 2,
    captainIsCoach: false,
    coachName: "Patrícia Lima",
    assistantName: "Joana Silva",
  });
  expect(real.coachPlayer.home).toBeNull();
  expect(getTeamStaff(real, "home")).toMatchObject({
    captainId: 2,
    coachName: "Patrícia Lima",
    assistantName: "Joana Silva",
  });
  const captain = withTeamStaff(real, "home", { captainIsCoach: true });
  expect(getTeamStaff(captain, "home")).toMatchObject({
    coachName: "",
    assistantName: "",
    captainId: 2,
  });
  expect(
    undo(change({ present: real, past: [], future: [] }, captain)).present,
  ).toEqual(real);
});
it("valida informações obrigatórias na publicação e rejeita assistente com capitão-técnico", () => {
  const s = initialState().sheet.present;
  expect(() =>
    assertStaffReady(withTeamStaff(s, "home", { captainId: null })),
  ).toThrow("capitão");
  expect(() =>
    assertStaffReady(
      withTeamStaff(s, "home", { captainIsCoach: false, coachName: "" }),
    ),
  ).toThrow("Técnico");
  const valid = withTeamStaff(s, "home", {
    captainIsCoach: false,
    coachName: "Patrícia Lima",
  });
  expect(() => assertStaffReady(valid)).not.toThrow();
  const staff = structuredClone(s.staff!);
  staff.home.assistantName = "Oculto";
  expect(() => validateSheet({ ...s, staff })).toThrow("assistente");
});
it("interpreta atleta-treinador legado como capitão sem reescrever o documento salvo", () => {
  const s = initialState().sheet.present;
  delete s.staff;
  s.coachPlayer.home = 2;
  expect(getTeamStaff(s, "home")).toMatchObject({
    captainId: 2,
    captainIsCoach: true,
  });
  expect(s.staff).toBeUndefined();
});

it("preserva a comissão anterior ao corrigir e republicar, com motivo obrigatório", () => {
  const data = readyPrototype();
  data.sheet.present.roster[0].played = true;
  data.sheet.present.events = [
    {
      id: crypto.randomUUID(),
      side: "home",
      period: 1,
      target: "7",
      code: "2",
    },
  ];
  const first = preparePublication(data, "");
  first.sheet.present = withTeamStaff(first.sheet.present, "home", {
    captainIsCoach: false,
    coachName: "Patrícia Lima",
    assistantName: "Joana Silva",
  });
  expect(() => preparePublication(first, "")).toThrow("motivo");
  const second = preparePublication(
    first,
    "Correção da comissão técnica informada.",
  );
  expect(second.publications[0].document?.staff?.home.captainIsCoach).toBe(
    true,
  );
  expect(second.publications[1].document?.staff?.home.assistantName).toBe(
    "Joana Silva",
  );
});
