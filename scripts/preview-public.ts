import {
  searchFixtureHits,
  fixtureSearchPage,
} from "../tests/fixtures/public-search";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { statisticsSourceSchema } from "../src/statistics/source";
import {
  buildStatisticsPage,
  parseStatisticsQuery,
} from "../src/statistics/query";
import { buildTeamsPage } from "../src/team-statistics/domain";
import { buildTeamDetail } from "../src/team-statistics/detail";
import { parseTeamsQuery } from "../src/team-statistics/query-contract";
import { parseTeamDetailQuery } from "../src/team-statistics/detail-query";
import { normalizeConfirmedGame } from "../src/statistics/confirmed-facts";
import { buildPlayerProfile } from "../src/player-profile/domain";
import { parseProfileQuery } from "../src/player-profile/query-contract";
import { catalogGameSchema } from "../src/public-ui/catalog-contract";
import { pubId } from "../tests/fixtures/publication";
import { publicStandingsSourceSchema } from "../src/regulation/public-contract";
import { buildPublicStandings } from "../src/regulation/public";
import { publicGamesFixture } from "../tests/fixtures/public-games";
import { competitiveFactFromPublication } from "../src/regulation/standings";

const previewPort = Number(process.env.PUBLIC_PREVIEW_PORT ?? 5177);
const source = statisticsSourceSchema.parse(
  JSON.parse(await readFile("tests/fixtures/statistics-source.json", "utf8")),
);
// Preview fixtures only. This server never connects to a database or publishes data.
const sources = [
  source,
  ...[
    {
      id: pubId(90002),
      gender: "feminino",
      category: "Sub-14",
      division: null,
    },
    {
      id: pubId(90004),
      gender: "masculino",
      category: "Adulto",
      division: "Prata",
    },
  ].map((context, index) => {
    const clone = structuredClone(source);
    const registrationIds = new Map(
      [
        ...new Set(
          clone.games.flatMap(({ snapshot }) => [
            snapshot.game.home.registrationId,
            snapshot.game.away.registrationId,
          ]),
        ),
      ]
        .sort()
        .map((id, i) => [id, pubId(400000 + index * 100 + i)]),
    );
    clone.disputeId = context.id;
    clone.games.forEach(({ snapshot }, gameIndex) => {
      snapshot.id = pubId(100000 + index * 100 + gameIndex);
      snapshot.disputeId = context.id;
      for (const side of ["home", "away"] as const)
        snapshot.game[side].registrationId = registrationIds.get(
          snapshot.game[side].registrationId,
        )!;
      for (const player of snapshot.facts.players)
        player.registrationId = registrationIds.get(player.registrationId)!;
      Object.assign(snapshot.context, {
        gender: context.gender,
        category: context.category,
        division: context.division,
      });
    });
    return statisticsSourceSchema.parse(clone);
  }),
];
const games = sources.flatMap((s) => s.games.map((g) => g.snapshot));
const catalog = games
  .map((g) =>
    catalogGameSchema.parse({
      id: g.id,
      disputeId: g.disputeId,
      context: g.context,
      game: g.game,
      score: {
        home: g.facts.teams.home.points,
        away: g.facts.teams.away.points,
      },
    }),
  )
  .sort((a, b) => a.id.localeCompare(b.id));
const facts = sources.flatMap((s) =>
  s.games.flatMap(({ snapshot, phase }) =>
    normalizeConfirmedGame(snapshot).map((fact) => ({
      kind: "confirmed-player-game-v1" as const,
      statisticsVersion: s.version,
      minimumSeconds: s.minimumSeconds,
      fact: { ...fact, phase },
      game: snapshot.game,
    })),
  ),
);
const standings = sources.map((s, index) => {
  const gameSnapshots = s.games.map((g) => g.snapshot);
  const registrations = [
    ...new Map(
      gameSnapshots
        .flatMap((g) => [g.game.home, g.game.away])
        .map((r) => [
          r.registrationId,
          { id: r.registrationId, name: r.name, team: r.team },
        ]),
    ).values(),
  ];
  return publicStandingsSourceSchema.parse({
    schemaVersion: "public-standings-source-v1",
    disputeId: s.disputeId,
    publicationVersion: 1,
    regulationVersion: 1,
    publishedAt: s.confirmedAt,
    context: gameSnapshots[0].context,
    registrations,
    games: gameSnapshots.map((g) => ({
      id: g.id,
      disputeId: s.disputeId,
      version: g.gameVersion,
      homeRegistrationId: g.game.home.registrationId,
      awayRegistrationId: g.game.away.registrationId,
      date: g.game.date,
      time: g.game.time,
      timeZone: g.game.timeZone,
      venue: g.game.venue,
      number: g.game.number,
    })),
    publishedGames: gameSnapshots.map(competitiveFactFromPublication),
    occurrences: [],
    withdrawals: [],
    definition: {
      registrationIds: registrations.map((r) => r.id),
      occurrenceRules: { wo: null },
      groupPhases: [
        {
          phaseId: pubId(200000 + index),
          name: "Fase regular",
          rules: {
            format: "round_robin",
            points: { win: 2, loss: 1 },
            tieBreakers: ["wins", "point_difference", "points_for"],
          },
          groups: [
            {
              id: pubId(210000 + index),
              name: "Grupo único",
              registrationIds: registrations.map((r) => r.id),
              gameIds: gameSnapshots.map((g) => g.id),
            },
          ],
        },
      ],
      knockoutPhases: [],
      series: [],
    },
  });
});
const upcoming = structuredClone(standings[0]);
upcoming.disputeId = pubId(90006);
Object.assign(upcoming.context, {
  year: 2027,
  gender: "feminino",
  category: "Sub-18",
  division: null,
});
upcoming.publishedGames = [];
upcoming.games.forEach((g, i) => {
  g.id = pubId(300000 + i);
  g.disputeId = upcoming.disputeId;
  g.date = i ? null : "2027-01-15";
  g.time = null;
  g.venue = null;
});
upcoming.definition.groupPhases[0].groups[0].gameIds = upcoming.games.map(
  (g) => g.id,
);
standings.push(publicStandingsSourceSchema.parse(upcoming));
standings.push(publicStandingsSourceSchema.parse(publicGamesFixture()));
// Validate every scenario at startup instead of serving a plausible but invalid mock.
standings.forEach(buildPublicStandings);

const server = await createServer({
  configFile: "vite.foundation.config.ts",
  cacheDir: `.preview-artifacts/public-vite-cache-${previewPort}`,
  server: { host: "127.0.0.1", port: previewPort, strictPort: true },
  plugins: [
    {
      name: "public-fixture-preview",
      transformIndexHtml() {
        return [
          {
            tag: "aside",
            attrs: {
              role: "note",
              style:
                "font:13px/1.4 system-ui,sans-serif;padding:6px 16px;background:#eef5ff;color:#163d76;border-bottom:1px solid #c7d9ef",
            },
            children:
              "Preview local da reforma UI/UX · Dados fictícios de teste",
            injectTo: "body-prepend",
          },
        ];
      },
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          const url = new URL(
            req.url ?? "/",
            `http://127.0.0.1:${previewPort}`,
          );
          const json = (data: unknown, status = 200) => {
            res.statusCode = status;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.setHeader("Cache-Control", "no-store");
            res.end(JSON.stringify(data));
          };
          if (url.pathname === "/") {
            res.writeHead(302, { Location: "/publico.html" });
            res.end();
            return;
          }
          if (url.pathname === "/foundation.html") {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(
              '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Preview público</title><main style="font:16px system-ui;padding:24px"><h1>Preview público da reforma UI/UX</h1><p>A administração não está conectada neste preview com dados fictícios.</p><a href="/publico.html">Voltar às competições</a></main></html>',
            );
            return;
          }
          if (!url.pathname.startsWith("/api/")) {
            next();
            return;
          }
          if (req.method !== "GET") {
            json(
              {
                error: {
                  message: "Este preview aceita somente consultas de teste.",
                },
              },
              405,
            );
            return;
          }
          try {
            const p = url.searchParams,
              parts = url.pathname.split("/");
            if (url.pathname === "/api/public/catalog") {
              const rows = catalog.filter(
                (g) =>
                  (!p.get("disputeId") || g.disputeId === p.get("disputeId")) &&
                  (!p.get("after") || g.id > p.get("after")!),
              );
              json({
                games: rows.slice(0, 100),
                next: rows.length > 100 ? rows[99].id : null,
                disputes: p.get("after")
                  ? []
                  : standings
                      .filter(
                        (s) =>
                          !p.get("disputeId") ||
                          s.disputeId === p.get("disputeId"),
                      )
                      .map((s) => ({
                        disputeId: s.disputeId,
                        context: s.context,
                        registrations: s.registrations,
                      })),
              });
              return;
            }
            if (url.pathname === "/api/public/discovery") {
              const players = [
                ...new Map(
                  games
                    .flatMap((g) =>
                      g.facts.players.map((p) => ({
                        kind: "players" as const,
                        id: p.person.id,
                        name: p.person.name,
                        nickname: p.person.nickname,
                        disputeId: g.disputeId,
                      })),
                    )
                    .map((p) => [p.id, p]),
                ).values(),
              ];
              json(
                fixtureSearchPage(
                  searchFixtureHits(
                    catalog,
                    standings.map((s) => ({
                      disputeId: s.disputeId,
                      context: s.context,
                      registrations: s.registrations,
                    })),
                    players,
                  ),
                  p,
                ),
              );
              return;
            }
            if (url.pathname === "/api/public/search") {
              const normalize = (s: string) =>
                s
                  .normalize("NFD")
                  .replace(/\p{Diacritic}/gu, "")
                  .toLocaleLowerCase("pt-BR");
              const q = normalize(p.get("q") ?? "");
              const players = [
                ...new Map(
                  games
                    .flatMap((g) =>
                      g.facts.players.map((person) => ({
                        person: person.person,
                        disputeId: g.disputeId,
                      })),
                    )
                    .filter((r) =>
                      normalize(
                        r.person.name + " " + (r.person.nickname ?? ""),
                      ).includes(q),
                    )
                    .map((r) => [r.person.id + "/" + r.disputeId, r]),
                ).values(),
              ];
              json({
                players: players.slice(0, 100),
                hasMore: players.length > 100,
              });
              return;
            }
            if (parts[3] === "standings" && parts[4]) {
              const s = standings.find((s) => s.disputeId === parts[4]);
              json(s ? buildPublicStandings(s) : null);
              return;
            }
            if (parts[3] === "players" && parts[4]) {
              const personId = parts[4],
                participations = facts.filter(
                  (p) => p.fact.person.id === personId,
                );
              if (!participations.length) {
                json(
                  {
                    error: { message: "Atleta não encontrado neste preview." },
                  },
                  404,
                );
                return;
              }
              json(
                buildPlayerProfile(
                  {
                    kind: "confirmed-player-career-v1",
                    personId,
                    profile: null,
                    participations,
                    honors: [],
                    teamPlacements: [],
                  },
                  parseProfileQuery(p),
                ),
              );
              return;
            }
            if (parts[3] === "games" && parts[4]) {
              const g = games.find((g) => g.id === parts[4]);
              json(
                g ?? {
                  error: { message: "Jogo não encontrado neste preview." },
                },
                g ? 200 : 404,
              );
              return;
            }
            const selected = sources.find((s) => s.disputeId === parts[4]);
            if (selected && parts[3] === "statistics") {
              json(buildStatisticsPage(selected, parseStatisticsQuery(p)));
              return;
            }
            if (selected && parts[3] === "teams") {
              const data = parts[5]
                ? buildTeamDetail(
                    selected,
                    parts[5],
                    p.get("registrationId"),
                    parseTeamDetailQuery(p),
                  )
                : buildTeamsPage(selected, parseTeamsQuery(p));
              json(
                data ?? {
                  error: { message: "Equipe não encontrada neste preview." },
                },
                data ? 200 : 404,
              );
              return;
            }
            json(
              {
                error: {
                  message: "Consulta não disponível neste preview local.",
                },
              },
              404,
            );
          } catch (error) {
            console.error(
              error instanceof Error ? error.message : "Preview error",
            );
            json(
              {
                error: {
                  message: "Não foi possível preparar esta consulta de teste.",
                },
              },
              500,
            );
          }
        });
      },
    },
  ],
});
await server.listen();
console.log(
  `PUBLIC_PREVIEW_READY http://127.0.0.1:${previewPort}/publico.html`,
);
