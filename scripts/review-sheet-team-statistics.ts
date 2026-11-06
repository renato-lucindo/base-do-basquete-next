import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { publicGameSchema } from "../src/publication/contract";
import { persistedSheetSchema } from "../src/games/sheet-contract";
import { deriveSheetTeamStatistics } from "../src/publication/sheet-team-statistics";
const [input, stem] = process.argv.slice(2);
if (!input || !stem)
  throw Error(
    "Informe o JSON privado de versões congeladas e o caminho-base do relatório público.",
  );
if (existsSync(stem + ".json") || existsSync(stem + ".md"))
  throw Error(
    "O relatório já existe; preserve as conferências e escolha outro caminho.",
  );
const records = z
  .array(
    z
      .object({
        game_id: z.uuid(),
        dispute_id: z.uuid(),
        version: z.number().int().positive(),
        game: publicGameSchema.shape.game,
        facts: publicGameSchema.shape.facts,
        document: persistedSheetSchema,
      })
      .strict(),
  )
  .parse(JSON.parse(readFileSync(input, "utf8")));
if (new Set(records.map((r) => r.game_id)).size !== records.length)
  throw Error("Versões repetidas do mesmo jogo não são elegíveis.");
const rows = records.flatMap((r) => {
  const facts = deriveSheetTeamStatistics(r.document);
  return (["home", "away"] as const).map((side) => {
    const opposingFC = r.facts.players
      .filter((p) => p.side !== side)
      .reduce((n, p) => n + p.fouls, 0);
    if (opposingFC !== facts[side].foulsReceived)
      throw Error("Documento e fatos publicados divergem em FC: " + r.game_id);
    return {
      gameId: r.game_id,
      disputeId: r.dispute_id,
      basePublicationVersion: r.version,
      gameNumber: r.game.number,
      side,
      registrationId: r.game[side].registrationId,
      name: r.game[side].name,
      documentHash: createHash("sha256")
        .update(JSON.stringify(r.document))
        .digest("hex"),
      foulsReceived: opposingFC,
      technicalFouls: facts[side].technicalFouls,
      minimumDisqualifications: facts[side].minimumDisqualifications,
      suggestedDisqualifications: facts[side].minimumDisqualifications,
      confirmedDisqualifications: null,
      confirmed: false,
    };
  });
});
const manifest = {
  kind: "sheet-team-statistics-review-v1",
  games: records.length,
  rows,
};
let md =
  "# Conferência de FR, T e GD — proposta não publicada\n\nFR = FC adversária por partida, somente súmula. T calculada pelo motor; GD sugerida é o mínimo identificado, não um total confirmado. Todas as50linhas continuam sem confirmação humana. Nenhuma migration aplicada ou republicação executada por este relatório.\n\nAs fontes são documentos congelados da mesma gameId/versão publicada, sem rascunhos. O JSON associado contém IDs, versões e hash documental para revalidar a proposta. Antes de executar, conferir novamente as versões públicas e preencher/confirmar GD das duas equipes por jogo.\n\n| Jogo | Versão | Equipe | FR calculada | T calculada | GD sugerida (mínimo) | GD confirmada |\n|---|---:|---|---:|---:|---:|---|\n";
for (const r of rows)
  md += `| ${r.gameId} (${r.gameNumber ?? "s/n"}) | ${r.basePublicationVersion} | ${r.name.replaceAll("|", "/")} | ${r.foulsReceived} | ${r.technicalFouls} | ${r.minimumDisqualifications} | Pendente |\n`;
md += `\nResumo:${records.length}jogos/${rows.length}lados; T=${rows.reduce((n, r) => n + r.technicalFouls, 0)}; mínimoGD=${rows.reduce((n, r) => n + r.minimumDisqualifications, 0)}. Confirmar zero explicitamente nas linhas propostas com0; totais maiores podem ser informados após conferência da equipe/banco. A publicação usa a RPC restrita de correção estatística, preservando a súmula atual, inclusive a divergência conhecida do jogo15.\n`;
mkdirSync(dirname(stem), { recursive: true });
writeFileSync(stem + ".json", JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(stem + ".md", md);
console.log(
  JSON.stringify({
    games: records.length,
    sides: rows.length,
    technical: rows.reduce((n, r) => n + r.technicalFouls, 0),
    minimumGD: rows.reduce((n, r) => n + r.minimumDisqualifications, 0),
    confirmed: 0,
  }),
);
