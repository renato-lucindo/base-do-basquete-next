import { expect, it } from "vitest";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { transferContextSchema } from "./transfer-contract";
import { previewTransfer } from "./transfer";
import { transferId } from "../../tests/fixtures/transfers";

it.each(["zero", "upgrade"] as const)(
  "lê contexto privado completo no %s sem mudar histórico",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const names = (await readdir("supabase/migrations"))
          .filter((n) => n.endsWith(".sql"))
          .sort(),
        index = names.findIndex((n) => n.endsWith("_transfer_context.sql")),
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
      const proof = await readFile(
        "supabase/tests/transfer_context.sql",
        "utf8",
      );
      if (
        process.env.BDB_EXPORT_TRANSFER_CONTEXT_PROOF === "1" &&
        mode === "zero"
      )
        await writeFile(
          ".preview-artifacts/transfer-context-proof.sql",
          seed + proof + "\nrollback;\n",
        );
      await db.exec(proof);
      await db.exec(
        "set local role authenticated; select set_config('request.jwt.claim.sub',pg_temp.pu_id(98)::text,true);",
      );
      const value = (
          await db.query<{ value: unknown }>(
            "select public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6)) as value",
          )
        ).rows[0].value,
        context = transferContextSchema.parse(value),
        source = context.memberships.find(
          (m) => m.personId === context.personId && m.endedAt === null,
        )!;
      expect(context.memberships).toHaveLength(7);
      expect(context.regulation).toEqual({ version: 3, transfers: "allowed" });
      expect(
        previewTransfer(
          {
            commandId: transferId(100),
            disputeId: context.disputeId,
            sourceEntryId: source.id,
            expectedSourceVersion: source.version,
            destinationRegistrationId: context.registrations.find(
              (r) => r.id !== source.registrationId,
            )!.id,
            expectedDestinationVersion: 1,
            expectedRegulationVersion: 3,
            expectedContextFingerprint: context.contextFingerprint,
            newEntryId: transferId(101),
            jersey: "88",
            reason: "Retorno conforme a regra",
            acknowledgeImpact: false,
          },
          context,
        ),
      ).toMatchObject({ ready: true, kind: "return" });
      if (mode === "zero") {
        await db.exec(`reset role;
          insert into public.persons(id,name) select pg_temp.pu_id(1000+n),'Occupant '||n from generate_series(1,1994) n;
          insert into private.athletes(person_id,sex) select pg_temp.pu_id(1000+n),'male' from generate_series(1,1994) n;
          insert into public.roster_entries(id,person_id,dispute_id,registration_id,jersey) select pg_temp.pu_id(4000+n),pg_temp.pu_id(1000+n),pg_temp.pu_id(3),pg_temp.pu_id(6),null from generate_series(1,1993) n;
          set local role authenticated;`);
        const full = transferContextSchema.parse(
          (
            await db.query<{ value: unknown }>(
              "select public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6)) as value",
            )
          ).rows[0].value,
        );
        expect(full.memberships).toHaveLength(2000);
        await db.exec(`reset role;
          insert into public.roster_entries(id,person_id,dispute_id,registration_id,jersey) values(pg_temp.pu_id(5994),pg_temp.pu_id(2994),pg_temp.pu_id(3),pg_temp.pu_id(6),null);
          set local role authenticated;
          select pg_temp.pu_error('select public.get_transfer_context(pg_temp.pu_id(101),pg_temp.pu_id(6))','PT413');`);
      }
      await db.exec("reset role; rollback;");
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
