import { providerJson, unavailable } from "../access/provider";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import {
  statisticsHeadSchema,
  statisticsPageSchema,
} from "./paged-source-contract";
import type { StatisticsSource } from "./source";
export type PublicStatisticsConfig = { url: string; key: string };
export type PublicStatisticsSend = (
  url: string,
  init: RequestInit,
) => Promise<Response>;
const capacity = () =>
  new HttpError(
    413,
    "source_capacity",
    "A consulta excede a capacidade de dados deste contexto.",
  );
const changed = () =>
  new HttpError(
    409,
    "source_changed",
    "Os resultados foram atualizados durante a consulta. Recarregue para conferir a versão atual.",
  );
/** Only current public pages, bounded as a whole; no caller-provided path/JWT/facts. */
export async function readPublicStatisticsSource(
  config: PublicStatisticsConfig,
  send: PublicStatisticsSend,
  disputeId: string,
): Promise<StatisticsSource | null> {
  const args: Database["public"]["Functions"]["get_public_statistics_source"]["Args"] =
    { p_dispute_id: disputeId };
  const deadline = AbortSignal.timeout(20000);
  let remaining = 16 * 1024 * 1024;
  async function request(
    rpc: "get_public_statistics_head" | "get_public_statistics_page",
    body: object,
  ) {
    if (remaining < 1024) throw capacity();
    let response: Response;
    try {
      response = await send(`${config.url}/rest/v1/rpc/${rpc}`, {
        method: "POST",
        headers: { apikey: config.key, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.any([deadline, AbortSignal.timeout(8000)]),
      });
    } catch {
      throw unavailable();
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      if (response.status === 409) throw changed();
      if (response.status === 413) throw capacity();
      if (response.status === 429)
        throw new HttpError(
          429,
          "too_many_attempts",
          "Muitas consultas. Aguarde um pouco e tente novamente.",
        );
      throw unavailable();
    }
    let size = 0;
    try {
      const result = await providerJson(
        response,
        Math.min(rpc.endsWith("_head") ? 4096 : 4 * 1024 * 1024, remaining),
        (n) => {
          size = n;
        },
      );
      remaining -= size;
      return result;
    } catch {
      if (size > remaining) throw capacity();
      throw unavailable();
    }
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await request("get_public_statistics_head", args);
      if (raw === null) return null;
      const parsed = statisticsHeadSchema.safeParse(raw);
      if (!parsed.success || parsed.data.disputeId !== disputeId)
        throw unavailable();
      const { gameCount, ...head } = parsed.data;
      const games: StatisticsSource["games"] = [];
      let after: string | null = null;
      if (gameCount > 0) {
        for (let pageNumber = 0; ; pageNumber++) {
          if (pageNumber >= 120) throw capacity();
          const page = statisticsPageSchema.safeParse(
            await request("get_public_statistics_page", {
              ...args,
              p_version: head.version,
              p_after: after,
            }),
          );
          if (
            !page.success ||
            page.data.disputeId !== disputeId ||
            page.data.version !== head.version ||
            page.data.after !== after
          )
            throw unavailable();
          const first = games[0]?.snapshot ?? page.data.games[0]?.snapshot;
          if (
            first &&
            page.data.games.some(
              ({ snapshot }) =>
                snapshot.context.championshipId.toLowerCase() !==
                  first.context.championshipId.toLowerCase() ||
                snapshot.context.seasonId.toLowerCase() !==
                  first.context.seasonId.toLowerCase(),
            )
          )
            throw unavailable();
          games.push(...page.data.games);
          if (games.length > gameCount) throw unavailable();
          if (page.data.next === null) break;
          if (games.length >= gameCount) throw unavailable();
          after = page.data.next;
        }
      }
      if (games.length !== gameCount) throw unavailable();
      return { ...head, kind: "confirmed-statistics-v1", games };
    } catch (error) {
      if (error instanceof HttpError && error.code === "source_changed") {
        if (attempt === 0) continue;
        throw changed();
      }
      throw error;
    }
  }
  throw changed();
}
