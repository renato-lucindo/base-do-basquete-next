import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";
import { finalCases, pubId } from "../../tests/fixtures/publication";
import { prepareManualPublication } from "./manual";
import { validatePersistedSheet } from "../games/sheet-contract";
it("PostgreSQL closure agrees with engine on overtime, FT, captains and starting five", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    for (const [index, d] of finalCases().entries()) {
      let valid = true;
      try {
        validatePersistedSheet(d, true);
      } catch {
        valid = false;
      }
      let postgres = true,
        facts: unknown;
      try {
        facts = (
          await db.query<{ facts: unknown }>(
            "select private.final_sheet_facts($1::jsonb) as facts",
            [JSON.stringify(d)],
          )
        ).rows[0].facts;
      } catch (e) {
        if ((e as { code?: string }).code !== "PT400") throw e;
        postgres = false;
      }
      expect(postgres, `case ${index}`).toBe(valid);
      if (valid)
        expect(facts, `facts case ${index}`).toEqual(
          prepareManualPublication({
            requestId: pubId(900),
            gameId: pubId(901),
            gameVersion: 1,
            basePublicationVersion: 0,
            source: { kind: "sheet", baseSheetVersion: 0, document: d },
            reason: "",
            fallback: false,
          }).facts,
        );
    }
  } finally {
    await db.close();
  }
});
