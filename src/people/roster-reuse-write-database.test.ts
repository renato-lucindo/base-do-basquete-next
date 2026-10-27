import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";
import {
  applyRosterReuseSchema,
  rosterReuseResultSchema,
} from "./roster-reuse-contract";

it.each(["zero", "upgrade"] as const)(
  "reaproveita vínculos atomicamente no %s e preserva G4",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const names = (await readdir("supabase/migrations"))
          .filter((n) => n.endsWith(".sql"))
          .sort(),
        added = names.filter((n) => n.endsWith("_roster_reuse_write.sql"));
      for (const n of names.filter(
        (n) => mode === "zero" || !added.includes(n),
      ))
        await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
      await db.exec(
        (await readFile("supabase/tests/publication.sql", "utf8")).replace(
          /\nrollback;\s*$/u,
          "\n",
        ),
      );
      // The application has one administrative slot; replace only the local
      // fixture's disabled administrator, keeping Auth identities and G4 intact.
      await db.exec("delete from public.admin_access");
      await db.exec(
        (
          await readFile("supabase/tests/roster_reuse_context.sql", "utf8")
        ).split("-- REUSE_CONTEXT_ASSERTIONS")[0],
      );
      const before = (
        await db.query(
          "select * from private.game_publication_versions order by game_id,version",
        )
      ).rows;
      expect(before.length).toBeGreaterThan(0);
      if (mode === "upgrade")
        for (const n of added)
          await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
      expect(
        (
          await db.query(
            "select to_regprocedure('public.apply_roster_reuse(jsonb)') is not null ready",
          )
        ).rows,
      ).toEqual([{ ready: true }]);
      const [helpers, proof] = (
        await readFile("supabase/tests/roster_reuse_write.sql", "utf8")
      ).split("-- REUSE_WRITE_ASSERTIONS");
      await db.exec(helpers);
      await db.exec(`select set_config('request.jwt.claim.sub',pg_temp.rr_id(900)::text,true);savepoint reuse_bulk;
        insert into public.persons(id,name) select pg_temp.rr_id(10000+n),'Atleta em lote '||n from generate_series(1,200) n;
        insert into private.athletes(person_id,sex) select pg_temp.rr_id(10000+n),'female' from generate_series(1,200) n;
        insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) select pg_temp.rr_id(20000+n),pg_temp.rr_id(30),pg_temp.rr_id(10),pg_temp.rr_id(10000+n),null from generate_series(1,200) n;
        set local role authenticated;
      `);
      const bulk = (
        await db.query<{ value: unknown }>(
          `select public.apply_roster_reuse(jsonb_set(pg_temp.rw_command(799),'{items}',(select jsonb_agg(jsonb_build_object('sourceEntryId',pg_temp.rr_id(20000+n),'sourceVersion',1,'newEntryId',pg_temp.rr_id(30000+n),'jersey',null) order by n) from generate_series(1,200) n))) value`,
        )
      ).rows[0].value;
      expect(rosterReuseResultSchema.parse(bulk).items).toHaveLength(200);
      await db.exec(`reset role;rollback to savepoint reuse_bulk;release savepoint reuse_bulk;savepoint reuse_capacity;
        insert into public.persons(id,name) select pg_temp.rr_id(40000+n),'Destino '||n from generate_series(1,1997) n;
        insert into private.athletes(person_id,sex) select pg_temp.rr_id(40000+n),'female' from generate_series(1,1997) n;
        insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) select pg_temp.rr_id(50000+n),pg_temp.rr_id(32),pg_temp.rr_id(11),pg_temp.rr_id(40000+n),null from generate_series(1,1997) n;
        set local role authenticated;
        select pg_temp.rr_error('select public.apply_roster_reuse(pg_temp.rw_command(798))','PT413');
        select pg_temp.rr_assert(public.get_roster_entry(pg_temp.rr_id(801)) is null,'limite não faz inclusão parcial');
        reset role;rollback to savepoint reuse_capacity;release savepoint reuse_capacity;
      `);
      await db.exec(proof);
      const c = (await db.query<{ c: unknown }>("select c from reuse_request"))
        .rows[0].c;
      expect(applyRosterReuseSchema.safeParse(c).success).toBe(true);
      const command = applyRosterReuseSchema.parse(c);
      const id = (n: number) =>
        `a7400000-0000-4000-8000-${String(n).padStart(12, "0")}`;
      const large = Array.from({ length: 200 }, (_, n) => ({
        sourceEntryId: id(1000 + n),
        sourceVersion: 1,
        newEntryId: id(2000 + n),
        jersey: null,
      }));
      const first = command.items[0];
      const matrix: unknown[] = [
        command,
        { ...command, confirmed: false },
        { ...command, confirmed: null },
        { ...command, eligibility: "eligible" },
        { ...command, commandId: "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF" },
        { ...command, commandId: command.commandId.toUpperCase() },
        { ...command, commandId: 42 },
        { ...command, sourceRegistrationId: command.targetRegistrationId },
        { ...command, items: [] },
        { ...command, items: large },
        {
          ...command,
          items: [
            ...large,
            { ...large[0], sourceEntryId: id(5000), newEntryId: id(6000) },
          ],
        },
        ...["003", 0, null, "00", "0", undefined].map((jersey) => ({
          ...command,
          items: [{ ...first, jersey }],
        })),
        ...[0, -1, 1.5, 2147483647, 2147483648, "1", null].map(
          (sourceVersion) => ({
            ...command,
            items: [{ ...first, sourceVersion }],
          }),
        ),
        { ...command, items: [first, first] },
        {
          ...command,
          items: [first, { ...command.items[1], newEntryId: first.newEntryId }],
        },
        { ...command, items: [{ ...first, newEntryId: first.sourceEntryId }] },
        {
          ...command,
          items: [
            { ...first, newEntryId: command.items[1].sourceEntryId },
            command.items[1],
          ],
        },
        { ...command, items: [{ ...first, personId: id(1) }] },
        { ...command, expectedContextFingerprint: "A".repeat(64) },
      ];
      for (const [index, value] of matrix.entries()) {
        const actual = (
          await db.query<{ valid: boolean }>(
            "select private.valid_roster_reuse_command($1::jsonb) valid",
            [JSON.stringify(value)],
          )
        ).rows[0].valid;
        expect(actual, `contract case ${index}`).toBe(
          applyRosterReuseSchema.safeParse(value).success,
        );
      }
      const results = (
        await db.query<{ result: unknown }>(
          "select result from private.roster_reuse_commands",
        )
      ).rows;
      expect(results).toHaveLength(1);
      expect(
        rosterReuseResultSchema.parse(results[0].result).items,
      ).toHaveLength(3);
      expect(
        (
          await db.query(
            "select * from private.game_publication_versions order by game_id,version",
          )
        ).rows,
      ).toEqual(before);
      await db.exec("rollback");
      expect(
        (await db.query("select count(*)::int n from public.roster_entries"))
          .rows,
      ).toEqual([{ n: 0 }]);
    } finally {
      await db.close();
    }
  },
  20000,
);
