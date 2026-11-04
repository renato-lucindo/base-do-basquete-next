import { expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { platform } from "../../tests/fixtures/database-platform";
import { discoveryPageSchema } from "./search-contract";

it("pesquisa todo escopo publicado antes do limite; normaliza Unicode, deduplica identidades e não lê cadastro privado", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(platform);
    for (const n of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${n}`, "utf8"));
    const search = async (
      q: string,
      type = "all",
      page = 1,
      entityId: string | null = null,
    ) =>
      discoveryPageSchema.parse(
        (
          await db.query<{ result: unknown }>(
            "select public.search_public_entities($1,$2,$3,$4) as result",
            [q, type, page, entityId],
          )
        ).rows[0].result,
      );
    await db.exec("set role anon");
    expect((await search("joao")).results).toEqual([]);
    await expect(
      db.query("select * from private.public_search_entities()"),
    ).rejects.toThrow();
    await db.exec("reset role");
    for (const file of ["publication", "regulation", "achievement_drafts"]) {
      await db.exec(
        (await readFile(`supabase/tests/${file}.sql`, "utf8")).replace(
          /\nrollback;\s*$/u,
          "\n",
        ),
      );
    }
    const career = await readFile("supabase/tests/player_career.sql", "utf8");
    await db.exec(
      career.slice(
        0,
        career.indexOf(
          "select public.save_achievement_draft(jsonb_set(pg_temp.ad_command(101",
        ),
      ),
    );
    await db.exec(`reset role;
   insert into public.persons(id,name,nickname) select pg_temp.pu_id(150000+i),case when i=1 then 'Álvaro' when i=66 then 'Zé Álvaro' when i=67 then 'João Independente' else 'Álvaro '||lpad(i::text,2,'0') end,case when i=67 then 'Águia' else null end from generate_series(1,67) i;
   insert into private.athletes(person_id,sex) select pg_temp.pu_id(150000+i),'male' from generate_series(1,67) i;
   update public.admin_access set enabled=true;
   set local role authenticated;select set_config('request.jwt.claim.sub',pg_temp.pu_id(98)::text,true);
   do $$begin for i in 1..67 loop perform public.confirm_player_profile(jsonb_build_object('commandId',pg_temp.pu_id(160000+i),'personId',pg_temp.pu_id(150000+i),'expectedPersonVersion',1,'expectedPublicationVersion',0,'reason','','acknowledgeImpact',true));end loop;end$$;
   reset role;update public.persons set name='Cadastro alterado e privado',version=version+1 where id=pg_temp.pu_id(150001);set local role anon;`);
    const first = await search("aLvArO");
    expect(first.counts.players).toBe(66);
    expect(first.results).toHaveLength(5);
    expect(first.results[0].name).toBe("Álvaro");
    const folded = await search("A\u0301LVARO");
    expect(folded.results).toEqual(first.results);
    expect(folded.counts).toEqual(first.counts);
    const last = await search("alvaro", "players", 4);
    expect(last.totalPages).toBe(4);
    expect(last.results).toHaveLength(6);
    expect(last.results.at(-1)?.name).toBe("Zé Álvaro");
    expect((await search("alvaro", "players", 999)).page).toBe(4);
    const nick = await search("AGUIA", "players");
    expect(nick.results.map((x) => x.name)).toContain("João Independente");
    expect((await search("Nome privado posterior")).results).toEqual([]);
    expect((await search("Cadastro alterado e privado")).results).toEqual([]);
    expect((await search("Cadastro privado sem publicação")).results).toEqual(
      [],
    );
    expect((await search("Perfil sem jogos", "players")).results).toHaveLength(
      1,
    );
    const publicTeam = (
      await db.query<{ name: string }>(
        "select snapshot#>>'{game,home,team,name}' name from public.published_games limit 1",
      )
    ).rows[0].name;
    const teams = await search(publicTeam, "teams");
    expect(teams.results.length).toBeGreaterThan(0);
    const team = teams.results[0];
    expect(team.kind).toBe("teams");
    if (team.kind === "teams") {
      expect(
        new Set(
          team.participations.map((x) => `${x.disputeId}/${x.registrationId}`),
        ).size,
      ).toBe(team.participations.length);
      expect((await search(publicTeam, "teams", 1, team.id)).results).toEqual([
        team,
      ]);
    }
    const comp = (
      await db.query<{ name: string }>(
        "select snapshot#>>'{context,name}' name from public.published_games limit 1",
      )
    ).rows[0].name;
    const comps = await search(comp, "competitions");
    expect(comps.results.length).toBeGreaterThan(0);
    const competition = comps.results.find((r) => r.kind === "competitions");
    if (competition?.kind === "competitions") {
      const d = competition.disputes[0].context,
        label = `${d.name} ${d.year} ${d.gender === "masculino" ? "Masculino" : "Feminino"} ${d.category}${d.division ? ` ${d.division}` : ""}`;
      const narrow = await search(label, "competitions");
      expect(narrow.results.map((r) => r.id)).toContain(competition.id);
      const found = narrow.results.find((r) => r.id === competition.id);
      if (found?.kind === "competitions" && competition.disputes.length === 1)
        expect(found.directDisputeId).toBe(competition.disputes[0].disputeId);
    }
    const serialized = JSON.stringify(await search("alvaro"));
    expect(serialized).not.toMatch(
      /birthDate|birth_date|actorId|federationRegistration|biography|version|reason/u,
    );
    const recipient = (
      await db.query<{ name: string }>(
        "select r->>'name' name from public.published_achievements a cross join lateral jsonb_array_elements(a.snapshot->'honors') h cross join lateral jsonb_array_elements(h->'athletes') r where r->>'personId'=pg_temp.pu_id(910)::text limit 1",
      )
    ).rows[0];
    expect(
      (await search(recipient.name, "players")).results.some((r) =>
        r.id.endsWith("000000000910"),
      ),
    ).toBe(true);
    await db.exec("set local role authenticated");
    await db.exec(
      career
        .slice(
          career.indexOf(
            "select public.save_achievement_draft(jsonb_set(pg_temp.ad_command(101",
          ),
        )
        .replace(/\nrollback;\s*$/u, "\n"),
    );
    await db.exec("set local role anon");
    expect(
      (await search(recipient.name, "players")).results.some((r) =>
        r.id.endsWith("000000000910"),
      ),
    ).toBe(false);
    for (const [query, type, page] of [
      ["a", "all", 1],
      ["ab", "private", 1],
      ["ab", "all", 0],
      ["ab\ncd", "all", 1],
    ] as const) {
      await db.query(
        "select pg_temp.pu_error(format('select public.search_public_entities(%L,%L,%s,null)', $1::text,$2::text,$3::integer),'PT400')",
        [query, type, page],
      );
    }
  } finally {
    await db.close();
  }
}, 20000);
