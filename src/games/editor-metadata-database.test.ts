import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { platform } from "../../tests/fixtures/database-platform";
import { emptyOfficiating } from "./officiating-contract";
import { gameSchema } from "./contract";

it.each(["zero", "upgrade"])(
  "game editor metadata stays administrative and compatible (%s)",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const files = (await readdir("supabase/migrations"))
        .filter((f) => f.endsWith(".sql"))
        .sort();
      const added = files.find((f) => f.endsWith("_game_editor_metadata.sql"))!;
      for (const file of files.filter((f) => mode === "zero" || f !== added))
        await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
      await db.exec(
        "insert into auth.users(id) values('fd500000-0000-4000-8000-000000000098');insert into public.admin_access(user_id) values('fd500000-0000-4000-8000-000000000098')",
      );
      const fixture = (
        await readFile("supabase/tests/game_venues.sql", "utf8")
      ).split("-- VENUE_ASSERTIONS")[0];
      await db.exec(fixture);
      await db.exec(
        "set local request.jwt.claim.sub='fd500000-0000-4000-8000-000000000098'; set local role authenticated;",
      );
      const legacy = {
        commandId: crypto.randomUUID(),
        expectedVersion: 0,
        game: {
          id: crypto.randomUUID(),
          disputeId: "fd500000-0000-4000-8000-000000000092",
          homeRegistrationId: "fd500000-0000-4000-8000-000000000095",
          awayRegistrationId: "fd500000-0000-4000-8000-000000000096",
          date: null,
          time: null,
          venue: null,
          number: null,
        },
      };
      const legacyReceipt = await db.query(
        "select public.save_game($1::jsonb) receipt",
        [JSON.stringify(legacy)],
      );
      await db.exec("reset role");
      if (mode === "upgrade")
        await db.exec(await readFile(`supabase/migrations/${added}`, "utf8"));
      await db.exec("set local role authenticated");
      expect(
        (
          await db.query("select public.save_game($1::jsonb) receipt", [
            JSON.stringify(legacy),
          ])
        ).rows,
      ).toEqual(legacyReceipt.rows);
      const get = async (id: string) =>
        (
          await db.query<{ game: Record<string, unknown> }>(
            "select public.get_game($1::uuid) game",
            [id],
          )
        ).rows[0].game;
      expect(await get(legacy.game.id)).toMatchObject({
        stageKind: "round_robin",
        round: null,
        knockoutStage: null,
      });
      const command = {
        commandId: crypto.randomUUID(),
        expectedVersion: 1,
        game: {
          ...legacy.game,
          stageKind: "knockout",
          round: 3,
          knockoutStage: "  Semifinal  ",
          startAt: null,
          endAt: null,
        },
        officiating: emptyOfficiating(),
      };
      const save = (c: unknown) =>
        db.query("select public.save_game_editor($1::jsonb) receipt", [
          JSON.stringify(c),
        ]);
      const ack = await save(command);
      expect((await save(command)).rows).toEqual(ack.rows);
      expect(await get(command.game.id)).toMatchObject({
        stageKind: "knockout",
        round: 3,
        knockoutStage: "Semifinal",
        version: 2,
      });
      // A legacy edit must not erase metadata added by a newer client.
      await db.query("select public.save_game($1::jsonb)", [
        JSON.stringify({
          ...legacy,
          commandId: crypto.randomUUID(),
          expectedVersion: 2,
        }),
      ]);
      expect(await get(command.game.id)).toMatchObject({
        stageKind: "knockout",
        round: 3,
        knockoutStage: "Semifinal",
        version: 3,
      });
      expect(
        (
          await db.query<{ result: { items: unknown[] } }>(
            "select public.list_game_rounds($1,'',0) result",
            [legacy.game.disputeId],
          )
        ).rows[0].result.items,
      ).toEqual([{ round: 3 }]);
      expect(
        (
          await db.query<{ result: { items: unknown[] } }>(
            "select public.list_game_rounds($1,'',0) result",
            [crypto.randomUUID()],
          )
        ).rows[0].result.items,
      ).toEqual([]);
      for (const fields of [
        { round: 0 },
        { round: -1 },
        { round: 1.5 },
        { round: 2147483648 },
        { stageKind: "regular" },
        { stageKind: "round_robin", knockoutStage: "Final" },
        { knockoutStage: "\nFinal" },
        { knockoutStage: "x".repeat(101) },
      ]) {
        const game = { ...command.game, ...fields };
        expect(gameSchema.safeParse(game).success).toBe(false);
        await db.exec("savepoint invalid_metadata");
        await expect(
          save({
            ...command,
            commandId: crypto.randomUUID(),
            expectedVersion: 3,
            game,
          }),
        ).rejects.toMatchObject({ code: "PT400" });
        await db.exec(
          "rollback to savepoint invalid_metadata;release savepoint invalid_metadata",
        );
        expect((await get(command.game.id)).version).toBe(3);
      }
      await db.exec("reset role");
      expect(
        (await db.query("select count(*)::int n from public.published_games"))
          .rows,
      ).toEqual([{ n: 0 }]);
      expect(
        (
          await db.query(
            "select has_function_privilege('anon','public.list_game_rounds(uuid,text,integer)','execute') allowed",
          )
        ).rows,
      ).toEqual([{ allowed: false }]);
      await db.exec(
        "set local role authenticated;set local request.jwt.claim.sub='fd500000-0000-4000-8000-000000000097'",
      );
      expect(
        (
          await db.query<{ result: { items: unknown[] } }>(
            "select public.list_game_rounds($1,'',0) result",
            [legacy.game.disputeId],
          )
        ).rows[0].result.items,
      ).toEqual([]);
    } finally {
      await db.close();
    }
  },
  20000,
);
