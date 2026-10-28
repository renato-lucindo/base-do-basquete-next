import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";
import {
  registrationWithdrawalStateSchema,
  registrationWithdrawalVersionSchema,
  registrationWithdrawalSaveResultSchema,
} from "./withdrawal-contract";
import {
  regulationStateSchema,
  previewRegulationDefinition,
} from "./persistence-contract";
const fixtures = async () =>
  (await readFile("supabase/tests/publication.sql", "utf8")).replace(
    /\nrollback;\s*$/u,
    "\n",
  ) +
  (await readFile("supabase/tests/regulation.sql", "utf8")) +
  (await readFile("supabase/tests/game_occurrences.sql", "utf8"));
const migrations = async () =>
  (await readdir("supabase/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort();
const id = (n: number) =>
  `f9200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function verifyShapes(results: { rows: Record<string, unknown>[] }[]) {
  const rows = results.flatMap((r) => r.rows);
  const projection = (key: string) => {
    const r = regulationStateSchema.parse(rows.find((v) => v[key])?.[key]);
    return previewRegulationDefinition(
      r.definition,
      r.context,
      r.disputeId,
      r.version,
    );
  };
  const keep = projection("keep_results_state");
  expect(keep.games.find((g) => g.gameId === id(9))).toMatchObject({
    state: "played",
  });
  expect(keep.games.find((g) => g.gameId === id(600))).toMatchObject({
    state: "awarded",
  });
  expect(keep.games.find((g) => g.gameId === id(909))).toMatchObject({
    state: "pending",
    needs: "withdrawal_decision",
    outcome: null,
  });
  const exclude = projection("exclude_results_state");
  expect(exclude.games.find((g) => g.gameId === id(9))).toMatchObject({
    state: "excluded",
    outcome: null,
  });
  expect(exclude.games.find((g) => g.gameId === id(600))).toMatchObject({
    state: "excluded",
    outcome: null,
  });
  expect(
    projection("result_removed_state").games.find((g) => g.gameId === id(600)),
  ).toMatchObject({
    state: "conflict",
    needs: "withdrawal_review",
    outcome: null,
  });
  expect(
    projection("future_award_state").games.find((g) => g.gameId === id(600)),
  ).toMatchObject({ state: "awarded" });
  expect(
    projection("new_result_state").games.find((g) => g.gameId === id(909)),
  ).toMatchObject({
    state: "conflict",
    needs: "withdrawal_review",
    outcome: null,
  });
  const both = projection("both_withdrawn_state");
  expect(both.games.find((g) => g.gameId === id(9))).toMatchObject({
    state: "excluded",
    outcome: null,
  });
  expect(both.games.find((g) => g.gameId === id(910))).toMatchObject({
    state: "pending",
    needs: "withdrawal_decision",
    outcome: null,
  });
  const retired = registrationWithdrawalStateSchema.parse(
    rows.find((r) => r.retired_withdrawal_state)?.retired_withdrawal_state,
  );
  expect(retired.head).toMatchObject({
    version: 5,
    policy: null,
    previousGameIds: [],
  });
  expect(
    registrationWithdrawalVersionSchema.parse(
      rows.find((r) => r.withdrawal_version)?.withdrawal_version,
    ).previousGameIds,
  ).toEqual([id(8), id(9), id(600)]);
  expect(
    registrationWithdrawalSaveResultSchema.parse(
      rows.find((r) => r.withdrawal_ack)?.withdrawal_ack,
    ).version,
  ).toBe(1);
}
it("creates withdrawal writers without changing original game sources or occurrence history", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of await migrations())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    const proof =
      (await fixtures()) +
      (await readFile("supabase/tests/registration_withdrawals.sql", "utf8")) +
      "\nrollback;\n";
    if (process.env.BDB_EXPORT_WITHDRAWAL_PROOF === "1")
      await writeFile(
        ".preview-artifacts/registration-withdrawals-proof.sql",
        proof,
      );
    verifyShapes(await db.exec(proof));
    expect(
      (await db.query("select count(*)::int n from public.games")).rows,
    ).toEqual([{ n: 0 }]);
  } finally {
    await db.close();
  }
}, 20000);
it("upgrades existing occurrences and published facts without inventing any withdrawal", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    const pending: string[] = [];
    for (const name of await migrations()) {
      if (name >= "20261025003234") pending.push(name);
      else await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    }
    await db.exec(await fixtures());
    const before = (
      await db.query(
        "select snapshot from public.published_games order by game_id",
      )
    ).rows;
    const decisions = (
      await db.query(
        "select id,version from private.game_occurrence_heads order by id",
      )
    ).rows;
    for (const name of pending)
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    expect(
      (
        await db.query(
          "select snapshot from public.published_games order by game_id",
        )
      ).rows,
    ).toEqual(before);
    expect(
      (
        await db.query(
          "select id,version from private.game_occurrence_heads order by id",
        )
      ).rows,
    ).toEqual(decisions);
    expect(
      (
        await db.query(
          "select count(*)::int n from private.registration_withdrawal_heads",
        )
      ).rows,
    ).toEqual([{ n: 0 }]);
    verifyShapes(
      await db.exec(
        await readFile("supabase/tests/registration_withdrawals.sql", "utf8"),
      ),
    );
    await db.exec("rollback");
  } finally {
    await db.close();
  }
}, 20000);
it("covers every withdrawal foreign key and denies direct access to all five private tables", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of await migrations())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    expect(
      (
        await db.query(
          "select count(*)::int n from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='private' and t.relname like 'registration_withdrawal_%' and c.contype='f' and not exists(select 1 from pg_index i where i.indrelid=c.conrelid and i.indisvalid and c.conkey <@ (i.indkey::smallint[])[0:cardinality(c.conkey)-1])",
        )
      ).rows,
    ).toEqual([{ n: 0 }]);
    expect(
      (
        await db.query(
          "select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname like 'registration_withdrawal_%' and c.relkind='r' and c.relrowsecurity",
        )
      ).rows,
    ).toEqual([{ n: 5 }]);
    expect(
      (
        await db.query(
          "select count(*)::int n from information_schema.role_table_grants where table_schema='private' and table_name like 'registration_withdrawal_%' and grantee in('anon','authenticated','service_role')",
        )
      ).rows,
    ).toEqual([{ n: 0 }]);
  } finally {
    await db.close();
  }
}, 20000);
