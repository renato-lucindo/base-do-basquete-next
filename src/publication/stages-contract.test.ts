import { expect, it } from "vitest";
import {
  confirmGameStagesSchema,
  confirmGameStagesReceiptSchema,
} from "./stages-contract";

const id = (n: number) =>
  `f9200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const game = (n: number) => ({
  gameId: id(n),
  gameVersion: 3,
  publicationVersion: 2,
  previousPhase: null,
});
const command = {
  requestId: id(90),
  disputeId: id(3),
  baseStatisticsVersion: 12,
  reason: "Correção verificada na classificação da disputa.",
  games: [game(8), game(9)],
};
it("exige intenção explícita, versões e fase anterior em cada jogo", () => {
  expect(confirmGameStagesSchema.parse(command)).toEqual(command);
  for (const invalid of [
    { ...command, games: [] },
    { ...command, games: [game(8), game(8)] },
    { ...command, games: [{ ...game(8), previousPhase: "unknown" }] },
    { ...command, games: [{ ...game(8), publicationVersion: 0 }] },
    { ...command, reason: "curto" },
    { ...command, reason: "Inválido\ncom controle" },
    { ...command, actorId: id(1) },
    { ...command, baseStatisticsVersion: 0 },
    { ...command, games: [game(8), { ...game(9), previousPhase: undefined }] },
  ])
    expect(confirmGameStagesSchema.safeParse(invalid).success).toBe(false);
  expect(
    confirmGameStagesSchema.parse({
      ...command,
      games: [{ ...game(8), previousPhase: "round_robin" }],
    }).games[0].previousPhase,
  ).toBe("round_robin");
});
it("recibo correlaciona versão publicada e jogos realmente modificados", () => {
  const receipt = {
    requestId: command.requestId,
    disputeId: command.disputeId,
    version: 13,
    changedGameCount: 1,
    changedGameIds: [game(8).gameId],
  };
  expect(confirmGameStagesReceiptSchema.parse(receipt)).toEqual(receipt);
  expect(
    confirmGameStagesReceiptSchema.safeParse({
      ...receipt,
      changedGameCount: 2,
    }).success,
  ).toBe(false);
});
