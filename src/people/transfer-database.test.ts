import { expect, it } from "vitest";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";

it.each(["zero", "upgrade"] as const)(
  "transfere e retorna atomicamente no %s sem reatribuir G4",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const names = (await readdir("supabase/migrations"))
          .filter((n) => n.endsWith(".sql"))
          .sort(),
        index = names.findIndex((n) => n.endsWith("_roster_transfers.sql")),
        split = index < 0 ? names.length : index;
      for (const name of names.slice(0, mode === "zero" ? names.length : split))
        await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
      const seed =
        (await readFile("supabase/tests/publication.sql", "utf8")).replace(
          /\nrollback;\s*$/u,
          "\n",
        ) + (await readFile("supabase/tests/regulation.sql", "utf8"));
      await db.exec(seed);
      const before = (
        await db.query(
          "select * from private.game_publication_versions order by game_id,version",
        )
      ).rows;
      if (mode === "upgrade")
        for (const name of names.slice(split))
          await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
      expect(
        (
          await db.query(
            "select * from private.game_publication_versions order by game_id,version",
          )
        ).rows,
      ).toEqual(before);
      const proof = await readFile("supabase/tests/transfers.sql", "utf8");
      if (process.env.BDB_EXPORT_TRANSFER_PROOF === "1" && mode === "zero")
        await writeFile(
          ".preview-artifacts/transfers-proof.sql",
          seed + proof + "\nrollback;\n",
        );
      await db.exec(proof + "\nrollback;");
      expect(
        (await db.query("select count(*)::int as n from public.roster_entries"))
          .rows,
      ).toEqual([{ n: 0 }]);
    } finally {
      await db.close();
    }
  },
  20000,
);
