import { expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import {
  publicPlayerProfileSchema,
  playerProfileProposalSchema,
  playerProfileStateSchema,
  playerProfileAckSchema,
  playerProfileVersionSchema,
  confirmPlayerProfileSchema,
} from "./contract";

it.each(["zero", "upgrade"] as const)(
  "confirma metadados sem expor cadastro privado no %s",
  async (mode) => {
    const db = await PGlite.create();
    try {
      await db.exec(platform);
      const names = (await readdir("supabase/migrations"))
        .filter((n) => n.endsWith(".sql"))
        .sort();
      const split = names.findIndex((n) =>
        n.endsWith("_player_profile_publications.sql"),
      );
      const index = split < 0 ? names.length : split;
      for (const n of names.slice(0, mode === "zero" ? names.length : index))
        await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
      const [seed, proof] = (
        await readFile("supabase/tests/player_profiles.sql", "utf8")
      ).split("-- APPLY PROFILE MIGRATION HERE");
      await db.exec(seed);
      const before = (
        await db.query("select * from public.persons order by id")
      ).rows;
      if (mode === "upgrade")
        for (const n of names.slice(index))
          await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
      expect(
        (await db.query("select * from public.persons order by id")).rows,
      ).toEqual(before);
      const rows = (
        await db.exec(proof.replace(/\nrollback;\s*$/u, "\n"))
      ).flatMap((r) => r.rows);
      const get = (key: string) => rows.find((r) => r[key])?.[key];
      const profile = publicPlayerProfileSchema.parse(
        get("public_player_profile"),
      );
      expect(profile.version).toBe(2);
      expect(profile.person.name).toBe("Ana depois da publicação");
      expect(profile.person.publicBirthYear).toBeNull();
      playerProfileProposalSchema.parse(get("profile_proposal"));
      playerProfileStateSchema.parse(get("empty_profile_state"));
      playerProfileStateSchema.parse(get("profile_state"));
      expect(
        playerProfileStateSchema.parse(get("profile_first_page")).history,
      ).toHaveLength(20);
      expect(
        playerProfileStateSchema.parse(get("profile_last_page")).history,
      ).toHaveLength(3);
      playerProfileVersionSchema.parse(get("profile_version"));
      playerProfileAckSchema.parse(get("profile_ack"));
      playerProfileAckSchema.parse(get("revised_profile_ack"));
      if (process.env.BDB_REAL_PROFILE_PROOF === "1" && mode === "zero") {
        const real = JSON.parse(
          await readFile(
            ".preview-artifacts/profile-p1-real-proof.json",
            "utf8",
          ),
        );
        expect(
          publicPlayerProfileSchema.parse(real.public_player_profile).version,
        ).toBe(2);
        playerProfileProposalSchema.parse(real.profile_proposal);
        playerProfileAckSchema.parse(real.profile_ack);
        playerProfileAckSchema.parse(real.revised_profile_ack);
        playerProfileStateSchema.parse(real.empty_profile_state);
        playerProfileStateSchema.parse(real.profile_state);
        expect(
          playerProfileStateSchema.parse(real.profile_first_page).history,
        ).toHaveLength(20);
        expect(
          playerProfileStateSchema.parse(real.profile_last_page).history,
        ).toHaveLength(3);
        playerProfileVersionSchema.parse(real.profile_version);
      }
      const base = {
        commandId: "f9400000-0000-4000-8000-000000000002",
        personId: "f9400000-0000-4000-8000-000000000001",
        expectedPersonVersion: 1,
        expectedPublicationVersion: 0,
        reason: "",
        acknowledgeImpact: true,
      };
      for (const extra of [
        {},
        { expectedPersonVersion: 0 },
        { expectedPersonVersion: 1.5 },
        { expectedPublicationVersion: -1 },
        { expectedPublicationVersion: 2147483647 },
        { expectedPublicationVersion: 1 },
        { expectedPublicationVersion: 1, reason: "🏀🏀🏀" },
        { reason: "🏀".repeat(1001) },
        { reason: "abc" },
        { reason: "ab" },
        { reason: "\u00a0Revisão\u00a0" },
        { person: {} },
        { acknowledgeImpact: false },
        { personId: "bad" },
      ]) {
        const c = { ...base, ...extra };
        const actual = (
          await db.query<{ ok: boolean }>(
            "select private.valid_player_profile_confirmation($1::jsonb) ok",
            [JSON.stringify(c)],
          )
        ).rows[0].ok;
        expect(actual, JSON.stringify(extra)).toBe(
          confirmPlayerProfileSchema.safeParse(c).success,
        );
      }
      for (const extra of [
        { name: "🏀".repeat(60) },
        { name: "🏀".repeat(61) },
        { biography: "🏀".repeat(2000) },
        { biography: "🏀".repeat(2001) },
        { publicBirthYear: 1997 },
        { publicBirthYear: 0 },
        { heightCm: null },
        { heightCm: 0 },
        { weightKg: 1001 },
        { dominantHand: "left" },
        { dominantHand: "unknown" },
        { birthDate: "1997-01-01" },
      ]) {
        const p = { ...profile.person, ...extra };
        const actual = (
          await db.query<{ ok: boolean }>(
            "select private.valid_profile_metadata($1::jsonb) ok",
            [JSON.stringify(p)],
          )
        ).rows[0].ok;
        expect(actual, JSON.stringify(extra)).toBe(
          publicPlayerProfileSchema.safeParse({ ...profile, person: p })
            .success,
        );
      }
      await db.exec("rollback;");
      expect(
        (await db.query("select count(*)::int n from public.persons")).rows,
      ).toEqual([{ n: 0 }]);
    } finally {
      await db.close();
    }
  },
  20000,
);
