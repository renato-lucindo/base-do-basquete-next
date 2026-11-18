import { expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { buildRemovalServiceProof } from "../../tests/fixtures/removal-service-proof";
import {
  registrationRemovalSchema,
  removalContextSchema,
} from "./removal-contract";

it.each(["zero", "upgrade", "existing_admin"] as const)(
  "remove só inscrição vazia no banco %s",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const names = (await readdir("supabase/migrations"))
        .filter((n) => n.endsWith(".sql"))
        .sort();
      const position = names.findIndex((n) =>
        n.endsWith("_registration_removal.sql"),
      );
      const split = position < 0 ? names.length : position;
      for (const name of names.slice(
        0,
        mode === "upgrade" ? split : names.length,
      ))
        await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
      if (mode === "existing_admin")
        await db.exec(`
        insert into auth.users(id) values('f9500000-0000-4000-8000-000000000097');
        insert into public.admin_access(user_id) values('f9500000-0000-4000-8000-000000000097');
        insert into public.teams(id,name) values('f9500000-0000-4000-8000-000000000003','Clube a preservar');
        insert into public.championships(id,name) values('f9500000-0000-4000-8000-000000000094','Contexto a preservar');
        insert into public.seasons(id,championship_id,year) values('f9500000-0000-4000-8000-000000000095','f9500000-0000-4000-8000-000000000094',2026);
        insert into public.disputes(id,season_id,gender,category) values('f9500000-0000-4000-8000-000000000096','f9500000-0000-4000-8000-000000000095','masculino','Adulto');
        insert into public.registrations(id,dispute_id,team_id,name) values('f9500000-0000-4000-8000-000000000025','f9500000-0000-4000-8000-000000000096','f9500000-0000-4000-8000-000000000003','Inscrição a preservar');
      `);
      const original = (
        await db.query(
          "select jsonb_build_object('admin',(select jsonb_agg(a) from public.admin_access a),'teams',(select jsonb_agg(t) from public.teams t),'registrations',(select jsonb_agg(r) from public.registrations r),'users',(select jsonb_agg(u) from auth.users u)) data",
        )
      ).rows;
      const source = await readFile(
        "supabase/tests/registration_removal.sql",
        "utf8",
      );
      const [seed, proof] = (
        mode === "existing_admin" ? buildRemovalServiceProof(source) : source
      ).split("-- REMOVAL PROOF");
      await db.exec(seed);
      const before = (
        await db.query("select * from public.registrations order by id")
      ).rows;
      if (mode === "upgrade")
        for (const name of names.slice(split))
          await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
      expect(
        (await db.query("select * from public.registrations order by id")).rows,
      ).toEqual(before);
      const id = (n: number) =>
        `f9500000-0000-4000-8000-${String(n).padStart(12, "0")}`;
      const command = {
        commandId: id(500),
        registrationId: id(10),
        disputeId: id(92),
        expectedVersion: 1,
      };
      const candidates: unknown[] = [
        command,
        null,
        {},
        [],
        ...[0, -1, 1.5, 2147483647, 2147483648, "1", null].map(
          (expectedVersion) => ({ ...command, expectedVersion }),
        ),
        { ...command, canRemove: true },
        { ...command, actorId: id(98) },
        { ...command, registrationId: id(10).toUpperCase() },
        { ...command, commandId: "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF" },
        { ...command, commandId: "00000000-0000-0000-0000-000000000000" },
        { ...command, registrationId: id(10).replaceAll("-", "") },
        { ...command, registrationId: "não é uuid" },
      ];
      for (const candidate of candidates) {
        const allowed = (
          await db.query<{ ok: boolean }>(
            "select private.valid_registration_removal_command($1::jsonb) ok",
            [JSON.stringify(candidate)],
          )
        ).rows[0].ok;
        expect(allowed, JSON.stringify(candidate)).toBe(
          registrationRemovalSchema.safeParse(candidate).success,
        );
      }
      expect(
        (
          await db.query<{ ok: boolean }>(
            "select private.valid_registration_removal_command($1::jsonb) ok",
            [
              JSON.stringify(command).replace(
                '"expectedVersion":1',
                '"expectedVersion":1.0',
              ),
            ],
          )
        ).rows[0].ok,
      ).toBe(true);
      // A new referencing table must be reviewed before eligibility is shipped again.
      const references = (
        await db.query<{ name: string; deletion: string }>(
          "select distinct n.nspname||'.'||c.relname name,k.confdeltype::text deletion from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where k.contype='f' and k.confrelid='public.registrations'::regclass order by name",
        )
      ).rows;
      expect(references.map((r) => r.name)).toEqual([
        "private.achievement_draft_registrations",
        "private.game_occurrence_versions",
        "private.game_publication_entries",
        "private.registration_withdrawal_records",
        "private.regulation_registration_links",
        "private.roster_reuse_commands",
        "private.roster_transfers",
        "private.text_reviews",
        "public.game_sheet_entries",
        "public.games",
        "public.roster_entries",
        "public.staff_entries",
      ]);
      expect(references.every((r) => ["a", "r"].includes(r.deletion))).toBe(
        true,
      );
      const initial = (
        await db.query<{ data: unknown }>(
          "select public.get_registration_removal_context(pg_temp.rm_id(10),pg_temp.rm_id(92)) as data",
        )
      ).rows[0].data;
      expect(removalContextSchema.parse(initial).state).toBe("available");
      for (const n of [12, 13, 14, 15, 16]) {
        const context = (
          await db.query<{ data: unknown }>(
            "select public.get_registration_removal_context(pg_temp.rm_id($1),pg_temp.rm_id(92)) as data",
            [n],
          )
        ).rows[0].data;
        expect(removalContextSchema.parse(context).state).toBe("blocked");
      }
      // Disposable database only: prove fallback against a future, unlisted FK.
      // This probe is deliberately absent from the real-service rollback contract.
      await db.exec(`
        create table private.rm_future_dependency(registration_id uuid references public.registrations(id));
        alter table private.rm_future_dependency enable row level security;
        revoke all on private.rm_future_dependency from public,anon,authenticated,service_role;
        insert into private.rm_future_dependency values(pg_temp.rm_id(17));
        set local role authenticated;
        select pg_temp.rm_error('select public.remove_registration(pg_temp.rm_command(17,517))','PT409');
        select pg_temp.rm_assert(public.get_registration(pg_temp.rm_id(17)) is not null,'late FK preserves row');
        reset role;
        select pg_temp.rm_assert(not exists(select 1 from private.registration_removals where registration_id=pg_temp.rm_id(17)),'late FK has no receipt');
        drop table private.rm_future_dependency;
      `);
      await db.exec(proof);
      expect(
        (
          await db.query(
            "select jsonb_build_object('admin',(select jsonb_agg(a) from public.admin_access a),'teams',(select jsonb_agg(t) from public.teams t),'registrations',(select jsonb_agg(r) from public.registrations r),'users',(select jsonb_agg(u) from auth.users u)) data",
          )
        ).rows,
      ).toEqual(original);
    } finally {
      await db.close();
    }
  },
  20000,
);
