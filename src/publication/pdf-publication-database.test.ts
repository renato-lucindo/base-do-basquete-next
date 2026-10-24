import { it, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { publicResultSchema, publishPdfSchema } from "./pdf-contract";
import {
  pdfPublicationFixture,
  pdfPublicationFixtures,
} from "../../tests/fixtures/pdf-publication";
import { pubId } from "../../tests/fixtures/publication";
it("publishes PDF facts atomically with versioned sources, private history, reasons, replay and a strict public projection", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    await db.exec(
      (await readFile("supabase/tests/pdf_publication.sql", "utf8")).replace(
        /\nrollback;\s*$/u,
        "\n",
      ),
    );
    const rows = (
      await db.query<{ snapshot: unknown }>(
        "select snapshot from public.published_games where game_id=pg_temp.pp_id(8)",
      )
    ).rows;
    expect(rows).toHaveLength(1);
    expect(publicResultSchema.parse(rows[0].snapshot).source.kind).toBe("pdf");
    await db.exec("rollback;");
  } finally {
    await db.close();
  }
}, 20000);

it("publishes each supplied PDF with actual capabilities and preserves only authorized public identity", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    for (const filename of pdfPublicationFixtures) {
      const { review, supplement, authority } =
        await pdfPublicationFixture(filename);
      const val = (s: string) => `'${s.replaceAll("'", "''")}'`,
        lit = (v: unknown) => `${val(JSON.stringify(v))}::jsonb`;
      const people = review.document.mappings
        .map((_m, i) => `(${val(pubId(2000 + i))},'Fixture Player ${i}')`)
        .join(",");
      const athletes = review.document.mappings
        .map((_m, i) => `(${val(pubId(2000 + i))},'male')`)
        .join(",");
      const roster = review.document.mappings
        .map(
          (m, i) =>
            `(${val(m.rosterEntryId!)},${val(pubId(m.sourceSide === 0 ? 9005 : 9006))},${val(pubId(2))},${val(pubId(2000 + i))},${val(m.jersey)})`,
        )
        .join(",");
      await db.exec(`begin;
    insert into auth.users(id) values('${pubId(9001)}');insert into public.admin_access(user_id) values('${pubId(9001)}');
    insert into public.championships(id,name) values('${pubId(9003)}','Fixture');insert into public.seasons(id,championship_id,year) values('${pubId(9004)}','${pubId(9003)}',2026);
    insert into public.disputes(id,season_id,gender,category) values('${pubId(2)}','${pubId(9004)}','masculino','Adulto');
    insert into public.teams(id,name) values('${pubId(9002)}','Global');insert into public.registrations(id,dispute_id,team_id,name) values('${pubId(9005)}','${pubId(2)}','${pubId(9002)}','Home'),('${pubId(9006)}','${pubId(2)}','${pubId(9002)}','Away');
    insert into public.games(id,dispute_id,home_registration_id,away_registration_id) values('${pubId(3)}','${pubId(2)}','${pubId(9005)}','${pubId(9006)}');
    insert into public.persons(id,name) values ${people};insert into private.athletes(person_id,sex) values ${athletes};insert into public.roster_entries(id,registration_id,dispute_id,person_id,jersey) values ${roster};
    insert into public.pdf_sources(id,dispute_id,filename,sha256,byte_size,page_count,parsed,created_by,ready,version) values('${pubId(1)}','${pubId(2)}',${val(filename)},'${review.source.sha256}',${review.source.byteSize},${review.source.pageCount},${lit(review.source.parsed)},'${pubId(9001)}',true,2);
    insert into storage.objects(bucket_id,name,metadata,owner_id) values('boxscore-sources','sources/${pubId(1)}.pdf',${lit({ mimetype: "application/pdf", size: review.source.byteSize })},'${pubId(9001)}');
    set local role authenticated;set local request.jwt.claim.sub='${pubId(9001)}';
   `);
      await db.query("select public.save_pdf_review($1::jsonb)", [
        JSON.stringify({
          commandId: pubId(8001),
          sourceId: pubId(1),
          expectedVersion: 0,
          document: review.document,
        }),
      ]);
      const command = publishPdfSchema.parse({
        requestId: pubId(8002),
        gameId: pubId(3),
        gameVersion: 1,
        basePublicationVersion: 0,
        source: {
          kind: "pdf",
          sourceId: pubId(1),
          sourceVersion: 2,
          reviewVersion: 1,
        },
        supplement,
        authority,
        sheetVersion: null,
        reason: "",
        acceptDivergence: false,
      });
      if (review.source.parsed.gameNumber !== null) {
        await db.exec("reset role;");
        await db.query(
          "update public.games set game_number='conflicting-number' where id=$1::uuid",
          [pubId(3)],
        );
        await db.exec("set local role authenticated;");
        await db.exec("savepoint number_conflict;");
        await expect(
          db.query("select public.publish_pdf_game($1::jsonb)", [
            JSON.stringify(command),
          ]),
        ).rejects.toMatchObject({ code: "PT400" });
        await db.exec(
          "rollback to savepoint number_conflict;release savepoint number_conflict;",
        );
        command.acceptDivergence = true;
        command.reason = "Número divergente conferido explicitamente.";
      }
      await db.query("select public.publish_pdf_game($1::jsonb)", [
        JSON.stringify(command),
      ]);
      const result = (
        await db.query<{ snapshot: unknown }>(
          "select public.get_public_game($1::uuid) as snapshot",
          [pubId(3)],
        )
      ).rows[0].snapshot;
      const published = publicResultSchema.parse(result);
      expect(published.source.kind).toBe("pdf");
      expect(published.facts.teams.home.points).toBe(
        review.source.parsed.teams[0].score,
      );
      expect(JSON.stringify(result)).not.toMatch(
        /sourceId|sha256|sourceIndex|sourceMarkers|birthDate|federation/,
      );
      await db.exec("reset role;rollback;");
    }
  } finally {
    await db.close();
  }
}, 20000);
