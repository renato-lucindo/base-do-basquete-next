import { expect, it } from "vitest";
import { readyPrototype } from "./test-support";
import { preparePublication } from "./publication";

it("exige decisão explícita e justificativa para fallback da fonte PDF", () => {
  const data = readyPrototype();
  data.sheet.present.roster[0].played = true;
  data.sheet.present.events.push({
    id: crypto.randomUUID(),
    side: "home",
    period: 1,
    target: "7",
    code: "2",
  });
  data.fallback = {
    required: true,
    decided: false,
    reason: "Correção após conferir o documento de origem.",
  };
  expect(() => preparePublication(data, "")).toThrow("divergência");
  data.fallback.decided = true;
  expect(preparePublication(data, "").publications[0].reason).toContain(
    "conferir",
  );
});

it("publica somente o jogo atual e mantém a versão anterior após correção", () => {
  const data = readyPrototype();
  data.sheet.present.roster[0].played = true;
  data.sheet.present.events.push({
    id: crypto.randomUUID(),
    side: "home",
    period: 1,
    target: "7",
    code: "2",
  });
  data.batch = [
    {
      id: "private",
      file: "Rascunho.pdf",
      destination: "f-adulto",
      home: "A",
      away: "B",
      format: "FIBA",
      status: "ready",
      selected: true,
      resolved: true,
      error: "",
      failPublish: false,
      score: [3, 0],
      date: "",
    },
  ];
  const first = preparePublication(data, "");
  expect(first.publications).toHaveLength(1);
  expect(first.publications[0].score).toEqual([2, 0]);
  first.sheet.present.events.push({
    id: crypto.randomUUID(),
    side: "home",
    period: 2,
    target: "7",
    code: "3",
  });
  expect(() => preparePublication(first, "")).toThrow("motivo");
  const second = preparePublication(
    first,
    "Correção da cesta no segundo período.",
  );
  expect(second.publications.map((p) => p.score)).toEqual([
    [2, 0],
    [5, 0],
  ]);
  expect(second.publications[1].version).toBe(2);
  expect(second.batch[0].status).toBe("ready");
});
it("não permite alterar camisas confirmadas mas permite corrigir participação", () => {
  const data = readyPrototype();
  data.sheet.present.roster[0].played = true;
  data.sheet.present.events.push({
    id: crypto.randomUUID(),
    side: "home",
    period: 1,
    target: "7",
    code: "2",
  });
  const saved = preparePublication(data, "");
  saved.sheet.present.roster.find((slot) => slot.rosterEntryId === 8)!.played =
    true;
  expect(
    preparePublication(saved, "Participação sem ações confirmada.")
      .publications,
  ).toHaveLength(2);
  saved.sheet.present.roster[1].jersey = "99";
  expect(() =>
    preparePublication(saved, "Alteração da camisa confirmada."),
  ).toThrow("relacionados");
});
