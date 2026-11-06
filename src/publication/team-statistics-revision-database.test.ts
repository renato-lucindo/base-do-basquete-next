import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";
import { disciplinarySheet } from "../../tests/fixtures/sheet-team-statistics";
import { deriveManualFacts } from "./manual";
import { publicGameSchema } from "./contract";
it("revises only published team totals atomically, preserving divergent live sheets and historical facts", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile("supabase/migrations/" + name, "utf8"));
    const fixture = await readFile("supabase/tests/publication.sql", "utf8");
    await db.exec(fixture.slice(0, fixture.indexOf("set local role anon;")));
    const fails = (sql: string, code: string) =>
      db.query("select pg_temp.pu_error($1,$2)", [sql, code]);
    const literal = (v: unknown) =>
      "'" + JSON.stringify(v).replaceAll("'", "''") + "'::jsonb";
    const d = disciplinarySheet(),
      review = {
        home: { disqualifications: 6, foulsReceived: null },
        away: { disqualifications: 0, foulsReceived: null },
      };
    expect(
      (
        await db.query<{ facts: unknown }>(
          "select private.enrich_sheet_team_statistics($1::jsonb,private.final_sheet_facts_base($1::jsonb),$2::jsonb) as facts",
          [JSON.stringify(d), JSON.stringify(review)],
        )
      ).rows[0].facts,
    ).toEqual(deriveManualFacts(d, review));
    await db.exec("set local role anon");
    await fails("select public.revise_sheet_team_statistics('{}')", "42501");
    await db.exec(
      "reset role;set local role authenticated;set local request.jwt.claim.sub='f9200000-0000-4000-8000-000000000098'",
    );
    await fails(
      "select public.publish_sheet_game(pg_temp.pu_command() #- '{source,teamReview}')",
      "PT400",
    );
    await db.exec(
      `select public.publish_sheet_game(jsonb_set(pg_temp.pu_command(),'{source,teamReview}','{"home":{"disqualifications":0,"foulsReceived":null},"away":{"disqualifications":0,"foulsReceived":null}}'))`,
    );
    const published = async () =>
      (
        await db.query<{ snapshot: unknown }>(
          "select public.get_public_game(pg_temp.pu_id(8)) as snapshot",
        )
      ).rows[0].snapshot;
    const first = publicGameSchema.parse(await published());
    await db.exec(
      `select public.save_game_sheet(jsonb_build_object('requestId',pg_temp.pu_id(820),'gameId',pg_temp.pu_id(8),'gameVersion',2,'baseVersion',1,'document',jsonb_set(pg_temp.pu_doc(),'{events,0,code}','"3"'),'confirm',false,'reason','Conferência humana de rascunho.'))`,
    );
    const live = async () =>
      (
        await db.query(
          "select to_jsonb(s) as sheet,(select jsonb_agg(to_jsonb(e) order by roster_entry_id) from public.game_sheet_entries e where e.game_id=s.game_id) as entries,(select to_jsonb(g) from public.games g where g.id=s.game_id) as game from public.game_sheets s where game_id=pg_temp.pu_id(8)",
        )
      ).rows;
    const liveBefore = await live();
    const command = (
      await db.query<{ command: Record<string, unknown> }>(
        `select jsonb_build_object('requestId',pg_temp.pu_id(900),'gameId',pg_temp.pu_id(8),'basePublicationVersion',1,'disqualifications',jsonb_build_object('home',1,'away',0),'reason','Conferência dos totais coletivos publicados.') as command`,
      )
    ).rows[0].command;
    const revise = () =>
      db.query<{ ack: { version: number; sourceVersion: number } }>(
        "select public.revise_sheet_team_statistics($1::jsonb) as ack",
        [JSON.stringify(command)],
      );
    const ack = (await revise()).rows[0].ack;
    expect(ack).toMatchObject({ version: 2, sourceVersion: 1 });
    expect((await revise()).rows[0].ack).toEqual(ack);
    await fails(
      "select public.revise_sheet_team_statistics(" +
        literal({ ...command, reason: "Outro motivo para o mesmo envio." }) +
        ")",
      "PT409",
    );
    await fails(
      "select public.revise_sheet_team_statistics(" +
        literal({
          ...command,
          requestId: "f9200000-0000-4000-8000-000000000901",
        }) +
        ")",
      "PT409",
    );
    expect(await live()).toEqual(liveBefore);
    const corrected = publicGameSchema.parse(await published());
    expect(corrected.facts.teams.home.teamStatistics).toEqual({
      version: 1,
      technicalFouls: 0,
      disqualifications: 1,
      foulsReceived: 0,
    });
    const withoutTeamTotals = (value: typeof first) => {
      const x = structuredClone(value);
      delete (x as Partial<typeof x>).version;
      delete (x as Partial<typeof x>).publishedAt;
      delete x.facts.teams.home.teamStatistics;
      delete x.facts.teams.away.teamStatistics;
      return x;
    };
    expect(withoutTeamTotals(corrected)).toEqual(withoutTeamTotals(first));
    await db.exec("reset role");
    expect(
      (
        await db.query<{ snapshot: unknown }>(
          "select snapshot from private.game_publication_versions where game_id=pg_temp.pu_id(8) and version=1",
        )
      ).rows[0].snapshot,
    ).toEqual(first);
    const projections = await db.query<{ version: number }>(
      "select distinct publication_version as version from public.published_player_games where game_id=pg_temp.pu_id(8)",
    );
    expect(projections.rows).toEqual([{ version: 2 }]);
    await db.exec("reset role;rollback");
  } finally {
    await db.close();
  }
}, 20000);
