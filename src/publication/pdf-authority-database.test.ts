import { it, expect } from "vitest";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import {
  pdfPublicationFixture,
  pdfPublicationFixtures,
} from "../../tests/fixtures/pdf-publication";
import { preparePdfFacts } from "./pdf-authority";
import { emptyPersistedSheet } from "../games/sheet-contract";
import { pubId } from "../../tests/fixtures/publication";
it("SQL derives only covered PDF domains and agrees with TypeScript for all four supplied reports", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    const proof: string[] = [
      "begin;",
      `create function pg_temp.pf_check(r jsonb,s jsonb,a jsonb,m jsonb,reason text,accepted boolean,expected jsonb) returns void language plpgsql as $$declare actual jsonb;begin actual:=private.pdf_publication_facts(r,s,a,m,reason,accepted);if actual is distinct from expected then raise exception 'FAIL: PDF facts mismatch';end if;end$$;`,
    ];
    const literal = (v: unknown) =>
      v === null
        ? "null"
        : `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`;
    for (const filename of pdfPublicationFixtures) {
      const { review, supplement, authority } =
        await pdfPublicationFixture(filename);
      for (const invert of [false, true]) {
        review.document.invertSides = invert;
        const expected = preparePdfFacts(review, supplement, authority);
        const { rows } = await db.query<{ facts: unknown }>(
          "select private.pdf_publication_facts($1::jsonb,$2::jsonb,$3::jsonb,null,'',false) as facts",
          [
            JSON.stringify(review),
            JSON.stringify(supplement),
            JSON.stringify(authority),
          ],
        );
        const { comparison, ...facts } = expected;
        const expectedFacts = {
          ...facts,
          divergent: comparison !== null && !comparison.compatible,
        };
        expect(rows[0].facts).toEqual(expectedFacts);
        proof.push(
          `select pg_temp.pf_check(${literal(review)},${literal(supplement)},${literal(authority)},null,'',false,${literal(expectedFacts)});`,
        );
      }
    }
    const fixture = await pdfPublicationFixture();
    const invalid: (typeof fixture)[] = [];
    const add = (edit: (f: typeof fixture) => void) => {
      const f = structuredClone(fixture);
      edit(f);
      invalid.push(f);
    };
    add((f) => {
      f.review.version = 0;
      f.review.savedAt = null;
    });
    add((f) => {
      f.review.source.ready = false;
      f.review.source.version = 1;
    });
    add((f) => {
      f.review.document.mappings[0].rosterEntryId = null;
    });
    add((f) => {
      f.review.document.mappings[1].rosterEntryId =
        f.review.document.mappings[0].rosterEntryId;
    });
    add((f) => {
      f.supplement.rows.pop();
    });
    add((f) => {
      f.supplement.rows[1] = { ...f.supplement.rows[0] };
    });
    add((f) => {
      f.supplement.rows[0].played = false;
    });
    add((f) => {
      f.supplement.rows[0].starter = false;
    });
    add((f) => {
      f.supplement.rows[0].captain = false;
    });
    add((f) => {
      f.supplement.staff.home.assistantStaffEntryId = pubId(700);
    });
    for (const domain of [
      "periodScores",
      "teamAdvanced",
      "gameAdvanced",
      "foulsReceived",
    ] as const)
      add((f) => {
        f.authority[domain] = "pdf";
      });
    add((f) => {
      f.authority.scorePoints = "sheet";
    });
    for (const f of invalid) {
      expect(() =>
        preparePdfFacts(f.review, f.supplement, f.authority),
      ).toThrow();
      await expect(
        db.query(
          "select private.pdf_publication_facts($1::jsonb,$2::jsonb,$3::jsonb,null,'',false)",
          [
            JSON.stringify(f.review),
            JSON.stringify(f.supplement),
            JSON.stringify(f.authority),
          ],
        ),
      ).rejects.toMatchObject({ code: "PT400" });
    }
    const { review, supplement, authority } = fixture,
      d = emptyPersistedSheet();
    d.participants = review.document.mappings.map((m) => ({
      rosterEntryId: m.rosterEntryId!,
      side: m.sourceSide === 0 ? "home" : "away",
      jersey: m.jersey,
      played: true,
      starter: m.sourceIndex < 5,
    }));
    d.staff.home.captainRosterEntryId = pubId(100);
    d.staff.away.captainRosterEntryId = pubId(120);
    d.events = [
      {
        id: pubId(600),
        side: "home",
        period: 4,
        target: d.participants[0].jersey,
        code: "2",
      },
    ];
    authority.scorePoints = "sheet";
    const manual = { document: d, version: 1 };
    const expected = preparePdfFacts(
      review,
      supplement,
      authority,
      manual,
      "Conferência manual do placar",
      true,
    );
    const { comparison, ...facts } = expected;
    const args = [
      JSON.stringify(review),
      JSON.stringify(supplement),
      JSON.stringify(authority),
      JSON.stringify(manual),
      "Conferência manual do placar",
    ];
    const mixed = await db.query<{ facts: unknown }>(
      "select private.pdf_publication_facts($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5,true) as facts",
      args,
    );
    expect(mixed.rows[0].facts).toEqual({
      ...facts,
      divergent: comparison !== null && !comparison.compatible,
    });
    await expect(
      db.query(
        "select private.pdf_publication_facts($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5,false)",
        args,
      ),
    ).rejects.toMatchObject({ code: "PT400" });
    const grants = await db.query<{ ok: boolean }>(
      "select bool_and(not has_function_privilege(role,'private.pdf_publication_facts(jsonb,jsonb,jsonb,jsonb,text,boolean)','execute')) as ok from unnest(array['anon','authenticated','service_role']) role",
    );
    expect(grants.rows[0].ok).toBe(true);
    proof.push(
      `do $$begin if exists(select 1 from unnest(array['anon','authenticated','service_role']) role where has_function_privilege(role,'private.pdf_publication_facts(jsonb,jsonb,jsonb,jsonb,text,boolean)','execute')) then raise exception 'FAIL: helper grant';end if;end$$;`,
      "rollback;",
    );
    if (process.env.BDB_EXPORT_PDF_FACTS_PROOF === "1")
      await writeFile(
        ".preview-artifacts/pdf-facts-proof.sql",
        proof.join("\n"),
        "utf8",
      );
  } finally {
    await db.close();
  }
}, 20000);
