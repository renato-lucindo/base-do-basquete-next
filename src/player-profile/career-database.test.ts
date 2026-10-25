import { expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { playerCareerSourceSchema } from "./career-source";

it("fonte de carreira consulta só participação, perfil e honraria publicados da identidade", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const n of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
    for (const path of ["publication", "regulation", "achievement_drafts"])
      await db.exec(
        (await readFile(`supabase/tests/${path}.sql`, "utf8")).replace(
          /\nrollback;\s*$/u,
          "\n",
        ),
      );
    const rows = (
      await db.exec(await readFile("supabase/tests/player_career.sql", "utf8"))
    ).flatMap((r) => r.rows);
    const result = (k: string) =>
      playerCareerSourceSchema.parse(rows.find((r) => r[k])?.[k]);
    const career = result("player_career");
    expect(career.participations).toHaveLength(2);
    expect(career.honors).toHaveLength(1);
    expect(career.teamPlacements).toHaveLength(1);
    expect(career.profile).toBeNull();
    const recipient = result("recipient_without_games");
    expect(recipient.participations).toEqual([]);
    expect(recipient.teamPlacements).toEqual([]);
    expect(recipient.honors).toHaveLength(1);
    const profile = result("profile_without_games");
    expect(profile.profile?.person.name).toBe("Perfil sem jogos");
    expect(profile.participations).toEqual([]);
    expect(profile.honors).toEqual([]);
    expect(
      playerCareerSourceSchema.safeParse({
        ...career,
        personId: recipient.personId,
      }).success,
    ).toBe(false);
    expect(
      playerCareerSourceSchema.safeParse({
        ...career,
        participations: [...career.participations, career.participations[0]],
      }).success,
    ).toBe(false);
    expect(
      playerCareerSourceSchema.safeParse({
        ...career,
        athlete: { birthDate: "1997-01-01" },
      }).success,
    ).toBe(false);
    expect(
      playerCareerSourceSchema.safeParse({
        ...recipient,
        teamPlacements: career.teamPlacements,
      }).success,
    ).toBe(false);
    if (process.env.BDB_REAL_PLAYER_SOURCE === "1") {
      const real = JSON.parse(
        await readFile(
          ".preview-artifacts/profile-p2-real-sources.json",
          "utf8",
        ),
      );
      expect(real.lineage.projectionRows).toBe(11);
      expect(
        playerCareerSourceSchema.parse(real.lineage.source).participations,
      ).toHaveLength(1);
      expect(
        playerCareerSourceSchema.parse(real.career.player_career)
          .participations,
      ).toHaveLength(2);
      expect(
        playerCareerSourceSchema.parse(real.career.recipient_without_games)
          .honors,
      ).toHaveLength(1);
      expect(
        playerCareerSourceSchema.parse(real.career.profile_without_games)
          .participations,
      ).toEqual([]);
    }
  } finally {
    await db.close();
  }
}, 20000);
