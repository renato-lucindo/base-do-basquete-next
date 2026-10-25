import { expect, it } from "vitest";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";

it("importador real preserva primeiro vínculo e edição, mas não contorna transferência por inativação", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    const proof =
      (await readFile("supabase/tests/text_confirm.sql", "utf8")).replace(
        /\nrollback;\s*$/u,
        "\n",
      ) +
      (await readFile("supabase/tests/transfer_import.sql", "utf8")) +
      "\nrollback;\n";
    if (process.env.BDB_EXPORT_TRANSFER_PROOF === "1")
      await writeFile(".preview-artifacts/transfer-import-proof.sql", proof);
    await db.exec(proof);
    expect(
      (await db.query("select count(*)::int as n from public.persons")).rows,
    ).toEqual([{ n: 0 }]);
  } finally {
    await db.close();
  }
}, 20000);
