import { z } from "zod";
import { providerJson, unavailable } from "../access/provider";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import { buildStatisticsPage, parseStatisticsQuery } from "./query";
/** Only the publishable key and a read-only public RPC are used; user sessions never leave here. */
export class SupabaseStatistics {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: (
      url: string,
      init: RequestInit,
    ) => Promise<Response> = (url, init) => fetch(url, init),
  ) {}
  async getPage(id: string, params: URLSearchParams) {
    const parsed = z
      .uuid()
      .transform((v) => v.toLowerCase())
      .safeParse(id);
    if (!parsed.success)
      throw new HttpError(400, "invalid_input", "Disputa inválida.");
    const args: Database["public"]["Functions"]["get_public_statistics_source"]["Args"] =
      { p_dispute_id: parsed.data };
    let response: Response;
    try {
      response = await this.send(
        `${this.config.url}/rest/v1/rpc/get_public_statistics_source`,
        {
          method: "POST",
          headers: {
            apikey: this.config.key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(args),
          signal: AbortSignal.timeout(8000),
        },
      );
    } catch {
      throw unavailable();
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      if (response.status === 429)
        throw new HttpError(
          429,
          "too_many_attempts",
          "Muitas consultas. Aguarde um pouco e tente novamente.",
        );
      throw unavailable();
    }
    // Source storage is bounded to4MiB. Allow transport encoding overhead, never an unbounded read.
    const source = await providerJson(response, 5 * 1024 * 1024);
    if (source === null) return null;
    try {
      const page = buildStatisticsPage(source, parseStatisticsQuery(params));
      if (page.disputeId !== parsed.data) throw unavailable();
      return page;
    } catch {
      throw unavailable();
    }
  }
}
