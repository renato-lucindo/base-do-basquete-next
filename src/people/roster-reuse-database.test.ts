import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";
import {
  reuseContextSchema,
  rosterReuseSourcesSchema,
} from "./roster-reuse-contract";
import { previewRosterReuse } from "./roster-reuse";

it.each(["zero", "upgrade"] as const)(
  "consulta privada de origens e contexto de reuso no %s",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const names = (await readdir("supabase/migrations"))
        .filter((n) => n.endsWith(".sql"))
        .sort();
      const added = names.filter((n) =>
        n.endsWith("_roster_reuse_context.sql"),
      );
      for (const n of names.filter(
        (n) => mode === "zero" || !added.includes(n),
      ))
        await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
      const [seed, proof] = (
        await readFile("supabase/tests/roster_reuse_context.sql", "utf8")
      ).split("-- REUSE_CONTEXT_ASSERTIONS");
      await db.exec(seed);
      const before = (
        await db.query("select * from public.roster_entries order by id")
      ).rows;
      if (mode === "upgrade")
        for (const n of added)
          await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
      expect(
        (
          await db.query(
            "select to_regprocedure('public.get_roster_reuse_context(uuid,uuid)') is not null ready",
          )
        ).rows,
      ).toEqual([{ ready: true }]);
      await db.exec(proof);
      await db.exec(
        "set local role authenticated;select set_config('request.jwt.claim.sub',pg_temp.rr_id(900)::text,true)",
      );
      const value = (
        await db.query<{ value: unknown }>(
          "select public.get_roster_reuse_context(pg_temp.rr_id(30),pg_temp.rr_id(32)) value",
        )
      ).rows[0].value;
      const context = reuseContextSchema.parse(value),
        preview = previewRosterReuse(context);
      const sources = rosterReuseSourcesSchema.parse(
        (
          await db.query<{ value: unknown }>(
            "select public.list_roster_reuse_sources(pg_temp.rr_id(32),0) value",
          )
        ).rows[0].value,
      );
      expect(
        sources.items.map((r) => r.athleteCount).sort((a, b) => a - b),
      ).toEqual([1, 11]);
      expect(sources.items.map((r) => r.name).sort()).toEqual([
        "Lobos A",
        "Lobos B",
      ]);
      expect(preview.rows).toHaveLength(11);
      expect(preview.alreadyIncludedCount).toBe(1);
      expect(preview.selectedCount).toBe(8);
      expect(
        preview.rows.find((r) => r.personId.endsWith("000000000101")),
      ).toMatchObject({
        status: "already_included",
        jersey: "99",
        selected: false,
      });
      expect(
        preview.rows.find((r) => r.personId.endsWith("000000000102")),
      ).toMatchObject({
        status: "registered_elsewhere",
        jersey: "00",
        selected: false,
      });
      expect(
        preview.rows.find((r) => r.personId.endsWith("000000000103")),
      ).toMatchObject({
        status: "transfer_required",
        jersey: null,
        selected: false,
      });
      expect(
        preview.rows.find((r) => r.personId.endsWith("000000000104"))?.errors,
      ).toEqual(["jersey_conflict"]);
      const male = reuseContextSchema.parse(
        (
          await db.query<{ value: unknown }>(
            "select public.get_roster_reuse_context(pg_temp.rr_id(30),pg_temp.rr_id(34)) value",
          )
        ).rows[0].value,
      );
      expect(
        previewRosterReuse(male).rows.every(
          (r) => r.status === "gender_mismatch",
        ),
      ).toBe(true);
      await db.exec("reset role");
      expect(
        (await db.query("select * from public.roster_entries order by id"))
          .rows,
      ).toEqual(before);
      await db.exec(
        "update public.roster_entries set jersey='98' where id=pg_temp.rr_id(301);set local role authenticated",
      );
      const altered = reuseContextSchema.parse(
        (
          await db.query<{ value: unknown }>(
            "select public.get_roster_reuse_context(pg_temp.rr_id(30),pg_temp.rr_id(32)) value",
          )
        ).rows[0].value,
      );
      expect(altered.contextFingerprint).not.toBe(context.contextFingerprint);
      expect(altered.candidates).toEqual(context.candidates);
      await db.exec(
        "reset role;update public.roster_entries set jersey='99' where id=pg_temp.rr_id(301)",
      );
      await db.exec(`
        insert into public.disputes(id,season_id,gender,category) select pg_temp.rr_id(400+n),pg_temp.rr_id(2),'feminino','Categoria '||n from generate_series(1,21) n;
        insert into public.registrations(id,dispute_id,team_id,name) select pg_temp.rr_id(500+n),pg_temp.rr_id(400+n),pg_temp.rr_id(20),'Lobos '||n from generate_series(1,21) n;
        insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) select pg_temp.rr_id(600+n),pg_temp.rr_id(500+n),pg_temp.rr_id(400+n),pg_temp.rr_id(101),'0' from generate_series(1,21) n;
        set local role authenticated;
      `);
      const pages = await Promise.all(
        [0, 20, 40].map(async (offset) =>
          rosterReuseSourcesSchema.parse(
            (
              await db.query<{ value: unknown }>(
                "select public.list_roster_reuse_sources(pg_temp.rr_id(32),$1) value",
                [offset],
              )
            ).rows[0].value,
          ),
        ),
      );
      expect(pages.map((p) => p.items.length)).toEqual([20, 3, 0]);
      expect(pages.map((p) => p.hasMore)).toEqual([true, false, false]);
      expect(new Set(pages.flatMap((p) => p.items.map((r) => r.id))).size).toBe(
        23,
      );
      await db.exec(`reset role;
        insert into public.persons(id,name) select pg_temp.rr_id(10000+n),'Identidade '||n from generate_series(1,1989) n;
        insert into private.athletes(person_id,sex) select pg_temp.rr_id(10000+n),'female' from generate_series(1,1989) n;
        insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) select pg_temp.rr_id(20000+n),pg_temp.rr_id(30),pg_temp.rr_id(10),pg_temp.rr_id(10000+n),null from generate_series(1,1989) n;
        set local role authenticated;
      `);
      expect(
        reuseContextSchema.parse(
          (
            await db.query<{ value: unknown }>(
              "select public.get_roster_reuse_context(pg_temp.rr_id(30),pg_temp.rr_id(32)) value",
            )
          ).rows[0].value,
        ).candidates,
      ).toHaveLength(2000);
      await db.exec(`reset role;
        insert into public.persons(id,name) values(pg_temp.rr_id(11990),'Excesso');
        insert into private.athletes(person_id,sex) values(pg_temp.rr_id(11990),'female');
        insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) values(pg_temp.rr_id(21990),pg_temp.rr_id(30),pg_temp.rr_id(10),pg_temp.rr_id(11990),null);
        set local role authenticated;
        select pg_temp.rr_error('select public.get_roster_reuse_context(pg_temp.rr_id(30),pg_temp.rr_id(32))','PT413');
        reset role;
      `);
      await db.exec(
        "update public.admin_access set enabled=false;set local role authenticated",
      );
      await db.exec(
        "select pg_temp.rr_error('select public.get_roster_reuse_context(pg_temp.rr_id(30),pg_temp.rr_id(32))','PT403')",
      );
      await db.exec("reset role;rollback");
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
