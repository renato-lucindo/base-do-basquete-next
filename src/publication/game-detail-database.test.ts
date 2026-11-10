import { expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { publicGameSchema } from "./contract";
import { publicationSheet, pubId } from "../../tests/fixtures/publication";
import { withGameDetails } from "../../tests/fixtures/public-game-detail";
import {
  publishedSheet,
  publishedSite,
} from "../../tests/fixtures/published-game";

it("consulta somente a versão publicada, com recortes estritos e sem dados privados", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile("supabase/migrations/" + name, "utf8"));
    await db.exec(
      (await readFile("supabase/tests/publication.sql", "utf8")).replace(
        /\nrollback;\s*$/u,
        "\n",
      ),
    );
    const row = (
      await db.query<{ id: string }>(
        "select game_id id from public.published_games order by game_id limit 1",
      )
    ).rows[0];
    const read = async () =>
      (
        await db.query<{ value: unknown }>(
          "select public.get_public_game_detail($1::uuid) value",
          [row.id],
        )
      ).rows[0].value;
    const result = publicGameSchema.parse(await read());
    expect(result.details?.periods).toHaveLength(4);
    expect(
      result.details?.periods[0].players.every(
        (p) => p.played === true || p.played === false,
      ),
    ).toBe(true);
    expect(
      result.details?.periods[1].players.some((p) => p.played === null),
    ).toBe(true);
    expect(
      result.details?.periods
        .map((p) => p.teams.home.points)
        .reduce((a, b) => a + b, 0),
    ).toBe(result.facts.teams.home.points);
    const before = JSON.stringify(await read());
    await db.exec(
      "update public.game_sheets set document=jsonb_set(document,'{events}','[]'::jsonb) where game_id='" +
        row.id +
        "'",
    );
    expect(JSON.stringify(await read())).toBe(before);
    const d = publicationSheet();
    d.periods = 5;
    d.events = [];
    let id = 30000;
    const add = (
      side: "home" | "away",
      jersey: string,
      period: number,
      code: string,
    ) => d.events.push({ id: pubId(id++), side, target: jersey, period, code });
    add("home", "0", 1, "2");
    add("away", "0", 1, "2");
    add("home", "4", 5, "3");
    for (const period of [1, 2, 3, 4, 4]) add("home", "2", period, "P");
    add("away", "2", 2, "T1");
    add("away", "2", 4, "T1");
    add("away", "3", 1, "P");
    add("away", "3", 2, "P");
    add("away", "3", 3, "U2");
    add("away", "3", 4, "P");
    add("away", "3", 5, "U2");
    const expected = withGameDetails(d);
    const projected = (
      await db.query<{ value: unknown }>(
        "select private.public_game_period_detail($1::jsonb,$2::jsonb) value",
        [JSON.stringify(publishedSheet(d)), JSON.stringify(d)],
      )
    ).rows[0].value;
    expect(publicGameSchema.parse(projected)).toEqual(expected);
    expect(
      expected.details.periods[2].players.find(
        (p) => p.side === "away" && p.jersey === "2",
      )?.status,
    ).toBe("eligible");
    expect(
      expected.details.periods[3].players.find(
        (p) => p.side === "away" && p.jersey === "2",
      )?.status,
    ).toBe("GD");
    expect(
      expected.details.periods[4].players.find(
        (p) => p.side === "away" && p.jersey === "3",
      )?.status,
    ).toBe("GD");
    const pdf = await publishedSite();
    expect(
      (
        await db.query<{ value: { details: unknown } }>(
          "select private.public_game_period_detail($1::jsonb,null) value",
          [JSON.stringify(pdf)],
        )
      ).rows[0].value.details,
    ).toBeNull();
    await db.exec("update public.admin_access set enabled=true");
    const roster = (
      await db.query<{
        value: { items: { jersey: string | null }[] };
      }>("select public.list_roster($1::uuid) value", [
        result.game.home.registrationId,
      ])
    ).rows[0].value.items.map((r) => r.jersey);
    expect(roster.at(-1)).toBe("00");
    await db.exec("set local role anon");
    expect(publicGameSchema.parse(await read())).toEqual(result);
    expect(
      (
        await db.query<{ value: unknown }>(
          "select public.get_public_game_detail('fd000000-0000-4000-8000-000000009999') value",
        )
      ).rows[0].value,
    ).toBeNull();
    expect(JSON.stringify(result.details)).not.toMatch(
      /rosterEntryId|published_by|reason|actorId|document/u,
    );
    await db.exec("rollback");
  } finally {
    await db.close();
  }
}, 20000);
