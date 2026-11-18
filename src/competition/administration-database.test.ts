import { afterAll, beforeAll, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";

const id = (n: number) =>
  "7d780000-0000-4000-8000-" + String(n).padStart(12, "0");
let db: PGlite;

beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(platform);
  for (const file of (await readdir("supabase/migrations")).sort())
    if (file.endsWith(".sql"))
      await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
  await db.query("insert into auth.users(id) values ($1)", [id(1)]);
  await db.query("insert into public.admin_access(user_id) values ($1)", [
    id(1),
  ]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id(1),
  ]);
}, 20_000);
afterAll(async () => db?.close());

function command(n: number, category = "Adulto", year = 2026, version = 0) {
  return {
    commandId: id(100 + n),
    expectedVersion: version,
    competition: {
      id: id(200),
      name: "Liga para validar administração",
      seasons: [
        {
          id: id(201),
          year,
          disputes: [
            {
              id: id(202),
              gender: "masculino",
              category,
              division: null,
            },
          ],
        },
      ],
    },
  };
}

it("allows identification changes before use and keeps the lock after removing an empty registration", async () => {
  await db.query("select public.save_competition($1)", [command(1)]);
  await db.query("select public.save_competition($1)", [
    command(2, "Sub-22", 2027, 1),
  ]);
  await db.query("insert into public.teams(id,name) values ($1,'Equipe')", [
    id(203),
  ]);
  await db.query(
    "insert into public.registrations(id,dispute_id,team_id,name) values ($1,$2,$3,'Equipe')",
    [id(204), id(202), id(203)],
  );
  await expect(
    db.query("select public.save_competition($1)", [
      command(3, "Adulto", 2027, 2),
    ]),
  ).rejects.toMatchObject({
    code: "PT409",
    message: "dispute_identity_locked",
  });
  await db.query("delete from public.registrations where id=$1", [id(204)]);
  await expect(
    db.query("select public.save_competition($1)", [
      command(4, "Sub-22", 2026, 2),
    ]),
  ).rejects.toMatchObject({ code: "PT409", message: "season_year_locked" });
  expect(
    (await db.query("select year from public.seasons where id=$1", [id(201)]))
      .rows,
  ).toEqual([{ year: 2027 }]);
});

it("lists a public dispute before content exists and removes the direct lookup when it becomes private", async () => {
  const c = command(21);
  c.competition.id = id(210);
  c.competition.seasons[0].id = id(211);
  c.competition.seasons[0].disputes[0].id = id(212);
  await db.query("select public.save_competition($1)", [c]);
  const catalogue = async () =>
    (
      await db.query<{ disputes: unknown }>(
        "select public.list_public_disputes($1) as disputes",
        [id(212)],
      )
    ).rows[0].disputes;
  expect(await catalogue()).toEqual([]);
  const publish = {
    commandId: id(213),
    disputeId: id(212),
    expectedVersion: 1,
    action: "set_visibility",
    visibility: "public",
    reason: null,
  };
  await db.query("select public.save_dispute_administration($1)", [publish]);
  expect(await catalogue()).toEqual([
    expect.objectContaining({
      disputeId: id(212),
      registrations: [],
    }),
  ]);
  await db.query("select public.save_dispute_administration($1)", [
    {
      ...publish,
      commandId: id(214),
      expectedVersion: 2,
      visibility: "private",
    },
  ]);
  expect(await catalogue()).toEqual([]);
});

it("starts with the first result, preserves it through cancellation, and requires reopening before changes", async () => {
  const fixture = await readFile("supabase/tests/publication.sql", "utf8");
  await db.exec(fixture.slice(0, fixture.indexOf("set local role anon;")));
  try {
    await db.exec(
      "update private.dispute_administration set visibility='private',was_public=false where dispute_id=pg_temp.pu_id(3)",
    );
    await db.exec(
      "set local role authenticated; select set_config('request.jwt.claim.sub',pg_temp.pu_id(98)::text,true)",
    );
    const status = async () =>
      (
        await db.query<{ value: string }>(
          "select public.get_dispute_administration(pg_temp.pu_id(1))->0->>'status' value",
        )
      ).rows[0].value;
    expect(await status()).toBe("planned");
    await db.exec("select public.publish_sheet_game(pg_temp.pu_command())");
    expect(await status()).toBe("in_progress");
    const administration = (
      n: number,
      expectedVersion: number,
      action: string,
      visibility: string | null = null,
    ) =>
      db.query(
        "select public.save_dispute_administration(jsonb_build_object('commandId',$1::uuid,'disputeId',pg_temp.pu_id(3),'expectedVersion',$2::int,'action',$3::text,'visibility',$4::text,'reason','Motivo de teste'))",
        [id(n), expectedVersion, action, visibility],
      );
    await db.exec("savepoint before_complete");
    await expect(administration(240, 2, "complete")).rejects.toMatchObject({
      code: "PT409",
      message: "dispute_pending_games",
    });
    await db.exec("rollback to savepoint before_complete");
    await administration(241, 2, "set_visibility", "public");
    await db.exec(`select public.save_competition_administration(jsonb_build_object(
      'commandId','${id(249)}','expectedVersion',1,
      'competition',jsonb_set(public.get_competition(pg_temp.pu_id(1))-array['version','savedAt'],'{name}',to_jsonb('Nome corrigido'::text)),
      'testDisputeIds','[]'::jsonb,'renameReason','Corrigir nome exibido'))`);
    await db.exec("set local role anon");
    expect(
      (
        await db.query(
          "select public.get_public_game(pg_temp.pu_id(8))#>>'{context,name}' name",
        )
      ).rows,
    ).toEqual([{ name: "Nome corrigido" }]);
    expect(
      (
        await db.query(
          "select public.get_player_career_source(pg_temp.pu_id(201))#>>'{participations,0,fact,context,name}' name",
        )
      ).rows,
    ).toEqual([{ name: "Nome corrigido" }]);
    await db.exec("set local role authenticated");
    await administration(242, 3, "cancel");
    expect(await status()).toBe("cancelled");
    await db.exec("savepoint before_correction");
    await expect(
      db.exec("select public.publish_sheet_game(pg_temp.pu_revision())"),
    ).rejects.toMatchObject({
      code: "PT409",
      message: "dispute_closed",
    });
    await db.exec("rollback to savepoint before_correction");
    await db.exec("set local role anon");
    expect(
      (
        await db.query(
          "select count(*)::int n from public.published_games where dispute_id=pg_temp.pu_id(3)",
        )
      ).rows,
    ).toEqual([{ n: 1 }]);
    await db.exec("set local role authenticated");
    await administration(243, 4, "set_visibility", "private");
    await db.exec("set local role anon");
    expect(
      (
        await db.query(
          "select count(*)::int n from public.published_games where dispute_id=pg_temp.pu_id(3)",
        )
      ).rows,
    ).toEqual([{ n: 0 }]);
    expect(
      (
        await db.query(
          "select public.get_public_game_detail(pg_temp.pu_id(8)) result",
        )
      ).rows,
    ).toEqual([{ result: null }]);
    await db.exec("set local role authenticated");
    await administration(244, 5, "reopen");
    expect(await status()).toBe("in_progress");
  } finally {
    await db.exec("rollback");
  }
});

it("exposes only the selected test in an authenticated preview and restores the normal readers", async () => {
  const c = command(31);
  c.competition.id = id(220);
  c.competition.seasons[0].id = id(221);
  c.competition.seasons[0].disputes[0].id = id(222);
  await db.query("select public.save_competition_administration($1)", [
    { ...c, testDisputeIds: [id(222)], renameReason: null },
  ]);
  await expect(
    db.query("select public.save_dispute_administration($1)", [
      {
        commandId: id(223),
        disputeId: id(222),
        expectedVersion: 1,
        action: "set_visibility",
        visibility: "public",
        reason: null,
      },
    ]),
  ).rejects.toMatchObject({ message: "test_dispute_private" });
  await db.exec("set role authenticated");
  try {
    const p = await db.query<{ result: unknown }>(
      "select public.read_test_dispute($1,'list_public_disputes',$2) result",
      [id(222), JSON.stringify({ p_dispute_id: null })],
    );
    expect(p.rows[0].result).toEqual([
      expect.objectContaining({ disputeId: id(222) }),
    ]);
    const normal = await db.query<{ result: unknown }>(
      "select public.list_public_disputes($1) result",
      [id(222)],
    );
    expect(normal.rows[0].result).toEqual([]);
    await expect(
      db.query(
        "select public.read_test_dispute($1,'list_public_disputes',$2)",
        [id(212), JSON.stringify({ p_dispute_id: null })],
      ),
    ).rejects.toMatchObject({ code: "PT404" });
  } finally {
    await db.exec("reset role");
  }
});

it("keeps interrupted published games and obsolete decisions pending until reviewed", async () => {
  const fixture = await readFile("supabase/tests/publication.sql", "utf8");
  await db.exec(fixture.slice(0, fixture.indexOf("set local role anon;")));
  try {
    const occurrences = await readFile(
      "supabase/tests/game_occurrences.sql",
      "utf8",
    );
    await db.exec(
      occurrences.slice(
        occurrences.indexOf("create function pg_temp.oc_command"),
        occurrences.indexOf("set local role anon;"),
      ),
    );
    await db.exec(
      "set local role authenticated; select set_config('request.jwt.claim.sub',pg_temp.pu_id(98)::text,true)",
    );
    await db.exec("select public.publish_sheet_game(pg_temp.pu_command())");
    await db.exec(`select public.save_game_occurrence(pg_temp.oc_command(20,0,'{"kind":"cancelled"}',pg_temp.pu_id(9)));
      select public.save_game_occurrence(pg_temp.oc_command(21,0,'{"kind":"interrupted"}'))`);
    const complete = (n: number) =>
      db.query(
        "select public.save_dispute_administration(jsonb_build_object('commandId',$1::uuid,'disputeId',pg_temp.pu_id(3),'expectedVersion',2,'action','complete','visibility',null,'reason',null)) result",
        [id(n)],
      );
    const expectPending = async (n: number) => {
      await db.exec("savepoint pending_occurrence");
      await expect(complete(n)).rejects.toMatchObject({
        code: "PT409",
        message: "dispute_pending_games",
        detail: expect.stringContaining("f9200000-0000-4000-8000-000000000008"),
      });
      await db.exec(
        "rollback to savepoint pending_occurrence;release savepoint pending_occurrence",
      );
    };
    await expectPending(250);
    await db.exec(
      `select public.save_game_occurrence(pg_temp.oc_command(22,1,'{"kind":"postponed"}'))`,
    );
    await expectPending(251);
    await db.exec(
      `select public.save_game_occurrence(pg_temp.oc_command(23,2,'{"kind":"cancelled"}'))`,
    );
    await db.exec(
      "reset role;update public.games set version=version+1 where id=pg_temp.pu_id(8);set local role authenticated",
    );
    await expectPending(252);
    await db.exec(
      "select public.save_game_occurrence(pg_temp.oc_command(24,3,'null'))",
    );
    expect((await complete(253)).rows).toEqual([
      { result: expect.objectContaining({ status: "completed" }) },
    ]);
  } finally {
    await db.exec("rollback");
  }
});
