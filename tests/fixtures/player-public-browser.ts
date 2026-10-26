import type { Page } from "@playwright/test";
import { playerCareerFixture } from "./player-career";
import { pubId } from "./publication";
import { emptyPerson } from "../../src/people/contract";
import { buildPlayerProfile } from "../../src/player-profile/domain";
import { parseProfileQuery } from "../../src/player-profile/query-contract";
export async function playerPublicFixture(
  page: Page,
  options: { long?: boolean; profileOnly?: boolean } = {},
) {
  const source = playerCareerFixture();
  const { athlete, coach, ...person } = emptyPerson(source.personId);
  void athlete;
  void coach;
  source.profile = {
    kind: "confirmed-player-profile-v1",
    personId: source.personId,
    version: 2,
    confirmedAt: "2027-04-01T12:00:00Z",
    person: {
      ...person,
      name: "Ana Pública",
      nickname: "AP",
      heightCm: 180,
      biography: "Trajetória confirmada.",
    },
  };
  const f = source.participations[0].fact;
  source.honors = [
    {
      disputeId: f.disputeId,
      context: f.context,
      version: 1,
      confirmedAt: "2027-03-01T12:00:00Z",
      honor: { id: pubId(999), title: "MVP da edição" },
      recipient: {
        personId: source.personId,
        name: "Ana na premiação",
        nickname: null,
        publicBirthYear: null,
      },
    },
  ];
  source.teamPlacements = [
    {
      disputeId: f.disputeId,
      context: f.context,
      version: 1,
      confirmedAt: "2027-03-01T12:00:00Z",
      position: 1,
      registration: {
        registrationId: f.registration.registrationId,
        teamId: f.registration.team.id,
        name: f.registration.name,
      },
    },
  ];
  if (options.long) {
    source.teamPlacements = [];
    source.participations = Array.from({ length: 25 }, (_, i) => {
      const p = structuredClone(source.participations[0]);
      p.fact.gameId = pubId(12000 + i);
      p.fact.registration.registrationId = pubId(13000 + i);
      p.fact.registration.name = `Inscrição ${String(i).padStart(2, "0")}`;
      p.game.home = structuredClone(p.fact.registration);
      return p;
    });
  }
  if (options.profileOnly) {
    source.participations = [];
    source.honors = [];
    source.teamPlacements = [];
  }
  const state = {
    failNext: false,
    missing: false,
    corrupt: false,
    delayNext: 0,
    sessionReads: 0,
    queries: [] as URLSearchParams[],
  };
  await page.route("**/api/session", (route) => {
    state.sessionReads++;
    return route.fulfill({
      status: 401,
      json: { error: { message: "login" } },
    });
  });
  await page.route("**/api/public/players/**", async (route) => {
    const url = new URL(route.request().url());
    state.queries.push(url.searchParams);
    const delay = state.delayNext;
    state.delayNext = 0;
    if (delay) await new Promise((r) => setTimeout(r, delay));
    if (state.failNext || state.missing) {
      const missing = state.missing;
      state.failNext = false;
      await route
        .fulfill({
          status: missing ? 404 : 503,
          json: {
            error: {
              message: missing
                ? "Perfil não publicado ou não encontrado."
                : "Não foi possível consultar. Tente novamente.",
            },
          },
        })
        .catch(() => undefined);
      return;
    }
    const result = buildPlayerProfile(
      source,
      parseProfileQuery(url.searchParams),
    );
    await route
      .fulfill({
        json: state.corrupt
          ? { ...result, privateValue: "do-not-display" }
          : result,
      })
      .catch(() => undefined);
  });
  return {
    source,
    state,
    url: `http://127.0.0.1:5174/atleta.html#${source.personId}`,
  };
}
