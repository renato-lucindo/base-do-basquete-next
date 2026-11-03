import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";
import {
  disciplinarySheet,
  teamReview,
} from "../../tests/fixtures/sheet-team-statistics";
import { deriveManualFacts } from "./manual";
import { publicGameSchema } from "./contract";

it("SQL and engine agree on whole-team coverage; only atomic authorized publication exposes reviewed counts", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    const d = disciplinarySheet();
    for (const review of [null, teamReview()]) {
      const { rows } = await db.query<{ facts: unknown }>(
        "select private.enrich_sheet_team_statistics($1::jsonb,private.final_sheet_facts_base($1::jsonb),$2::jsonb) as facts",
        [JSON.stringify(d), review === null ? null : JSON.stringify(review)],
      );
      expect(rows[0].facts).toEqual(deriveManualFacts(d, review ?? undefined));
      expect(JSON.stringify(rows[0].facts)).not.toContain("_staffDiscipline");
    }
    for (const invalid of [
      { ...teamReview(), home: { disqualifications: 3, foulsReceived: 0 } },
      { ...teamReview(), home: { disqualifications: 4, foulsReceived: -1 } },
      { ...teamReview(), home: { disqualifications: 4, foulsReceived: 0.5 } },
      { ...teamReview(), home: { disqualifications: 4, foulsReceived: "0" } },
      {
        ...teamReview(),
        home: {
          disqualifications: 4,
          foulsReceived: 0,
          privateReason: "not public",
        },
      },
    ])
      await expect(
        db.query(
          "select private.enrich_sheet_team_statistics($1::jsonb,private.final_sheet_facts_base($1::jsonb),$2::jsonb)",
          [JSON.stringify(d), JSON.stringify(invalid)],
        ),
      ).rejects.toThrow();

    const fixture = await readFile("supabase/tests/publication.sql", "utf8");
    await db.exec(fixture.slice(0, fixture.indexOf("set local role anon;")));
    await db.exec("set local role anon");
    await db.exec(
      "select pg_temp.pu_error($q$select private.enrich_sheet_team_statistics('{}','{}')$q$,'42501')",
    );
    await db.exec(
      "reset role; set local role authenticated; set local request.jwt.claim.sub='f9200000-0000-4000-8000-000000000098'",
    );
    await db.exec(
      'select public.publish_sheet_game(jsonb_set(pg_temp.pu_command(),\'{source,teamReview}\', \'{"home":{"disqualifications":2,"foulsReceived":7},"away":{"disqualifications":0,"foulsReceived":0}}\'))',
    );
    const current = async () =>
      (
        await db.query<{ snapshot: unknown }>(
          "select public.get_public_game(pg_temp.pu_id(8)) as snapshot",
        )
      ).rows[0].snapshot;
    const initial = publicGameSchema.parse(await current());
    expect(initial.facts.teams.home.teamStatistics).toEqual({
      version: 1,
      technicalFouls: 0,
      disqualifications: 2,
      foulsReceived: 7,
    });
    await db.exec(
      "select public.save_game_sheet(jsonb_build_object('requestId',pg_temp.pu_id(820),'gameId',pg_temp.pu_id(8),'gameVersion',2,'baseVersion',1,'document',jsonb_set(pg_temp.pu_doc(),'{events,0,code}','\"3\"'),'confirm',false,'reason','Conferência de rascunho da súmula.'))",
    );
    expect(await current()).toEqual(initial);
    await db.exec(
      'select public.publish_sheet_game(jsonb_set(jsonb_set(pg_temp.pu_revision(821),\'{source,baseSheetVersion}\',\'2\'),\'{source,teamReview}\', \'{"home":{"disqualifications":1,"foulsReceived":3},"away":{"disqualifications":null,"foulsReceived":null}}\'))',
    );
    await db.exec("reset role; set local role anon");
    const corrected = publicGameSchema.parse(await current());
    expect(corrected.version).toBe(2);
    expect(corrected.facts.teams.home.teamStatistics?.disqualifications).toBe(
      1,
    );
    expect(corrected.facts.teams.home.points).toBe(3);
    expect(JSON.stringify(corrected)).not.toContain("teamReview");
    await db.exec("reset role; rollback");
  } finally {
    await db.close();
  }
}, 20000);
