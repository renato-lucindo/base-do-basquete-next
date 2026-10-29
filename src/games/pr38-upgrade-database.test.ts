import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";

it("rehearses PR38 after the remote baseline, rolls DDL back and preserves v1 publications", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    const pending = [
      "20261027143904_roster_reuse_context.sql",
      "20261027145431_roster_reuse_write.sql",
      "20261029143000_sheet_staff_v2.sql",
    ];
    const names = (await readdir("supabase/migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (const name of names.filter((name) => !pending.includes(name)))
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    // This fixture mutates Auth/admin only in the disposable PGlite database.
    const fixture = await readFile("supabase/tests/publication.sql", "utf8");
    await db.exec(fixture.slice(0, fixture.indexOf("set local role anon;")));
    await db.exec(`
      set local role authenticated;
      set local request.jwt.claim.sub='f9200000-0000-4000-8000-000000000098';
      select public.publish_sheet_game(pg_temp.pu_command());
      reset role;
    `);
    const historical = () =>
      db.query(`select
        public.get_public_game(pg_temp.pu_id(8)) as publication,
        public.get_game_sheet(pg_temp.pu_id(8)) as sheet,
        private.compute_sheet_facts(pg_temp.pu_doc()) as facts,
        (select jsonb_agg(to_jsonb(v) order by game_id,version)
          from private.game_publication_versions v) as history`);
    const before = (await historical()).rows;
    const upgrade = async () => {
      for (const name of pending)
        await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    };
    await db.exec("savepoint pr38_upgrade");
    await upgrade();
    expect((await historical()).rows).toEqual(before);
    await db.exec("rollback to savepoint pr38_upgrade");
    expect((await historical()).rows).toEqual(before);
    expect(
      (
        await db.query(`select
          to_regprocedure('private.compute_sheet_facts_v1(jsonb)') is null as no_v1_rename,
          to_regprocedure('private.compute_sheet_facts_v2(jsonb)') is null as no_v2,
          to_regclass('private.roster_reuse_commands') is null as no_receipts`)
      ).rows,
    ).toEqual([{ no_v1_rename: true, no_v2: true, no_receipts: true }]);
    await upgrade();
    expect((await historical()).rows).toEqual(before);

    // Public entry points enforce the actual role boundary, not just SQL text.
    const signatures = [
      "public.get_roster_reuse_context(uuid,uuid)",
      "public.list_roster_reuse_sources(uuid,integer)",
      "public.apply_roster_reuse(jsonb)",
    ];
    for (const signature of signatures)
      expect(
        (
          await db.query(
            `select has_function_privilege('anon',$1,'execute') as anon,
              has_function_privilege('authenticated',$1,'execute') as authenticated,
              has_function_privilege('service_role',$1,'execute') as service`,
            [signature],
          )
        ).rows,
      ).toEqual([{ anon: false, authenticated: true, service: false }]);
    for (const version of ["v1", "v2"])
      expect(
        (
          await db.query(
            `select has_function_privilege('authenticated',$1,'execute') as allowed`,
            [`private.compute_sheet_facts_${version}(jsonb)`],
          )
        ).rows,
      ).toEqual([{ allowed: false }]);

    // Save the reproduced draft through the public RPC after upgrading.
    const draft = {
      ...(
        await db.query<{ document: Record<string, unknown> }>(
          "select pg_temp.pu_doc() as document",
        )
      ).rows[0].document,
      formatVersion: 2,
      staff: Object.fromEntries(
        ["home", "away"].map((side) => [
          side,
          {
            captainRosterEntryId: null,
            coachStaffEntryId: null,
            assistantStaffEntryId: null,
          },
        ]),
      ),
    };
    await db.exec("set local role authenticated");
    const command = `jsonb_build_object('requestId',pg_temp.pu_id(900),
      'gameId',pg_temp.pu_id(9),'gameVersion',1,'baseVersion',0,
      'document',$1::jsonb,'confirm',false,'reason','')`;
    const saved = await db.query<{ result: { version: number } }>(
      `select public.save_game_sheet(${command}) as result`,
      [JSON.stringify(draft)],
    );
    expect(saved.rows[0].result.version).toBe(1);
    expect(
      (
        await db.query(
          `select public.get_game_sheet(pg_temp.pu_id(9))->'document' as document`,
        )
      ).rows,
    ).toEqual([{ document: draft }]);
    await db.exec("reset role");
    await db.exec("savepoint incomplete_confirmation");
    await expect(
      db.query("select private.final_sheet_facts($1::jsonb)", [
        JSON.stringify(draft),
      ]),
    ).rejects.toThrow("incomplete_sheet");
    await db.exec("rollback to savepoint incomplete_confirmation");
    expect((await historical()).rows).toEqual(before);
    await db.exec("rollback");
  } finally {
    await db.close();
  }
}, 20000);
