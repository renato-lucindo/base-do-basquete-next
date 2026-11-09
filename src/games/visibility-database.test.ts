import { afterAll, beforeAll, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import {
  gameVisibilityResultSchema,
  gameVisibilityStateSchema,
} from "./visibility-contract";

const id = (n: number) =>
  `f9200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let db: PGlite;

async function query<T = unknown>(expression: string, args: unknown[] = []): Promise<T> {
  const result = await db.query<{ value: T }>(`select ${expression} as value`, args);
  return result.rows[0].value;
}
async function auth() {
  await db.exec(`set local role authenticated;set local request.jwt.claim.sub='${id(98)}'`);
}
async function anon() {
  await db.exec("set local role anon");
}
async function reject(command: unknown, code: string) {
  await db.exec("savepoint rejected");
  await expect(query("public.save_game_visibility($1)", [command])).rejects.toMatchObject({ code });
  await db.exec("rollback to savepoint rejected;release savepoint rejected");
}

beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(platform);
  for (const file of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  const seed = await readFile("supabase/tests/publication.sql", "utf8");
  await db.exec(seed.slice(0, seed.indexOf("set local role anon;")));
  await auth();
}, 30000);
afterAll(async () => { await db?.close(); });

it("reversibly hides an already published semifinal without deleting its facts, with versioned audit", async () => {
  await db.exec("savepoint visibility_case");
  try {
    await auth();
    await query("public.finalize_sheet_game(pg_temp.pu_command())");
    const before = gameVisibilityStateSchema.parse(
      await query("public.get_game_visibility($1)", [id(8)]),
    );
    expect(before).toMatchObject({
      gameId: id(8),
      visibility: "published",
      version: 0,
      publicationVersion: 1,
    });
    const command = {
      commandId: id(9200),
      gameId: id(8),
      expectedVersion: before.version,
      expectedGameVersion: before.gameVersion,
      expectedPublicationVersion: before.publicationVersion,
      visibility: "draft",
      reason: "Semifinal registrada antes de completar a fase classificatória",
    };
    const ack = gameVisibilityResultSchema.parse(
      await query("public.save_game_visibility($1)", [command]),
    );
    expect(ack).toMatchObject({ gameId: id(8), visibility: "draft", version: 1 });
    expect(await query("public.save_game_visibility($1)", [command])).toEqual(ack);
    await reject({ ...command, commandId: id(9201) }, "PT409");
    await reject({ ...command, visibility: "published" }, "PT409");
    expect(gameVisibilityStateSchema.parse(await query("public.get_game_visibility($1)", [id(8)])).visibility).toBe("draft");
    await anon();
    expect(await query("public.get_public_game($1)", [id(8)])).toBeNull();
    expect(await query<number>("(select count(*)::int from public.published_games where game_id=$1)", [id(8)])).toBe(0);
    const source = await query<{ games: unknown[]; publishedGames: unknown[] }>(
      "public.get_live_competition_source($1)", [id(3)],
    );
    expect(source.games).toHaveLength(0);
    expect(source.publishedGames).toHaveLength(0);
    await db.exec("reset role");
    expect(await query<number>("(select count(*)::int from public.published_games where game_id=$1)", [id(8)])).toBe(1);
    expect(await query<number>("(select count(*)::int from private.game_visibility_versions where game_id=$1)", [id(8)])).toBe(1);
    await auth();
    const state = gameVisibilityStateSchema.parse(
      await query("public.get_game_visibility($1)", [id(8)]),
    );
    expect(state.version).toBe(1);
    const restore = {
      ...command,
      commandId: id(9202),
      expectedVersion: 1,
      visibility: "published",
      reason: "Classificatória concluída e confrontos confirmados",
    };
    expect(gameVisibilityResultSchema.parse(
      await query("public.save_game_visibility($1)", [restore]),
    ).visibility).toBe("published");
    await anon();
    expect(await query("public.get_public_game($1)", [id(8)])).not.toBeNull();
    await db.exec("reset role");
    expect(await query<number>("(select count(*)::int from private.game_visibility_versions where game_id=$1)", [id(8)])).toBe(2);
  } finally {
    await db.exec("rollback to savepoint visibility_case;release savepoint visibility_case");
  }
});

it("denies draft controls to anonymous callers and non-administrators", async () => {
  await db.exec("savepoint visibility_auth");
  try {
    await anon();
    await expect(query("public.get_game_visibility($1)", [id(8)])).rejects.toMatchObject({ code: "42501" });
    await auth();
    await db.exec(`set local request.jwt.claim.sub='${id(99)}'`);
    await expect(query("public.get_game_visibility($1)", [id(8)])).rejects.toMatchObject({ code: "PT403" });
  } finally {
    await db.exec("rollback to savepoint visibility_auth;release savepoint visibility_auth");
  }
}, 10000);
