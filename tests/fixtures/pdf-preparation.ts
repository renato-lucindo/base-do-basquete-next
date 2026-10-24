import type { Page } from "@playwright/test";
import { pdfFixture } from "./pdf";
import { pdfPublicationFixture } from "./pdf-publication";
import { publishedSite } from "./published-game";
import { tid } from "./text-import";
import { publishPdfSchema } from "../../src/publication/pdf-contract";
import {
  savePreparationSchema,
  type Preparation,
} from "../../src/publication/preparation-contract";
export async function pdfPreparationFixture(page: Page) {
  const f = await pdfFixture(page),
    sample = await pdfPublicationFixture(),
    stamp = "2026-10-24T14:10:00Z";
  const source = {
    ...sample.review.source,
    id: tid(60),
    disputeId: tid(3),
    filename: "Boxscore-site.pdf",
  };
  const mappings = sample.review.document.mappings.map((m, i) => ({
    ...m,
    rosterEntryId: tid(500 + i),
  }));
  const review = {
    ...sample.review,
    source,
    document: {
      ...sample.review.document,
      disputeId: tid(3),
      gameId: tid(8),
      mappings,
    },
  };
  f.sources.set(source.id, source);
  f.reviews.set(source.id, review);
  const roster = mappings.map((m, i) => ({
    id: m.rosterEntryId!,
    registrationId: m.sourceSide === 0 ? tid(5) : tid(6),
    disputeId: tid(3),
    personId: tid(700 + i),
    jersey: m.jersey,
    active: true,
    version: 1,
    savedAt: stamp,
    startedAt: stamp,
    endedAt: null,
    person: {
      id: tid(700 + i),
      name: source.parsed.teams[m.sourceSide].players[m.sourceIndex].name,
      nickname: null,
      publicBirthYear: null,
    },
  }));
  await page.route(/\/api\/roster(\?|\/|$)/, (route) => {
    const u = new URL(route.request().url()),
      id = u.pathname.split("/")[3];
    return route.fulfill({
      json: id
        ? roster.find((r) => r.id === id)
        : {
            items: roster.filter(
              (r) => r.registrationId === u.searchParams.get("registrationId"),
            ),
            hasMore: false,
          },
    });
  });
  const staff = ["head", "assistant"].map((role, i) => ({
    id: tid(900 + i),
    personId: tid(910 + i),
    registrationId: tid(5),
    role,
    active: true,
    version: 1,
    savedAt: stamp,
    startedAt: stamp,
    endedAt: null,
    person: {
      id: tid(910 + i),
      name: i ? "Auxiliar Bia" : "Técnica Ana",
      nickname: null,
      publicBirthYear: null,
    },
  }));
  await page.route(/\/api\/staff(\?|\/|$)/, (route) =>
    route.fulfill({
      json: {
        items:
          new URL(route.request().url()).searchParams.get("registrationId") ===
          tid(5)
            ? staff
            : [],
        hasMore: false,
      },
    }),
  );
  await page.route(`**/api/games/${tid(8)}/sheet`, (route) =>
    route.fulfill({ json: null }),
  );
  let saved: Preparation | null = null,
    publicVersion = 0,
    lostSave = false,
    lostPublish = false,
    failedPublishedRead = false,
    expired = false;
  const saveAttempts: string[] = [],
    publishAttempts: string[] = [],
    receipts = new Map<string, unknown>();
  const template = await publishedSite();
  let projection: typeof template | null = null;
  await page.route(`**/api/games/${tid(8)}/publication`, (route) =>
    failedPublishedRead
      ? ((failedPublishedRead = false),
        route.fulfill({
          status: 503,
          json: {
            error: {
              code: "access_unavailable",
              message: "Leitura indisponível.",
            },
          },
        }))
      : route.fulfill({
          json: {
            gameId: tid(8),
            version: publicVersion,
            published: projection,
            history: [],
            hasMore: false,
            requiresFallback: true,
          },
        }),
  );
  await page.route(`**/api/pdf-sources/${source.id}/preparation`, (route) =>
    route.fulfill({ json: saved }),
  );
  await page.route(
    `**/api/games/${tid(8)}/publication/preparation/${source.id}`,
    async (route) => {
      const c = savePreparationSchema.parse(route.request().postDataJSON());
      saveAttempts.push(route.request().postData()!);
      if (!saved || saved.publication.requestId !== c.publication.requestId)
        saved = {
          sourceId: source.id,
          version: c.expectedVersion + 1,
          savedAt: stamp,
          publication: c.publication,
        };
      if (lostSave) {
        lostSave = false;
        return route.fulfill({
          status: 503,
          json: {
            error: {
              code: "access_unavailable",
              message: "Resposta não confirmada.",
            },
          },
        });
      }
      return route.fulfill({
        json: {
          sourceId: source.id,
          version: saved.version,
          requestId: c.publication.requestId,
        },
      });
    },
  );
  await page.route(`**/api/games/${tid(8)}/publication/pdf`, async (route) => {
    const c = publishPdfSchema.parse(route.request().postDataJSON());
    publishAttempts.push(route.request().postData()!);
    if (expired) {
      expired = false;
      return route.fulfill({
        status: 401,
        json: {
          error: { code: "invalid_session", message: "Entre novamente." },
        },
      });
    }
    if (receipts.has(c.requestId))
      return route.fulfill({ json: receipts.get(c.requestId) });
    const game = f.games.get(tid(8))!;
    if (
      c.basePublicationVersion !== publicVersion ||
      c.gameVersion !== game.version
    )
      return route.fulfill({
        status: 409,
        json: {
          error: {
            code: "version_conflict",
            message: "Outra aba alterou a publicação.",
          },
        },
      });
    publicVersion++;
    projection = {
      ...template,
      source: { ...template.source, version: 2 },
      id: game.id,
      disputeId: game.disputeId,
      version: publicVersion,
      gameVersion: game.version + 1,
      game: {
        ...template.game,
        home: { ...template.game.home, registrationId: game.home.id },
        away: { ...template.game.away, registrationId: game.away.id },
      },
      facts: {
        ...template.facts,
        origins: Object.fromEntries(
          Object.entries(template.facts.origins).map(([key, value]) => [
            key,
            value ? { ...value, version: 2 } : null,
          ]),
        ) as typeof template.facts.origins,
        players: template.facts.players.map((p) => ({
          ...p,
          registrationId: p.side === "home" ? game.home.id : game.away.id,
        })),
      },
    };
    f.games.set(game.id, {
      ...game,
      state: "finished",
      version: game.version + 1,
    });
    const ack = {
      requestId: c.requestId,
      gameId: game.id,
      gameVersion: game.version + 1,
      version: publicVersion,
      sourceVersion: 2,
      reviewVersion: review.version,
      publishedAt: stamp,
    };
    receipts.set(c.requestId, ack);
    if (lostPublish) {
      lostPublish = false;
      return route.fulfill({
        status: 503,
        json: {
          error: {
            code: "access_unavailable",
            message: "Resposta não confirmada.",
          },
        },
      });
    }
    return route.fulfill({ json: ack });
  });
  return {
    ...f,
    review,
    source,
    roster,
    staff,
    saveAttempts,
    publishAttempts,
    saved: () => saved,
    projection: () => projection,
    loseSave: () => {
      lostSave = true;
    },
    losePublish: () => {
      lostPublish = true;
    },
    expirePublish: () => {
      expired = true;
    },
    failPublishedRead: () => {
      failedPublishedRead = true;
    },
  };
}
