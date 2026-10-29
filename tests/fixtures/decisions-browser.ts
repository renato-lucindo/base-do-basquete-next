import { type Page } from "@playwright/test";
import { regulationBrowserFixture } from "./regulation-browser";
import { decisionBackend } from "./decisions.mjs";
import { SupabaseDecisions } from "../../src/regulation/decision-provider";
import { tid } from "./text-import";
import { emptyOfficiating } from "../../src/games/officiating-contract";
export async function decisionBrowserFixture(
  page: Page,
  options: Record<string, boolean | number | undefined> = {},
) {
  const f = await regulationBrowserFixture(page),
    source = f.getState();
  source.version = 1;
  source.savedAt = "2026-10-25T01:00:00Z";
  source.definition = {
    registrationIds: [tid(5), tid(6)],
    occurrenceRules: { wo: null },
    groupPhases: [],
    knockoutPhases: [],
    series: [],
  };
  const backend = decisionBackend(source, options),
    provider = new SupabaseDecisions(
      { url: "https://db.example.test", key: "fixture" },
      async (url, init) => {
        const response = await backend(
          new Request(url, {
            ...init,
            headers: {
              authorization: "Bearer fixture-access",
              "content-type": "application/json",
            },
          }),
        );
        if (response)
          return Response.json(await response.json(), {
            status: response.status,
          });
        return Response.json(source);
      },
    );
  const attempts: string[] = [],
    withdrawalAttempts: string[] = [];
  async function attach(target: Page) {
    await target.route(
      /\/api\/games\/[^/]+\/occurrence(?:[/?]|$)/,
      async (route) => {
        const req = route.request(),
          tail = new URL(req.url()).pathname.slice(
            `/api/games/${tid(8)}/occurrence`.length,
          );
        try {
          if (req.method() === "POST") attempts.push(req.postData()!);
          if (options.expireDecision) {
            options.expireDecision = false;
            return route.fulfill({
              status: 401,
              json: {
                error: { code: "invalid_session", message: "Entre novamente." },
              },
            });
          }
          if (
            req.method() === "GET" &&
            options.failReadAfterAck &&
            options.occurrenceCommits
          ) {
            options.failReadAfterAck = false;
            return route.fulfill({
              status: 503,
              json: {
                error: {
                  code: "access_unavailable",
                  message: "Leitura indisponível.",
                },
              },
            });
          }
          if (req.method() === "POST" && tail === "")
            options.saveAttempts = Number(options.saveAttempts ?? 0) + 1;
          if (
            req.method() === "POST" &&
            tail === "" &&
            options.rejectChangedSource
          ) {
            options.rejectChangedSource = false;
            source.contextFingerprint = "b".repeat(64);
            return route.fulfill({
              status: 409,
              json: {
                error: {
                  code: "version_conflict",
                  message: "As fontes mudaram. Recarregue para conferir.",
                },
              },
            });
          }
          const value =
            req.method() === "GET"
              ? tail.startsWith("/versions/")
                ? await provider.getOccurrenceVersion(
                    "fixture",
                    tid(8),
                    Number(tail.split("/")[2]),
                  )
                : await provider.getOccurrence(
                    "fixture",
                    tid(8),
                    Number(new URL(req.url()).searchParams.get("offset") ?? 0),
                  )
              : tail === "/preview"
                ? await provider.previewOccurrence(
                    "fixture",
                    req.postDataJSON(),
                  )
                : await provider.saveOccurrence("fixture", req.postDataJSON());
          await route.fulfill({ json: value });
        } catch (error) {
          const e = error as {
            status?: number;
            code?: string;
            message?: string;
          };
          await route.fulfill({
            status: e.status ?? 503,
            json: {
              error: {
                code: e.code ?? "access_unavailable",
                message: e.message ?? "Indisponível",
              },
            },
          });
        }
      },
    );
    await target.route(
      /\/api\/registrations\/[^/]+\/withdrawal(?:[/?]|$)/,
      async (route) => {
        const req = route.request(),
          url = new URL(req.url()),
          parts = url.pathname.split("/"),
          id = parts[3],
          tail = parts.slice(5).join("/");
        try {
          if (req.method() === "POST") withdrawalAttempts.push(req.postData()!);
          if (options.expireWithdrawal) {
            options.expireWithdrawal = false;
            return route.fulfill({
              status: 401,
              json: {
                error: { code: "invalid_session", message: "Entre novamente." },
              },
            });
          }
          if (
            req.method() === "GET" &&
            options.failWithdrawalReadAfterAck &&
            options.withdrawalCommits
          ) {
            options.failWithdrawalReadAfterAck = false;
            return route.fulfill({
              status: 503,
              json: {
                error: {
                  code: "access_unavailable",
                  message: "Leitura indisponível.",
                },
              },
            });
          }
          const value =
            req.method() === "GET"
              ? tail.startsWith("versions/")
                ? await provider.getWithdrawalVersion(
                    "fixture",
                    id,
                    Number(parts[6]),
                  )
                : await provider.getWithdrawal(
                    "fixture",
                    id,
                    Number(url.searchParams.get("offset") ?? 0),
                  )
              : tail === "preview"
                ? await provider.previewWithdrawal(
                    "fixture",
                    req.postDataJSON(),
                  )
                : await provider.saveWithdrawal("fixture", req.postDataJSON());
          await route.fulfill({ json: value });
        } catch (error) {
          const e = error as {
            status?: number;
            code?: string;
            message?: string;
          };
          await route.fulfill({
            status: e.status ?? 503,
            json: {
              error: {
                code: e.code ?? "access_unavailable",
                message: e.message ?? "Indisponível",
              },
            },
          });
        }
      },
    );
  }
  await attach(page);
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page
    .getByRole("button", { name: "Abrir jogo Lobos × Lobos B", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Situação e decisões do jogo", exact: true })
    .click();
  return {
    options,
    source,
    provider,
    attempts,
    withdrawalAttempts,
    addPublishedGames: (count: number) => {
      f.addGames(count);
      const first = source.context.publishedGames[0];
      for (const game of source.context.games.slice(1)) {
        if (!source.context.publishedGames.some((p) => p.gameId === game.id))
          source.context.publishedGames.push({ ...first, gameId: game.id });
      }
    },
    addTab: async (target: Page) => {
      await f.addTab(target);
      await attach(target);
      await target.route(
        new RegExp(`/api/games/${tid(8)}(?:/editor)?$`),
        (route) =>
          route.fulfill({
            json: route.request().url().endsWith("/editor")
              ? {
                  game: f.games.get(tid(8)),
                  officiating: f.scales.get(tid(8)) ?? emptyOfficiating(),
                }
              : f.games.get(tid(8)),
          }),
      );
    },
  };
}
