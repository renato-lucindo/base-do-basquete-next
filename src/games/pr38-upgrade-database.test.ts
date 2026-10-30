import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";

it("rehearses PR38 after the remote baseline, rolls DDL back and preserves v1 publications", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    const pending = [
      "20261029221031_roster_reuse_context.sql",
      "20261029221048_roster_reuse_write.sql",
      "20261029221056_sheet_staff_v2.sql",
    ];
    const names = (await readdir("supabase/migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (const name of names.filter(
      (name) => !pending.includes(name) && name < "20261030140000",
    ))
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
    for (const name of [
      "20261030140000_sheet_timeouts.sql",
      "20261030141000_game_actual_times.sql",
    ])
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
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
        await db.query<{
          document: Record<string, unknown> & {
            events: unknown[];
            periods: number;
          };
        }>("select pg_temp.pu_doc() as document")
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
    // Exercise the seed-free remote checks inside this disposable fixture too.
    const remoteChecks = await readFile(
      "supabase/tests/pr38_remote_checks.sql",
      "utf8",
    );
    await db.exec(
      remoteChecks
        .replace(/^begin;$/mu, "savepoint remote_checks;")
        .replace(
          /^rollback;$/mu,
          "rollback to savepoint remote_checks; release savepoint remote_checks;",
        ),
    );
    expect((await historical()).rows).toEqual(before);
    // FUT-001: use the same v2 facts engine that publication and drafts invoke.
    const timeout = (side: "home" | "away", period: number, code: string) => ({
      id: crypto.randomUUID(),
      side,
      period,
      target: "TO",
      code,
    });
    const doc = (events: unknown[]) => ({
      ...draft,
      events: [...draft.events, ...events],
    });
    const timeoutFacts = (events: unknown[], periods = draft.periods) =>
      db.query<{
        facts: { teams: { home: { points: number; freeConceded: number } } };
      }>("select private.compute_sheet_facts_v2($1::jsonb) as facts", [
        JSON.stringify({ ...doc(events), periods }),
      ]);
    const validTimes = [
      timeout("home", 1, "1"),
      timeout("home", 2, "10"),
      timeout("away", 2, "6"),
      timeout("home", 3, "8"),
      timeout("home", 4, "9"),
      timeout("home", 4, "10"),
    ];
    const facts = (await timeoutFacts(validTimes)).rows[0].facts;
    expect(facts.teams.home.points).toBe(2);
    expect(facts.teams.home.freeConceded).toBe(0);
    const rejectTimeout = async (
      events: unknown[],
      periods = draft.periods,
      error = "invalid_sheet_timeout",
    ) => {
      await db.exec("savepoint invalid_timeout");
      try {
        await expect(timeoutFacts(events, periods)).rejects.toThrow(error);
      } finally {
        await db.exec("rollback to savepoint invalid_timeout");
        await db.exec("release savepoint invalid_timeout");
      }
    };
    await rejectTimeout([...validTimes, timeout("home", 1, "3")]);
    await rejectTimeout([...validTimes, timeout("home", 4, "7")]);
    await rejectTimeout([
      timeout("home", 4, "9"),
      timeout("home", 4, "9"),
      timeout("home", 4, "10"),
    ]);
    await rejectTimeout([timeout("home", 5, "6")], 5);
    await rejectTimeout([timeout("home", 1, "0")]);
    await rejectTimeout([timeout("home", 1, "11")]);
    await rejectTimeout(
      [{ ...timeout("home", 1, "4"), actorId: crypto.randomUUID() }],
      4,
      "invalid_sheet",
    );
    // Quarter-specific overtime allowance; no transfer between extra periods.
    const extra = {
      ...doc([timeout("home", 5, "5"), timeout("home", 6, "1")]),
      periods: 6,
    };
    await db.query("select private.compute_sheet_facts_v2($1::jsonb)", [
      JSON.stringify(extra),
    ]);
    await db.exec("savepoint invalid_overtime");
    try {
      await expect(
        db.query("select private.compute_sheet_facts_v2($1::jsonb)", [
          JSON.stringify({
            ...extra,
            events: [...extra.events, timeout("home", 5, "4")],
          }),
        ]),
      ).rejects.toThrow("invalid_sheet_timeout");
    } finally {
      await db.exec("rollback to savepoint invalid_overtime");
      await db.exec("release savepoint invalid_overtime");
    }

    // The actual timestamps must round-trip through the same editor RPC as the UI.
    await db.exec("set local role authenticated");
    await db.exec(
      "set local request.jwt.claim.sub='f9200000-0000-4000-8000-000000000098'",
    );
    const game = {
      id: "f9200000-0000-4000-8000-000000000009",
      disputeId: "f9200000-0000-4000-8000-000000000003",
      homeRegistrationId: "f9200000-0000-4000-8000-000000000005",
      awayRegistrationId: "f9200000-0000-4000-8000-000000000006",
      date: null,
      time: null,
      venue: null,
      number: null,
      startAt: "2026-10-30T23:15",
      endAt: "2026-10-31T00:50",
    };
    const officiating = Object.fromEntries(
      ["referee", "umpire1", "umpire2", "scorer", "timer", "shotClock"].map(
        (role) => [role, null],
      ),
    );
    const editorCommand = {
      commandId: "f9200000-0000-4000-8000-000000000901",
      expectedVersion: 1,
      game,
      officiating,
    };
    const savedGame = await db.query<{ result: { version: number } }>(
      "select public.save_game_editor($1::jsonb) as result",
      [JSON.stringify(editorCommand)],
    );
    expect(savedGame.rows[0].result.version).toBe(2);
    expect(
      (
        await db.query<{
          editor: { game: { startAt: string; endAt: string } };
        }>("select public.get_game_editor($1::uuid) as editor", [game.id])
      ).rows[0].editor.game,
    ).toMatchObject({ startAt: game.startAt, endAt: game.endAt });
    await db.exec("savepoint invalid_duration");
    try {
      await expect(
        db.query("select public.save_game_editor($1::jsonb)", [
          JSON.stringify({
            ...editorCommand,
            commandId: "f9200000-0000-4000-8000-000000000902",
            expectedVersion: 2,
            game: { ...game, endAt: "2026-10-30T23:00" },
          }),
        ]),
      ).rejects.toThrow("invalid_game_time");
    } finally {
      await db.exec("rollback to savepoint invalid_duration");
      await db.exec("release savepoint invalid_duration");
    }
    await db.exec("reset role");
    expect((await historical()).rows).toEqual(before);
    await db.exec("rollback");
  } finally {
    await db.close();
  }
}, 40000);
