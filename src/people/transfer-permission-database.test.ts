import { expect, it } from "vitest";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { regulationFixture } from "../../tests/fixtures/regulation";
import { regulationDefinitionSchema } from "../regulation/persistence-contract";

const cases = () => {
  const d = regulationFixture().definition!;
  return [
    ["legacy", d, true],
    ...([null, "allowed", "forbidden"] as const).map(
      (transfers) => [String(transfers), { ...d, transfers }, true] as const,
    ),
    ...[true, false, 0, 1, {}, [], "ALLOW", " allowed ", "true", "run()"].map(
      (transfers) =>
        [JSON.stringify(transfers), { ...d, transfers }, false] as const,
    ),
    [
      "other extra field",
      { ...d, transfers: "allowed", actorId: "unknown" },
      false,
    ],
    [
      "missing required field",
      { ...d, transfers: "allowed", occurrenceRules: undefined },
      false,
    ],
    [
      "unknown nested field",
      { ...d, transfers: null, occurrenceRules: { wo: null, allow: true } },
      false,
    ],
    ["array", [], false],
    ["json null", null, false],
  ] as const;
};
it("mantém permissão antiga pendente e aceita somente decisões explícitas fechadas", () => {
  for (const [name, value, valid] of cases())
    expect(regulationDefinitionSchema.safeParse(value).success, name).toBe(
      valid,
    );
  const old = regulationDefinitionSchema.parse(regulationFixture().definition!);
  expect(old).not.toHaveProperty("transfers");
});
async function migrations() {
  return (await readdir("supabase/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort();
}
it("permite a mesma matriz TS×PostgreSQL sem ampliar grants do validador", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of await migrations())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    for (const [name, value, valid] of cases()) {
      const actual = (
        await db.query<{ valid: boolean }>(
          "select private.valid_regulation_definition($1::jsonb) as valid",
          [JSON.stringify(value)],
        )
      ).rows[0].valid;
      expect(actual, name).toBe(valid);
      expect(actual, name).toBe(
        regulationDefinitionSchema.safeParse(value).success,
      );
    }
    expect(
      (
        await db.query(
          "select has_function_privilege('anon','private.valid_regulation_definition(jsonb)','execute') as anon,has_function_privilege('authenticated','private.valid_regulation_definition(jsonb)','execute') as admin,has_function_privilege('service_role','private.valid_regulation_definition(jsonb)','execute') as service",
        )
      ).rows,
    ).toEqual([{ anon: false, admin: false, service: false }]);
  } finally {
    await db.close();
  }
}, 20000);

it.each(["zero", "upgrade"] as const)(
  "preserva regras e G4 no %s e grava permissão pelo writer existente",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const names = await migrations(),
        split = names.findIndex((n) => n.endsWith("_transfer_permission.sql")),
        baseline = split < 0 ? names.length : split;
      for (const name of names.slice(
        0,
        mode === "zero" ? names.length : baseline,
      ))
        await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
      const seed =
        (await readFile("supabase/tests/publication.sql", "utf8")).replace(
          /\nrollback;\s*$/u,
          "\n",
        ) + (await readFile("supabase/tests/regulation.sql", "utf8"));
      await db.exec(seed);
      const before = (
        await db.query(
          "select * from private.regulation_versions order by dispute_id,version",
        )
      ).rows;
      const binding = (
        await db.query(
          "select oid,proacl,prosecdef,proconfig from pg_proc where oid='private.valid_regulation_definition(jsonb)'::regprocedure",
        )
      ).rows;
      if (mode === "upgrade")
        for (const name of names.slice(baseline))
          await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
      expect(
        (
          await db.query(
            "select oid,proacl,prosecdef,proconfig from pg_proc where oid='private.valid_regulation_definition(jsonb)'::regprocedure",
          )
        ).rows,
      ).toEqual(binding);
      expect(
        (
          await db.query(
            "select * from private.regulation_versions order by dispute_id,version",
          )
        ).rows,
      ).toEqual(before);
      const proof = await readFile(
        "supabase/tests/transfer_permissions.sql",
        "utf8",
      );
      if (
        process.env.BDB_EXPORT_TRANSFER_PERMISSION_PROOF === "1" &&
        mode === "zero"
      )
        await writeFile(
          ".preview-artifacts/transfer-permission-proof.sql",
          seed + proof + "\nrollback;\n",
        );
      await db.exec(proof + "\nrollback;");
      expect(
        (
          await db.query(
            "select count(*)::int as n from private.regulation_versions",
          )
        ).rows,
      ).toEqual([{ n: 0 }]);
    } finally {
      await db.close();
    }
  },
  20000,
);
