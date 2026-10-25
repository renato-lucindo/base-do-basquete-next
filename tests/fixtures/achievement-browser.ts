import type { Page } from "@playwright/test";
import { regulationBrowserFixture } from "./regulation-browser";
import { achievementBackendFixture } from "./achievement-backend";
import {
  achievementOutbound,
  type AchievementOutboundOptions,
} from "./achievement-outbound.mjs";
import { SupabaseAchievements } from "../../src/achievements/provider";
import { HttpError } from "../../src/server/http";
import { tid } from "./text-import";
export async function achievementBrowserFixture(
  page: Page,
  config: { series?: boolean } = {},
) {
  const base = await regulationBrowserFixture(page),
    raw = achievementBackendFixture(),
    f = {
      ...(JSON.parse(
        JSON.stringify(raw)
          .replaceAll(raw.id(90), tid(3))
          .replaceAll(raw.id(1), tid(5))
          .replaceAll(raw.id(2), tid(6)),
      ) as Omit<ReturnType<typeof achievementBackendFixture>, "id">),
      id: raw.id,
    };
  f.source.scope = {
    ...f.source.scope,
    championshipId: tid(1),
    seasonId: tid(2),
    name: "Liga de teste",
    gender: "feminino",
  };
  f.workspace.scope = f.source.scope;
  f.publicValue.context = f.source.scope;
  for (const r of [...f.source.registrations, ...f.workspace.registrations])
    r.name = r.id === tid(5) ? "Lobos" : "Lobos B";
  if (config.series) {
    const reg = f.source.regulation;
    reg.definition!.knockoutPhases = [{ id: f.id(30), name: "Finais" }];
    reg.definition!.series = [
      {
        id: f.id(20),
        phaseId: f.id(30),
        name: "Final escolhida",
        format: "single",
        home: { kind: "registration", registrationId: tid(5) },
        away: { kind: "registration", registrationId: tid(6) },
        games: [{ slot: 1, gameId: f.id(101) }],
      },
    ];
    reg.context.games.push({ ...reg.context.games[0], id: f.id(101) });
    reg.context.publishedGames.push({
      ...reg.context.publishedGames[0],
      gameId: f.id(101),
    });
    f.workspace.sourceOptions.series = [
      { id: f.id(20), name: "Final escolhida", format: "single" },
    ];
  }
  Object.assign(base.getState(), f.source.regulation);
  const options: AchievementOutboundOptions = {},
    backend = achievementOutbound(options, f),
    db = new SupabaseAchievements(
      { url: "https://db.example.test", key: "fixture-publishable" },
      async (url, init) => {
        const r = await backend(new Request(url, init));
        if (!r) throw Error("Unmapped RPC");
        return new Response(await r.text(), {
          status: r.status,
          headers: [...r.headers],
        });
      },
    );
  const attempts: { path: string; body: unknown }[] = [],
    reads: string[] = [];
  let expired = false,
    candidateCount = 0,
    failAfterMutation = false,
    readUnavailable = false;
  async function attach(target: Page) {
    await target.route(/\/api\/(?:public\/)?achievements\//, async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        parts = url.pathname.split("/"),
        isPublic = parts[2] === "public",
        tail = isPublic ? "" : parts.slice(4).join("/");
      try {
        if (expired && !isPublic)
          throw new HttpError(401, "invalid_session", "Sua sessão terminou.");
        let value: unknown;
        if (isPublic) {
          value = await db.getPublic(tid(3));
          if (value === null)
            throw new HttpError(
              404,
              "public_not_found",
              "Premiação não confirmada.",
            );
        } else if (request.method() === "GET") {
          reads.push(tail || "workspace");
          if (tail === "" && readUnavailable)
            throw new HttpError(
              503,
              "service_unavailable",
              "Atualização indisponível.",
            );
          value =
            tail === "athletes" && candidateCount > 0
              ? {
                  disputeId: tid(3),
                  items: Array.from({ length: candidateCount }, (_, n) => ({
                    personId: f.id(500 + n),
                    version: 1,
                    name: `Atleta ${n + 1}`,
                    nickname: null,
                    publicBirthYear: null,
                    registrationIds: [tid(5)],
                  })).slice(
                    Number(url.searchParams.get("offset") ?? 0),
                    Number(url.searchParams.get("offset") ?? 0) + 20,
                  ),
                  hasMore:
                    candidateCount >
                    Number(url.searchParams.get("offset") ?? 0) + 20,
                }
              : tail === "athletes"
                ? await db.getCandidates(
                    "fixture-access",
                    tid(3),
                    url.searchParams.get("q") ?? "",
                    Number(url.searchParams.get("offset") ?? 0),
                  )
                : tail.startsWith("drafts/")
                  ? await db.getDraftVersion(
                      "fixture-access",
                      tid(3),
                      Number(parts[5]),
                    )
                  : tail.startsWith("confirmations/")
                    ? await db.getPublicationVersion(
                        "fixture-access",
                        tid(3),
                        Number(parts[5]),
                      )
                    : await db.getWorkspace(
                        "fixture-access",
                        tid(3),
                        Number(url.searchParams.get("draftOffset") ?? 0),
                        Number(url.searchParams.get("publicationOffset") ?? 0),
                      );
        } else {
          const body = request.postDataJSON();
          attempts.push({ path: tail, body });
          value =
            tail === "suggestion"
              ? await db.preview("fixture-access", body)
              : tail === "confirm"
                ? await db.confirm("fixture-access", body)
                : await db.save("fixture-access", body);
          if (failAfterMutation && tail !== "suggestion") {
            failAfterMutation = false;
            readUnavailable = true;
          }
        }
        await route.fulfill({ json: value });
      } catch (e) {
        if (!(e instanceof HttpError)) throw e;
        await route.fulfill({
          status: e.status,
          json: { error: { code: e.code, message: e.message } },
        });
      }
    });
  }
  await attach(page);
  return {
    options,
    attempts,
    reads,
    f,
    db,
    candidatePages: (count: number) => {
      candidateCount = count;
    },
    addTab: async (target: Page) => {
      await base.addTab(target);
      await attach(target);
    },
    loseSaveAck: () => {
      options.loseAchievementSaveAck = true;
    },
    loseConfirmAck: () => {
      options.loseAchievementConfirmAck = true;
    },
    failReadAfterMutation: () => {
      failAfterMutation = true;
    },
    allowReads: () => {
      readUnavailable = false;
    },
    expire: () => {
      expired = true;
    },
    resume: () => {
      expired = false;
    },
  };
}
