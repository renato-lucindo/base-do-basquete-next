import { expect, it } from "vitest";
import { initialState } from "../prototype/model";
import {
  aggregate,
  change,
  undo,
  redo,
  type Entry,
} from "../domain/scoresheet";
import { orderedActions, editAction, deleteAction } from "./actions";

const action = (period: number, code = "2"): Entry => ({
  id: crypto.randomUUID(),
  period,
  side: "home",
  target: "7",
  code,
});
const sheet = () => {
  const s = initialState().sheet.present;
  s.roster[0].played = true;
  return s;
};
it("ordena por quarto sem mudar a sequência salva e mantém a ordem dentro do quarto", () => {
  const s = sheet();
  s.events = [action(3), action(1), action(2), action(1)];
  expect(orderedActions(s, "period").map((x) => x.sequence)).toEqual([
    2, 4, 3, 1,
  ]);
  expect(orderedActions(s, "entry").map((x) => x.sequence)).toEqual([
    1, 2, 3, 4,
  ]);
  expect(s.events.map((x) => x.period)).toEqual([3, 1, 2, 1]);
});
it("edita pelo ID, muda equipe/camisa/quarto, recalcula totais e permite desfazer/refazer", () => {
  const s = sheet();
  s.events = [action(1), action(3)];
  const next = editAction(s, s.events[0].id, {
    side: "away",
    target: "4",
    period: 2,
    code: " p3 ",
  });
  const h = change({ present: s, past: [], future: [] }, next);
  expect(next.events[0]).toMatchObject({
    id: s.events[0].id,
    code: "P3",
    period: 2,
  });
  expect(aggregate(next).teams.home.points).toBe(2);
  expect(aggregate(next).teams.away.foulsByPeriod[1]).toBe(1);
  expect(next.roster.find((x) => x.jersey === "4")?.played).toBe(true);
  expect(redo(undo(h)).present).toEqual(next);
  expect(s.events[0].code).toBe("2");
});
it("exclui somente o ID escolhido e conserva participação mesmo sem ações", () => {
  const s = sheet();
  s.events = [action(1), action(2, "3")];
  const next = deleteAction(s, s.events[0].id);
  expect(next.events.map((x) => x.id)).toEqual([s.events[1].id]);
  expect(aggregate(next).teams.home.points).toBe(3);
  expect(next.roster[0].played).toBe(true);
  expect(
    undo(change({ present: s, past: [], future: [] }, next)).present,
  ).toEqual(s);
});
it("rejeita edição que invalida ações posteriores e IDs ausentes sem modificar o documento", () => {
  const s = sheet();
  s.events = [action(1), action(2)];
  expect(() =>
    editAction(s, s.events[0].id, { ...s.events[0], code: "D" }),
  ).toThrow("Cesta posterior");
  expect(() => editAction(s, "ausente", s.events[0])).toThrow("não encontrada");
  expect(() => deleteAction(s, "ausente")).toThrow("não encontrada");
  expect(aggregate(s).teams.home.points).toBe(4);
});
