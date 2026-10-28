import { expect, it } from "vitest";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { normalizeConfirmedGame } from "../statistics/confirmed-facts";
import {
  confirmedManualFixture,
  confirmedPdfFixture,
} from "../../tests/fixtures/statistics-publications";
import { pdfPublicationFixtures } from "../../tests/fixtures/pdf-publication";
import { confirmedPlayerGameSchema } from "./participation-contract";

it("SQL e TS preservam a mesma participação confirmada nos quatro PDFs e súmula", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    const inputs = [
      confirmedManualFixture(true),
      ...(await Promise.all(
        pdfPublicationFixtures.map((file) => confirmedPdfFixture(file)),
      )),
    ];
    const mixed = structuredClone(inputs[1]);
    if (!("origins" in mixed.facts)) throw Error("PDF fixture required");
    const scorer = mixed.facts.players.find(
      (p) => p.played && p.side === "home",
    )!;
    const delta = Math.max(
      1,
      mixed.facts.teams.away.points - mixed.facts.teams.home.points + 1,
    );
    scorer.points += delta;
    scorer.free += delta;
    mixed.facts.teams.home.points += delta;
    mixed.facts.origins.scorePoints = { kind: "sheet", version: 3 };
    inputs.push(mixed);
    if (process.env.BDB_EXPORT_PLAYER_PARTICIPATIONS === "1") {
      await writeFile(
        ".preview-artifacts/player-normalization-matrix.json",
        JSON.stringify(
          inputs.map((input) => ({
            input,
            expected: normalizeConfirmedGame(input).map((fact) => ({
              kind: "confirmed-player-game-v1",
              statisticsVersion: 9,
              minimumSeconds: 600,
              game: input.game,
              fact,
            })),
          })),
        ),
      );
    }
    for (const input of inputs) {
      const actual = (
        await db.query<{ rows: unknown[] }>(
          "select private.normalize_player_publication($1::jsonb,9,600,null) rows",
          [JSON.stringify(input)],
        )
      ).rows[0].rows;
      const expected = normalizeConfirmedGame(input).map((fact) => ({
        kind: "confirmed-player-game-v1",
        statisticsVersion: 9,
        minimumSeconds: 600,
        game: input.game,
        fact,
      }));
      expect(actual).toEqual(expected);
      for (const row of actual) confirmedPlayerGameSchema.parse(row);
    }
    const manual = inputs[0],
      facts = normalizeConfirmedGame(manual);
    expect(facts.some((p) => !p.played && p.scoring === null)).toBe(true);
    expect(facts.some((p) => p.played && p.scoring?.points === 0)).toBe(true);
    expect(facts.some((p) => p.jersey === "0")).toBe(true);
    expect(facts.some((p) => p.jersey === "00")).toBe(true);
    const row = {
      kind: "confirmed-player-game-v1",
      statisticsVersion: 9,
      minimumSeconds: 600,
      game: manual.game,
      fact: facts[0],
    };
    expect(
      confirmedPlayerGameSchema.safeParse({
        ...row,
        game: {
          ...manual.game,
          home: manual.game.away,
          away: manual.game.home,
        },
      }).success,
    ).toBe(false);
    for (const [stats, min, phase] of [
      [0, 600, null],
      [1, 0, null],
      [1, 600, "final"],
    ]) {
      await expect(
        db.query(
          "select private.normalize_player_publication($1::jsonb,$2::integer,$3::integer,$4::text)",
          [JSON.stringify(manual), stats, min, phase],
        ),
      ).rejects.toMatchObject({ code: "PT400" });
    }
    const duplicate = structuredClone(manual);
    duplicate.facts.players[1].person.id =
      duplicate.facts.players[0].person.id.toUpperCase();
    await expect(
      db.query(
        "select private.normalize_player_publication($1::jsonb,1,600,null)",
        [JSON.stringify(duplicate)],
      ),
    ).rejects.toMatchObject({ code: "PT400" });
    const leaked = structuredClone(manual);
    Object.assign(leaked.facts.players[0].person, { birthDate: "1997-01-01" });
    await expect(
      db.query(
        "select private.normalize_player_publication($1::jsonb,1,600,null)",
        [JSON.stringify(leaked)],
      ),
    ).rejects.toMatchObject({ code: "PT400" });
    const known = (
      await db.query<{ rows: unknown[] }>(
        "select private.normalize_player_publication($1::jsonb,10,700,'knockout') rows",
        [JSON.stringify(manual)],
      )
    ).rows[0].rows;
    expect(confirmedPlayerGameSchema.parse(known[0]).fact.phase).toBe(
      "knockout",
    );
    expect(confirmedPlayerGameSchema.parse(known[0]).minimumSeconds).toBe(700);
    expect(
      confirmedPlayerGameSchema.safeParse({ ...row, birthDate: "1997-01-01" })
        .success,
    ).toBe(false);
  } finally {
    await db.close();
  }
}, 20000);
