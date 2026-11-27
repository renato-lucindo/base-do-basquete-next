import { afterEach, expect, it, vi } from "vitest";
import { loadTeamProfile } from "./loader";
import { teamStatisticsFixture } from "../../tests/fixtures/team-statistics";
import { pubId } from "../../tests/fixtures/publication";
import { teamProfileFixture } from "../../tests/fixtures/team-profile";
afterEach(() => vi.unstubAllGlobals());
it("monta duas inscrições da mesma equipe somente de fontes públicas", async () => {
  const source = teamStatisticsFixture();
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (raw: string) => {
    const u = new URL(raw, "https://public.example");
    calls.push(u.pathname);
    if (u.pathname === "/api/public/catalog")
      return Response.json({
        games: source.games.map(({ snapshot: g }) => ({
          id: g.id,
          disputeId: g.disputeId,
          context: g.context,
          game: g.game,
          score: {
            home: g.facts.teams.home.points,
            away: g.facts.teams.away.points,
          },
        })),
        next: null,
        disputes: [],
      });
    if (u.pathname.includes("dispute-status"))
      return Response.json("in_progress");
    if (u.pathname.includes("discovery"))
      return Response.json({
        query: u.searchParams.get("q"),
        type: "teams",
        entityId: pubId(9),
        page: 1,
        totalPages: 1,
        counts: { teams: 1, players: 0, competitions: 0 },
        results: [
          {
            kind: "teams",
            id: pubId(9),
            name: "Lobos",
            abbreviation: null,
            participations: [
              ...new Map(
                source.games.flatMap(({ snapshot: g }) =>
                  [g.game.home, g.game.away]
                    .filter((r) => r.team.id === pubId(9))
                    .map((r) => [
                      r.registrationId,
                      {
                        disputeId: g.disputeId,
                        context: g.context,
                        registrationId: r.registrationId,
                        name: r.name,
                        hasResults: true,
                      },
                    ]),
                ),
              ).values(),
            ],
          },
        ],
      });
    return Response.json({ message: "Não publicado" }, { status: 404 });
  });
  const data = await loadTeamProfile(
    pubId(9),
    new AbortController().signal,
    null,
  );
  expect(data.participations).toHaveLength(2);
  expect(new Set(data.participations.map((p) => p.registrationId)).size).toBe(
    2,
  );
  expect(data.honors).toEqual([]);
  expect(data.participations.every((p) => p.status === "in_progress")).toBe(
    true,
  );
  expect(calls.every((p) => p.startsWith("/api/public/"))).toBe(true);
});
it("não transforma uma falha do catálogo em perfil vazio", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({ message: "Indisponível" }, { status: 503 }),
  );
  await expect(
    loadTeamProfile(pubId(9), new AbortController().signal, null),
  ).rejects.toMatchObject({ status: 503 });
});
it("interrompe uma paginação vazia que anuncia outra página", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({ games: [], disputes: [], next: pubId(99) }),
  );
  await expect(
    loadTeamProfile(pubId(9), new AbortController().signal, null),
  ).rejects.toMatchObject({ status: 503 });
});
it("aceita a ausência de classificação como null, contrato real do leitor", async () => {
  const f = teamProfileFixture();
  vi.stubGlobal("fetch", async (raw: string) => {
    const u = new URL(raw, "https://test.example");
    if (u.pathname.includes("catalog")) return Response.json(f.catalog);
    if (u.pathname.includes("standings")) return Response.json(null);
    if (u.pathname.includes("dispute-status")) return Response.json("planned");
    return Response.json({ message: "Não publicado" }, { status: 404 });
  });
  const data = await loadTeamProfile(
    f.teamId,
    new AbortController().signal,
    f.source.disputeId,
  );
  expect(data.participations).toHaveLength(2);
  expect(data.participations[0].standings).toBeNull();
});
it("recusa catálogo contaminado de outra disputa na prévia", async () => {
  const f = teamProfileFixture();
  vi.stubGlobal("fetch", async () => Response.json(f.catalog));
  await expect(
    loadTeamProfile(f.teamId, new AbortController().signal, pubId(999)),
  ).rejects.toMatchObject({ status: 503 });
});
it("mantém a prévia em uma só disputa sem buscar identidade global ou sessão", async () => {
  const f = teamProfileFixture(),
    calls: string[] = [];
  vi.stubGlobal("fetch", async (raw: string) => {
    const u = new URL(raw, "https://test.example");
    calls.push(u.pathname + u.search);
    if (u.pathname.includes("catalog")) return Response.json(f.catalog);
    if (u.pathname.includes("standings")) return Response.json(f.standings);
    if (u.pathname.includes("dispute-status"))
      return Response.json("in_progress");
    return Response.json({ message: "Não publicado" }, { status: 404 });
  });
  const data = await loadTeamProfile(
    f.teamId,
    new AbortController().signal,
    f.source.disputeId,
  );
  expect(
    data.participations.every((p) => p.disputeId === f.source.disputeId),
  ).toBe(true);
  expect(calls.every((p) => p.includes(f.source.disputeId))).toBe(true);
});
it("retira do agregado uma inscrição recolhida enquanto o histórico era consultado", async () => {
  const f = teamProfileFixture();
  let count = 0;
  vi.stubGlobal("fetch", async (raw: string) => {
    const u = new URL(raw, "https://test.example");
    if (u.pathname.includes("catalog"))
      return Response.json(
        ++count === 1 ? f.catalog : { games: [], disputes: [], next: null },
      );
    if (u.pathname.includes("dispute-status")) return Response.json(null);
    return Response.json({ message: "Não publicado" }, { status: 404 });
  });
  await expect(
    loadTeamProfile(f.teamId, new AbortController().signal, f.source.disputeId),
  ).rejects.toMatchObject({ status: 404 });
});
