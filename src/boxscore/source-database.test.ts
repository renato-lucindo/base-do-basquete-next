import { it, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { extractSupportedPdf } from "./extract";
import { parsedBoxscoreSchema } from "./source-contract";
it("PostgreSQL accepts four real parsed fixtures and rejects inconsistent structured source facts", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const file of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    for (const filename of [
      "Boxscore-site.pdf",
      "Box Score FIBA ALC vs AVA 09 maio.pdf",
      "Box Score FIBA IVV vs CAC 06 maio.pdf",
      "Box Score FIBA SAL vs SAN 09 maio.pdf",
    ]) {
      const result = await extractSupportedPdf(
        new Uint8Array(
          await readFile(
            `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/docs/plan/referencias/modelos-boxscore/${filename}`,
          ),
        ),
        filename,
        "application/pdf",
      );
      expect(parsedBoxscoreSchema.safeParse(result.parsed).success).toBe(true);
      await db.query("select private.validate_pdf_parsed($1::jsonb)", [
        JSON.stringify(result.parsed),
      ]);
      for (const mutate of [
        (p: typeof result.parsed) => {
          p.teams[0].score++;
        },
        (p: typeof result.parsed) => {
          p.teams[0].players[0].fieldGoals.attempted = -1;
        },
        (p: typeof result.parsed) => {
          p.teams[0].periodScores = [p.teams[0].score];
        },
      ]) {
        const broken = structuredClone(result.parsed);
        mutate(broken);
        expect(parsedBoxscoreSchema.safeParse(broken).success).toBe(false);
        await expect(
          db.query("select private.validate_pdf_parsed($1::jsonb)", [
            JSON.stringify(broken),
          ]),
        ).rejects.toMatchObject({ code: "PT400" });
      }
    }
  } finally {
    await db.close();
  }
}, 20000);
