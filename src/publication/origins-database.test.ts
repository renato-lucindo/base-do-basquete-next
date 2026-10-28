import { it, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
it("upgrades typed source references without rewriting immutable manual history and binds PDFs to one game", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    const migrations = await Promise.all(
      (await readdir("supabase/migrations"))
        .filter((n) => n.endsWith(".sql"))
        .sort()
        .map((n) => readFile(`supabase/migrations/${n}`, "utf8")),
    );
    let boundary = migrations.findIndex((s) =>
      s.includes("-- G4c2 typed origins"),
    );
    if (boundary < 0) boundary = migrations.length;
    for (const migration of migrations.slice(0, boundary))
      await db.exec(migration);
    await db.exec(
      (await readFile("supabase/tests/publication.sql", "utf8")).replace(
        /\nrollback;\s*$/u,
        "\n",
      ),
    );
    const query =
      "select to_jsonb(v) as version from private.game_publication_versions v order by game_id,version";
    const before = (await db.query(query)).rows;
    for (const migration of migrations.slice(boundary))
      await db.exec(migration);
    expect((await db.query(query)).rows).toEqual(before);
    await db.exec(
      await readFile("supabase/tests/publication_origins.sql", "utf8"),
    );
    await db.exec("rollback;");
  } finally {
    await db.close();
  }
}, 20000);
