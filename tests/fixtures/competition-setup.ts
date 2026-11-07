import type { Page } from "@playwright/test";
import { gamesFixture } from "./games";
import { tid } from "./text-import";
import { regulationFixture, regulationId } from "./regulation";
import { SupabaseCompetitionSetups } from "../../src/regulation/setup-provider";
import {
  saveCompetitionSetupSchema,
  type CompetitionSetupView,
} from "../../src/regulation/setup-contract";
import type { CompetitionSetup } from "../../src/regulation/format";
export async function competitionSetupFixture(page: Page) {
  const f = await gamesFixture(page),
    raw = JSON.stringify(regulationFixture())
      .replaceAll(regulationId(90), tid(3))
      .replaceAll(regulationId(1), tid(5))
      .replaceAll(regulationId(2), tid(6))
      .replaceAll(regulationId(100), tid(8)),
    context = JSON.parse(raw).context;
  let document: CompetitionSetup | null = null,
    version = 0,
    loseAck = false;
  const attempts: unknown[] = [],
    receipts = new Map<string, unknown>();
  const freshContext = () => ({
    ...context,
    games: [
      ...new Map(
        [
          ...context.games,
          ...[...f.games.values()].map((g) => ({
            id: g.id,
            disputeId: g.disputeId,
            version: g.version,
            homeRegistrationId: g.homeRegistrationId,
            awayRegistrationId: g.awayRegistrationId,
          })),
        ].map((g) => [g.id, g]),
      ).values(),
    ],
  });
  const db = new SupabaseCompetitionSetups(
    { url: "https://db.example.test", key: "fixture" },
    async () =>
      Response.json({
        disputeId: tid(3),
        version,
        savedAt: version ? "2026-11-07T18:00:00Z" : null,
        document,
        legacyDefinition: null,
        legacyRegulationVersion: 0,
        context: freshContext(),
        contextFingerprint: "a".repeat(64),
        registrations: [...f.registrations.values()].map((r) => ({
          id: r.id,
          name: r.name,
          teamName: r.team.name,
        })),
        games: freshContext().games.map((g: { id: string }) => ({
          ...g,
          stageKind: "round_robin",
          number: "1",
          date: null,
        })),
        history: [],
      }),
  );
  await page.route("**/foundation.html", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        "<head>",
        '<head><meta name="bb-flexible-competition" content="true">',
      ),
    });
  });
  await page.route("**/api/competition-setups/**", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: await db.get("fixture", tid(3)) });
    const c = saveCompetitionSetupSchema.parse(route.request().postDataJSON());
    attempts.push(c);
    if (receipts.has(c.commandId))
      return route.fulfill({ json: receipts.get(c.commandId) });
    document = c.document;
    version++;
    const receipt = {
      commandId: c.commandId,
      disputeId: c.disputeId,
      version,
      savedAt: "2026-11-07T18:00:00Z",
    };
    receipts.set(c.commandId, receipt);
    if (loseAck) {
      loseAck = false;
      return route.fulfill({
        status: 503,
        json: {
          error: {
            code: "access_unavailable",
            message: "Envio não confirmado.",
          },
        },
      });
    }
    return route.fulfill({ json: receipt });
  });
  return {
    ...f,
    setupAttempts: attempts,
    getDocument: () => document,
    loseAck: () => {
      loseAck = true;
    },
    getView: () => db.get("fixture", tid(3)) as Promise<CompetitionSetupView>,
  };
}
