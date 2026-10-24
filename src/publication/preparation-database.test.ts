import { it, expect } from "vitest";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
it("persists private PDF preparation without publishing and freezes retries across sessions", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    const proof =
      (await readFile("supabase/tests/pdf_publication.sql", "utf8")).replace(
        /\nrollback;\s*$/u,
        "\n",
      ) +
      (await readFile("supabase/tests/pdf_preparation.sql", "utf8")) +
      "\nrollback;\n";
    if (process.env.BDB_EXPORT_PREPARATION_PROOF === "1")
      await writeFile(".preview-artifacts/pdf-preparation-proof.sql", proof);
    await db.exec(proof);
    expect(
      (await db.query("select count(*)::int as n from public.games")).rows,
    ).toEqual([{ n: 0 }]);
  } finally {
    await db.close();
  }
}, 20000);
it("upgrades existing manual and PDF history without rewriting publications", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    const names = (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort();
    for (const name of names.filter(
      (n) => !n.includes("pdf_publication_preparations"),
    ))
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    await db.exec(
      (await readFile("supabase/tests/pdf_publication.sql", "utf8")).replace(
        /\nrollback;\s*$/u,
        "\n",
      ),
    );
    const before = await db.query(
      "select * from private.game_publication_versions order by game_id,version",
    );
    await db.exec(
      await readFile(
        `supabase/migrations/${names.find((n) => n.includes("pdf_publication_preparations"))!}`,
        "utf8",
      ),
    );
    expect(
      (
        await db.query(
          "select * from private.game_publication_versions order by game_id,version",
        )
      ).rows,
    ).toEqual(before.rows);
    await db.exec(await readFile("supabase/tests/pdf_preparation.sql", "utf8"));
    await db.exec("rollback;");
  } finally {
    await db.close();
  }
}, 20000);
