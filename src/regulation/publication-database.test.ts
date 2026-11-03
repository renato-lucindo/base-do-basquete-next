import { it, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
const id = (n: number) =>
  `f9200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
import { standingsPublicationPreviewSchema } from "./publication-contract";
import { publicStandingsSourceSchema } from "./public-contract";
import { buildPublicStandings } from "./public";

it("upgrade preserves existing private entities and denies anonymous previews", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    const migrations = (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort();
    for (const name of migrations.slice(0, -1))
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    const seed = await readFile("supabase/tests/publication.sql", "utf8");
    await db.exec(seed.slice(0, seed.indexOf("set local role anon;")));
    // Upgrade with existing private entities must publish nothing.
    await db.exec(
      await readFile(`supabase/migrations/${migrations.at(-1)}`, "utf8"),
    );
    const json = async (sql: string, args: unknown[] = []) =>
      (await db.query<{ value: unknown }>(`select ${sql} as value`, args))
        .rows[0].value;
    await db.exec("set local role anon");
    expect(await json("public.get_public_standings($1)", [id(3)])).toBeNull();
    expect(await json("public.list_public_disputes(null)")).toEqual([]);
    await db.exec(
      "select pg_temp.pu_error('select public.preview_public_standings(pg_temp.pu_id(3))','42501');set local role authenticated;set local request.jwt.claim.sub='f9200000-0000-4000-8000-000000000099';select pg_temp.pu_error('select public.preview_public_standings(pg_temp.pu_id(3))','PT403');rollback",
    );
  } finally {
    await db.close();
  }
}, 20000);

it("publishes before results, freezes identities/agenda/rules, replays lost ACKs and reads new public results without private edits", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    const seed = await readFile("supabase/tests/publication.sql", "utf8");
    await db.exec(seed.slice(0, seed.indexOf("set local role anon;")));
    const json = async (sql: string, args: unknown[] = []) =>
      (await db.query<{ value: unknown }>(`select ${sql} as value`, args))
        .rows[0].value;
    await db.exec(
      `set local role authenticated; set local request.jwt.claim.sub='${id(98)}'`,
    );
    const state = (await json("public.get_regulation_state($1,0)", [
      id(3),
    ])) as { contextFingerprint: string };
    const definition = {
      registrationIds: [id(5), id(6)],
      occurrenceRules: { wo: null },
      groupPhases: [
        {
          phaseId: id(800),
          name: "Fase regular",
          rules: {
            format: "round_robin",
            points: { win: 2, loss: 1 },
            tieBreakers: ["point_difference"],
          },
          groups: [
            {
              id: id(801),
              name: "Grupo único",
              registrationIds: [id(5), id(6)],
              gameIds: [id(8)],
            },
          ],
        },
      ],
      knockoutPhases: [],
      series: [],
    };
    await json("public.save_regulation($1)", [
      {
        commandId: id(850),
        disputeId: id(3),
        expectedVersion: 0,
        expectedContextFingerprint: state.contextFingerprint,
        definition,
        reason: "",
        acknowledgeImpact: false,
      },
    ]);
    const p = standingsPublicationPreviewSchema.parse(
      await json("public.preview_public_standings($1)", [id(3)]),
    );
    expect(p.source.games.map((g) => g.id)).toEqual([id(8)]);
    expect(p.source.registrations).toHaveLength(2);
    expect(
      buildPublicStandings(
        p.source,
      ).projection.groupPhases[0].groups[0].standings.rows.every(
        (r) => r.games === 0 && r.position === null,
      ),
    ).toBe(true);
    const c = {
      commandId: id(851),
      disputeId: id(3),
      expectedPublicationVersion: 0,
      fingerprint: p.fingerprint,
    };
    // Force a failure after the version insert; the whole confirmation must roll back.
    await db.exec(
      `reset role; create function pg_temp.fail_standings() returns trigger language plpgsql as $$begin raise exception 'publication fixture failure';end$$;create trigger fixture_standings_failure before insert on private.public_standings_heads for each row execute function pg_temp.fail_standings();set local role authenticated`,
    );
    await db.exec(
      `select pg_temp.pu_error('select public.confirm_public_standings(' || quote_literal('${JSON.stringify(c)}') || '::jsonb)', 'P0001')`,
    );
    await db.exec("reset role");
    expect(
      (
        await db.query(
          "select count(*)::int as n from private.public_standings_versions",
        )
      ).rows,
    ).toEqual([{ n: 0 }]);
    await db.exec(
      "drop trigger fixture_standings_failure on private.public_standings_heads;set local role authenticated",
    );
    const result = await json("public.confirm_public_standings($1)", [c]);
    expect(await json("public.confirm_public_standings($1)", [c])).toEqual(
      result,
    );
    const before = publicStandingsSourceSchema.parse(
      await json("public.get_public_standings($1)", [id(3)]),
    );
    expect(before.games).toHaveLength(1);
    expect(before.publishedGames).toEqual([]);
    const freshPreview = standingsPublicationPreviewSchema.parse(
      await json("public.preview_public_standings($1)", [id(3)]),
    );
    await db.exec(
      "reset role;update public.games set scheduled_date='2027-01-02' where id=pg_temp.pu_id(8); update public.registrations set name='PRIVATE_RENAME' where id=pg_temp.pu_id(5); set local role authenticated",
    );
    expect(await json("public.get_public_standings($1)", [id(3)])).toEqual(
      before,
    );
    expect(await json("public.confirm_public_standings($1)", [c])).toEqual(
      result,
    );
    await db.exec(
      `select pg_temp.pu_error('select public.confirm_public_standings(' || quote_literal('${JSON.stringify({ ...c, commandId: id(852), expectedPublicationVersion: 1, fingerprint: freshPreview.fingerprint })}') || '::jsonb)', 'PT409')`,
    );
    await json("public.publish_sheet_game(pg_temp.pu_command())");
    const played = buildPublicStandings(
      await json("public.get_public_standings($1)", [id(3)]),
    );
    expect(played.games[0]).toMatchObject({
      state: "played",
      score: { homePoints: 2, awayPoints: 0 },
    });
    expect(played.registrations[0].name).not.toBe("PRIVATE_RENAME");
    await json("public.publish_sheet_game(pg_temp.pu_revision())");
    const corrected = buildPublicStandings(
      await json("public.get_public_standings($1)", [id(3)]),
    );
    expect(corrected.games[0].score).toEqual({ homePoints: 3, awayPoints: 0 });
    expect(corrected.games[0].date).toBe(before.games[0].date);
    expect(JSON.stringify(corrected)).not.toMatch(
      /PRIVATE_RENAME|actorId|birthDate|federationRegistration|reason/u,
    );
    await db.exec("set local role anon");
    expect(await json("public.list_public_disputes(null)")).toMatchObject([
      { disputeId: id(3) },
    ]);
    expect(
      publicStandingsSourceSchema.safeParse(
        await json("public.get_public_standings($1)", [id(3)]),
      ).success,
    ).toBe(true);
    await db.exec(
      "select pg_temp.pu_error('select * from private.public_standings_versions', '42501');select pg_temp.pu_error('select private.public_standings_candidate(pg_temp.pu_id(3))','42501')",
    );
    await db.exec(
      `reset role;update public.admin_access set enabled=false;set local role authenticated;select pg_temp.pu_error('select public.confirm_public_standings(' || quote_literal('${JSON.stringify(c)}') || '::jsonb)', 'PT403')`,
    );
    await db.exec("rollback");
  } finally {
    await db.close();
  }
}, 20000);
