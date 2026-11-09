import { afterAll, beforeAll, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { publicStandingsSourceSchema } from "../regulation/public-contract";
import { buildPublicStandings } from "../regulation/public";
import {
  gameVisibilityResultSchema,
  gameVisibilityStateSchema,
} from "./visibility-contract";

const id = (n: number) =>
  `f9200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let db: PGlite;

async function query<T = unknown>(
  expression: string,
  args: unknown[] = [],
): Promise<T> {
  const result = await db.query<{ value: T }>(
    `select ${expression} as value`,
    args,
  );
  return result.rows[0].value;
}
async function auth() {
  await db.exec(
    `set local role authenticated;set local request.jwt.claim.sub='${id(98)}'`,
  );
}
async function anon() {
  await db.exec("set local role anon");
}
async function reject(command: unknown, code: string) {
  await db.exec("savepoint rejected");
  await expect(
    query("public.save_game_visibility($1)", [command]),
  ).rejects.toMatchObject({ code });
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
afterAll(async () => {
  await db?.close();
});

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
    expect(ack).toMatchObject({
      gameId: id(8),
      visibility: "draft",
      version: 1,
    });
    expect(await query("public.save_game_visibility($1)", [command])).toEqual(
      ack,
    );
    await reject({ ...command, commandId: id(9201) }, "PT409");
    await reject({ ...command, visibility: "published" }, "PT409");
    expect(
      gameVisibilityStateSchema.parse(
        await query("public.get_game_visibility($1)", [id(8)]),
      ).visibility,
    ).toBe("draft");
    await anon();
    expect(await query("public.get_public_game($1)", [id(8)])).toBeNull();
    expect(
      await query<number>(
        "(select count(*)::int from public.published_games where game_id=$1)",
        [id(8)],
      ),
    ).toBe(0);
    const source = await query<{ games: unknown[]; publishedGames: unknown[] }>(
      "public.get_live_competition_source($1)",
      [id(3)],
    );
    expect(source.games).toHaveLength(0);
    expect(source.publishedGames).toHaveLength(0);
    await db.exec("reset role");
    expect(
      await query<number>(
        "(select count(*)::int from public.published_games where game_id=$1)",
        [id(8)],
      ),
    ).toBe(1);
    expect(
      await query<number>(
        "(select count(*)::int from private.game_visibility_versions where game_id=$1)",
        [id(8)],
      ),
    ).toBe(1);
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
    expect(
      gameVisibilityResultSchema.parse(
        await query("public.save_game_visibility($1)", [restore]),
      ).visibility,
    ).toBe("published");
    await anon();
    expect(await query("public.get_public_game($1)", [id(8)])).not.toBeNull();
    await db.exec("reset role");
    expect(
      await query<number>(
        "(select count(*)::int from private.game_visibility_versions where game_id=$1)",
        [id(8)],
      ),
    ).toBe(2);
  } finally {
    await db.exec(
      "rollback to savepoint visibility_case;release savepoint visibility_case",
    );
  }
});

it("denies draft controls to anonymous callers and non-administrators", async () => {
  await db.exec("savepoint visibility_auth");
  try {
    await anon();
    await db.exec("savepoint anonymous_denial");
    await expect(
      query("public.get_game_visibility($1)", [id(8)]),
    ).rejects.toMatchObject({ code: "42501" });
    await db.exec(
      "rollback to savepoint anonymous_denial;release savepoint anonymous_denial",
    );
    await auth();
    await db.exec(`set local request.jwt.claim.sub='${id(99)}'`);
    await db.exec("savepoint unauthorized_denial");
    await expect(
      query("public.get_game_visibility($1)", [id(8)]),
    ).rejects.toMatchObject({ code: "PT403" });
    await db.exec(
      "rollback to savepoint unauthorized_denial;release savepoint unauthorized_denial",
    );
  } finally {
    await db.exec(
      "rollback to savepoint visibility_auth;release savepoint visibility_auth",
    );
  }
}, 10000);

// Regression: the principal Worker uses the legacy read RPC rather than the
// flexible-competition endpoint. A private semifinal cannot blank its table.
it("legacy published standings keep remaining group results when a published semifinal is private", async () => {
  await db.exec("savepoint legacy_draft_projection");
  try {
    await auth();
    const state = await query<{ contextFingerprint: string }>(
      "public.get_regulation_state($1,0)",
      [id(3)],
    );
    await query("public.save_regulation($1)", [
      {
        commandId: id(9600),
        disputeId: id(3),
        expectedVersion: 0,
        expectedContextFingerprint: state.contextFingerprint,
        definition: {
          registrationIds: [id(5), id(6)],
          occurrenceRules: { wo: null },
          groupPhases: [
            {
              phaseId: id(9610),
              name: "Classificatória",
              rules: {
                format: "round_robin",
                points: { win: 2, loss: 1 },
                tieBreakers: ["point_difference"],
              },
              groups: [
                {
                  id: id(9611),
                  name: "Grupo A",
                  registrationIds: [id(5), id(6)],
                  gameIds: [id(9)],
                },
              ],
            },
          ],
          knockoutPhases: [{ id: id(9620), name: "Semifinal" }],
          series: [
            {
              id: id(9621),
              phaseId: id(9620),
              name: "Semifinal 1",
              format: "single",
              home: { kind: "registration", registrationId: id(5) },
              away: { kind: "registration", registrationId: id(6) },
              games: [{ slot: 1, gameId: id(8) }],
            },
          ],
        },
        reason: "",
        acknowledgeImpact: false,
      },
    ]);
    const preview = await query<{ fingerprint: string }>(
      "public.preview_public_standings($1)",
      [id(3)],
    );
    await query("public.confirm_public_standings($1)", [
      {
        commandId: id(9601),
        disputeId: id(3),
        expectedPublicationVersion: 0,
        fingerprint: preview.fingerprint,
      },
    ]);
    await query("public.finalize_sheet_game(pg_temp.pu_command())");
    const otherCommand = await query<Record<string, unknown>>(
      "pg_temp.pu_command()",
    );
    await query("public.publish_sheet_game($1)", [
      { ...otherCommand, requestId: id(9602), gameId: id(9) },
    ]);
    await anon();
    const original = publicStandingsSourceSchema.parse(
      await query("public.get_public_standings($1)", [id(3)]),
    );
    expect(original.games.map((g) => g.id).sort()).toEqual([id(8), id(9)]);
    expect(original.publishedGames).toHaveLength(2);
    await auth();
    const visibility = gameVisibilityStateSchema.parse(
      await query("public.get_game_visibility($1)", [id(8)]),
    );
    const change = {
      commandId: id(9603),
      gameId: id(8),
      expectedVersion: visibility.version,
      expectedGameVersion: visibility.gameVersion,
      expectedPublicationVersion: visibility.publicationVersion,
      visibility: "draft",
      reason: "Semifinal antecipada, sem divulgação até concluir a fase anterior",
    };
    await query("public.save_game_visibility($1)", [change]);
    await anon();
    const filtered = publicStandingsSourceSchema.parse(
      await query("public.get_public_standings($1)", [id(3)]),
    );
    expect(filtered.games.map((g) => g.id)).toEqual([id(9)]);
    expect(filtered.publishedGames.map((g) => g.gameId)).toEqual([id(9)]);
    expect(filtered.definition.groupPhases[0].groups[0].gameIds).toEqual([
      id(9),
    ]);
    expect(filtered.definition.series[0].games).toEqual([]);
    const standings = buildPublicStandings(filtered);
    expect(
      standings.projection.groupPhases[0].groups[0].standings.rows.map(
        (row) => row.games,
      ),
    ).toEqual([1, 1]);
    expect(JSON.stringify(filtered)).not.toContain(id(8));
    await auth();
    await query("public.save_game_visibility($1)", [
      {
        ...change,
        commandId: id(9604),
        expectedVersion: 1,
        visibility: "published",
        reason: "Jogos de todas as fases revisados e publicação autorizada",
      },
    ]);
    await anon();
    expect(
      publicStandingsSourceSchema.parse(
        await query("public.get_public_standings($1)", [id(3)]),
      ),
    ).toEqual(original);
  } finally {
    await db.exec(
      "rollback to savepoint legacy_draft_projection;release savepoint legacy_draft_projection",
    );
  }
}, 20000);
